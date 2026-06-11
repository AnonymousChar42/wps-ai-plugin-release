/**
 * 浏览器环境幻灯片适配器（Mock 实现）
 *
 * 所有操作基于内存数组，无需 WPS 环境即可全流程测试。
 * 完全实现 SlideToolAdapter 接口，与 WpsSlideAdapter 可互换。
 */

import type {
  SlideToolAdapter,
  CreateSlideParams,
  AddTextBoxParams,
  SlideInfo,
  AddShapeParams,
  AddLineParams,
  SetSlideBgParams,
  ApplyTemplateParams,
  SlideSpec,
} from '../slide-tool-adapter'
import { validateSlideSpec } from '../slide-tool-adapter'
import { getTheme, DEFAULT_THEME, type Theme } from '@wpsai/shared/agent/themes'

/** 内存中的文本框数据 */
interface MockTextBox {
  text: string
  fontSize: number
  bold: boolean
  left: number
  top: number
  width: number
  height: number
  color?: string
}

/** 内存中的形状数据 */
interface MockShape {
  id: number
  type: string
  left: number
  top: number
  width: number
  height: number
  fillColor?: string
  lineColor?: string
  lineWeight?: number
  transparency?: number
}

/** 内存中的幻灯片数据 */
interface MockSlide {
  index: number
  title?: string
  textBoxes: MockTextBox[]
  shapes: MockShape[]
  bgColor?: string
}

export class BrowserSlideAdapter implements SlideToolAdapter {
  /** 内存幻灯片存储 */
  private slides: MockSlide[] = []

  /** 自动递增的幻灯片序号 */
  private nextIndex = 1

  /** 自动递增的形状 ID */
  private nextShapeId = 1

  // ========== SlideToolAdapter 接口实现 ==========

  async getPresentationInfo(): Promise<{ slideCount: number; slides: SlideInfo[] }> {
    const slideInfos: SlideInfo[] = this.slides.map(s => ({
      index: s.index,
      title: s.title,
      textContent: s.textBoxes.map(tb => tb.text).join('\n'),
      shapeCount: s.textBoxes.length + s.shapes.length
    }))

    return {
      slideCount: this.slides.length,
      slides: slideInfos
    }
  }

  /** 实现 ToolAdapter.getDocumentInfo — 通用文档信息接口 */
  async getDocumentInfo(): Promise<{ count: number; title?: string; [key: string]: unknown }> {
    const info = await this.getPresentationInfo()
    return { count: info.slideCount, title: info.slides[0]?.title }
  }

  async createSlide(params: CreateSlideParams): Promise<{ slideIndex: number }> {
    const slide: MockSlide = {
      index: this.nextIndex++,
      title: params.title,
      textBoxes: [],
      shapes: []
    }

    // 如果提供了初始标题，作为文本框添加
    if (params.title) {
      slide.textBoxes.push({
        text: params.title,
        fontSize: 32,
        bold: true,
        left: 50,
        top: 30,
        width: 600,
        height: 60
      })
    }

    this.slides.push(slide)
    return { slideIndex: slide.index }
  }

  async addTextBox(params: AddTextBoxParams): Promise<{ success: boolean }> {
    const slide = this.slides.find(s => s.index === params.slideIndex)
    if (!slide) {
      throw new Error(`幻灯片 ${params.slideIndex} 不存在`)
    }

    slide.textBoxes.push({
      text: params.text,
      fontSize: params.fontSize ?? 18,
      bold: params.bold ?? false,
      left: params.left ?? 50,
      top: params.top ?? 100,
      width: params.width ?? 600,
      height: params.height ?? 400,
      color: params.color
    })

    return { success: true }
  }

  async addTitle(slideIndex: number, title: string): Promise<{ success: boolean }> {
    return this.addTextBox({
      slideIndex,
      text: title,
      left: 50,
      top: 30,
      width: 600,
      height: 60,
      fontSize: 32,
      bold: true
    })
  }

