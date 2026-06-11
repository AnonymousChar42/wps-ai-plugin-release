/**
 * Excel Agent 模块导出
 */

// 适配器
export type { ExcelAdapter } from './excel-adapter'
export type {
  WorkbookInfo,
  RangeData,
  CellData,
  FormatOptions,
  ChartType,
  SortOrder,
} from './excel-adapter'

// 适配器实现
export { WpsExcelAdapter } from './adapters/wps-excel-adapter'
export { BrowserExcelAdapter } from './adapters/browser-excel-adapter'

// Agent
export { ExcelAgentLoop } from './agent-loop'

// 工具（供 AgentLoop 装配）
export { buildToolSchemas, executeTool } from './tools'

// Prompt
export { buildCorePrompt, buildReferenceSummary, buildReferencePrompt } from './prompts'

// Composables
export { createAgentState } from './composables/useAgent'
