# VSCode Merfolk 插件功能扩展头脑风暴

## 文档信息
- **创建日期**: 2025-12-12
- **目标插件**: vscode-merfolk (VS Code Mermaid 图表预览扩展)
- **文档目的**: 深度挖掘 VS Code 插件 API 能力，探索与 Mermaid 集成的创新功能

## 概述

本文档是对现有功能规划的补充，重点关注**尚未在现有文档中详细描述的 VS Code API 能力**，以及这些能力与 Mermaid 图表的创新集成方式。

### 与现有文档的关系
- `docs/feature-roadmap.md` - 已规划的 10 大类功能
- `docs/plan/vscode-merfolk-enhancement-proposal.md` - 详细增强提案
- **本文档** - 补充性头脑风暴，聚焦未充分探索的 VS Code API

---

## 新功能头脑风暴

### 一、语言服务增强 (Language Server Protocol)

#### 1.1 语义高亮 (Semantic Tokens)
**VS Code API**: `DocumentSemanticTokensProvider`
**描述**: 超越 TextMate 语法的智能语义高亮
**创新点**:
- 根据节点类型动态着色（开始节点、结束节点、决策节点）
- 高亮未使用的节点定义
- 循环引用可视化标记
- 子图层级颜色区分

#### 1.2 重命名支持 (Rename Provider)
**VS Code API**: `RenameProvider`
**描述**: 安全重命名节点 ID，自动更新所有引用
**创新点**:
- 跨文件重命名（MermaidChart 链接中的 ID）
- 重命名预览（显示所有受影响位置）
- 智能命名建议

#### 1.3 查找引用 (Reference Provider)
**VS Code API**: `ReferenceProvider`
**描述**: 查找节点在图表中的所有引用
**创新点**:
- 显示节点的入边和出边
- 跨文件引用追踪（MermaidChart 链接）
- 引用计数统计

#### 1.4 跳转到定义 (Definition Provider)
**VS Code API**: `DefinitionProvider`
**描述**: 从边的引用跳转到节点定义
**创新点**:
- 从 `A --> B` 跳转到 `B[节点B]` 定义
- 从 MermaidChart 链接跳转到目标文件
- 从 `classDef` 引用跳转到定义

#### 1.5 折叠范围 (Folding Range Provider)
**VS Code API**: `FoldingRangeProvider`
**描述**: 智能代码折叠
**创新点**:
- 子图 (subgraph) 自动折叠
- 样式定义块折叠
- 注释块折叠
- 按图表类型智能识别折叠区域

---

### 二、编辑器增强

#### 2.1 内联提示 (Inlay Hints)
**VS Code API**: `InlayHintsProvider`
**描述**: 在代码中显示内联信息
**创新点**:
- 显示节点的连接数量 `A[开始] // 3 connections`
- 显示子图包含的节点数
- 显示 MermaidChart 链接的目标文件状态（存在/缺失）
- 显示图表复杂度指标

#### 2.2 代码动作 (Code Actions)
**VS Code API**: `CodeActionProvider`
**描述**: 快速修复和重构操作
**创新点**:
- 自动修复语法错误
- 提取子图（选中节点 → 创建 subgraph）
- 反转边方向
- 添加缺失的节点定义
- 转换图表类型（flowchart ↔ graph）
- 优化布局方向建议

#### 2.3 文档链接 (Document Link Provider)
**VS Code API**: `DocumentLinkProvider`
**描述**: 使 MermaidChart 链接可点击
**创新点**:
- 直接在编辑器中点击跳转
- 悬停预览目标图表缩略图
- 断链检测和修复建议

#### 2.4 选择范围 (Selection Range Provider)
**VS Code API**: `SelectionRangeProvider`
**描述**: 智能扩展选择
**创新点**:
- 选择节点 → 扩展到包含的边 → 扩展到子图
- 语义感知的选择扩展

---

### 三、项目级功能

#### 3.1 工作区符号 (Workspace Symbol Provider)
**VS Code API**: `WorkspaceSymbolProvider`
**描述**: 全局搜索图表元素
**创新点**:
- 搜索所有 Mermaid 文件中的节点
- 按图表类型筛选
- 搜索 merfolk@id 标记

#### 3.2 调用层次 (Call Hierarchy Provider)
**VS Code API**: `CallHierarchyProvider`
**描述**: 图表引用关系导航
**创新点**:
- 显示 MermaidChart 链接的调用链
- 图表依赖关系可视化
- 循环引用检测