  async deleteSlide(slideIndex: number): Promise<{ success: boolean }> {
    const idx = this.slides.findIndex(s => s.index === slideIndex)
    if (idx === -1) {
      throw new Error(`幻灯片 ${slideIndex} 不存在`)
    }

    this.slides.splice(idx, 1)
    return { success: true }
  }

  async getSlideContent(slideIndex: number): Promise<string> {
    const slide = this.slides.find(s => s.index === slideIndex)
    if (!slide) return ''

    return slide.textBoxes.map(tb => tb.text).join('\n')
  }

  // ========== Phase 03 新增：形状操作方法 ==========

  async addShape(params: AddShapeParams): Promise<{ success: boolean; shapeId?: number }> {
    const slide = this.slides.find(s => s.index === params.slideIndex)
    if (!slide) {
      throw new Error(`幻灯片 ${params.slideIndex} 不存在`)
    }

    const shape: MockShape = {
      id: this.nextShapeId++,
      type: params.shapeType,
      left: params.left,
      top: params.top,
      width: params.width,
      height: params.height,
      fillColor: params.fillColor,
      lineColor: params.lineColor,
      lineWeight: params.lineWeight,
      transparency: params.transparency
    }

    slide.shapes.push(shape)
    return { success: true, shapeId: shape.id }
  }

  async addLine(params: AddLineParams): Promise<{ success: boolean }> {
    const slide = this.slides.find(s => s.index === params.slideIndex)
    if (!slide) {
      throw new Error(`幻灯片 ${params.slideIndex} 不存在`)
    }

    const left = Math.min(params.startX, params.endX)
    const top = Math.min(params.startY, params.endY)
    const width = Math.abs(params.endX - params.startX)
    const height = Math.abs(params.endY - params.startY)

    const shape: MockShape = {
      id: this.nextShapeId++,
      type: 'line',
      left,
      top,
      width,
      height,
      lineColor: params.color ?? '#333333',
      lineWeight: params.weight ?? 2
    }

    slide.shapes.push(shape)
    return { success: true }
  }

  async setSlideBg(params: SetSlideBgParams): Promise<{ success: boolean }> {
    const slide = this.slides.find(s => s.index === params.slideIndex)
    if (!slide) {
      throw new Error(`幻灯片 ${params.slideIndex} 不存在`)
    }

    slide.bgColor = params.color
    return { success: true }
  }

  async setShapeStyle(slideIndex: number, shapeIndex: number,
    options: { fillColor?: string; lineColor?: string; lineWeight?: number; transparency?: number }
  ): Promise<{ success: boolean }> {
    const slide = this.slides.find(s => s.index === slideIndex)
    if (!slide) {
      throw new Error(`幻灯片 ${slideIndex} 不存在`)
    }
    if (shapeIndex < 0 || shapeIndex >= slide.shapes.length) {
      throw new Error(`形状 ${shapeIndex} 不存在`)
    }

    const shape = slide.shapes[shapeIndex]
    if (options.fillColor !== undefined) shape.fillColor = options.fillColor
    if (options.lineColor !== undefined) shape.lineColor = options.lineColor
    if (options.lineWeight !== undefined) shape.lineWeight = options.lineWeight
    if (options.transparency !== undefined) shape.transparency = options.transparency

    return { success: true }
  }

  async deleteShape(slideIndex: number, shapeIndex: number): Promise<{ success: boolean }> {
    const slide = this.slides.find(s => s.index === slideIndex)
    if (!slide) {
      throw new Error(`幻灯片 ${slideIndex} 不存在`)
    }
    if (shapeIndex < 0 || shapeIndex >= slide.shapes.length) {
      throw new Error(`形状 ${shapeIndex} 不存在`)
    }

    slide.shapes.splice(shapeIndex, 1)
    return { success: true }
  }

  // ========== 测试辅助方法（非接口方法） ==========

  /**
   * 获取所有幻灯片原始数据（仅用于测试断言）
   */
  getRawSlides(): ReadonlyArray<MockSlide> {
    return this.slides
  }

