#!/usr/bin/env python3
"""
Publish a markdown file to a Notion page, with local images uploaded
and inserted at the correct positions.

Usage:
    python3 scripts/notion_publish.py <markdown_file> <page_id>

How it works:
1. Parse markdown into segments: text chunks and image references
2. For each segment in order:
   - Text chunk: write to a temp file, append via `notion block append --file`
   - Image: upload via `notion file upload --to`, then insert image block via raw API
"""

import sys
import os
import re
import json
import subprocess
import tempfile
import shutil

NOTION_BIN = shutil.which("notion-cli") or shutil.which("notion") or "notion-cli"


def run_cmd(args, check=True):
    """Run a shell command and return stdout."""
    result = subprocess.run(args, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"Command failed: {' '.join(args)}", file=sys.stderr)
        print(f"stderr: {result.stderr}", file=sys.stderr)
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


def parse_markdown(md_path):
    """
    Parse markdown into a list of segments.
    Each segment is either:
      ("text", "markdown text content")
      ("image", "/absolute/path/to/image.png")
    """
    base_dir = os.path.dirname(os.path.abspath(md_path))
    with open(md_path, "r") as f:
        content = f.read()

    # Strip YAML frontmatter
    content = re.sub(r"^---.*?---\s*", "", content, count=1, flags=re.DOTALL)

    # Split by image pattern, keeping the image matches
    # Pattern: ![alt](path)
    image_pattern = r"(!\[.*?\]\(.*?\))"
    parts = re.split(image_pattern, content)

    segments = []
    for part in parts:
        m = re.match(r"!\[.*?\]\((.*?)\)", part)
        if m:
            img_path = m.group(1)
            # Resolve relative path
            abs_path = os.path.normpath(os.path.join(base_dir, img_path))
            if os.path.exists(abs_path):
                segments.append(("image", abs_path))
            else:
                print(f"Warning: image not found: {abs_path}, skipping")
                segments.append(("text", part))
        else:
            text = part.strip()
            if text:
                segments.append(("text", text))

    return segments


def append_text(page_id, text):
    """Append a text chunk (markdown) to the page via notion block append --file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(text)
        tmp_path = f.name

    try:
        output = run_cmd([NOTION_BIN, "block", "append", page_id, "--file", tmp_path])
        print(f"  Text: {output}")
    finally:
        os.unlink(tmp_path)


def upload_and_insert_image(page_id, image_path):
    """Upload an image and insert it as an image block."""
    # Step 1: Upload file
    output = run_cmd([
        NOTION_BIN, "file", "upload", image_path,
        "--format", "json"
    ])
    upload_data = json.loads(output)
    file_upload_id = upload_data["id"]
    print(f"  Uploaded: {os.path.basename(image_path)} -> {file_upload_id}")

    # Step 2: Insert image block via raw API
    body = json.dumps({
        "children": [{
            "type": "image",
            "image": {
                "type": "file_upload",
                "file_upload": {
                    "id": file_upload_id
                }
            }
        }]
    })
    output = run_cmd([
        NOTION_BIN, "api", "PATCH",
        f"/v1/blocks/{page_id}/children",
        "--body", body,
        "--format", "json"
    ])
    print(f"  Image block inserted")


def publish(md_path, page_id):
    """Publish markdown to Notion page with images."""
    print(f"Parsing: {md_path}")
    segments = parse_markdown(md_path)
    print(f"Found {len(segments)} segments")

    # Notion API has a 100-block limit per append call.
    # For text segments, we need to split if they're too large.
    # A rough heuristic: ~2 blocks per paragraph/blank-line-separated section.
    # We'll split text into sub-chunks of ~60 lines to stay safe.
    MAX_LINES = 60

    for i, (seg_type, content) in enumerate(segments):
        print(f"\n[{i+1}/{len(segments)}] {seg_type}")
        if seg_type == "image":
            upload_and_insert_image(page_id, content)
        else:
            # Split large text chunks
            lines = content.split("\n")
            chunks = []
            current = []
            for line in lines:
                current.append(line)
                if len(current) >= MAX_LINES and line.strip() == "":
                    chunks.append("\n".join(current))
                    current = []
            if current:
                chunks.append("\n".join(current))

            for j, chunk in enumerate(chunks):
                if len(chunks) > 1:
                    print(f"  Sub-chunk {j+1}/{len(chunks)}")
                append_text(page_id, chunk)

    print(f"\nDone! Published to: https://www.notion.so/{page_id.replace('-', '')}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/notion_publish.py <markdown_file> <page_id>")
        sys.exit(1)

    md_path = sys.argv[1]
    page_id = sys.argv[2]

    if not os.path.exists(md_path):
        print(f"File not found: {md_path}")
        sys.exit(1)

    publish(md_path, page_id)
