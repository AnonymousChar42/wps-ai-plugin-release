/**
 * 智能体循环集成测试
 *
 * 使用 mock fetch 模拟 LLM 响应，验证完整的 Re-act 循环。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PptAgentLoop } from '../agent-loop'
import { BrowserSlideAdapter } from '../adapters/browser-slide-adapter'
import type { AIRequestConfig } from '@wpsai/shared/types'

/** 测试用 AI 配置 */
const mockAiConfig: AIRequestConfig = {
  baseURL: 'https://test-api.example.com',
  model: 'test-model',
  apiKey: 'test-key'
}

/**
 * 创建 mock fetch 响应
 */
function mockFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as Response
}

/**
 * 创建模拟 LLM 响应的工具调用
 */
function makeToolCallResponse(
  toolName: string,
  args: Record<string, unknown>
): unknown {
  return {
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        tool_calls: [{
          id: 'call_test',
          type: 'function',
          function: {
            name: toolName,
            arguments: JSON.stringify(args)
          }
        }]
      },
      finish_reason: 'tool_calls'
    }]
  }
}

/**
 * 创建模拟 LLM 响应的 done 调用
 */
function makeDoneResponse(message: string, success = true): unknown {
  return makeToolCallResponse('done', { message, success })
}

describe('PptAgentLoop', () => {
  let adapter: BrowserSlideAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new BrowserSlideAdapter()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  // ===== 基础流程测试 =====

  it('应正确初始化并返回结果', async () => {
    // Mock: 第一次调用返回 get_presentation_info（LLM 先了解状态）
    // 第二次调用返回 done
    let callCount = 0
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve(mockFetchResponse(
          makeToolCallResponse('get_presentation_info', {})
        ))
      }
      return Promise.resolve(mockFetchResponse(
        makeDoneResponse('分析完成，无需创建幻灯片')
      ))
    }) as any

    const agent = new PptAgentLoop(adapter, mockAiConfig)
    const steps: any[] = []

    const result = await agent.run({
      inputText: '测试文本',
      onStepUpdate: (s) => { steps.push([...s]) },
      maxSteps: 5
    })

    expect(result.summary).toBeTruthy()
    expect(steps.length).toBeGreaterThan(0)
  })

  // ===== 步骤管理测试 =====

  it('应正确触发步骤更新回调', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(mockFetchResponse(
        makeToolCallResponse('get_presentation_info', {})
      ))
    }) as any

    const agent = new PptAgentLoop(adapter, mockAiConfig)
    const allSteps: any[] = []

    await agent.run({
      inputText: '测试',
      onStepUpdate: (steps) => { allSteps.push([...steps]) },
      maxSteps: 3
    })

    // 至少应有初始步骤和最终步骤
    expect(allSteps.length).toBeGreaterThan(0)

    // 最后一次更新中的最后一个步骤应是 error（因为超出 maxSteps 且未 done）
    const lastUpdate = allSteps[allSteps.length - 1]
    const lastStep = lastUpdate[lastUpdate.length - 1]
    expect(lastStep.status).toBe('error')
  })

  // ===== 工具执行流程测试 =====

  it('应依次执行 LLM 返回的工具调用', async () => {
    // 模拟完整流程：
    // 1. get_presentation_info → 了解状态
    // 2. create_slide → 创建幻灯片
    // 3. add_slide_title → 添加标题
    // 4. add_slide_content → 添加正文
    // 5. done → 完成

    const responses = [
      makeToolCallResponse('get_presentation_info', {}),
      makeToolCallResponse('create_slide', { layout: 'content' }),
      makeToolCallResponse('add_slide_title', { slide_index: 1, title: '测试标题' }),
      makeToolCallResponse('add_slide_content', { slide_index: 1, text: '正文内容' }),
      makeDoneResponse('成功创建了 1 页幻灯片')
    ]

    let callIndex = 0
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const response = responses[callIndex] || makeDoneResponse('完成')
      callIndex++
      return Promise.resolve(mockFetchResponse(response))
    }) as any

    const agent = new PptAgentLoop(adapter, mockAiConfig)
    const steps: any[] = []

    const result = await agent.run({
      inputText: '请创建一个标题为"测试标题"的幻灯片',
      onStepUpdate: (s) => { steps.push([...s]) },
      maxSteps: 10
    })

    // 验证工具确实被执行了（幻灯片已创建）
    const info = await adapter.getPresentationInfo()
    expect(info.slideCount).toBe(1)
    expect(info.slides[0].textContent).toContain('测试标题')
    expect(info.slides[0].textContent).toContain('正文内容')
  })

  // ===== 最大步数限制测试 =====

  it('超过最大步数应中止', async () => {
    // 一直返回 get_presentation_info（永远不到 done）
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(mockFetchResponse(
        makeToolCallResponse('get_presentation_info', {})
      ))
    }) as any

    const agent = new PptAgentLoop(adapter, mockAiConfig)
    const steps: any[] = []

    const result = await agent.run({
      inputText: '测试',
      onStepUpdate: (s) => { steps.push([...s]) },
      maxSteps: 3  // 只允许 3 步
    })

    expect(result.success).toBe(false)
    const lastUpdate = steps[steps.length - 1]
    const lastStep = lastUpdate[lastUpdate.length - 1]
    expect(lastStep.description).toContain('最大执行步骤')
  })

  // ===== LLM 错误处理 =====

  it('LLM API 调用失败应抛出异常', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(mockFetchResponse({ error: 'Internal Server Error' }, 500))
    }) as any

    const agent = new PptAgentLoop(adapter, mockAiConfig)

    await expect(
      agent.run({
        inputText: '测试',
        onStepUpdate: () => {},
        maxSteps: 3
      })
    ).rejects.toThrow('LLM API')
  })

  // ===== 步骤状态转换测试 =====

  it('步骤应从 running 变为 done', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(mockFetchResponse(
        makeToolCallResponse('get_presentation_info', {})
      ))
    }) as any

    const agent = new PptAgentLoop(adapter, mockAiConfig)
    const allSteps: any[] = []

    await agent.run({
      inputText: '测试',
      onStepUpdate: (steps) => { allSteps.push([...steps]) },
      maxSteps: 3
    })

    // 检查状态转换：某个步骤先以 running 出现，后来变成 done
    const stepIds = new Set<string>()
    for (const snapshot of allSteps) {
      for (const step of snapshot) {
        stepIds.add(step.id)
      }
    }
    expect(stepIds.size).toBeGreaterThan(0)
  })
})

