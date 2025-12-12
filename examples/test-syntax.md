# MermaidChart 语法测试

这个文件用于测试新的 MermaidChart 语法。

## 架构图

<!-- merfolk@arch1 -->
```mermaid
graph TB
    subgraph 前端层
        UI[用户界面]
        App[应用逻辑]
    end

    subgraph 后端层
        API[API服务]
        DB[数据库]
    end

    UI --> App
    App --> API
    API --> DB
```

## 数据流程

<!-- merfolk@pipeline -->
```mermaid
sequenceDiagram
    participant U as 用户
    participant C as 客户端
    participant S as 服务器

    U->>C: 发送请求
    C->>S: HTTP请求
    S->>C: 返回数据
    C->>U: 显示结果
```

## 系统组件

<!-- merfolk@components -->
```mermaid
classDiagram
    class User {
        +id: string
        +name: string
        +login()
    }

    class Database {
        +connect()
        +query()
    }

    User --> Database : uses
```

## 测试链接

测试链接语法：

- 传统 .mmd 文件：[MermaidChart: ./test-diagram.mmd]
- 带 ID 的 markdown 引用：[MermaidChart: ./test-syntax.md@arch1]
- 带 ID 的 markdown 引用：[MermaidChart: ./test-syntax.md@pipeline]
- 带 ID 的 markdown 引用：[MermaidChart: ./test-syntax.md@components]
- 错误的 ID 引用：[MermaidChart: ./test-syntax.md@nonexistent]
- 缺少 ID 的 markdown 引用：[MermaidChart: ./test-syntax.md]