## Why

当前 Mermaid 预览面板顶部有一个工具栏，包含多个按钮（Zoom In/Out, Reset, Fit to Screen, Export SVG）。这种设计在屏幕空间有限时会占用宝贵的垂直空间。同时，缩放操作需要按住 Ctrl+滚轮，不够直观。

目标是将预览界面简化为一个纯净的画布，让用户专注于图表内容本身。

## What Changes

1. **移除顶部工具栏** - 删除所有工具栏按钮（Zoom In/Out, Reset, Fit to Screen, Export SVG）

2. **滚轮直接缩放** - 无需按住 Ctrl，直接滚动鼠标滚轮即可 zoom

3. **添加右键菜单** - 在画布上右键点击弹出菜单，包含 "Export SVG" 选项

4. **全画布布局** - 整个面板都是画布区域，无页面滚动，无内边距

5. **保留拖拽平移** - 保持现有的拖拽移动功能

## Capabilities

### New Capabilities
- `preview-canvas-ui`: 简化的预览画布界面，专注图表内容展示

### Modified Capabilities
- `mermaid-preview`: 更新预览面板的 UI 布局和交互方式

## Impact

- **受影响文件**: `src/ui/preview/previewPanel.ts` 中的 HTML 模板和样式
- **用户体验**: 更简洁的界面，更直观的缩放操作
- **功能保留**: 所有原有功能（缩放、平移、导出）仍然可用，只是交互方式改变
