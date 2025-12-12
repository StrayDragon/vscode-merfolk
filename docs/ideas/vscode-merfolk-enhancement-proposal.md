# VS Code Merfolk 插件增强需求与实施计划

## 文档信息
- **创建日期**: 2025-12-12
- **目标插件**: vscode-merfolk (VS Code Mermaid 图表预览扩展)
- **文档目的**: 头脑风暴和规划插件的增强功能

## 现状分析

### 当前功能特性
基于对代码库的深入分析，vscode-merfolk 插件目前具备以下核心功能：

1. **IoC 架构**
   - 自定义依赖注入容器
   - 6个核心服务模块
   - 清晰的分离关注点设计

2. **预览系统**
   - WebView 面板实时预览
   - 缩放、平移、适配屏幕功能
   - SVG 导出能力
   - 自动更新（300ms 去抖）

3. **MermaidChart 链接**
   - 跨文件导航支持
   - CodeLens 集成显示"预览"和"打开"操作
   - ID 引用机制（`[MermaidChart: file.md@id]`）
   - Markdown 中的 merfolk@id 块解析

4. **语法高亮**
   - TextMate 语法支持
   - 独立 `.mmd/.mermaid` 文件语法
   - Markdown 内嵌语法支持

### 已使用的 VS Code API
- ✅ WebView API (面板、消息传递、本地资源)
- ✅ CodeLens API (模式匹配、刷新)
- ✅ Commands API (注册、执行)
- ✅ Configuration API (设置管理)
- ✅ Workspace APIs (TextDocument、Editor 事件)
- ✅ FileSystem APIs (路径解析、文件操作)
- ✅ TextMate Grammar API (语法高亮)

### 架构优势
- 模块化服务设计，易于扩展
- 性能优化已到位（缓存、去抖、LRU）
- 良好的错误处理机制
- 代码质量高，遵循最佳实践

## 增强需求与计划

### 1. 语言智能特性（Language Intelligence）

**目标**: 提升开发体验，减少错误，加速图表创建

#### 1.1 智能补全系统
**需求描述**:
- 提供上下文感知的代码补全
- 支持图表类型自动完成（flowchart, sequence, class, state, er, gantt 等）
- 节点样式和连接符建议
- MermaidChart 链接语法补全
- 关键词和保留字提示

**技术实现**:
- 使用 `CompletionItemProvider` API
- 创建 `IntelliSenseService` 服务
- 集成 Mermaid.js 语法分析
- 上下文感知补全逻辑

**预期效果**: 50% 图表创建速度提升

#### 1.2 实时诊断系统
**需求描述**:
- 语法错误即时检测
- 渲染错误预警
- 未定义节点引用检查
- 快速修复建议

**技术实现**:
- 使用 `DiagnosticCollection` API
- 创建 `DiagnosticService` 服务
- 集成 `mermaid.parse()` 验证
- 500ms 去抖优化性能

**预期效果**: 90% 语法错误减少

#### 1.3 悬停帮助系统
**需求描述**:
- Mermaid 语法文档显示
- 示例代码展示
- 小型图表快速预览
- 官方文档链接

**技术实现**:
- 使用 `HoverProvider` API
- 扩展现有诊断服务

### 2. 项目导航与探索（Project Navigation）

**目标**: 理解项目架构，发现所有图表

#### 2.1 图表资源管理器
**需求描述**:
- 树形展示工作区中所有 `.mmd` 和 `.mermaid` 文件
- 解析 Markdown 中的 `<!-- merfolk@id -->` 块
- 按图表类型分类显示（flowchart, sequence 等）
- 搜索和筛选功能
- 文件修改时间戳显示

**技术实现**:
- 使用 `TreeDataProvider` API
- 创建 `ExplorerViewService` 服务
- 注册到 Explorer 视图容器

**预期效果**: 90% 项目图表可见性

