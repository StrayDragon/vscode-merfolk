# VSCode Merfolk 实现 Review 建议

## 主要问题
1) 相对路径解析逻辑失效：`resolvePath` 里对 `vscode.workspace.fs.stat` 没有 `await`，导致总是直接返回“相对当前文件”的路径，工作区根目录的兜底分支永远不会生效，`openFile` 会在文件存在于工作区根目录时仍然报“找不到”。位置：`src/services/fileService.ts:32`。
2) 语法高亮服务依赖注入与配置读取错误：构造函数使用了未注册的 token `IConfigService`，且读取配置时又把完整前缀 `merfolk.syntaxHighlight.*` 传给 `ConfigService.get`（该方法已经固定了 `merfolk` 根）。这会导致服务实例化时报错，配置永远回退到默认值。位置：`src/services/syntaxHighlightService.ts:46`、`src/services/syntaxHighlightService.ts:49`、`src/services/configService.ts:27`。
3) 语法高亮服务未被实例化：虽然注册了 `SyntaxHighlightService`，但没有任何地方 `resolve` 该服务，事件监听不会绑定，配置项形同虚设。位置：`src/extension.ts:45`、`src/extension.ts:50`。

## 中等问题
1) 预览列选择在 “beside” 模式下不随当前活动列变化：调用 `getViewColumn` 时没有传入 `activeEditor`，导致“beside”固定在第 2 列，而不是相对当前列。位置：`src/ui/preview/previewPanel.ts:16`、`src/ui/preview/previewPanel.ts:56`、`src/services/configService.ts:17`。
2) 内容模式下的 MermaidChart 链接解析基准可能错误：`_sourceInfo.filePath` 可能是相对路径，但被直接用于 `vscode.Uri.file`，会导致点击图内 `MermaidChart:` 链接时解析目录错误或找不到文件。位置：`src/ui/preview/previewPanel.ts:234`。
3) Webview 安全策略偏松：CSP 允许 `unsafe-inline`，且 Mermaid `securityLevel` 为 `loose`，在打开不可信工作区时可能引入 HTML 注入/渲染风险。位置：`src/ui/preview/previewPanel.ts:287`、`src/ui/preview/previewPanel.ts:385`。

## 次要问题
1) 预览面板恢复依赖“当前活动编辑器”：重启/热重载时如果没有活动编辑器，已打开的预览无法恢复。位置：`src/ui/preview/previewPanel.ts:88`。
2) 多根工作区路径选择不准确：`resolvePath` 只使用 `workspaceFolders[0]`，在多根工作区里可能解析到错误目录。位置：`src/services/fileService.ts:40`。
3) 语法高亮内容检测有重复条件：`text.includes('```mermaid')` 写了两次，虽不影响功能，但可读性偏低。位置：`src/services/syntaxHighlightService.ts:127`。

## 测试/验证缺口
- 当前没有自动化测试，建议至少补充：路径解析（相对路径/工作区根/多根工作区）、Markdown ID 提取、Webview 预览恢复与导出等关键路径的回归验证。

## 修复方案（可选组合）
1) 路径解析与多根工作区
方案 A：在 `resolvePath` 中对 `vscode.workspace.fs.stat` 使用 `await`，并在找不到时再尝试工作区根目录。
方案 B：使用 `vscode.workspace.getWorkspaceFolder(baseUri)` 获取所属根目录，再基于该根目录解析相对路径。
方案 C：在多根工作区中遍历 `workspaceFolders` 或使用 `workspace.findFiles` 搜索匹配文件名并择优返回。

2) 语法高亮服务注入与配置读取
方案 A：将构造函数注入 token 改为 `ConfigService`，并把配置键改为 `syntaxHighlight.*`（由 `ConfigService` 拼上 `merfolk` 根）。
方案 B：保留调用处的全路径配置键，调整 `ConfigService.get` 为 `workspace.getConfiguration().get(key, default)`。
方案 C：若功能只是占位，移除 `SyntaxHighlightService` 与相关配置项，避免误导用户。

