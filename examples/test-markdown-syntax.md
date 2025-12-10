# MermaidChart 扩展语法测试

这个文档用于测试新的 `[MermaidChart:]` 扩展语法功能。

## 基础图表

这是一个基础的流程图：

```mermaid
flowchart TD
    A[开始] --> B[处理]
    B --> C[结束]
```

## 架构图

系统架构设计图：

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

## 测试链接

基础语法测试：

- `[MermaidChart:basic-flow.mmd]` - 引用普通mermaid文件
- `[MermaidChart:test-markdown-syntax.md]` - 引用整个markdown文档的第一个图表
- `[MermaidChart:test-markdown-syntax.md#架构图]` - 引用特定章节的图表
- `[MermaidChart:test-markdown-syntax.md#数据流程:1]` - 引用特定章节的第一个图表
- `[MermaidChart:test-markdown-syntax.md:2]` - 引用整个文档的第二个图表

## 复杂示例

### 子系统交互

```mermaid
graph LR
    subgraph 认证系统
        Auth[认证服务]
        Token[令牌管理]
    end

    subgraph 业务系统
        Order[订单服务]
        Payment[支付服务]
    end

    Auth --> Token
    Token --> Order
    Order --> Payment
```

### 错误处理流程

```mermaid
flowchart TD
    A[请求开始] --> B{检查参数}
    B -->|有效| C[处理业务]
    B -->|无效| D[返回错误]

    C --> E{处理成功?}
    E -->|是| F[返回结果]
    E -->|否| G[记录错误]
    G --> D

    D --> H[结束]
    F --> H
```