#### 3.3 类型层次 (Type Hierarchy Provider)
**VS Code API**: `TypeHierarchyProvider`
**描述**: 类图的继承关系导航
**创新点**:
- 显示类的继承链
- 接口实现关系
- 组合/聚合关系

---

### 四、视图与面板

#### 4.1 图表大纲视图 (Document Symbol + TreeView)
**VS Code API**: `DocumentSymbolProvider` + `TreeDataProvider`
**描述**: 侧边栏显示图表结构
**创新点**:
- 分层显示：图表类型 → 子图 → 节点 → 边
- 点击跳转到定义
- 拖拽重排节点顺序
- 显示节点连接数和复杂度

#### 4.2 图表资源管理器 (Activity Bar View)
**VS Code API**: `TreeDataProvider` + `ViewContainer`
**描述**: 专属侧边栏视图
**创新点**:
- 工作区所有 Mermaid 文件树
- Markdown 中的 merfolk@id 块索引
- 按图表类型分组
- 快速预览和编辑
- 批量操作（导出、验证）

#### 4.3 图表关系图 (WebView)
**VS Code API**: `WebviewPanel`
**描述**: 可视化 MermaidChart 链接关系
**创新点**:
- 用 Mermaid 图表展示图表间的引用关系
- 交互式导航
- 孤立图表检测

#### 4.4 图表统计面板 (WebView)
**VS Code API**: `WebviewPanel`
**描述**: 项目图表统计信息
**创新点**:
- 图表类型分布
- 复杂度分析
- 节点/边数量统计
- 最近修改的图表

---

### 五、状态栏与通知

#### 5.1 图表状态栏 (Status Bar)
**VS Code API**: `StatusBarItem`
**描述**: 状态栏显示当前图表信息
**创新点**:
- 当前图表类型图标
- 节点/边数量
- 语法状态（有效/错误）
- 点击快速预览
- 复杂度警告

#### 5.2 进度指示 (Progress)
**VS Code API**: `Progress`
**描述**: 长时间操作进度显示
**创新点**:
- 批量导出进度
- 大型图表渲染进度
- 验证进度

---

### 六、任务与自动化

#### 6.1 图表任务 (Task Provider)
**VS Code API**: `TaskProvider`
**描述**: 自定义任务类型
**创新点**:
- `mermaid: validate` - 验证所有图表
- `mermaid: export` - 批量导出
- `mermaid: lint` - 代码风格检查
- `mermaid: stats` - 生成统计报告
- 集成到 VS Code 任务系统

#### 6.2 问题匹配器 (Problem Matcher)
**VS Code API**: `contributes.problemMatchers`
**描述**: 解析 Mermaid 错误输出
**创新点**:
- 自动解析 mermaid-cli 输出
- 错误跳转到源文件
- 与任务系统集成

---

### 七、测试集成

#### 7.1 图表测试框架 (Testing API)
**VS Code API**: `TestController`, `TestRunProfile`
**描述**: 图表验证测试
**创新点**:
- 渲染测试（图表能否正确渲染）
- 链接完整性测试（MermaidChart 链接是否有效）
- 快照测试（图表输出对比）
- 复杂度阈值测试
- Test Explorer 集成

#### 7.2 覆盖率显示 (Test Coverage)
**VS Code API**: `TestCoverage`
**描述**: 显示图表测试覆盖
**创新点**:
- 标记已测试/未测试的图表
- 覆盖率报告

---

### 八、调试集成

#### 8.1 Mermaid 调试器 (Debug Adapter)
**VS Code API**: `DebugAdapterDescriptorFactory`
**描述**: 图表渲染调试
**创新点**:
- 逐步渲染预览
- 解析过程可视化
- 错误断点
- 变量检查（节点、边、样式）

#### 8.2 执行流程可视化
**VS Code API**: `Debug Session` 监听
**描述**: 将代码执行路径转换为 Mermaid 图
**创新点**:
- 实时生成调用栈时序图
- 函数调用流程图
- 性能热点标记

---

### 九、Notebook 集成

#### 9.1 Mermaid Notebook
**VS Code API**: `NotebookSerializer`, `NotebookController`
**描述**: 原生 Mermaid 笔记本支持
**创新点**:
- `.mermaidnb` 文件格式
- 单元格实时渲染
- Markdown + Mermaid 混合
- 变量驱动图表（从数据生成图表）
- 导出为文档

