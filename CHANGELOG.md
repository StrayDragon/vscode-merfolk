# Change Log

All notable changes to the "vscode-merfolk" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.5] - 2025-01-XX

### Added
- **Markdown 章节支持**: 扩展 `[MermaidChart:]` 语法，支持从 Markdown 文件的特定章节提取 Mermaid 图表
- **新语法格式**:
  - `[MermaidChart: doc.md]` - 整个文档的第一个 mermaid 块
  - `[MermaidChart: doc.md#section-name]` - 特定章节的第一个 mermaid 块
  - `[MermaidChart: doc.md#section-name:2]` - 特定章节的第 N 个 mermaid 块
  - `[MermaidChart: doc.md:3]` - 整个文档的第 N 个 mermaid 块
- **智能导航**: 点击 Open 按钮可以直接导航到 Markdown 文件中的对应章节
- **性能优化**: 实现多层缓存架构，提升大文档解析性能
- **新增配置选项**:
  - `merfolk.markdown.enabled`: 启用/禁用 Markdown 支持
  - `merfolk.markdown.cacheSize`: 缓存大小配置
  - `merfolk.markdown.cacheTTL`: 缓存生存时间

### Improved
- 增强 CodeLens 提供器，支持扩展语法解析
- 优化文件路径解析算法，支持更复杂的相对路径
- 改进错误处理，提供更友好的错误信息
- 重构代码架构，使用依赖注入模式

### Fixed
- 修复大文件解析时的性能问题
- 改进缓存失效机制，确保数据一致性

## [0.0.4] - 2024-XX-XX

- Initial release