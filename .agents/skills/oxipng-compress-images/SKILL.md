---
name: oxipng-compress-images
description: Use `oxipng` to compress PNG images in place, either for single files or batch directory runs. Trigger this skill when Codex needs to shrink blog images, article assets, screenshots, or other `.png` files; keep large PNGs under a target size such as 5MB; run lossless compression first; and fall back to resizing oversized files to 1080px when oxipng alone is not enough.
---

# Oxipng 图片压缩

使用 `scripts/compress_pngs.sh` 统一处理 PNG 压缩：先跑 `oxipng`，如果文件仍然超过目标大小，再缩小到 `1080x1080` 的边界框并再次压缩。

## 快速开始

- 先确认 `oxipng` 和 `magick` 可用：`command -v oxipng`、`command -v magick`
- 优先使用脚本而不是手写临时命令：`bash ./.agents/skills/oxipng-compress-images/scripts/compress_pngs.sh <path>`
- 默认规则：
  - 只处理大于等于 `3000000` bytes 的 PNG
  - 先执行 `oxipng -o 4 --strip all --preserve`
  - 如果结果仍大于等于 `5000000` bytes，则缩小到 `1080x1080>` 并再次执行 `oxipng`
  - 直接原地覆盖文件，不自动保留备份

## 常用命令

压缩单个文件：

```bash
bash ./.agents/skills/oxipng-compress-images/scripts/compress_pngs.sh path/to/image.png
```

压缩目录下的 PNG：

```bash
bash ./.agents/skills/oxipng-compress-images/scripts/compress_pngs.sh drafts/ai-development-concepts/images
```

递归处理多层目录：

```bash
bash ./.agents/skills/oxipng-compress-images/scripts/compress_pngs.sh --recursive drafts
```

先预览将会处理哪些文件：

```bash
bash ./.agents/skills/oxipng-compress-images/scripts/compress_pngs.sh --dry-run drafts/ai-development-concepts/images
```

自定义阈值：

```bash
bash ./.agents/skills/oxipng-compress-images/scripts/compress_pngs.sh \
  --min-bytes 3000000 \
  --max-bytes 5000000 \
  --resize 1080 \
  drafts/ai-development-concepts/images
```

## 工作流

### 1. 确认目标

- 如果用户指定单张图片，直接传入文件路径
- 如果用户指定目录，直接传入目录路径；需要深层遍历时加 `--recursive`
- 如果用户只说“压到 5MB 以下”，默认保持 `--max-bytes 5000000`

### 2. 执行压缩

- 默认先跑脚本，不要先写临时 Python
- 脚本会输出 `DONE`、`SKIP`、`FAIL`、`SUMMARY`
- `DONE` 行依次包含：路径、原始字节数、最终字节数、动作、最终尺寸
- 动作只有两种：
  - `oxipng`
  - `oxipng+resize`

### 3. 验证结果

- 处理完成后，重点确认：
  - 最终文件是否低于用户要求的大小
  - 如果触发了缩放，最终尺寸是否符合预期
  - 是否为原地覆盖，避免误报输出位置
- 需要额外核对时，使用：

```bash
stat -f '%z %N' path/to/image.png
file path/to/image.png
```

## 注意事项

- 这个 skill 面向 PNG；如果用户给的是 JPG、WebP 或 PDF，不要硬套这个流程
- 这是原地修改；如果用户要求保留原图，先手动复制再运行脚本
- `oxipng` 是无损压缩；只有在超出目标大小时，才通过 `magick` 缩尺寸
- `--resize 1080` 会被转换为 `1080x1080>`，即只缩小，不放大小图
- 如果用户只要求“先无损压缩一次”，可以直接用 `oxipng` 命令，不必触发缩放分支
- 如果目录里没有匹配文件，脚本只会输出 `SUMMARY`，不视为失败

## 资源

### `scripts/compress_pngs.sh`

使用这个脚本执行批量压缩和必要的缩放兜底，不要重复手写一次性的 shell 流程。
