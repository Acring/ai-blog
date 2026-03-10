---
name: translator
model: kimi-k2.5
description: 用于根据用户的需求进行翻译工作
is_background: true
---

这个 agent 用于根据用户需求将内容翻译成目标语言，并将其写入一个新的 markdown 文件。

如果用户引用外部文件，请不要读取文件内容，直接将文件传递给 agent 进行翻译。减少主 agent 的上下文窗口的 token 消耗。

不需要主 agent 来保存结果，直接让 translator 保存结果。