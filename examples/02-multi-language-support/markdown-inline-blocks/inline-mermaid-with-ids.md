# Inline Mermaid Blocks with IDs

This example demonstrates using Mermaid diagrams within Markdown files with identifiable IDs for reference.

## First Diagram: User Login Flow
```mermaid
flowchart LR
    A[User] --> B[Login Page]
    B --> C[Credentials]
    C --> D{Valid?}
    D -->|Yes| E[Dashboard]
    D -->|No| B
```
*Diagram ID: login-flow*

## Second Diagram: API Request Flow
```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Database

    Client->>API: POST /data
    API->>Database: Insert record
    Database-->>API: Success
    API-->>Client: 201 Created
```
*Diagram ID: api-flow*

## Third Diagram: System Architecture
```mermaid
graph TB
    subgraph "Frontend"
        A[React App]
        B[Vue App]
    end

    subgraph "Backend"
        C[Node.js API]
        D[Python API]
    end

    subgraph "Database"
        E[PostgreSQL]
        F[MongoDB]
    end

    A --> C
    B --> D
    C --> E
    D --> F
```
*Diagram ID: system-arch*

## Referencing These Diagrams

To reference specific diagrams in this file:
- Use the MermaidChart syntax with file path and optional identifier
- The extension will scan the file for Mermaid blocks
- Each block can be accessed via its position or ID

Example reference from another file:
[MermaidChart:inline-mermaid-with-ids.md] - Will show the first diagram
[MermaidChart:inline-mermaid-with-ids.md#login-flow] - Will show the login flow diagram (if supported)