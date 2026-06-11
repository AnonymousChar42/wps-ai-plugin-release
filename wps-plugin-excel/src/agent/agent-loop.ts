/**
 * Excel 智能体循环 — 薄封装
 *
 * 通过依赖注入将 Excel 专用的 prompts / tools / adapter 装配到通用 AgentLoop。
 */

import type { AIRequestConfig } from '@wpsai/shared/types'
import type { ToolAdapter } from '@wpsai/shared/agent/tool-adapter'
import { AgentLoop } from '@wpsai/shared/agent/agent-loop'
import type { AgentLoopConfig } from '@wpsai/shared/agent/agent-loop'
import { getTheme } from '@wpsai/shared/agent/themes'
import type { Theme } from '@wpsai/shared/agent/themes'
import type { ExcelAdapter } from './excel-adapter'
import {
  buildCorePrompt,
  buildReferenceSummary,
  buildReferencePrompt,
} from './prompts'
import { buildToolSchemas, executeTool } from './tools'

/**
 * Excel 专用 AgentLoop
 */
export class ExcelAgentLoop extends AgentLoop {
  constructor(adapter: ExcelAdapter, aiConfig: AIRequestConfig, themeKey: string = 'business') {
    const theme = getTheme(themeKey)

    const config: AgentLoopConfig = {
      adapter: adapter as unknown as ToolAdapter,
      aiConfig,
      themeKey,
      buildCorePrompt: (t: Theme) => buildCorePrompt(t),
      buildReferenceSummary: (t: Theme) => buildReferenceSummary(t),
      buildReferencePrompt: (t: Theme) => buildReferencePrompt(t),
      buildToolSchemas: () => buildToolSchemas(),
      executeTool: (name: string, args: Record<string, unknown>) =>
        executeTool(name, args, adapter),
      buildDocumentSummary: (info) => {
        if (!info.count || info.count === 0) return '当前工作簿为空。'
        return `当前工作簿有 ${info.count} 个工作表。`
      },
      describeAction: (name: string, args: Record<string, unknown>) => {
        switch (name) {
          case 'get_workbook_info':
            return '正在读取工作簿信息...'
          case 'get_range':
            return `正在读取 ${args.worksheet} 的 ${args.range}...`
          case 'set_value':
            return `正在设置 ${args.cell} = ${args.value}`
          case 'set_formula':
            return `正在设置 ${args.cell} 公式`
          case 'format_range':
            return `正在格式化 ${args.range}`
          case 'create_table':
            return `正在创建表格（表头: ${(args.headers as string[])?.join(', ')}）`
          case 'add_chart':
            return `正在创建${args.chartType}图表`
          case 'merge_cells':
            return `正在合并 ${args.range}`
          case 'sort_range':
            return `正在排序 ${args.range}`
          case 'done':
            return '正在完成任务...'
          default:
            return `正在执行：${name}`
        }
      },
    }

    super(config)
  }
}
