/**
 * 智能体状态管理 Composable
 *
 * 将 AgentLoop 的运行状态封装为可订阅的状态对象。
 * 框架无关设计——不直接依赖 Vue，可通过适配器接入任何 UI 框架。
 *
 * Phase 08: 使用 shared/agent 的通用 AgentLoop，PPT 通过 PptAgentLoop 装配。
 */

import type { AIRequestConfig } from '@wpsai/shared/types'
import type { AgentStep, AgentResult } from '@wpsai/shared/types/agent'
import type { SlideToolAdapter } from '../slide-tool-adapter'
import { PptAgentLoop } from '../agent-loop'

/** 智能体运行状态 */
export interface AgentState {
  /** 步骤列表 */
  steps: AgentStep[]
  /** 是否正在运行 */
  isRunning: boolean
  /** 最终结果文本 */
  result: string
  /** 错误信息 */
  error: string | null
  /** 是否执行成功 */
  success: boolean
}

/** 智能体状态管理器 */
export interface AgentStateManager {
  /** 当前状态快照 */
  readonly state: Readonly<AgentState>
  /** 步骤更新回调 */
  onUpdate: ((state: Readonly<AgentState>) => void) | null
  /**
   * 运行智能体
   * @param inputText 用户输入文本
   */
  run: (inputText: string) => Promise<void>
  /** 停止运行中的智能体 */
  stop: () => void
  /** 重置状态 */
  reset: () => void
}

/**
 * 创建 PPT 智能体状态管理器
 *
 * @param adapter 幻灯片工具适配器实例
 * @param aiConfig AI API 请求配置
 * @param maxSteps 最大执行步骤数，默认 999
 * @param themeKey 主题 key，默认 'business'
 */
export function createAgentState(
  adapter: SlideToolAdapter,
  aiConfig: AIRequestConfig,
  maxSteps: number = 999,
  themeKey: string = 'business'
): AgentStateManager {
  // ===== 内部状态 =====
  let abortController: AbortController | null = null

  const state: AgentState = {
    steps: [],
    isRunning: false,
    result: '',
    error: null,
    success: false
  }

  let onUpdate: ((state: Readonly<AgentState>) => void) | null = null

  /** 通知状态更新 */
  function notify(): void {
    if (onUpdate) {
      onUpdate({ ...state, steps: [...state.steps] })
    }
  }

  // ===== 方法 =====

  /**
   * 运行智能体
   */
  async function run(inputText: string): Promise<void> {
    // 防止重复运行
    if (state.isRunning) return

    // 重置状态
    state.steps = []
    state.result = ''
    state.error = null
    state.success = false
    state.isRunning = true
    notify()

    // 创建新的 AbortController
    abortController = new AbortController()

    try {
      const agent = new PptAgentLoop(adapter, aiConfig, themeKey)

      const agentResult: AgentResult = await agent.run({
        inputText,
        maxSteps,
        abortSignal: abortController.signal,
        onStepUpdate: (newSteps) => {
          state.steps = newSteps
          notify()
        }
      })

      state.result = agentResult.summary
      state.success = agentResult.success
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      state.error = errMsg
      state.success = false
      state.result = `执行出错：${errMsg}`
    } finally {
      state.isRunning = false
      notify()
    }
  }

  /**
   * 重置所有状态
   */
  function reset(): void {
    state.steps = []
    state.isRunning = false
    state.result = ''
    state.error = null
    state.success = false
    notify()
  }

  /**
   * 停止正在运行的智能体
   */
  function stop(): void {
    if (abortController && state.isRunning) {
      abortController.abort()
    }
  }

  return {
    get state() { return state },
    get onUpdate() { return onUpdate },
    set onUpdate(fn) { onUpdate = fn },
    run,
    stop,
    reset
  }
}
