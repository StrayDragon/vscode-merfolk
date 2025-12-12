# MermaidChart References to .mmd Files

This example demonstrates how to use `[MermaidChart: path]` syntax to reference external `.mmd` files.

## Basic Reference
[MermaidChart:../01-basic-mmd-highlighting/basic-syntax.mmd]

## Reference with Subdirectory
Create a subdirectory with additional diagrams:
[MermaidChart:subdir/advanced-flowchart.mmd]

## Reference with Description
You can add descriptions to your links:
See [MermaidChart:../01-basic-mmd-highlighting/basic-syntax.mmd] for basic syntax examples.

## Multiple References in One Document

1. First diagram: [MermaidChart:../01-basic-mmd-highlighting/basic-syntax.mmd]
2. Another example: [MermaidChart:../01-basic-mmd-highlighting/another-example.mmd]

## CodeLens Features

When you open this file in VS Code with the Merfolk extension:
- Each `[MermaidChart: ...]` link will show CodeLens actions
- "Preview" button opens the referenced diagram in a preview panel
- "Open" button opens the referenced file in the editor

## Supported File Types

The extension supports referencing:
- `.mmd` files
- `.mermaid` files
- `.md` files (with Mermaid blocks and IDs)