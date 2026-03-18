---
name: publish-to-notion
description: |
  将 drafts 目录中的 markdown 文章发布到 Notion 日常笔记数据库。支持本地图片自动上传并插入到正确位置。
  触发条件：用户要求将文章/草稿发布到 Notion，或提到"发布到日常笔记"。
---

# 发布文章到 Notion

将 markdown 文章发布到 Notion 日常笔记数据库，支持本地图片上传。

## 前置依赖

- `notion-cli`（别名 `notion`）：`/Users/liuzhen/go/bin/notion-cli`
- Python 3
- 发布脚本：`scripts/notion_publish.py`

## 目标数据库

日常笔记（数据库）ID: `090dcff64bb749959abb1a0a1c7aa165`

数据库属性：
- **主题**（title）：文章标题
- **标签**（multi_select）：逗号分隔的标签
- **归档**（checkbox）：默认 false
- **URL**（url）：可选
- **created time**（created_time）：自动生成

## 发布步骤

### 1. 读取文章 frontmatter

从 markdown 文件的 YAML frontmatter 中提取 `title` 和 `tags` 等元信息。如果没有 frontmatter，从第一个 `#` 标题推断标题，标签由用户指定或从内容推断。

### 2. 在数据库中创建页面

```bash
notion-cli db add 090dcff64bb749959abb1a0a1c7aa165 \
  "主题=<文章标题>" \
  "标签=<tag1>,<tag2>,<tag3>" \
  --format json
```

从返回的 JSON 中提取 `id` 作为 `<page_id>`。

### 3. 用脚本发布内容（含图片）

```bash
python3 scripts/notion_publish.py <markdown_file> <page_id>
```

脚本工作原理：
1. 解析 markdown，按图片引用 `![](./images/xxx.png)` 拆分为文本段和图片段
2. 文本段：写入临时文件，通过 `notion-cli block append --file` 追加到页面
3. 图片段：
   - 先通过 `notion-cli file upload <image_path> --format json` 上传（**不带** `--to` 参数，避免重复创建 image block）
   - 再通过 `notion-cli api PATCH /v1/blocks/<page_id>/children --body '...'` 插入 image block
4. 大文本段自动按 60 行拆分，避免超出 Notion API 的 100 block 限制

### 4. 输出结果

发布完成后输出 Notion 页面链接：`https://www.notion.so/<page_id>`

## 注意事项

- 图片上传时**不要**使用 `--to` 参数，否则会导致每张图片出现两次
- Notion API 每次 append 最多 100 个 block，脚本已自动处理分批
- `notion-cli` 在 subprocess 中调用时需要使用完整路径，脚本通过 `shutil.which` 自动查找
