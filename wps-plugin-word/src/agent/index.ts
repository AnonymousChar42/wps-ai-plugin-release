/**
 * Word Agent 模块导出
 */

// 适配器接口
export type { WordAdapter } from './word-adapter'
export type {
  ParagraphInfo,
  TextFormatOptions,
  ParagraphFormatOptions,
  TableCellData,
} from './word-adapter'

// 适配器实现
export { WpsWordAdapter } from './adapters/wps-word-adapter'
export { BrowserWordAdapter } from './adapters/browser-word-adapter'

// Agent
export { WordAgentLoop } from './agent-loop'

// 工具（供 AgentLoop 装配）
export { buildToolSchemas, executeTool } from './tools'

// Prompt
export { buildCorePrompt, buildReferenceSummary, buildReferencePrompt } from './prompts'

// Composables
export { createAgentState } from './composables/useAgent'