  /**
   * 重置适配器状态（仅用于测试）
   */
  reset(): void {
    this.slides = []
    this.nextIndex = 1
    this.nextShapeId = 1
  }

  // ========== Phase 06: 语义层模板（与 WPS 适配器相同逻辑） ==========

  async applyTemplate(params: ApplyTemplateParams): Promise<{ slideIndices: number[]; summary: string }> {
    const theme = getTheme(params.theme || DEFAULT_THEME)
    const slideIndices: number[] = []
    const typeNames: string[] = []

    for (const spec of params.slides) {
      const err = validateSlideSpec(spec)
      if (err) throw new Error(`SlideSpec 校验失败：${err}`)

      switch (spec.type) {
        case 'cover':            slideIndices.push(await this._renderCover(spec, theme)); typeNames.push('封面'); break
        case 'bullets':          slideIndices.push(await this._renderBullets(spec, theme)); typeNames.push(`${spec.items!.length}个要点`); break
        case 'cards':            slideIndices.push(await this._renderCards(spec, theme)); typeNames.push(`卡片网格(${spec.columns || 3}列)`); break
        case 'ending':           slideIndices.push(await this._renderEnding(spec, theme)); typeNames.push('结束页'); break
        case 'big_number':       slideIndices.push(await this._renderBigNumber(spec, theme)); typeNames.push('大数字'); break
        case 'timeline':         slideIndices.push(await this._renderTimeline(spec, theme)); typeNames.push(`${spec.events!.length}节点时间线`); break
        case 'comparison':       slideIndices.push(await this._renderComparison(spec, theme)); typeNames.push('双栏对比'); break
        case 'two_column':       slideIndices.push(await this._renderTwoColumn(spec, theme)); typeNames.push('双栏内容'); break
        case 'big_quote':        slideIndices.push(await this._renderBigQuote(spec, theme)); typeNames.push('引用'); break
        case 'stat_grid':        slideIndices.push(await this._renderStatGrid(spec, theme)); typeNames.push(`${spec.stats!.length}个指标`); break
        case 'process_steps':    slideIndices.push(await this._renderProcessSteps(spec, theme)); typeNames.push(`${spec.steps!.length}步流程`); break
        case 'image_text':       slideIndices.push(await this._renderImageText(spec, theme)); typeNames.push('图文混排'); break
        case 'section_divider':  slideIndices.push(await this._renderSectionDivider(spec, theme)); typeNames.push('章节过渡'); break
        case 'team':             slideIndices.push(await this._renderTeam(spec, theme)); typeNames.push(`${spec.members!.length}人团队`); break
        case 'table':            slideIndices.push(await this._renderTable(spec, theme)); typeNames.push(`表格(${spec.headers!.length}列)`); break
      }
    }

    return { slideIndices, summary: `共创建${slideIndices.length}页：${typeNames.join('、')}` }
  }

  private async _renderCover(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addShape({ slideIndex, shapeType: 'rectangle', left: 0, top: 0, width: 720, height: 3, fillColor: t.accent })
    await this.addTextBox({ slideIndex, text: spec.title, left: 46, top: 70, width: 628, fontSize: 33, bold: true, color: t.title })
    if (spec.subtitle) {
      await this.addTextBox({ slideIndex, text: spec.subtitle, left: 46, top: 120, width: 628, fontSize: 17, color: t.body })
    }
    await this.addLine({ slideIndex, startX: 46, startY: 367, endX: 294, endY: 367, color: t.accent, weight: 2 })
    return slideIndex
  }

