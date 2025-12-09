<div align="center">
  <img src="./icon.png" alt="Merfolk Icon" width="128" height="128" />

  <h1>Merfolk</h1>

  <p>
    <a href="https://github.com/straydragon/vscode-merfolk/actions/workflows/test.yml">
      <img src="https://github.com/straydragon/vscode-merfolk/actions/workflows/test.yml/badge.svg" alt="Test" />
    </a>
    <a href="https://github.com/straydragon/vscode-merfolk/actions/workflows/release.yml">
      <img src="https://github.com/straydragon/vscode-merfolk/actions/workflows/release.yml/badge.svg" alt="Release" />
    </a>
    <a href="https://open-vsx.org/extension/l8ng/vscode-merfolk"><img src="https://img.shields.io/open-vsx/v/l8ng/vscode-merfolk?label=Open%20VSX" alt="Open VSX" /></a>
  </p>
</div>

## 功能介绍

Merfolk 是一个轻量级的 Mermaid 功能增强的 VS Code 插件，让你在编辑器中直接预览和导航 Mermaid 图表。

### 实时预览图表

插件会在 VS Code 中创建一个专门的预览面板，显示当前打开的 `.mmd` 或 `.mermaid` 文件的图表。预览面板支持：

- 缩放功能：可以放大或缩小图表，方便查看大型图表的细节
- 平移功能：按住鼠标左键拖动，可以在预览中移动图表位置
- 自适应屏幕：自动调整图表大小以适应预览面板
- 实时更新：当你在编辑器中修改图表代码时，预览会自动刷新

预览面板默认在当前编辑器的旁边打开，你也可以在设置中配置它在其他位置显示。

### 跨文件图表导航

在任何类型的文件中，你都可以插入特殊格式的链接来引用 Mermaid 图表：

```
[MermaidChart: path/to/diagram.mmd]
```

插件会自动识别这种格式，并在链接旁边显示两个操作按钮：

- **Preview 按钮**：点击后在预览面板中查看图表
- **Open 按钮**：点击后打开图表文件

这种方式让你可以在文档、代码或其他文件中轻松引用和查看相关的流程图、架构图等。链接路径支持相对路径和绝对路径，插件会自动解析文件位置。

### 图表导出

预览面板提供了导出功能，可以将当前显示的图表保存为 SVG 格式的文件。导出的 SVG 文件可以在其他应用程序中使用或进一步编辑。

### 语法高亮

插件为 `.mmd` 和 `.mermaid` 文件提供完整的语法高亮，让图表代码更易读易懂。

## 工作原理

当你打开一个 Mermaid 文件时，插件会在预览面板中加载 Mermaid.js 渲染引擎，将你的图表代码转换为可交互的可视化图表。对于包含 `[MermaidChart:]` 链接的文件，插件会扫描整个文档并添加相应的操作按钮。

预览面板使用 WebView 技术实现，与 VS Code 主界面集成，提供流畅的用户体验。所有图表渲染都在本地进行，不依赖外部服务。