#### 9.2 Jupyter 集成
**VS Code API**: Notebook Renderer
**描述**: Jupyter 中的 Mermaid 渲染
**创新点**:
- `%%mermaid` magic command 支持
- 与 Python 数据集成
- 动态图表生成

---

### 十、自定义编辑器

#### 10.1 可视化图表编辑器 (Custom Editor)
**VS Code API**: `CustomEditorProvider`
**描述**: 所见即所得的图表编辑
**创新点**:
- 拖拽式节点编辑
- 双向同步（代码 ↔ 可视化）
- 节点属性面板
- 样式编辑器
- 布局优化工具

#### 10.2 图表比较编辑器 (Custom Diff Editor)
**VS Code API**: `CustomEditorProvider` (diff)
**描述**: 可视化图表差异
**创新点**:
- 并排显示两个版本的图表
- 高亮变化的节点和边
- 合并冲突解决

---

### 十一、源代码管理集成

#### 11.1 Git 图表生成
**VS Code API**: `SourceControl` + Git API
**描述**: 从 Git 历史生成图表
**创新点**:
- 分支拓扑图自动生成
- 提交历史时间线
- 贡献者关系图
- PR/MR 流程图

#### 11.2 图表版本对比
**VS Code API**: `SourceControl` + Diff
**描述**: 图表的 Git 差异可视化
**创新点**:
- 显示图表的历史版本
- 可视化差异（新增/删除/修改的节点）
- 时间线浏览

---

### 十二、远程与协作

#### 12.1 实时协作 (Live Share 集成)
**VS Code API**: Live Share API
**描述**: 多人实时编辑图表
**创新点**:
- 光标位置同步
- 编辑冲突处理
- 协作者标识
- 实时预览同步

#### 12.2 图表评论 (Comments API)
**VS Code API**: `CommentController`
**描述**: 在图表上添加评论
**创新点**:
- 节点级评论
- 代码审查集成
- 评论线程
- @提及支持

---

### 十三、AI 增强功能

#### 13.1 自然语言生成
**描述**: 从描述生成 Mermaid 代码
**创新点**:
- 集成 Claude/GPT API
- 上下文感知（理解项目结构）
- 迭代优化
- 本地 LLM 支持

#### 13.2 图表解释
**描述**: AI 解释复杂图表
**创新点**:
- 生成图表描述
- 识别潜在问题
- 优化建议

#### 13.3 代码到图表
**描述**: 从代码自动生成架构图
**创新点**:
- 分析代码结构
- 生成类图、流程图
- 增量更新

---

### 十四、导出与发布

#### 14.1 多格式导出增强
**描述**: 扩展导出能力
**创新点**:
- PNG/JPEG（高分辨率）
- PDF（矢量）
- HTML（交互式）
- Markdown（嵌入式）
- PowerPoint/Keynote
- Confluence/Notion 格式

#### 14.2 图表发布
**描述**: 一键发布到云端
**创新点**:
- 发布到 Mermaid Chart
- 生成分享链接
- 嵌入代码生成
- 版本管理

---

### 十五、性能与可访问性

#### 15.1 大型图表优化
**描述**: 处理复杂图表
**创新点**:
- 虚拟滚动
- 渐进式渲染
- 节点懒加载
- 缓存优化

#### 15.2 可访问性增强
**描述**: 无障碍支持
**创新点**:
- 屏幕阅读器支持
- 键盘导航
- 高对比度主题
- ARIA 标签

---

## 优先级建议

### 第一优先级（高价值 + 低复杂度）
1. 语义高亮 (Semantic Tokens)
2. 折叠范围 (Folding Range)
3. 文档链接 (Document Link)
4. 状态栏信息 (Status Bar)
5. 代码动作 (Code Actions)

### 第二优先级（高价值 + 中等复杂度）
1. 重命名支持 (Rename Provider)
2. 查找引用 (Reference Provider)
3. 图表大纲视图 (Document Symbol)
4. 内联提示 (Inlay Hints)
5. 任务系统 (Task Provider)

### 第三优先级（高价值 + 高复杂度）
1. 测试框架 (Testing API)
2. 可视化编辑器 (Custom Editor)
3. Notebook 集成
4. AI 功能
5. 实时协作

---

## 后续建议

1. 根据团队资源和用户反馈确定功能优先级
2. 选择 3-5 个功能进行详细技术设计
3. 为每个选定功能创建 `docs/plan/` 下的实施计划文档
