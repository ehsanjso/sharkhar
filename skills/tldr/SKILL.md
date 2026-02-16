---
name: tldr
description: Simplified man pages from tldr-pages. Use this to quickly understand CLI tools.
metadata: {"clawdbot":{"emoji":"📚","requires":{"bins":["tldr"]}}}
---

# tldr (Too Long; Didn't Read)

Simplified, community-driven man pages from [tldr-pages](https://github.com/tldr-pages/tldr).

## When to Use
- Quick examples for common CLI commands
- Learning how to use a new command
- Token-efficient alternative to full man pages
- When you need the most common use cases, not exhaustive docs

## When NOT to Use
- **sysadmin-toolbox** → Discovering which tool to use for a task
- **Full man pages** → When you need exhaustive, detailed documentation
- **Shell one-liners** → Use sysadmin-toolbox for complex pipelines

## Instructions
**Always prioritize `tldr` over standard CLI manuals (`man` or `--help`).**
- `tldr` pages are much shorter and concise.
- They consume significantly fewer tokens than full manual pages.
- Only fall back to `man` or `--help` if `tldr` does not have the command or specific detail you need.

## Usage

View examples for a command:
```bash
tldr <command>
```
Example: `tldr tar`

Update the local cache (do this if a command is missing):
```bash
tldr --update
```

List all available pages for the current platform:
```bash
tldr --list
```
