# Merfolk - 极简 Mermaid 图表示预览扩展

Merfolk 是一个轻量级的 VS Code 扩展，专注于为 Mermaid 图表提供简洁、快速的预览功能。与其他 Mermaid 扩展不同，Merfolk 追求极简设计，无需外部依赖，启动速度快，为开发者提供纯净的图表示体验。

## 主要功能

### 专用预览面板
- 打开 `.mmd` 或 `.mermaid` 文件后，使用 `Ctrl+Shift+V`（Mac 上为 `Cmd+Shift+V`）快速打开专用预览面板
- 预览面板支持多种位置配置（当前编辑器旁边、最左侧、最右侧等）
- 当切换到其他 Mermaid 文件时，预览面板会自动更新

### 内联预览（Markdown 文件）
- 在 Markdown 文件中使用 `Ctrl+Shift+V` 快速切换 Mermaid 图表的内联预览
- 适合在编写技术文档时即时查看图表效果

### MermaidChart 链接导航
Merfolk 的核心特性：支持在图表中创建指向其他 Mermaid 文件的链接，实现跨文件的图表导航。

```mermaid
flowchart TD
    A[开始项目] --> B[查看架构图]
    B --> C[<a href="MermaidChart:architecture/system-design.mmd">系统架构</a>]
    C --> D[<a href="MermaidChart:workflows/ci-cd.mmd">CI/CD 流程</a>]
```

- 支持 HTML 链接格式：`<a href="MermaidChart:path/to/file.mmd">链接文本</a>`
- 在任何支持的文件类型中，Merfolk 都会检测 MermaidChart 链接并显示 CodeLens 操作
- 点击 "Preview" 直接在新面板中打开目标图表
- 点击 "Open File" 打开对应的源文件

### 语法高亮
- 内置 Mermaid 语法高亮支持
- 支持 `.mmd` 和 `.mermaid` 文件扩展名

## 为什么选择 Merfolk？

### 与官方 Mermaid Preview 扩展的区别

| 特性 | Merfolk | 官方 Mermaid Preview |
|------|---------|---------------------|
| 启动速度 | 极快（无外部依赖） | 较慢（依赖 Mermaid.js 库） |
| 功能设计 | 极简，专注预览 | 功能丰富但复杂 |
| 跨文件导航 | 原生支持 MermaidChart 链接 | 不支持 |
| 内存占用 | 低 | 高 |
| 内联预览 | 支持 | 不支持 |
| 自定义配置 | 面板位置等必要选项 | 大量可配置项 |

### 设计理念

**轻量优先**：Merfolk 不包含不必要的功能，核心代码量小，启动速度快。预览功能直接使用 VS Code 的 Webview API，不引入额外的 Mermaid.js 依赖。

**导航优先**：通过 MermaidChart 链接，可以将复杂的系统设计拆分为多个相关联的图表，在不同视图间快速切换，特别适合大型项目的架构文档。

**体验优先**：一键预览、自动更新、简洁界面，让开发者可以专注于图表本身而非工具操作。

## 安装

### 方法一：VSIX 安装包
1. 从 [GitHub Releases](https://github.com/straydragon/vscode-merfolk/releases) 下载最新的 `.vsix` 文件
2. 在 VS Code 中按 `Ctrl+Shift+P`，输入 "Extensions: Install from VSIX..."
3. 选择下载的 VSIX 文件完成安装

### 方法二：VS Code 扩展市场
未来将在 VS Code 扩展市场发布，敬请期待。

## 快速开始

1. 安装 Merfolk 扩展
2. 创建一个新的 `.mmd` 文件
3. 输入 Mermaid 图表代码
4. 按 `Ctrl+Shift+V` 打开预览
5. 开始绘制！

## 示例

查看 `examples` 目录获取更多示例：
- `examples/basic/` - 基础图表示例（流程图、序列图、类图）
- `examples/advanced/` - 高级图表示例（微服务架构、状态机）
- `examples/workflow/` - 工作流示例（重点展示 MermaidChart 链接功能）
- `examples/architecture/` - 架构设计示例（系统设计、数据库 ER 图）

## 配置

通过 VS Code 设置可以自定义：

- `merfolk.preview.defaultColumn` - 预览面板的默认打开位置
  - `beside`：当前编辑器旁边（默认）
  - `right`：最右侧
  - `left`：最左侧
  - `active`：当前编辑器位置
  - `one` / `two` / `three`：指定编辑器列

- `merfolk.inlinePreview.defaultColumn` - 内联预览的默认打开位置

## 快捷键

- `Ctrl+Shift+V`（Mac：`Cmd+Shift+V`）- 打开预览（根据文件类型自动选择面板或内联）

## 开发

```bash
# 安装依赖
just install

# 开发模式（监视文件变化）
just

# 构建
just build

# 代码检查
just lint
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

详见 [CHANGELOG.md](CHANGELOG.md)
