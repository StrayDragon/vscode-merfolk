# Merfolk Extension Examples

This directory contains examples demonstrating all the features of the Merfolk VS Code extension.

## Directory Structure

### 01. Basic MMD Highlighting
**Location**: `01-basic-mmd-highlighting/`

Demonstrates syntax highlighting for standalone Mermaid files (`.mmd`, `.mermaid`).

- **basic-syntax.mmd** - Examples of basic Mermaid diagram types with proper syntax highlighting
- Open any `.mmd` file to see the syntax highlighting in action
- Use `Ctrl+Shift+V` to preview the diagrams

### 02. Multi-Language Support

#### 02A. MermaidChart References to MMD Files
**Location**: `02-multi-language-support/mermaidchart-references/`

Shows how to reference external Mermaid files using the `[MermaidChart: path]` syntax.

- **referencing-mmd-files.md** - Examples of referencing external `.mmd` files
- **subdir/advanced-flowchart.mmd** - Diagram in subdirectory for testing relative paths
- CodeLens provides "Preview" and "Open" actions for each reference

#### 02B. Markdown Inline Blocks
**Location**: `02-multi-language-support/markdown-inline-blocks/`

Demonstrates Mermaid diagrams embedded within Markdown files.

- **inline-mermaid-with-ids.md** - Multiple diagrams in a single Markdown file
- Shows how the extension detects and provides access to individual Mermaid blocks
- Each block can be previewed independently

### 03. Preview Features
**Location**: `03-preview-features/`

Showcases the capabilities of the Merfolk preview panel.

- **preview-panel-features.md** - Demonstrates:
  - Auto-update on file changes
  - Zoom and pan functionality
  - Interactive diagram elements
  - Export capabilities
  - Keyboard shortcuts

### 04. Advanced Examples
**Location**: `04-advanced-examples/`

Real-world, complex Mermaid diagram examples.

- **system-design.mmd** - Complex system architecture
- **microservices.mmd** - Microservices pattern
- **database-schema.mmd** - Entity relationships
- **ci-cd-pipeline.mmd** - DevOps workflows
- **state-machine.mmd** - State management
- And more...

## How to Use These Examples

### Opening Previews
- Open any file and press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)
- Click on CodeLens "Preview" buttons above `[MermaidChart: ...]` references

### Testing Syntax Highlighting
- Open `.mmd` or `.mermaid` files to see syntax highlighting
- Create new files to test the highlighting

### Testing MermaidChart References
- Open files containing `[MermaidChart: path]` links
- Use CodeLens actions to preview or open referenced files
- Test relative and absolute paths

### Configuring Preview Panel
- Change `merfolk.preview.defaultColumn` in settings to control where previews open
- Options: `beside`, `right`, `left`, `active`, `one`, `two`, `three`

## Extension Features Tested

These examples cover all major Merfolk features:
- ✅ Syntax highlighting for `.mmd` and `.mermaid` files
- ✅ Mermaid diagram preview in dedicated panel
- ✅ CodeLens integration for `[MermaidChart: path]` references
- ✅ Support for both external `.mmd` files and inline Markdown blocks
- ✅ Auto-updating previews with debouncing
- ✅ Zoom, pan, and export functionality
- ✅ Keyboard shortcuts and navigation

## Tips for Developers

- When adding new examples, use the existing folder structure
- Each feature should have at least one example
- Include comments explaining what is being tested
- Test both simple and complex scenarios
- Verify relative paths work correctly with subdirectories

---

**Last updated**: 2025-12-12
**Version**: v0.0.5