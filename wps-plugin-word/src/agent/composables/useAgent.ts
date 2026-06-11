/**
 * Word 智能体状态管理 Composable
 *
 * 复用 Excel agent 的模式，Word 专有适配器装配。
 */

import type { AIRequestConfig } from '@wpsai/shared/types'
import type { AgentStep, AgentResult } from '@wpsai/shared/types/agent'
import type { WordAdapter } from '../word-adapter'
import { WordAgentLoop } from '../agent-loop'

/** 智能体运行状态 */
export interface AgentState {
  steps: AgentStep[]
  isRunning: boolean
  result: string
  error: string | null
  success: boolean
}

/** 智能体状态管理器 */
export interface AgentStateManager {
  readonly state: Readonly<AgentState>
  onUpdate: ((state: Readonly<AgentState>) => void) | null
  run: (inputText: string) => Promise<void>
  stop: () => void
  reset: () => void
}

export function createAgentState(
  adapter: WordAdapter,
  aiConfig: AIRequestConfig,
  maxSteps: number = 999,
  themeKey: string = 'business',
): AgentStateManager {
  let abortController: AbortController | null = null

  const state: AgentState = {
    steps: [],
    isRunning: false,
    result: '',
    error: null,
    success: false,
  }

  let onUpdate: ((s: Readonly<AgentState>) => void) | null = null

  function notify(): void {
    if (onUpdate) {
      onUpdate({ ...state, steps: [...state.steps] })
    }
  }

  async function run(inputText: string): Promise<void> {
    if (state.isRunning) return

    state.steps = []
    state.result = ''
    state.error = null
    state.success = false
    state.isRunning = true
    notify()

    abortController = new AbortController()

    try {
      const agent = new WordAgentLoop(adapter, aiConfig, themeKey)

      const agentResult: AgentResult = await agent.run({
        inputText,
        maxSteps,
        abortSignal: abortController.signal,
        onStepUpdate: (newSteps) => {
          state.steps = newSteps
          notify()
        },
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

  function reset(): void {
    state.steps = []
    state.isRunning = false
    state.result = ''
    state.error = null
    state.success = false
    notify()
  }

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
    reset,
  }
}
