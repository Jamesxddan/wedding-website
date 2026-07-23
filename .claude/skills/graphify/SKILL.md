# graphify

Knowledge graph builder. Transforms codebases, docs, and media into interactive graphs.

## Activation

`/graphify`

## Input Types (Multimodal)

- Source code
- PDFs
- Markdown files
- Screenshots
- Images

## Outputs

- Interactive HTML graph
- Obsidian vault
- Wikipedia-style articles
- JSON graph
- SHA256 cache (incremental updates)

## Requirements

```bash
pip install graphifyy
graphify install
```

Requires Python 3.10+

## Performance

71.5x fewer tokens per query vs raw files — cache enables incremental graph updates without reprocessing.

## Usage

Run `/graphify` to build a knowledge graph of the current project. Outputs an interactive HTML visualization and Obsidian-compatible vault for navigation.
