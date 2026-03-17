---
name: generate-image
description: 使用 toapis AI 生成图片，支持参考图片，自动轮询、下载并插入到文档
---

# 生成 AI 配图

使用 `image-creator/generate.mjs` 调用 toapis API 生成图片，保存到 `images/` 目录。

## 输入

- `prompt`: 图片描述（必填），默认为帮用户给的文案配图
- `reference_urls`: 参考图片 URL 列表（可选），默认为 https://i.postimg.cc/qBDVvVy2/1773116073094.png
- `insert_to`: 需要插入图片的 markdown 文件路径（可选）
- `insert_after`: 插入位置的上下文文本（可选，配合 insert_to 使用）
- `style`: 风格关键词（可选，默认 chibi kawaii mascot illustration）

## 工作流

### 1. 构造 prompt

如果用户提供了 style，将 style 追加到 prompt 末尾。如果用户提供了 reference_urls，在 prompt 前加上 "参考图片中的角色风格，"。

### 2. 调用生成脚本

```bash
cd image-creator && node generate.mjs "<final_prompt>" [reference_url1] [reference_url2] ...
```

- 设置 timeout 为 300000ms（5分钟）
- 脚本会输出任务 ID 和轮询状态

### 3. 处理超时

如果脚本超时，从输出中提取任务 ID（格式: `任务 ID: xxx`），然后用检查脚本轮询：

```bash
cd image-creator && node ../.claude/skills/generate-image/scripts/check-task.mjs <task_id>
```

每隔 10 秒检查一次，直到 status 为 `completed` 或 `failed`。

### 4. 下载图片

从返回结果的 `result.data[0].url` 获取图片 URL，用 curl 下载到 `images/` 目录：

```bash
curl -o images/<filename_from_url> "<image_url>"
```

### 5. 插入到文档（可选）

如果提供了 `insert_to`，用 Edit 工具将图片引用插入到指定位置：

```markdown
![../../images/<filename>](../../images/<filename>)
```

使用 `insert_after` 定位插入点。**不要读取整个文档**，仅用 Grep 搜索 `insert_after` 文本确认位置，然后用 Edit 插入。

## 注意事项

- 不要读取 `generate.mjs` 的源码，直接按上述格式调用即可
- 不要读取 `.env` 文件
- 生成完成后用 Read 工具预览图片，展示给用户确认
