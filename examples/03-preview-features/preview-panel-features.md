# Preview Panel Features

This file demonstrates the various features of the Merfolk preview panel.

## Open Preview

To open the preview panel:
- Use the command `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)
- Or run the command: `Mermaid: Open Preview`

## Features Demonstrated

### 1. Auto-update
```mermaid
flowchart TD
    A[Edit Diagram] --> B[Save File]
    B --> C[Preview Updates Automatically]
    C --> D[Debounced Updates]
```

### 2. Zoom and Pan
```mermaid
mindmap
  root((Preview Features))
    Zoom
      Mouse Wheel
      Buttons
      Keyboard Shortcuts
    Pan
      Click and Drag
      Navigation Controls
    Export
      PNG
      SVG
      PDF
```

### 3. Interactive Elements
```mermaid
graph TD
    A[Click Me] --> B{Did you click?}
    B -->|Yes| C[Thanks!]
    B -->|No| D[Try Again]
    D --> A
```

### 4. Complex Diagram with Styling
```mermaid
graph LR
    subgraph "Development Workflow"
        A[Code] --> B[Build]
        B --> C[Test]
        C --> D[Deploy]
    end

    subgraph "Tools"
        E[VS Code]
        F[Git]
        G[CI/CD]
    end

    A -.-> E
    C -.-> F
    D -.-> G

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style D fill:#9f9,stroke:#333,stroke-width:2px
```

## Preview Settings

Configure preview behavior in VS Code settings:
- `merfolk.preview.defaultColumn`: Controls where the preview opens
- Options: `beside`, `right`, `left`, `active`, `one`, `two`, `three`

## Keyboard Shortcuts in Preview

- `Ctrl++` (Cmd++): Zoom in
- `Ctrl+-` (Cmd+-): Zoom out
- `Ctrl+0` (Cmd+0): Reset zoom
- `Arrow Keys`: Pan the diagram
- `Escape`: Close preview