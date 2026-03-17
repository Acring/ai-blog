import 'dotenv/config';

const API_BASE = 'https://toapis.com';
const API_KEY = process.env.TOAPIS_KEY;

if (!API_KEY) {
  console.error('请在 .env 文件中设置 TOAPIS_KEY');
  process.exit(1);
}

// 从命令行参数获取 prompt 和可选的 image_urls
const prompt = process.argv[2];
const imageUrls = process.argv.slice(3);

if (!prompt) {
  console.error('用法: node generate.mjs "<prompt>" [image_url1] [image_url2] ...');
  process.exit(1);
}

async function createImage(prompt, imageUrls = []) {
  const body = {
    model: 'gemini-3.1-flash-image-preview',
    prompt,
    size: '1:1',
    n: 1,
    metadata: { resolution: '2K' },
  };

  if (imageUrls.length > 0) {
    body.image_urls = imageUrls;
  }

  const response = await fetch(`${API_BASE}/v1/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`创建任务失败 (${response.status}): ${text}`);
  }

  return response.json();
}

async function getImageStatus(taskId) {
  const response = await fetch(`${API_BASE}/v1/images/generations/${taskId}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });
  return response.json();
}

async function waitForImage(taskId, maxAttempts = 60, interval = 3000) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getImageStatus(taskId);
    const status = result.status;

    console.log(`[${i + 1}/${maxAttempts}] 状态: ${status}`);

    if (status === 'completed') {
      return result;
    } else if (status === 'failed') {
      throw new Error(`任务失败: ${JSON.stringify(result)}`);
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error('任务超时');
}

// 主流程
const task = await createImage(prompt, imageUrls);
console.log(`任务 ID: ${task.id}`);
console.log(`初始状态: ${task.status}`);

const result = await waitForImage(task.id);
console.log('图片 URL:', result.result?.data?.[0]?.url ?? result.url);
