---
name: generate-image
description: 使用 toapis AI 生成图片，支持参考图，默认复制第一张到目标 markdown 的 images 目录并清理临时文件
---

# 生成 AI 配图

使用 `image-creator/generate.mjs` 调用 toapis API 生成图片。脚本通常会直接把结果保存到 `image-creator/output/`，然后默认复制第一张到目标文档附近的 `images/` 目录；流程结束后删除本次生成的 `output` 临时文件。

## 输入

- `prompt`: 图片描述（必填），默认为帮用户给的文案配图
- `reference_urls`: 参考图片 URL 列表（可选），默认为 https://i.postimg.cc/qBDVvVy2/1773116073094.png
- `insert_to`: 需要插入图片的 markdown 文件路径（可选）
- `insert_after`: 插入位置的上下文文本（可选，配合 insert_to 使用）
- `style`: 风格关键词（可选，默认 chibi kawaii mascot illustration）

## 工作流

### 1. 构造 prompt

如果用户提供了 style，将 style 追加到 prompt 末尾。如果用户提供了 `reference_urls`，在 prompt 前加上 "参考图片中的角色，"。

### 2. 调用生成脚本

```bash
cd image-creator && node generate.mjs "<final_prompt>" [reference_url1] [reference_url2] ...
```

- 设置 timeout 为 300000ms（5分钟）
- 如果当前环境网络受限，需要申请提权，因为脚本会访问外部 API
- 忽略 `dotenv` 的提示输出，重点关注保存结果
- 成功时，脚本通常会输出类似 `图片 1 已保存: /abs/path/to/file.jpg`

### 3. 优先使用第一张本地输出，必要时再下载

- 如果 `generate.mjs` 已经输出本地文件路径，优先直接使用这些文件，不要重复下载
- 如果生成了多张图，不用预览，默认使用第一张
- 如果轮询结果里只有远程 URL，再用 `curl` 下载到目标文档的 `images/` 目录，并将第一张结果作为默认图

```bash
curl -o <target_images_dir>/<filename_from_url> "<image_url>"
```

### 4. 复制到目标目录并插入到文档（可选）

如果提供了 `insert_to`：

- 先用 `rg -n` 搜索 `insert_after`，不要先读整个文档
- 再只读取命中位置附近的一小段上下文，确认插入点
- 如果文章目录下已有 `images/` 目录，优先把第一张生成结果复制到这个目录
- 图片引用路径要跟 `insert_to` 的相对位置一致，并尽量沿用该文档现有写法；不要硬编码成 `../../images/...`

常见情况是 markdown 和 `images/` 同级，这时插入：

```markdown
![./images/<filename>](./images/<filename>)
```

### 5. 清理临时文件

- 完成复制和插入后，删除 `image-creator/output/` 下本次生成的临时文件，避免仓库里残留重复图片
- 只删除本次生成流程产生的文件，不要清理历史上不确定来源的文件

## 注意事项

- 不要读取 `generate.mjs` 的源码，直接按上述格式调用即可
- 不要读取 `.env` 文件
- 不要预览图片；除非用户明确要求，否则直接使用第一张结果
- 如果需要清理文件，优先删除本次生成流程明确产出的 `output` 文件，避免误删其他资源