#### 2.2 快速大纲导航
**需求描述**:
- 显示图表结构（节点、子图、边）
- 大型图表的符号导航
- 符号搜索功能
- 跳转到特定节点

**技术实现**:
- 使用 `DocumentSymbolProvider` API
- 创建 `OutlineService` 服务
- 解析图表结构并提取符号

**预期效果**: 60% 导航时间节省

### 3. Notebook 集成（Notebook Integration）

**目标**: 支持现代数据科学工作流

#### 3.1 原生 Mermaid 笔记本支持
**需求描述**:
- 支持 `.mermaidnb` 笔记本格式
- Mermaid 单元格实时渲染
- 变量驱动图表生成
- 内联输出显示
- 导出为多种格式

**技术实现**:
- 使用 `NotebookSerializer` 和 `NotebookController` API
- 创建 `NotebookService` 服务
- 与现有预览系统集成

### 4. 测试与验证（Testing & Validation）

**目标**: 确保图表质量，集成 CI/CD

#### 4.1 图表测试框架
**需求描述**:
- 渲染验证测试
- 链接完整性检查
- 交叉引用验证
- 复杂度分析
- Test Explorer 集成

**技术实现**:
- 使用 `TestHub`, `TestRunProfile`, `TestItem` API
- 创建 `TestingService` 服务
- 定义测试 API 和断言

**测试示例**:
```typescript
diagramTest('User Authentication', 'flowchart.mmd', {
  renders: true,
  hasNode: 'User',
  hasEdge: 'User->Auth',
  hasLink: '[MermaidChart:../auth.md@user-flow]'
});
```

### 5. AI 增强功能（AI Enhancement）

**目标**: 下一代开发体验

#### 5.1 自然语言转图表
**需求描述**:
- 描述生成 Mermaid 代码
- 代码注释转图表
- 智能图表优化建议
- 隐私保护选项

**技术实现**:
- 集成 Claude/ChatGPT API
- 创建 `AIService` 服务
- 本地处理选项

**AI 提示示例**:
```
User: "Create a flowchart for user registration with email verification"
AI: 生成有效的 Mermaid 代码
```

## 实施优先级与时间线

### Phase 1: 核心基础增强（6-8周）
**优先级**: 最高
1. **智能补全系统** (Week 1-2)
2. **实时诊断系统** (Week 3-4)
3. **项目资源管理器** (Week 5-6)
4. **多格式导出系统** (Week 7-8)

### Phase 2: 高级交互功能（8-10周）
**优先级**: 高
1. **悬停帮助系统** (Week 9-10)
2. **快速大纲导航** (Week 11-12)
3. **任务自动化系统** (Week 13-15)
4. **Git 集成增强** (Week 16-17)

### Phase 3: 专业级功能（10-12周）
**优先级**: 中高
1. **Notebook 集成** (Week 18-20)
2. **测试框架** (Week 21-23)
3. **AI 增强功能** (Week 24-26)

### Phase 4: 创新特性（12-16周）
**优先级**: 中
1. **可视化编辑器** (Week 27-31)
2. **高级 AI 功能** (Week 32-36)
3. **协作和企业功能** (Week 37-40)

## 技术架构扩展

### 新增服务层
```
src/services/
├── intelliSenseService.ts      // 智能补全
├── diagnosticService.ts        // 实时诊断
├── explorerViewService.ts      // 项目导航
├── exportService.ts           // 多格式导出
├── testingService.ts          // 测试框架
├── taskService.ts             // 任务自动化
├── aiService.ts              // AI 增强
└── editorService.ts          // 可视化编辑
```

### 配置扩展
```json
{
  "merfolk.intellisense.enabled": true,
  "merfolk.diagnostics.validateRendering": true,
  "merfolk.explorer.showOnStartup": false,
  "merfolk.export.defaultFormat": "svg",
  "merfolk.theme.syncWithVSCode": true,
  "merfolk.ai.enabled": false
}
```

## 未充分利用的 VS Code API