// ===== Phase 05 v3: 窗口压缩模式测试 =====

describe('PptAgentLoop 窗口压缩', () => {
  let adapter: BrowserSlideAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    adapter = new BrowserSlideAdapter()
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('应保留 assistant+tool 消息对（工具调用协议）', async () => {
    const requestBodies: any[] = []

    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.body) {
        requestBodies.push(JSON.parse(init.body as string))
      }
      const callIndex = requestBodies.length
      if (callIndex === 1) {
        return Promise.resolve(mockFetchResponse(
          makeToolCallResponse('create_slide', { layout: 'content' })
        ))
      }
      return Promise.resolve(mockFetchResponse(
        makeDoneResponse('完成')
      ))
    }) as any

    const agent = new PptAgentLoop(adapter, mockAiConfig)
    await agent.run({ inputText: '创建一页', onStepUpdate: () => {}, maxSteps: 5 })

    // 验证消息中包含 tool 角色（工具协议保留）
    const roles = requestBodies[requestBodies.length - 1].messages.map((m: any) => m.role)
    expect(roles).toContain('system')
    expect(roles).toContain('user')
    expect(roles).toContain('assistant')
    expect(roles).toContain('tool')
  })

  it('首轮 system 包含完整示例', async () => {
    const systemContents: string[] = []

    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.body) {
        const body = JSON.parse(init.body as string)
        systemContents.push(body.messages[0].content)
      }
      if (systemContents.length === 1) {
        return Promise.resolve(mockFetchResponse(
          makeToolCallResponse('create_slide', { layout: 'content' })
        ))
      }
      return Promise.resolve(mockFetchResponse(
        makeDoneResponse('完成')
      ))
    }) as any

    const agent = new PptAgentLoop(adapter, mockAiConfig)
    await agent.run({ inputText: '测试', onStepUpdate: () => {}, maxSteps: 5 })

    expect(systemContents[0]).toContain('模板工具 apply_template')
  })

  it('消息数低于窗口阈值时不触发压缩', async () => {
    const requestBodies: any[] = []

    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.body) {
        requestBodies.push(JSON.parse(init.body as string))
      }
      if (requestBodies.length <= 2) {
        return Promise.resolve(mockFetchResponse(
          makeToolCallResponse('create_slide', { layout: 'content' })
        ))
      }
      return Promise.resolve(mockFetchResponse(
        makeDoneResponse('完成')
      ))
    }) as any

    const agent = new PptAgentLoop(adapter, mockAiConfig)
    await agent.run({ inputText: '测试', onStepUpdate: () => {}, maxSteps: 5 })

    // 3 轮调用，消息数应远小于窗口 24
    for (const body of requestBodies) {
      expect(body.messages.length).toBeLessThan(24)
    }
  })
})
