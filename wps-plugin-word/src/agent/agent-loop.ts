/**
 * Word 智能体循环 — 薄封装
 *
 * 通过依赖注入将 Word 专用的 prompts / tools / adapter 装配到通用 AgentLoop。
 */

import type { AIRequestConfig } from '@wpsai/shared/types'
import type { ToolAdapter } from '@wpsai/shared/agent/tool-adapter'
import { AgentLoop } from '@wpsai/shared/agent/agent-loop'
import type { AgentLoopConfig } from '@wpsai/shared/agent/agent-loop'
import { getTheme } from '@wpsai/shared/agent/themes'
import type { Theme } from '@wpsai/shared/agent/themes'
import type { WordAdapter } from './word-adapter'
import {
  buildCorePrompt,
  buildReferenceSummary,
  buildReferencePrompt,
} from './prompts'
import { buildToolSchemas, executeTool } from './tools'

/**
 * Word 专用 AgentLoop
 */
export class WordAgentLoop extends AgentLoop {
  constructor(adapter: WordAdapter, aiConfig: AIRequestConfig, themeKey: string = 'business') {
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
        if (!info.count || info.count === 0) return '当前文档为空。'
        return `当前文档有 ${info.count} 个段落。`
      },
      describeAction: (name: string, args: Record<string, unknown>) => {
        switch (name) {
          case 'get_document_info':
            return '正在读取文档信息...'
          case 'get_paragraphs':
            return '正在读取段落列表...'
          case 'get_text':
            return `正在读取段落 ${args.paragraphIndex}...`
          case 'insert_text':
            return `正在插入文本...`
          case 'set_text':
            return `正在设置段落 ${args.paragraphIndex} 文本...`
          case 'format_text':
            return `正在格式化段落 ${args.paragraphIndex} 文字...`
          case 'format_paragraph':
            return `正在格式化段落 ${args.paragraphIndex} 段落...`
          case 'set_style':
            return `正在对段落 ${args.paragraphIndex} 应用样式"${args.styleName}"...`
          case 'create_table':
            return `正在创建 ${args.rows}×${args.cols} 表格...`
          case 'fill_table':
            return `正在填写表格 ${args.tableIndex}...`
          case 'find_replace':
            return `正在查找替换"${args.findText}"...`
          case 'insert_page_break':
            return '正在插入分页符...'
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
