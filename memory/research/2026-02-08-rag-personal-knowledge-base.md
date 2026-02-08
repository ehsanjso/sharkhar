---
type: research
tags: [research, rag, embeddings, ollama, mission-control, personal-knowledge]
---
# Research: RAG for Personal Knowledge Base

## Summary

Retrieval Augmented Generation (RAG) enables semantic search over personal documents, making your memory files actually searchable by meaning rather than keywords. Combined with Ollama (already viable on Pi 5, researched Feb 4), you can build a completely local, private knowledge assistant that understands your notes, journals, and research — without sending data to cloud APIs.

## Why This Matters for Ehsan

- **Mission Control shows memories, but can't search them semantically** — you browse, but can't ask "what did I learn about Pi-hole last month?"
- **Memory files are growing** — 70+ files in `memory/`, but no way to surface relevant context automatically
- **Ollama is already viable** — Feb 4 research confirmed local embeddings work on Pi 5
- **ClawdBot's memory_search is disabled** — no OpenAI/Google keys means the built-in semantic search doesn't work

## Key Findings

### What is RAG?

```
┌─────────────────────────────────────────────────────────┐
│  Your Query: "What did I learn about thermal issues?"  │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│  1. EMBED - Convert query to vector (384-1536 dims)    │
│     Using: nomic-embed-text via Ollama                 │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│  2. RETRIEVE - Find similar chunks in vector DB        │
│     Returns: Feb 6 thermal research, pi-health.sh logs │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│  3. AUGMENT - Inject retrieved context into prompt     │
│     "Based on these docs: [chunks]... answer: ..."     │
└───────────────────────────┬─────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│  4. GENERATE - LLM produces grounded answer            │
│     "On Feb 6, you discovered Pi 5 thermal throttling  │
│      at 84°C. You ordered an Active Cooler for $5..."  │
└─────────────────────────────────────────────────────────┘
```

### Best Embedding Models for Pi 5

| Model | Size | Dimensions | Speed on Pi 5 | Quality |
|-------|------|------------|---------------|---------|
| **nomic-embed-text** | 274MB | 768 | ~50 docs/min | ★★★★☆ |
| all-minilm | 45MB | 384 | ~100 docs/min | ★★★☆☆ |
| mxbai-embed-large | 670MB | 1024 | ~30 docs/min | ★★★★★ |
| snowflake-arctic-embed | 335MB | 768 | ~45 docs/min | ★★★★☆ |

**Recommendation:** Start with `nomic-embed-text` — best balance of quality and speed, widely used in production.

### Best Local Vector Databases

| Database | Language | Size | RAM Usage | Best For |
|----------|----------|------|-----------|----------|
| **ChromaDB** | Python | Pip install | ~100MB | Easiest start, Python native |
| **LanceDB** | Python/Rust | Pip install | ~50MB | Serverless, fast, no daemon |
| sqlite-vss | SQLite ext | ~5MB | Minimal | If already using SQLite |
| Qdrant | Rust | Docker ~150MB | ~200MB | Production scale, REST API |

**Recommendation:** LanceDB — serverless (no background process), very fast, minimal RAM on Pi 5.

### The Tech Stack for Pi 5

```
Ollama (already know this)
├── nomic-embed-text (embeddings)
└── llama3.2:1b or phi4-mini (generation)

LanceDB (new - vector storage)
├── No daemon required
├── ~50MB RAM
└── Stores vectors as Parquet files

Python glue script
├── Watches memory/ folder
├── Chunks + embeds new files
├── Provides search endpoint
```

### Chunking Strategy for Memory Files

Your memory files have clear structure — use it:

```python
# Good chunking for your files:
# 1. Split by H2 headers (## sections)
# 2. Keep metadata (date, filename) attached
# 3. Overlap slightly for context

# Example: 2026-02-07.md becomes chunks like:
# - "2026-02-07 | Spare Capacity Work | Quota check: all limits..."
# - "2026-02-07 | Daily Research: Social Media | Topic selected..."
```

**Chunk size:** 500-1000 tokens works well for journal-style content.

## Practical Applications

1. **"What did I work on last week?"** → Retrieves daily files, summarizes activity
2. **"What do I know about Home Assistant?"** → Finds Feb 3 research + any mentions
3. **"Show me code changes I made to investor-tracker"** → Finds spare capacity commits
4. **"What's the password for Uptime Kuma?"** → Retrieves from MEMORY.md
5. **Mission Control search bar** → Actually works semantically, not just keyword match

### Integration Points

1. **ClawdBot native** — Could add `memory_search` that uses local embeddings
2. **Mission Control API** — Add `/api/search` endpoint that queries LanceDB
3. **CLI tool** — `rag-search "query"` for terminal use
4. **Heartbeat use** — "What should I follow up on today?"

## Implementation Path

### Phase 1: Minimal Viable RAG (1-2 hours)

