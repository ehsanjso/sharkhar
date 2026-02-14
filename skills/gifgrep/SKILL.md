---
name: gifgrep
description: Search GIF providers with CLI/TUI, download results, and extract stills/sheets.
homepage: https://gifgrep.com
metadata: {"clawdbot":{"emoji":"🧲","requires":{"bins":["gifgrep"]},"install":[{"id":"brew","kind":"brew","formula":"steipete/tap/gifgrep","bins":["gifgrep"],"label":"Install gifgrep (brew)"},{"id":"go","kind":"go","module":"github.com/steipete/gifgrep/cmd/gifgrep@latest","bins":["gifgrep"],"label":"Install gifgrep (go)"}]}}
---

# gifgrep

## When to Use
- Searching Tenor/Giphy for reaction GIFs to send in messages
- Downloading GIFs for use in projects or chats
- Extracting still frames or contact sheets from GIFs
- Interactive TUI browsing of GIF search results
- Getting direct URLs for GIF embedding

## When NOT to Use
- **Creating GIFs from video** → Use FFmpeg or video-frames skill
- **Editing GIFs** → Use ezgif.com or ImageMagick
- **Searching for images (not GIFs)** → Use web search or image APIs
- **Meme generation** → Use dedicated meme generators

Use `gifgrep` to search GIF providers (Tenor/Giphy), browse in a TUI, download results, and extract stills or sheets.

GIF-Grab (gifgrep workflow)
- Search → preview → download → extract (still/sheet) for fast review and sharing.

Quick start
- `gifgrep cats --max 5`
- `gifgrep cats --format url | head -n 5`
- `gifgrep search --json cats | jq '.[0].url'`
- `gifgrep tui "office handshake"`
- `gifgrep cats --download --max 1 --format url`

TUI + previews
- TUI: `gifgrep tui "query"`
- CLI still previews: `--thumbs` (Kitty/Ghostty only; still frame)

Download + reveal
- `--download` saves to `~/Downloads`
- `--reveal` shows the last download in Finder

Stills + sheets
- `gifgrep still ./clip.gif --at 1.5s -o still.png`
- `gifgrep sheet ./clip.gif --frames 9 --cols 3 -o sheet.png`
- Sheets = single PNG grid of sampled frames (great for quick review, docs, PRs, chat).
- Tune: `--frames` (count), `--cols` (grid width), `--padding` (spacing).

Providers
- `--source auto|tenor|giphy`
- `GIPHY_API_KEY` required for `--source giphy`
- `TENOR_API_KEY` optional (Tenor demo key used if unset)

Output
- `--json` prints an array of results (`id`, `title`, `url`, `preview_url`, `tags`, `width`, `height`)
- `--format` for pipe-friendly fields (e.g., `url`)

Environment tweaks
- `GIFGREP_SOFTWARE_ANIM=1` to force software animation
- `GIFGREP_CELL_ASPECT=0.5` to tweak preview geometry
