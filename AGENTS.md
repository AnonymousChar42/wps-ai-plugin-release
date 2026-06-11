# WPS AI 插件 — 开发指南

> 本文档随仓库发布，所有开发者/AI 助手都应该遵守。

## WPS API 陷阱

### PPT 图表：MsoChart ≠ Excel Chart

PPT 图表的类型是 `Kso.MsoChart`（`lib.kso.d.ts` L2549），不是 Excel 的 `Chart`（`lib.et.d.ts` L5280）。

| | 错误（Excel API） | 正确（PPT MsoChart） |
|---|---|---|
| 数据注入 | `SeriesCollection.NewSeries()` | `ChartData.Workbook.ActiveSheet.Cells(r,c).Value` |
| 标题 | `ChartTitle.Text` | `ChartTitle.Caption` |
| 类型文件 | `lib.et.d.ts` | `lib.kso.d.ts` |

```typescript
// ✅ PPT 图表正确写法
const shape = slide.Shapes.AddChart(xlChartType, l, t, w, h)
const chart: any = shape.Chart  // MsoChart
const wb = chart.ChartData.Workbook
wb.ActiveSheet.Cells(1, 1).Value = '列名'
wb.ActiveSheet.Cells(2, 1).Value = '数据'
chart.HasTitle = true
chart.ChartTitle.Caption = '标题'
```

### API 文档查找顺序

1. `node_modules/et-jsapi-declare/lib.kso.d.ts` — PPT 形状/图表（`MsoChart` 在这里）
2. `node_modules/et-jsapi-declare/lib.et.d.ts` — Excel/WPS 表格（PPT 图表不要用这个）

### ⚠️ 新增面板/按钮必须改 4 个文件

WPS 加载项新增一个任务窗格按钮，需要同时修改以下 4 处，缺一不可：

| # | 文件 | 改什么 |
|---|------|--------|
| 1 | `public/ribbon.xml` | 注册 `<button>` 标签 |
| 2 | `src/components/ribbon.js` | `OnAction` case 分支（打开窗格）+ `GetImage` case 分支（图标） |
| 3 | `src/router/index.js` | 添加 `/pane-name` 路由 |
| 4 | `src/components/XxxPane.vue` | 实际窗格组件 |

**案例（2026-05-25）：** Phase 09 Excel Agent 完成后，发现 ribbon 上没有"AI生成表格"按钮。排查发现：
- `ribbon.js` 已有 `btnAgentPane` 处理代码 ✅
- `router` 已有 `/aipane` 但没有 `/agentpane` ❌
- `public/ribbon.xml` 完全不存在 ❌（PPT 有，Excel 是空壳忘了建）

修复：创建 `public/ribbon.xml` + 添加路由 + 补 `GetImage`。

### ⚠️ `isolatedModules` 下 interface 重导出必须用 `export type`

`shared/tsconfig.json` 启用了 `isolatedModules: true`，这意味着每个文件必须能被独立编译。当 `index.ts` 重导出一个 `interface` 时：

```typescript
// ❌ 错误 — Vite 会尝试在运行时解析 interface，失败
export { ExcelAdapter } from './excel-adapter'

// ✅ 正确
export type { ExcelAdapter } from './excel-adapter'
```

运行时错误：`does not provide an export named 'ExcelAdapter'`

## 项目约定

- 计划文档（`.planning/`）和代码注释使用中文
- 双适配器模式：SlideToolAdapter → WpsSlideAdapter + BrowserSlideAdapter
- 修改代码后：① vue-tsc --noEmit ② pnpm test
- 长任务：每完成一个 T 就 commit + 更新 PLAN.md
- 新增能力优先参考上游 PPT 设计规范

## 架构

```
apply_template → 18 种 SlideSpec type（15 文字 + 3 图表）
  图表 = 完整幻灯片（标题 + 副标题 + 图表 + 底部结论）
  坐标照抄 Mck engine.py ×0.75 (SW:960→720, all positions ×0.75)
```