3) 语法高亮服务未被实例化
方案 A：在 `activate` 中 `resolve('SyntaxHighlightService')` 以注册监听。
方案 B：仅在配置启用时创建（`IConfigService.get('syntaxHighlight.enabled')`），并在配置变更时动态创建/销毁。
方案 C：合并进 `ActivationProvider`，由 provider 统一初始化与清理。

4) 预览列选择行为
方案 A：调用 `getViewColumn(defaultColumnConfig, vscode.window.activeTextEditor)`，使 `beside` 相对当前列。
方案 B：在 `ConfigService.getPreviewColumn` 内接收 `activeEditor` 参数并集中处理。
方案 C：允许用户设置固定列（one/two/three）并在 UI 文档里说明该优先级。

5) 内容模式下 MermaidChart 链接解析
方案 A：在 `PreviewService` 中把 `sourceInfo.filePath` 存为绝对路径（基于 `documentUri` 解析）。
方案 B：在 `PreviewPanel._openMermaidChartFile` 使用 `FileService.resolvePath` 解析相对路径。
方案 C：通过 webview 消息把 `baseUri` 一并传回扩展侧，由扩展侧解析路径。

6) Webview 安全策略
方案 A：去掉 `unsafe-inline`，改为 nonce + 外部脚本注入；Mermaid `securityLevel` 设为 `strict`。
方案 B：保留 `loose`，但在不可信工作区时强制降级安全级别或禁用导出/链接。
方案 C：新增配置项允许用户显式选择安全级别，默认收紧。

7) 预览面板恢复
方案 A：保存 `documentUri`/`sourceInfo` 到 `webviewPanel.webview.state`，反序列化时恢复。
方案 B：在 `activate` 中缓存最近预览文档 URI，重启后自动恢复。
方案 C：若无法恢复，显示引导 UI 提示用户重新选择文件。

## 推荐最佳实践（建议采用）
1) 路径解析：`resolvePath` 内用 `await vscode.workspace.fs.stat` 检查；优先使用 `vscode.workspace.getWorkspaceFolder(baseUri)` 的根目录解析多根工作区；最后再回退到当前文件目录。
2) 语法高亮：注入 token 改为 `ConfigService`；读取配置键使用相对键（`syntaxHighlight.*`）；在 `activate` 中 `resolve('SyntaxHighlightService')` 以绑定监听。
3) 预览列：统一从 `ConfigService.getPreviewColumn(activeEditor)` 获取列；调用处传 `vscode.window.activeTextEditor` 保证 “beside” 正确相对。
4) 内容模式链接：在 `PreviewService` 解析 `filePath` 得到绝对路径并写入 `sourceInfo`，`PreviewPanel` 只消费绝对路径；避免在 Webview 侧自行拼路径。
5) Webview 安全：使用 nonce + 外部脚本加载，移除 `unsafe-inline`；Mermaid `securityLevel` 默认 `strict`，允许配置降级但在不可信工作区强制收紧。
6) 预览恢复：把 `documentUri`/`content`/`sourceInfo` 写入 `webview.state`，在 `deserializeWebviewPanel` 中优先从 state 恢复，找不到再提示用户选择文件。

## 测试验证方案
1) 手动验证（建议）
步骤：准备一个包含 `.mmd`、`.mermaid`、`.md` 的工作区，覆盖单根与多根。
场景：`[MermaidChart: ./diagram.mmd]` 与 `[MermaidChart: ./doc.md@id]` 均能打开与预览。
场景：相对路径在“同目录”和“工作区根目录”都能正确解析。
场景：多根工作区时，解析优先使用 `baseUri` 所属根目录。
场景：切换配置 `merfolk.preview.defaultColumn` 为 `beside/left/right/active`，验证列行为。
场景：SyntaxHighlight 启用/禁用时，Markdown 中 Mermaid 代码块高亮是否按配置生效。
场景：Webview 重载/重启后能恢复预览或显示合理提示。

2) 自动化建议（可选）
建议使用 `@vscode/test-electron` 编写扩展集成测试，覆盖预览面板、命令、CodeLens。
对 `MarkdownService`/`FileService` 增加单元测试（可用 `vitest` 或 `jest`），校验 ID 提取和路径解析。
CI 验证：保留 `pnpm run lint`、`pnpm run check-types`，并补充 `pnpm run test`。
