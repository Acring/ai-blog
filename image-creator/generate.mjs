import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const API_BASE = process.env.OPENROUTER_API_URL ?? 'https://openrouter.ai/api/v1';
const API_KEY = process.env.OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY_FANSTAG;
const SITE_URL = process.env.OPENROUTER_SITE_URL;
const APP_TITLE = 'BeeTag AI';
const MODEL = 'google/gemini-3-pro-image-preview';

if (!API_KEY) {
  console.error('请在 image-creator/.env 中设置 OPENROUTER_API_KEY');
  process.exit(1);
}

const prompt = process.argv[2];
const imageUrls = process.argv.slice(3);

if (!prompt) {
  console.error('用法: node generate.mjs "<prompt>" [image_url1] [image_url2] ...');
  process.exit(1);
}

function buildRequestBody(userPrompt, inputImageUrls = []) {
  const content = inputImageUrls.map((url) => ({
    type: 'image_url',
    image_url: { url },
  }));

  content.push({
    type: 'text',
    text: userPrompt,
  });

  return {
    model: MODEL,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
    modalities: ['image', 'text'],
  };
}

async function createImage(userPrompt, inputImageUrls = []) {
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'X-Title': APP_TITLE,
  };

  if (SITE_URL) {
    headers['HTTP-Referer'] = SITE_URL;
  }

  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(buildRequestBody(userPrompt, inputImageUrls)),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`图片生成失败 (${response.status}): ${text}`);
  }

  return response.json();
}

function extractMarkdownImageUrls(text) {
  const matches = text.matchAll(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/g);
  return Array.from(matches, ([, url]) => ({
    kind: 'url',
    url,
  }));
}

function parseDataUrl(url) {
  if (typeof url !== 'string') {
    return null;
  }

  const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    return null;
  }

  const [, mediaType, data] = match;
  return {
    kind: 'base64',
    mediaType,
    data,
  };
}

function normalizeImageUrl(url) {
  return parseDataUrl(url) ?? {
    kind: 'url',
    url,
  };
}

function normalizeContentArray(content) {
  if (Array.isArray(content)) {
    return content;
  }

  if (typeof content === 'string') {
    return extractMarkdownImageUrls(content);
  }

  return [];
}

function extractImagesFromPart(part) {
  if (!part || typeof part !== 'object') {
    return [];
  }

  if (part.kind === 'url' && typeof part.url === 'string') {
    return [normalizeImageUrl(part.url)];
  }

  if (part.type === 'image_url' && typeof part.image_url?.url === 'string') {
    return [normalizeImageUrl(part.image_url.url)];
  }

  if (part.type === 'image' && typeof part.source?.data === 'string') {
    return [
      {
        kind: 'base64',
        mediaType: part.source.media_type ?? 'image/png',
        data: part.source.data,
      },
    ];
  }

  return [];
}

function extractGeneratedImages(payload) {
  const messages = (payload?.choices ?? [])
    .map((choice) => choice?.message)
    .filter(Boolean);

  const results = [];

  for (const message of messages) {
    if (Array.isArray(message.images)) {
      for (const image of message.images) {
        results.push(...extractImagesFromPart(image));
      }
    }

    for (const part of normalizeContentArray(message.content)) {
      results.push(...extractImagesFromPart(part));
    }
  }

  return results;
}

function extensionFromMediaType(mediaType) {
  switch (mediaType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'png';
  }
}

async function saveBase64Image(image, index) {
  const outputDir = path.join(__dirname, 'output');
  const extension = extensionFromMediaType(image.mediaType);
  const filename = `generated-${Date.now()}-${index + 1}.${extension}`;
  const outputPath = path.join(outputDir, filename);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, Buffer.from(image.data, 'base64'));

  return outputPath;
}

async function printResults(images) {
  if (images.length === 0) {
    throw new Error('OpenRouter 已返回成功响应，但未找到可用图片结果');
  }

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];

    if (image.kind === 'url') {
      console.log(`图片 ${index + 1} URL: ${image.url}`);
      continue;
    }

    const savedPath = await saveBase64Image(image, index);
    console.log(`图片 ${index + 1} 已保存: ${savedPath}`);
  }
}

try {
  const payload = await createImage(prompt, imageUrls);
  const images = extractGeneratedImages(payload);
  await printResults(images);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
