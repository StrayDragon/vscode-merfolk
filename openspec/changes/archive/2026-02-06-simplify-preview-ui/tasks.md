## 实施任务

### 阶段 1: 移除工具栏和简化布局

- [x] 移除 HTML 中的 toolbar div 元素
- [x] 移除相关的 toolbar CSS 样式
- [x] 移除 toolbar 按钮相关的 JavaScript 函数 (zoomIn, zoomOut, resetZoom, fitToScreen)
- [x] 调整 body 和 container 样式，移除 padding 和 margin
- [x] 设置 canvas 占满整个视口 (100vw x 100vh)
- [x] 确保无页面滚动条 (overflow: hidden)

### 阶段 2: 修改缩放交互 (滚轮直接缩放)

- [x] 修改 handleWheel 函数，移除 Ctrl 键检查
- [x] 确保滚轮事件直接触发缩放逻辑
- [x] 保持以鼠标位置为中心的缩放行为
- [x] 保持缩放范围限制 (0.3x - 3x)
- [x] 测试平滑的缩放过渡效果

### 阶段 3: 实现右键菜单

- [x] 添加 contextmenu 事件监听器
- [x] 阻止默认浏览器右键菜单
- [x] 创建自定义右键菜单 HTML 元素
- [x] 设计菜单样式 (VS Code 风格)
- [x] 添加 "Export SVG" 菜单项
- [x] 实现点击菜单项触发 exportSvg 函数
- [x] 实现点击菜单外部区域关闭菜单
- [x] 处理菜单边界 (防止菜单超出视口)

### 阶段 4: 保留和优化拖拽平移

- [x] 确保现有的拖拽平移功能正常工作
- [x] 保持 grab/grabbing 光标状态
- [x] 确保拖拽和右键菜单不冲突
- [x] 测试拖拽时不会触发右键菜单

### 阶段 5: 测试和验证

- [x] 验证工具栏已完全移除
- [x] 验证滚轮缩放工作正常 (无需 Ctrl)
- [x] 验证右键菜单显示和工作正常
- [x] 验证导出 SVG 功能正常
- [x] 验证拖拽平移功能正常
- [x] 验证无页面滚动条
- [x] 验证画布占满整个视口
- [x] 测试不同尺寸的 Mermaid 图表
- [x] 测试边界情况 (极小图表、极大图表)

### 阶段 6: 代码清理

- [x] 删除所有未使用的 CSS 样式
- [x] 删除所有未使用的 JavaScript 函数
- [x] 整理代码格式
- [x] 确保没有 console.log 调试代码
- [x] 更新相关注释
