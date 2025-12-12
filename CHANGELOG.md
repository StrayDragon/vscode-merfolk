# Change Log

All notable changes to the "vscode-merfolk" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.5] - 2025-01-XX

### 🚨 Breaking Changes
- **简化语法**: 完全重新设计 MermaidChart 语法，提升易用性和直观性
- **移除章节语法**: 不再支持 `#section` 和 `:index` 语法，改用基于 ID 的引用
- **配置简化**: 移除复杂的 Markdown 相关配置选项

### ✨ New Features
- **基于 ID 的 Markdown 引用**: 使用 `<!-- merfolk@<id> -->` 注释标记 mermaid 块
- **新语法格式**:
  - `[MermaidChart: diagram.mmd]` - 直接引用 .mmd 文件
  - `[MermaidChart: docs.md@flowchart]` - 引用 markdown 文件中带 ID 的图表
- **友好错误处理**: 显示可用 ID 列表，提供详细的使用指导

### 🗑️ Removed
- 章节解析语法：`[MermaidChart: doc.md#section]`
- 索引用法：`[MermaidChart: doc.md:3]`
- 配置选项：`merfolk.markdown.enabled`, `merfolk.markdown.cacheSize`, `merfolk.markdown.parseOnSave`, `merfolk.markdown.headingLevels`
- 命令：`mermaidChart.previewMarkdown`, `mermaidChart.openFileAtSection`

### 📚 Migration Guide
如果你之前使用的是章节语法，请按以下步骤迁移：

1. **在 Markdown 文件中添加 ID 注释**：
   ```markdown
   <!-- merfolk@architecture -->
   ```mermaid
   graph TB
       A --> B
   ```
   ```

2. **更新引用语法**：
   - 旧：`[MermaidChart: docs.md#architecture]`
   - 新：`[MermaidChart: docs.md@architecture]`

### 🛠️ Internal Changes
- 重构 MarkdownService，简化缓存架构
- 统一命令处理逻辑，减少复杂性
- 优化正则表达式性能
- 改进错误消息和用户体验
- 优化文件路径解析算法，支持更复杂的相对路径
- 改进错误处理，提供更友好的错误信息
- 重构代码架构，使用依赖注入模式

### Fixed
- 修复大文件解析时的性能问题
- 改进缓存失效机制，确保数据一致性

## [0.0.4] - 2024-XX-XX

- Initial release