```bash
# 1. Install Ollama embedding model
ollama pull nomic-embed-text

# 2. Install Python dependencies
pip install lancedb sentence-transformers

# 3. Create indexer script
# (see sample script below)

# 4. Index memory files
python index_memories.py ~/clawd/memory/

# 5. Query
python search_memories.py "thermal throttling"
```

### Phase 2: Auto-Index on File Change (1 hour)

```bash
# Use inotifywait to watch for new/modified files
apt install inotify-tools

# Watch script that triggers re-indexing
```

### Phase 3: Integrate with Mission Control (2-3 hours)

```javascript
// Add to Mission Control's /api/search
// Python subprocess or HTTP to local embeddings server
```

## Sample Code: Minimal RAG

```python
#!/usr/bin/env python3
"""index_memories.py - Index memory files into LanceDB using Ollama embeddings"""

import os
import glob
import json
import subprocess
import lancedb

# Connect to LanceDB (creates if not exists)
db = lancedb.connect("~/clawd/memory/.lancedb")

def get_embedding(text: str) -> list[float]:
    """Get embedding from Ollama"""
    result = subprocess.run(
        ["ollama", "embeddings", "nomic-embed-text"],
        input=text,
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout)["embedding"]

def chunk_file(filepath: str) -> list[dict]:
    """Chunk a markdown file by H2 headers"""
    with open(filepath) as f:
        content = f.read()
    
    filename = os.path.basename(filepath)
    chunks = []
    
    # Split by ## headers
    sections = content.split("\n## ")
    for i, section in enumerate(sections):
        if section.strip():
            chunks.append({
                "file": filename,
                "section": i,
                "text": section[:1000],  # Limit chunk size
            })
    return chunks

def index_all(memory_dir: str):
    """Index all markdown files"""
    files = glob.glob(f"{memory_dir}/**/*.md", recursive=True)
    
    all_chunks = []
    for f in files:
        chunks = chunk_file(f)
        for chunk in chunks:
            chunk["vector"] = get_embedding(chunk["text"])
            all_chunks.append(chunk)
    
    # Create or overwrite table
    db.create_table("memories", all_chunks, mode="overwrite")
    print(f"Indexed {len(all_chunks)} chunks from {len(files)} files")

if __name__ == "__main__":
    import sys
    index_all(sys.argv[1] if len(sys.argv) > 1 else "~/clawd/memory")
```

```python
#!/usr/bin/env python3
"""search_memories.py - Search indexed memories"""

import sys
import json
import subprocess
import lancedb

db = lancedb.connect("~/clawd/memory/.lancedb")
table = db.open_table("memories")

def get_embedding(text: str) -> list[float]:
    result = subprocess.run(
        ["ollama", "embeddings", "nomic-embed-text"],
        input=text,
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout)["embedding"]

def search(query: str, limit: int = 5):
    vector = get_embedding(query)
    results = table.search(vector).limit(limit).to_list()
    
    for r in results:
        print(f"\n📄 {r['file']} (section {r['section']})")
        print(f"   {r['text'][:200]}...")
        print(f"   Score: {r['_distance']:.4f}")

if __name__ == "__main__":
    search(" ".join(sys.argv[1:]))
```

## Resources

### Tutorials & Docs
- LanceDB Docs: https://lancedb.github.io/lancedb/
- Ollama Embeddings: https://ollama.com/blog/embedding-models
- RAG Best Practices: https://www.pinecone.io/learn/retrieval-augmented-generation/

### Related Tools
- **Khoj** — Self-hosted AI personal assistant with RAG (khoj.dev)
- **PrivateGPT** — Chat with your documents locally (privategpt.dev)
- **Danswer** — Open-source enterprise search + RAG (danswer.ai)

### Pi 5 Specific
- Ollama ARM64 builds work out of the box
- LanceDB has no native deps issues on ARM
- nomic-embed-text specifically tested on ARM64

## Cost Analysis

| Component | Cloud Cost | Local Cost |
|-----------|------------|------------|
| Embeddings | $0.0001/1K tokens (OpenAI) | Free (Ollama) |
| Vector DB | $25+/mo (Pinecone) | Free (LanceDB) |
| LLM | $0.002-0.015/1K tokens | Free (Ollama) |

**Savings:** ~$30-50/month for moderate use, plus complete privacy.

## Next Steps

1. **Install Ollama embedding model** (5 min)
   ```bash
   ollama pull nomic-embed-text
   ```

2. **Create minimal indexer script** (30 min)
   - Start with just `memory/*.md` files
   - Use simple H2 chunking

3. **Test with queries about past work** (15 min)
   - "What did I learn about Pi-hole?"
   - "Show thermal throttling discoveries"

4. **Add to Mission Control** (2-3 hours, optional)
   - Add search endpoint
   - Real-time results in UI

5. **Consider as ClawdBot skill** (future)
   - Could enable `memory_search` without OpenAI key
   - Would make all agents searchable locally

---

*Research conducted: February 8, 2026*
*Builds on: Ollama research (Feb 4), Mission Control project, memory file patterns*
