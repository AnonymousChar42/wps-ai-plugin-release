/**
 * StepHistory 单元测试
 *
 * 测试 shared/agent/step-history.ts 的步骤历史记录功能。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { StepHistory } from '../step-history'

describe('StepHistory', () => {
  let history: StepHistory

  beforeEach(() => {
    history = new StepHistory()
  })

  it('空历史 toPrompt 返回空字符串', () => {
    expect(history.toPrompt()).toBe('')
    expect(history.count).toBe(0)
  })

  it('记录步骤后正确计数', () => {
    history.push({ index: 1, description: '创建封面', toolNames: ['create_slide'], resultSummary: '成功', success: true })
    history.push({ index: 2, description: '添加标题', toolNames: ['add_slide_title'], resultSummary: '成功', success: true })
    expect(history.count).toBe(2)
  })

  it('toPrompt 输出包含步骤描述和状态图标', () => {
    history.push({ index: 1, description: '创建封面页', toolNames: ['create_slide', 'set_slide_bg'], resultSummary: '成功', success: true })
    history.push({ index: 2, description: '添加标题失败', toolNames: ['add_slide_title'], resultSummary: '幻灯片不存在', success: false })

    const prompt = history.toPrompt()
    expect(prompt).toContain('## 最近操作')
    expect(prompt).toContain('✅')
    expect(prompt).toContain('❌')
    expect(prompt).toContain('创建封面页')
    expect(prompt).toContain('添加标题失败')
  })

  it('recent(1) 返回最近1步', () => {
    history.push({ index: 1, description: '第一步', toolNames: ['a'], resultSummary: 'ok', success: true })
    history.push({ index: 2, description: '第二步', toolNames: ['b'], resultSummary: 'ok', success: true })
    history.push({ index: 3, description: '第三步', toolNames: ['c'], resultSummary: 'ok', success: true })

    const recent = history.recent(1)
    expect(recent).toHaveLength(1)
    expect(recent[0].index).toBe(3)
  })

  it('toPrompt 限制 maxSteps', () => {
    for (let i = 1; i <= 10; i++) {
      history.push({ index: i, description: `Step ${i}`, toolNames: ['t'], resultSummary: 'ok', success: true })
    }
    const prompt = history.toPrompt(3)
    const stepLines = prompt.split('\n').filter(l => l.startsWith('- Step'))
    expect(stepLines.length).toBeLessThanOrEqual(3)
  })

  it('reset 清空所有记录', () => {
    history.push({ index: 1, description: 'test', toolNames: ['t'], resultSummary: 'ok', success: true })
    history.reset()
    expect(history.count).toBe(0)
    expect(history.toPrompt()).toBe('')
  })
})