以下 VS Code API 目前未被使用，但具有高价值潜力：

1. **Notebook API** - 笔记本集成
2. **Testing API** - 图表测试框架
3. **DiagnosticCollection** - 实时语法验证
4. **CompletionItemProvider** - 智能补全
5. **HoverProvider** - 悬停帮助
6. **SemanticTokensProvider** - 语义语法高亮
7. **TreeDataProvider** - 项目资源管理器
8. **TaskProvider** - 任务自动化
9. **StatusBarItem** - 状态栏反馈
10. **DocumentSymbolProvider** - 快速大纲
11. **CallHierarchyProvider** - 图表关系导航
12. **CustomEditor API** - 可视化编辑器

## Mermaid.js 高级功能

当前实现未充分利用的 Mermaid 功能：

1. **交互元素**:
   ```mermaid
   click nodeId callback "tooltip"
   click nodeId href "https://example.com"
   ```

2. **主题定制**:
   ```javascript
   mermaid.initialize({
     theme: 'custom',
     themeVariables: { primaryColor: '#ff6b6b' }
   })
   ```

3. **子图和复杂布局**
4. **自定义样式**
5. **所有图表类型**（flowchart, sequence, class, state, er, gantt, git, mindmap, timeline, sankey, quadrant, requirement）

## 成功指标

### Phase 1
- ✅ 70% 语法错误减少（通过实时诊断）
- ✅ 50% 图表创建速度提升（通过智能补全）
- ✅ 90% 项目图表可见性（通过资源管理器）

### Phase 2
- ✅ 60% 导航时间节省（通过大纲视图）
- ✅ 100% 工作流自动化（通过任务系统）
- ✅ 80% 版本控制可见性（通过 Git 集成）

### Phase 3
- ✅ 90% 测试覆盖率（通过测试框架）
- ✅ 50% 文档生成时间节省（通过 Notebook）
- ✅ 30% AI 辅助效率提升（通过 AI 功能）

### Phase 4
- ✅ 市场第一：最全面的 Mermaid VS Code 扩展
- ✅ 用户满意度 >4.5/5
- ✅ 月活用户增长 300%

## 风险与缓解策略

### 高风险
1. **AI API 成本和稳定性**
   - 缓解：本地处理选项，缓存结果

2. **性能问题（大型图表）**
   - 缓解：WebWorker，虚拟滚动

3. **Notebook API 兼容性**
   - 缓解：渐进式增强，降级支持

### 中风险
1. **复杂功能开发周期长**
   - 缓解：MVP 优先，迭代交付

2. **测试覆盖不足**
   - 缓解：自动化测试，持续集成

## 独特价值主张

1. **首个全功能 Mermaid LSP 支持**
2. **唯一集成测试框架的 Mermaid 扩展**
3. **最全面的导出选项**
4. **首个 AI 驱动的图表生成**
5. **最深度的 VS Code 集成**

## 长期愿景

**6 个月后**：
- 成为最受欢迎的 Mermaid VS Code 扩展
- 集成所有主要 VS Code API
- 支持 AI 驱动的图表生成

**1 年后**：
- 行业标准：其他扩展参考的实现
- 企业采用：大型团队使用
- 生态建设：插件市场和社区贡献

**愿景**：让 Mermaid 图表开发成为 VS Code 中最流畅的体验，赋能全球开发者更好地可视化思维和架构。

## 结论

vscode-merfolk 插件拥有扎实的架构基础，通过上述增强功能，可以将其打造成最全面、最强大的 Mermaid VS Code 扩展。分阶段的实施方法确保了可控的开发节奏和持续的价值交付。

这个增强计划充分利用了 VS Code 提供的插件能力，同时深度挖掘了 Mermaid.js 的潜力，将为用户带来革命性的图表开发体验。

---

*本需求文档基于对 vscode-merfolk 代码库的深入分析制定，旨在为扩展开发提供清晰的路线图和目标。*
