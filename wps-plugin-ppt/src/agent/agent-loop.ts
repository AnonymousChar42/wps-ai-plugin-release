/**
 * PPT 智能体循环 — 薄封装
 *
 * 通过依赖注入将 PPT 专用的 prompts / tools / adapter 装配到通用 AgentLoop。
 * 本文件不再包含循环逻辑，仅负责配置组装。
 *
 * Phase 08: 核心逻辑已迁移到 @wpsai/shared/agent/agent-loop.ts
 */

import type { AIRequestConfig } from '@wpsai/shared/types'
import type { AgentStep, AgentResult } from '@wpsai/shared/types/agent'
import type { ToolAdapter, ToolResult, DocumentInfo } from '@wpsai/shared/agent/tool-adapter'
import { AgentLoop } from '@wpsai/shared/agent/agent-loop'
import type { AgentLoopConfig, AgentRunOptions } from '@wpsai/shared/agent/agent-loop'
import { getTheme } from '@wpsai/shared/agent/themes'
import type { Theme } from '@wpsai/shared/agent/themes'
import type { SlideToolAdapter } from './slide-tool-adapter'
import type { ToolSchema, ChatMessage } from '@wpsai/shared/agent/types'
import {
  buildCorePrompt,
  buildReferenceSummary,
  buildReferencePrompt,
} from './prompts'
import { buildToolSchemas, executeTool } from './tools'

/** 生成 PPT 文档状态摘要 */
function buildPptDocumentSummary(info: DocumentInfo): string {
  if (!info.count || info.count === 0) {
    return '当前演示文稿为空，可以从第一页开始创建。'
  }
  return `当前已有 ${info.count} 页幻灯片。`
}

/** 生成 PPT 工具操作描述 */
function pptDescribeAction(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case 'get_presentation_info':
      return '正在读取当前演示文稿状态...'
    case 'create_slide':
      return args.title
        ? `正在创建新幻灯片（${args.layout || 'content'}布局，标题：${args.title}）`
        : `正在创建新幻灯片（${args.layout || 'content'}布局）`
    case 'add_slide_title': {
      const t = String(args.title || ''); const p = t.length > 30 ? t.slice(0, 30) + '...' : t
      return `正在为第 ${args.slide_index} 页添加标题："${p}"`
    }
    case 'add_slide_content': {
      const t = String(args.text || ''); const p = t.length > 30 ? t.slice(0, 30) + '...' : t
      return `正在为第 ${args.slide_index} 页添加内容："${p}"`
    }
    case 'delete_slide':
      return `正在删除第 ${args.slide_index} 页幻灯片...`
    case 'done':
      return '正在完成任务...'
    default:
      return `正在执行：${toolName}`
  }
}

/**
 * PPT 专用 AgentLoop
 *
 * 将 PPT 的 adapter、prompts、tools 装配到通用 AgentLoop。
 * 外部使用方式与重构前完全兼容。
 */
export class PptAgentLoop extends AgentLoop {
  /**
   * @param adapter 幻灯片适配器（WPS 或 Browser）
   * @param aiConfig AI API 配置
   * @param themeKey 主题 key，默认 'business'
   */
  constructor(adapter: SlideToolAdapter, aiConfig: AIRequestConfig, themeKey: string = 'business') {
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
      buildDocumentSummary: (info: DocumentInfo) => buildPptDocumentSummary(info),
      describeAction: (name: string, args: Record<string, unknown>) =>
        pptDescribeAction(name, args),
    }

    super(config)
  }
}