  private async _renderBullets(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title)
    await this.addLine({ slideIndex, startX: 46, startY: 74, endX: 674, endY: 74, color: t.accent, weight: 2 })
    const items = spec.items!
    for (let i = 0; i < items.length; i++) {
      const y = 86 + i * 24
      await this.addShape({ slideIndex, shapeType: 'oval', left: 32, top: y + 4, width: 8, height: 8, fillColor: t.accent })
      await this.addTextBox({ slideIndex, text: items[i], left: 46, top: y, width: 628, fontSize: 17, color: t.body })
    }
    return slideIndex
  }

  private async _renderCards(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title)
    const cards = spec.cards!
    const columns = spec.columns || 3
    const gap = 20
    const cardW = (628 - gap * (columns - 1)) / columns
    const cardH = 280

    for (let i = 0; i < cards.length; i++) {
      const row = Math.floor(i / columns)
      const col = i % columns
      const left = 46 + col * (cardW + gap)
      const top = 100 + row * (cardH + gap)
      await this.addShape({ slideIndex, shapeType: 'rectangle', left, top, width: cardW, height: cardH, fillColor: t.accentLight })
      await this.addShape({ slideIndex, shapeType: 'rectangle', left, top, width: cardW, height: 3, fillColor: t.accent })
      await this.addTextBox({ slideIndex, text: cards[i].title, left: left + 14, top: top + 35, width: cardW - 28, fontSize: 18, bold: true, color: t.title })
      await this.addTextBox({ slideIndex, text: cards[i].desc, left: left + 14, top: top + 80, width: cardW - 28, fontSize: 13, color: t.body })
    }
    return slideIndex
  }

  private async _renderEnding(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.setSlideBg({ slideIndex, color: t.accent })
    await this.addTextBox({ slideIndex, text: spec.title, left: 46, top: 150, width: 628, fontSize: 56, bold: true, color: 'ffffff' })
    if (spec.contact) {
      await this.addTextBox({ slideIndex, text: spec.contact, left: 46, top: 300, width: 628, fontSize: 14, color: 'ffffff' })
    }
    return slideIndex
  }

  // ========== Phase 07: 新增 11 种渲染方法（照抄 Mck engine.py，与 WPS 适配器相同逻辑） ==========

  private async _renderBigNumber(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const boxLeft = 46, boxTop = 77, boxW = 189, boxH = 97
    await this.addShape({ slideIndex, shapeType: 'rectangle', left: boxLeft, top: boxTop, width: boxW, height: boxH, fillColor: t.accent })
    await this.addTextBox({ slideIndex, text: s.number, left: boxLeft + 11, top: boxTop + 11, width: boxW - 22, height: 43, fontSize: 33, bold: true, color: 'ffffff' })
    if (s.label) {
      await this.addTextBox({ slideIndex, text: s.label, left: boxLeft + 11, top: boxTop + 54, width: boxW - 22, height: 38, fontSize: 13, color: 'ffffff' })
    }
    if (s.subtitle) {
      await this.addTextBox({ slideIndex, text: s.subtitle, left: 270, top: 77, width: 404, height: 97, fontSize: 17, color: t.body })
    }
    return slideIndex
  }

  private async _renderTimeline(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const events: any[] = s.events || []
    const n = events.length
    const lineY = 162
    await this.addLine({ slideIndex, startX: 73, startY: lineY, endX: 647, endY: lineY, color: 'cccccc', weight: 2 })
    const spacing = (628 - 27) / Math.max(n - 1, 1)
    for (let i = 0; i < n; i++) {
      const mx = 73 + spacing * i
      const isLast = i === n - 1
      await this.addShape({ slideIndex, shapeType: 'oval', left: mx - 12, top: lineY - 12, width: 24, height: 24, fillColor: isLast ? t.accent : '006ba6' })
      await this.addTextBox({ slideIndex, text: events[i].year || `节点 ${i + 1}`, left: mx - 54, top: 108, width: 108, height: 27, fontSize: 17, bold: true, color: t.title })
      const desc = [events[i].title, events[i].desc].filter(Boolean).join(': ')
      await this.addTextBox({ slideIndex, text: desc, left: mx - 54, top: 189, width: 108, height: 81, fontSize: 13, color: t.body })
    }
    return slideIndex
  }

  private async _renderComparison(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const halfW = 297, gap = 34
    const leftX = 46, rightX = 46 + halfW + gap
    await this.addTextBox({ slideIndex, text: s.left.title, left: leftX, top: 81, width: halfW, height: 22, fontSize: 17, bold: true, color: t.title })
    await this.addLine({ slideIndex, startX: leftX, startY: 108, endX: leftX + halfW, endY: 108, color: t.accent, weight: 2 })
    await this.addTextBox({ slideIndex, text: s.left.items.join('\n'), left: leftX, top: 119, width: halfW, height: 135, fontSize: 17, color: t.body })
    await this.addTextBox({ slideIndex, text: s.right.title, left: rightX, top: 81, width: halfW, height: 22, fontSize: 17, bold: true, color: t.title })
    await this.addLine({ slideIndex, startX: rightX, startY: 108, endX: rightX + halfW, endY: 108, color: '666666', weight: 2 })
    await this.addTextBox({ slideIndex, text: s.right.items.join('\n'), left: rightX, top: 119, width: halfW, height: 135, fontSize: 17, color: t.body })
    if (s.conclusion) {
      await this.addShape({ slideIndex, shapeType: 'rectangle', left: 46, top: 281, width: 628, height: 81, fillColor: t.accentLight })
      await this.addTextBox({ slideIndex, text: s.conclusion.label, left: 62, top: 287, width: 81, height: 22, fontSize: 17, bold: true, color: t.accent })
      await this.addTextBox({ slideIndex, text: s.conclusion.text, left: 62, top: 314, width: 596, height: 32, fontSize: 17, color: t.body })
    }
    return slideIndex
  }

  private async _renderTwoColumn(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const cols: any[] = s.columns || []
    const colW = 297, colG = 34
    for (let i = 0; i < cols.length; i++) {
      const cx = 46 + (colW + colG) * i
      await this.addShape({ slideIndex, shapeType: 'oval', left: cx, top: 81, width: 27, height: 27, fillColor: t.accent })
      await this.addTextBox({ slideIndex, text: cols[i].letter || String.fromCharCode(65 + i), left: cx, top: 83, width: 27, height: 22, fontSize: 13, color: 'ffffff' })
      await this.addTextBox({ slideIndex, text: cols[i].label, left: cx + 32, top: 81, width: colW - 32, height: 22, fontSize: 17, bold: true, color: t.title })
      await this.addLine({ slideIndex, startX: cx, startY: 108, endX: cx + colW, endY: 108, color: 'cccccc', weight: 2 })
      await this.addTextBox({ slideIndex, text: (cols[i].items || []).join('\n'), left: cx, top: 119, width: colW, height: 216, fontSize: 17, color: t.body })
    }
    return slideIndex
  }

  private async _renderBigQuote(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    const s = spec as any
    await this.addShape({ slideIndex, shapeType: 'rectangle', left: 0, top: 0, width: 720, height: 3, fillColor: t.accent })
    await this.addLine({ slideIndex, startX: 297, startY: 108, endX: 423, endY: 108, color: t.accent, weight: 2 })
    await this.addTextBox({ slideIndex, text: `"${s.quote}"`, left: 81, top: 135, width: 558, height: 135, fontSize: 24, color: t.title })
    await this.addLine({ slideIndex, startX: 297, startY: 287, endX: 423, endY: 287, color: t.accent, weight: 2 })
    const attr: string[] = []
    if (s.author) attr.push(s.author)
    if (s.role) attr.push(s.role)
    if (attr.length > 0) {
      await this.addTextBox({ slideIndex, text: `— ${attr.join(', ')}`, left: 81, top: 302, width: 558, height: 27, fontSize: 17, color: '666666' })
    }
    return slideIndex
  }

  private async _renderStatGrid(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const stats: any[] = s.stats || []
    await this.addTextBox({ slideIndex, text: '项目', left: 46, top: 77, width: 216, height: 22, fontSize: 13, bold: true, color: '666666' })
    await this.addTextBox({ slideIndex, text: '数值', left: 270, top: 77, width: 81, height: 22, fontSize: 13, bold: true, color: '666666' })
    await this.addTextBox({ slideIndex, text: '进度', left: 378, top: 77, width: 270, height: 22, fontSize: 13, bold: true, color: '666666' })
    await this.addLine({ slideIndex, startX: 46, startY: 101, endX: 674, endY: 101, color: '000000', weight: 1 })
    let ry = 109
    for (const stat of stats) {
      await this.addTextBox({ slideIndex, text: stat.label, left: 46, top: ry, width: 216, height: 27, fontSize: 17, color: t.body })
      await this.addTextBox({ slideIndex, text: stat.value, left: 270, top: ry, width: 81, height: 27, fontSize: 17, bold: true, color: t.accent })
      const pct = typeof stat.pct === 'number' ? stat.pct : 0.5
      await this.addShape({ slideIndex, shapeType: 'rectangle', left: 378, top: ry + 3, width: 270, height: 22, fillColor: 'cccccc' })
      const barColor = pct >= 0.7 ? t.accent : pct >= 0.5 ? 'd46a00' : 'c62828'
      await this.addShape({ slideIndex, shapeType: 'rectangle', left: 378, top: ry + 3, width: Math.round(270 * pct), height: 22, fillColor: barColor })
      ry += 35
      await this.addLine({ slideIndex, startX: 46, startY: ry - 1, endX: 674, endY: ry - 1, color: 'cccccc', weight: 1 })
      ry += 5
    }
    return slideIndex
  }

  private async _renderProcessSteps(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const steps: any[] = s.steps || []
    const n = steps.length
    const MIN_GAP = 19
    const stepW = Math.min(140, (628 - MIN_GAP * (n - 1)) / n)
    const gap = (628 - stepW * n) / Math.max(n - 1, 1)
    for (let i = 0; i < n; i++) {
      const sx = 46 + (stepW + gap) * i
      const isLast = i === n - 1
      const fill = isLast ? t.accent : t.accentLight
      const tc = isLast ? 'ffffff' : t.accent
      await this.addShape({ slideIndex, shapeType: 'rectangle', left: sx, top: 81, width: stepW, height: 54, fillColor: fill })
      await this.addShape({ slideIndex, shapeType: 'oval', left: sx + 5, top: 84, width: 22, height: 22, fillColor: isLast ? 'ffffff' : t.accent })
      await this.addTextBox({ slideIndex, text: steps[i].label, left: sx + 5, top: 84, width: 22, height: 22, fontSize: 13, color: isLast ? t.accent : 'ffffff' })
      await this.addTextBox({ slideIndex, text: steps[i].title, left: sx + 35, top: 84, width: stepW - 43, height: 49, fontSize: 17, bold: true, color: tc })
      if (steps[i].desc) {
        await this.addTextBox({ slideIndex, text: steps[i].desc, left: sx + 5, top: 146, width: stepW - 11, height: 108, fontSize: 13, color: t.body })
      }
      if (i < n - 1) {
        const arrowW = Math.max(gap - 5, 11)
        await this.addTextBox({ slideIndex, text: '→', left: sx + stepW + 3, top: 92, width: arrowW, height: 27, fontSize: 20, color: 'cccccc' })
      }
    }
    return slideIndex
  }

  private async _renderImageText(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const leftW = 351
    if (s.subtitle) {
      await this.addTextBox({ slideIndex, text: s.subtitle, left: 46, top: 77, width: leftW, height: 22, fontSize: 17, bold: true, color: t.title })
    }
    await this.addTextBox({ slideIndex, text: s.text, left: 46, top: s.subtitle ? 104 : 77, width: leftW, height: 189, fontSize: 17, color: t.body })
    const imgX = 46 + leftW + 16
    const imgW = 628 - leftW - 16
    await this.addShape({ slideIndex, shapeType: 'rectangle', left: imgX, top: 77, width: imgW, height: 227, fillColor: 'cccccc' })
    await this.addTextBox({ slideIndex, text: s.image || '📷 图片占位', left: imgX + 16, top: 175, width: imgW - 32, height: 32, fontSize: 17, color: '666666' })
    return slideIndex
  }

  private async _renderSectionDivider(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    const s = spec as any
    await this.addShape({ slideIndex, shapeType: 'rectangle', left: 0, top: 0, width: 32, height: 405, fillColor: t.accent })
    if (s.sectionLabel) {
      await this.addTextBox({ slideIndex, text: s.sectionLabel, left: 65, top: 108, width: 540, height: 43, fontSize: 17, color: '666666' })
    }
    const titleTop = s.sectionLabel ? 151 : 108
    await this.addTextBox({ slideIndex, text: spec.title as string, left: 65, top: titleTop, width: 540, height: 65, fontSize: 28, bold: true, color: t.accent })
    if (s.subtitle) {
      await this.addTextBox({ slideIndex, text: s.subtitle, left: 65, top: 227, width: 540, height: 32, fontSize: 17, color: t.body })
    }
    return slideIndex
  }

  private async _renderTeam(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const members: any[] = s.members || []
    const n = members.length
    const cardW = (628 - 11 * (n - 1)) / n
    const cardG = 11
    for (let i = 0; i < n; i++) {
      const cx = 46 + (cardW + cardG) * i
      await this.addShape({ slideIndex, shapeType: 'rectangle', left: cx, top: 81, width: cardW, height: 270, fillColor: t.accentLight })
      const avatarLeft = cx + cardW / 2 - 27
      await this.addShape({ slideIndex, shapeType: 'oval', left: avatarLeft, top: 92, width: 54, height: 54, fillColor: t.accent })
      await this.addTextBox({ slideIndex, text: members[i].name.charAt(0), left: avatarLeft, top: 97, width: 54, height: 43, fontSize: 24, color: 'ffffff' })
      await this.addTextBox({ slideIndex, text: members[i].name, left: cx + 8, top: 157, width: cardW - 16, height: 22, fontSize: 17, bold: true, color: t.title })
      await this.addTextBox({ slideIndex, text: members[i].role, left: cx + 8, top: 184, width: cardW - 16, height: 22, fontSize: 17, color: '666666' })
      await this.addLine({ slideIndex, startX: cx + 16, startY: 211, endX: cx + cardW - 16, endY: 211, color: 'cccccc', weight: 1 })
      if (members[i].bio) {
        await this.addTextBox({ slideIndex, text: members[i].bio, left: cx + 8, top: 222, width: cardW - 16, height: 108, fontSize: 13, color: t.body })
      }
    }
    return slideIndex
  }

  private async _renderTable(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const headers: string[] = s.headers || []
    const rows: string[][] = s.rows || []
    const n = headers.length
    const colWidths: number[] = Array(n).fill(Math.round(628 / n))
    let cx = 46
    for (let i = 0; i < n; i++) {
      await this.addTextBox({ slideIndex, text: headers[i], left: cx, top: 77, width: colWidths[i], height: 22, fontSize: 13, bold: true, color: '666666' })
      cx += colWidths[i]
    }
    await this.addLine({ slideIndex, startX: 46, startY: 101, endX: 674, endY: 101, color: '000000', weight: 1 })
    const rowH = 51, rowFont = 13
    for (let ri = 0; ri < rows.length; ri++) {
      let ry = 107 + rowH * ri
      cx = 46
      for (let ci = 0; ci < n; ci++) {
        const val = ci < rows[ri].length ? rows[ri][ci] : ''
        await this.addTextBox({ slideIndex, text: val, left: cx, top: ry, width: colWidths[ci], height: rowH, fontSize: rowFont, color: t.body })
        cx += colWidths[ci]
      }
      await this.addLine({ slideIndex, startX: 46, startY: ry + rowH, endX: 674, endY: ry + rowH, color: 'cccccc', weight: 1 })
    }
    return slideIndex
  }
}
