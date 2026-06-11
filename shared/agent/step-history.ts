/**
 * 步骤历史记录器
 *
 * 借鉴 page-agent 的 this.history 数组模式：
 * 不通过 OpenAI messages 累积历史，而是将每步的关键信息
 * 记录为结构化数据，每轮 API 调用前重新组装为 user prompt。
 */

/** 单步记录 */
export interface StepRecord {
  /** 步骤序号（从 1 开始） */
  index: number
  /** 人类可读描述（如 "创建封面页"） */
  description: string
  /** 本轮调用的工具名列表 */
  toolNames: string[]
  /** 执行结果摘要（合并后截断至 100 字） */
  resultSummary: string
  /** 是否全部成功 */
  success: boolean
}

/** 步骤历史管理器 */
export class StepHistory {
  private steps: StepRecord[] = []

  /** 记录一步 */
  push(step: StepRecord): void {
    this.steps.push(step)
  }

  /** 获取最近 N 步（按时间倒序，最新的在前） */
  recent(n: number): StepRecord[] {
    return this.steps.slice(-n).reverse()
  }

  /** 总步数 */
  get count(): number {
    return this.steps.length
  }

  /**
   * 组装为 user prompt 中的历史片段
   * @param maxSteps 最多显示几步（默认 6）
   */
  toPrompt(maxSteps: number = 6): string {
    if (this.steps.length === 0) return ''

    const recent = this.recent(maxSteps)
    const lines: string[] = ['## 最近操作']

    for (const step of recent) {
      const icon = step.success ? '✅' : '❌'
      const desc = step.description.length > 50
        ? step.description.slice(0, 50) + '...'
        : step.description
      lines.push(`- Step ${step.index} ${icon} ${desc} → ${step.resultSummary}`)
    }

    return lines.join('\n')
  }

  /** 重置所有记录（新一轮对话开始时调用） */
  reset(): void {
    this.steps = []
  }
}
