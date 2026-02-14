---
name: jq
description: Command-line JSON processor. Extract, filter, transform JSON.
---

# jq

Command-line JSON processor for extracting, filtering, and transforming JSON.

## Installation

**macOS / Linux (Homebrew):**
```bash
brew install jq
```

**All platforms:** See [jqlang.org/download](https://jqlang.org/download/) for packages, binaries, and build instructions.

## Usage

```bash
jq '[filter]' [file.json]
cat file.json | jq '[filter]'
```

## Quick Reference

```bash
.key                    # Get key
.a.b.c                  # Nested access
.[0]                    # First element
.[]                     # Iterate array
.[] | select(.x > 5)    # Filter
{a: .x, b: .y}          # Reshape
. + {new: "val"}        # Add field
del(.key)               # Remove field
length                  # Count
[.[] | .x] | add        # Sum
keys                    # List keys
unique                  # Dedupe array
group_by(.x)            # Group
```

## Flags

`-r` raw output (no quotes) · `-c` compact · `-s` slurp into array · `-S` sort keys

## Examples

```bash
jq '.users[].email' data.json          # Extract emails
jq -r '.name // "default"' data.json   # With fallback
jq '.[] | select(.active)' data.json   # Filter active
jq -s 'add' *.json                     # Merge files
jq '.' file.json                       # Pretty-print
```

## When to Use

- Extracting specific fields from JSON files or API responses
- Filtering JSON arrays based on conditions
- Transforming JSON structure (reshaping, renaming keys)
- Pretty-printing JSON for readability
- Combining or merging multiple JSON files
- Shell pipelines with JSON data (e.g., `curl ... | jq ...`)
- Quick ad-hoc queries on JSON logs or config files

## When NOT to Use

- **CSV/tabular data** → Use `csvkit`, `mlr` (miller), or `awk` instead
- **XML data** → Use `xmllint`, `xq`, or `xmlstarlet` instead
- **YAML data** → Use `yq` instead (similar syntax to jq)
- **Complex data pipelines** → Consider Python/Node for multi-step transformations
- **Binary data or non-JSON formats** → jq is JSON-only
- **Interactive exploration** → Consider `fx` or `jless` for TUI-based browsing
