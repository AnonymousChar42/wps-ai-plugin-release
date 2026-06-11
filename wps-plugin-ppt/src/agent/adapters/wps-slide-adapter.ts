/**
 * WPS 环境幻灯片适配器
 *
 * 通过 WPSJS API 操作真实演示文稿。
 * 所有幻灯片操作最终调用 window.Application.ActivePresentation。
 *
 * 注意：此适配器仅在 WPS 加载项运行时环境中可用。
 * 浏览器开发模式下请使用 BrowserSlideAdapter。
 */

import type {
  SlideToolAdapter,
  CreateSlideParams,
  AddTextBoxParams,
  AddShapeParams,
  AddLineParams,
  SetSlideBgParams,
  SlideInfo,
  ApplyTemplateParams,
  SlideSpec,
} from '../slide-tool-adapter'
import { validateSlideSpec } from '../slide-tool-adapter'
import { getTheme, DEFAULT_THEME, type Theme } from '@wpsai/shared/agent/themes'

/** WPS 幻灯片布局常量（参考 Office ppLayoutType 枚举） */
const LAYOUT_BLANK = 12   // ppLayoutBlank — 空白布局
const LAYOUT_TEXT = 2     // ppLayoutText — 文本布局
const LAYOUT_TITLE = 1    // ppLayoutTitle — 标题布局

/** 文本方向：水平 */
const ORIENTATION_HORIZONTAL = 1

/** 形状类型到 MsoAutoShapeType 的映射 */
const SHAPE_MAP: Record<string, number> = {
  rectangle: 1,          // msoShapeRectangle
  rounded_rectangle: 5,  // msoShapeRoundedRectangle
  oval: 9,               // msoShapeOval
  triangle: 7,           // msoShapeIsoscelesTriangle
  diamond: 4             // msoShapeDiamond
}

export class WpsSlideAdapter implements SlideToolAdapter {
  /** 检测是否在 WPS 加载项环境中 */
  static isAvailable(): boolean {
    return !!(window as any).Application?.ActivePresentation
  }

  /**
   * 获取 WPS Application 对象
   * 仅在 WPS 加载项环境中可用
   */
  private get app(): any {
    return (window as any).Application
  }

  /**
   * 获取当前活动的演示文稿
   */
  private get presentation(): any {
    return this.app.ActivePresentation
  }

  // ========== SlideToolAdapter 接口实现 ==========

  async getPresentationInfo(): Promise<{ slideCount: number; slides: SlideInfo[] }> {
    const pres = this.presentation
    if (!pres) {
      return { slideCount: 0, slides: [] }
    }

    const slides: SlideInfo[] = []
    const slideCount = pres.Slides.Count

    for (let i = 1; i <= slideCount; i++) {
      const slide = pres.Slides.Item(i)
      let title: string | undefined
      let textContent = ''

      for (let j = 1; j <= slide.Shapes.Count; j++) {
        const shape = slide.Shapes.Item(j)
        if (shape.HasTextFrame && shape.TextFrame.HasText) {
          const text = shape.TextFrame.TextRange.Text.trim()
          if (text && !title && shape.TextFrame.TextRange.Font.Bold) {
            title = text
          }
          textContent += text + '\n'
        }
      }

      slides.push({
        index: i,
        title,
        textContent: textContent.trim(),
        shapeCount: slide.Shapes.Count
      })
    }

    return { slideCount, slides }
  }

  /** 实现 ToolAdapter.getDocumentInfo — 通用文档信息接口 */
  async getDocumentInfo(): Promise<{ count: number; title?: string; [key: string]: unknown }> {
    const info = await this.getPresentationInfo()
    return { count: info.slideCount, title: info.slides[0]?.title }
  }

  async createSlide(params: CreateSlideParams): Promise<{ slideIndex: number }> {
    const pres = this.presentation
    const layoutIndex = this._mapLayout(params.layout)
    const slide = pres.Slides.Add(pres.Slides.Count + 1, layoutIndex)

    if (params.title) {
      await this.addTitle(pres.Slides.Count, params.title)
    }

    return { slideIndex: pres.Slides.Count }
  }

  async addTextBox(params: AddTextBoxParams): Promise<{ success: boolean }> {
    const pres = this.presentation
    const slide = pres.Slides.Item(params.slideIndex)

    const textBox = slide.Shapes.AddTextbox(
      ORIENTATION_HORIZONTAL,
      params.left ?? 50,
      params.top ?? 100,
      params.width ?? 600,
      params.height ?? 400
    )

    textBox.TextFrame.TextRange.Text = params.text
    textBox.TextFrame.TextRange.Font.Size = params.fontSize ?? 18
    textBox.TextFrame.TextRange.Font.Bold = params.bold ?? false
    if (params.color) {
      textBox.TextFrame.TextRange.Font.Color.RGB = parseInt(params.color, 16)
    }

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
    const pres = this.presentation
    pres.Slides.Item(slideIndex).Delete()
    return { success: true }
  }

  async getSlideContent(slideIndex: number): Promise<string> {
    const pres = this.presentation
    const slide = pres.Slides.Item(slideIndex)
    let content = ''

    for (let j = 1; j <= slide.Shapes.Count; j++) {
      const shape = slide.Shapes.Item(j)
      if (shape.HasTextFrame && shape.TextFrame.HasText) {
        content += shape.TextFrame.TextRange.Text + '\n'
      }
      if (shape.HasTable) {
        content += this._extractTableText(shape.Table) + '\n'
      }
    }

    return content.trim()
  }

  // ========== Phase 03 新增：形状操作方法 ==========

  async addShape(params: AddShapeParams): Promise<{ success: boolean; shapeId?: number }> {
    const pres = this.presentation
    const slide = pres.Slides.Item(params.slideIndex)

    const shapeType = SHAPE_MAP[params.shapeType] || 1
    const shape = slide.Shapes.AddShape(shapeType, params.left, params.top, params.width, params.height)

    if (params.fillColor) {
      shape.Fill.Solid()
      shape.Fill.ForeColor.RGB = parseInt(params.fillColor, 16)
      if (params.transparency) shape.Fill.Transparency = params.transparency
    } else {
      shape.Fill.Visible = 0
    }

    if (params.lineColor) {
      shape.Line.ForeColor.RGB = parseInt(params.lineColor, 16)
      shape.Line.Weight = params.lineWeight ?? 1
    } else {
      shape.Line.Visible = 0
    }

    return { success: true, shapeId: shape.ID }
  }

  async addLine(params: AddLineParams): Promise<{ success: boolean }> {
    const pres = this.presentation
    const slide = pres.Slides.Item(params.slideIndex)

    const line = slide.Shapes.AddLine(params.startX, params.startY, params.endX, params.endY)
    line.Line.ForeColor.RGB = parseInt(params.color || '333333', 16)
    line.Line.Weight = params.weight ?? 2
    if (params.dashStyle === 'dash') line.Line.DashStyle = 2

    return { success: true }
  }

  async setSlideBg(params: SetSlideBgParams): Promise<{ success: boolean }> {
    const pres = this.presentation
    const slide = pres.Slides.Item(params.slideIndex)

    slide.FollowMasterBackground = 0
    slide.Background.Fill.Solid()
    slide.Background.Fill.ForeColor.RGB = parseInt(params.color, 16)

    return { success: true }
  }

  async setShapeStyle(slideIndex: number, shapeIndex: number,
    options: { fillColor?: string; lineColor?: string; lineWeight?: number; transparency?: number }
  ): Promise<{ success: boolean }> {
    const pres = this.presentation
    const slide = pres.Slides.Item(slideIndex)
    const shape = slide.Shapes.Item(shapeIndex)

    if (options.fillColor !== undefined) {
      shape.Fill.Solid()
      shape.Fill.ForeColor.RGB = parseInt(options.fillColor, 16)
    }
    if (options.lineColor !== undefined) {
      shape.Line.ForeColor.RGB = parseInt(options.lineColor, 16)
    }
    if (options.lineWeight !== undefined) {
      shape.Line.Weight = options.lineWeight
    }
    if (options.transparency !== undefined) {
      shape.Fill.Transparency = options.transparency
    }

    return { success: true }
  }

  async deleteShape(slideIndex: number, shapeIndex: number): Promise<{ success: boolean }> {
    const pres = this.presentation
    const slide = pres.Slides.Item(slideIndex)
    slide.Shapes.Item(shapeIndex).Delete()
    return { success: true }
  }

  /**
   * 从表格提取文本
   * 参考 util.js 中的 getTableContent 实现
   */
  private _extractTableText(table: any): string {
    if (!table) return ''

    let markdown = ''
    const rowCount = table.Rows.Count
    const colCount = table.Columns.Count

    for (let row = 1; row <= rowCount; row++) {
      markdown += '|'
      for (let col = 1; col <= colCount; col++) {
        const cellText = table.Cell(row, col).Shape.TextFrame.TextRange.Text
        markdown += ' ' + cellText.replace(/\|/g, '\\|') + ' |'
      }
      markdown += '\n'

      if (row === 1) {
        markdown += '|'
        for (let col = 1; col <= colCount; col++) {
          markdown += ' --- |'
        }
        markdown += '\n'
      }
    }

    return markdown
  }

  private _mapLayout(layout?: string): number {
    switch (layout) {
      case 'blank': return LAYOUT_BLANK
      case 'title': return LAYOUT_TITLE
      case 'content':
      default:      return LAYOUT_TEXT
    }
  }

  // ========== Phase 06: 语义层模板（照抄 Mck engine.py） ==========

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

  // ========== Phase 07: 新增 11 种渲染方法（照抄 Mck engine.py，×0.75） ==========

  /** #5 大数字 — 照抄 Mck big_number() L181-216 */
  private async _renderBigNumber(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    // Navy 数字底框 (Mck: LM + Inches(0.1), CONTENT_TOP + Inches(0.1), box_w=Inches(3.5), Inches(1.8))
    const boxLeft = 46, boxTop = 77, boxW = 189, boxH = 97
    await this.addShape({ slideIndex, shapeType: 'rectangle', left: boxLeft, top: boxTop, width: boxW, height: boxH, fillColor: t.accent })
    await this.addTextBox({ slideIndex, text: s.number, left: boxLeft + 11, top: boxTop + 11, width: boxW - 22, height: 43, fontSize: 33, bold: true, color: 'ffffff' })
    if (s.label) {
      await this.addTextBox({ slideIndex, text: s.label, left: boxLeft + 11, top: boxTop + 54, width: boxW - 22, height: 38, fontSize: 13, color: 'ffffff' })
    }
    // 右侧说明文字
    if (s.subtitle) {
      await this.addTextBox({ slideIndex, text: s.subtitle, left: 270, top: 77, width: 404, height: 97, fontSize: 17, color: t.body })
    }
    return slideIndex
  }

  /** #6 时间线 — 照抄 Mck timeline() L1175-1200 */
  private async _renderTimeline(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const events: any[] = s.events || []
    const n = events.length
    // 水平线 (Mck: LM+0.5", y=3.0", w=10.7")
    const lineY = 162
    await this.addLine({ slideIndex, startX: 73, startY: lineY, endX: 647, endY: lineY, color: 'cccccc', weight: 2 })
    const spacing = (628 - 27) / Math.max(n - 1, 1)  // (CW - 0.5" left padding) / (n-1)
    for (let i = 0; i < n; i++) {
      const mx = 73 + spacing * i
      const isLast = i === n - 1
      // 圆点
      await this.addShape({ slideIndex, shapeType: 'oval', left: mx - 12, top: lineY - 12, width: 24, height: 24, fillColor: isLast ? t.accent : '006ba6' })
      // 日期标签
      await this.addTextBox({ slideIndex, text: events[i].year || `节点 ${i + 1}`, left: mx - 54, top: 108, width: 108, height: 27, fontSize: 17, bold: true, color: t.title })
      // 描述
      const desc = [events[i].title, events[i].desc].filter(Boolean).join(': ')
      await this.addTextBox({ slideIndex, text: desc, left: mx - 54, top: 189, width: 108, height: 81, fontSize: 13, color: t.body })
    }
    return slideIndex
  }

  /** #7 双栏对比 — 照抄 Mck pros_cons() L1413-1442 */
  private async _renderComparison(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const halfW = 297  // Mck: Inches(5.5) × 0.75 ≈ 297pt
    const gap = 34     // Mck: Inches(0.733) × 0.75 ≈ 39pt (use 34 to fit CW=628)
    const leftX = 46, rightX = 46 + halfW + gap
    // 左侧
    await this.addTextBox({ slideIndex, text: s.left.title, left: leftX, top: 81, width: halfW, height: 22, fontSize: 17, bold: true, color: t.title })
    await this.addLine({ slideIndex, startX: leftX, startY: 108, endX: leftX + halfW, endY: 108, color: t.accent, weight: 2 })
    await this.addTextBox({ slideIndex, text: s.left.items.join('\n'), left: leftX, top: 119, width: halfW, height: 135, fontSize: 17, color: t.body })
    // 右侧
    await this.addTextBox({ slideIndex, text: s.right.title, left: rightX, top: 81, width: halfW, height: 22, fontSize: 17, bold: true, color: t.title })
    await this.addLine({ slideIndex, startX: rightX, startY: 108, endX: rightX + halfW, endY: 108, color: '666666', weight: 2 })
    await this.addTextBox({ slideIndex, text: s.right.items.join('\n'), left: rightX, top: 119, width: halfW, height: 135, fontSize: 17, color: t.body })
    // 底部结论
    if (s.conclusion) {
      await this.addShape({ slideIndex, shapeType: 'rectangle', left: 46, top: 281, width: 628, height: 81, fillColor: t.accentLight })
      await this.addTextBox({ slideIndex, text: s.conclusion.label, left: 62, top: 287, width: 81, height: 22, fontSize: 17, bold: true, color: t.accent })
      await this.addTextBox({ slideIndex, text: s.conclusion.text, left: 62, top: 314, width: 596, height: 32, fontSize: 17, color: t.body })
    }
    return slideIndex
  }

  /** #8 双栏内容 — 照抄 Mck two_column_text() L1459-1477 */
  private async _renderTwoColumn(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const cols: any[] = s.columns || []
    const colW = 297, colG = 34
    for (let i = 0; i < cols.length; i++) {
      const cx = 46 + (colW + colG) * i
      // 字母圆标
      await this.addShape({ slideIndex, shapeType: 'oval', left: cx, top: 81, width: 27, height: 27, fillColor: t.accent })
      await this.addTextBox({ slideIndex, text: cols[i].letter || String.fromCharCode(65 + i), left: cx, top: 83, width: 27, height: 22, fontSize: 13, color: 'ffffff' })
      // 列标题
      await this.addTextBox({ slideIndex, text: cols[i].label, left: cx + 32, top: 81, width: colW - 32, height: 22, fontSize: 17, bold: true, color: t.title })
      await this.addLine({ slideIndex, startX: cx, startY: 108, endX: cx + colW, endY: 108, color: 'cccccc', weight: 2 })
      await this.addTextBox({ slideIndex, text: (cols[i].items || []).join('\n'), left: cx, top: 119, width: colW, height: 216, fontSize: 17, color: t.body })
    }
    return slideIndex
  }

  /** #9 引用/金句 — 照抄 Mck quote() L1443-1458 */
  private async _renderBigQuote(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    const s = spec as any
    // 顶部 accent 细线 (Mck: rect 0,0, SW, 0.05")
    await this.addShape({ slideIndex, shapeType: 'rectangle', left: 0, top: 0, width: 720, height: 3, fillColor: t.accent })
    // 上装饰线 (Mck: hline 5.5", 2.0", 2.3")
    await this.addLine({ slideIndex, startX: 297, startY: 108, endX: 423, endY: 108, color: t.accent, weight: 2 })
    // 引用文字
    await this.addTextBox({ slideIndex, text: `"${s.quote}"`, left: 81, top: 135, width: 558, height: 135, fontSize: 24, color: t.title })
    // 下装饰线
    await this.addLine({ slideIndex, startX: 297, startY: 287, endX: 423, endY: 287, color: t.accent, weight: 2 })
    // 署名
    const attr: string[] = []
    if (s.author) attr.push(s.author)
    if (s.role) attr.push(s.role)
    if (attr.length > 0) {
      await this.addTextBox({ slideIndex, text: `— ${attr.join(', ')}`, left: 81, top: 302, width: 558, height: 27, fontSize: 17, color: '666666' })
    }
    return slideIndex
  }

  /** #10 指标网格 — 照抄 Mck scorecard() L470-503 */
  private async _renderStatGrid(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const stats: any[] = s.stats || []
    const headers = ['项目', '数值', '进度']
    await this.addTextBox({ slideIndex, text: headers[0], left: 46, top: 77, width: 216, height: 22, fontSize: 13, bold: true, color: '666666' })
    await this.addTextBox({ slideIndex, text: headers[1], left: 270, top: 77, width: 81, height: 22, fontSize: 13, bold: true, color: '666666' })
    await this.addTextBox({ slideIndex, text: headers[2], left: 378, top: 77, width: 270, height: 22, fontSize: 13, bold: true, color: '666666' })
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

  /** #11 流程步骤 — 照抄 Mck process_chevron() L726-768 */
  private async _renderProcessSteps(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const steps: any[] = s.steps || []
    const n = steps.length
    const MIN_GAP = 19  // Mck: Inches(0.35) × 0.75 ≈ 19pt
    const stepW = Math.min(140, (628 - MIN_GAP * (n - 1)) / n)  // Mck: PREFERRED_W = 2.6" × 0.75 ≈ 140pt
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
      const desc = steps[i].desc || ''
      if (desc) {
        await this.addTextBox({ slideIndex, text: desc, left: sx + 5, top: 146, width: stepW - 11, height: 108, fontSize: 13, color: t.body })
      }
      // 箭头
      if (i < n - 1) {
        const arrowW = Math.max(gap - 5, 11)
        await this.addTextBox({ slideIndex, text: '→', left: sx + stepW + 3, top: 92, width: arrowW, height: 27, fontSize: 20, color: 'cccccc' })
      }
    }
    return slideIndex
  }

  /** #12 图文混排 — 照抄 Mck content_right_image() L1577-1598 */
  private async _renderImageText(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const leftW = 351  // Mck: Inches(6.5) × 0.75 ≈ 351pt
    if (s.subtitle) {
      await this.addTextBox({ slideIndex, text: s.subtitle, left: 46, top: 77, width: leftW, height: 22, fontSize: 17, bold: true, color: t.title })
    }
    await this.addTextBox({ slideIndex, text: s.text, left: 46, top: s.subtitle ? 104 : 77, width: leftW, height: 189, fontSize: 17, color: t.body })
    // 右侧图片占位
    const imgX = 46 + leftW + 16
    const imgW = 628 - leftW - 16
    await this.addShape({ slideIndex, shapeType: 'rectangle', left: imgX, top: 77, width: imgW, height: 227, fillColor: 'cccccc' })
    await this.addTextBox({ slideIndex, text: s.image || '📷 图片占位', left: imgX + 16, top: 175, width: imgW - 32, height: 32, fontSize: 17, color: '666666' })
    return slideIndex
  }

  /** #13 章节过渡 — 照抄 Mck section_divider() L123-137 */
  private async _renderSectionDivider(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    const s = spec as any
    // 左侧 navy 色条 (Mck: rect 0,0, Inches(0.6), SH)
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

  /** #14 团队介绍 — 照抄 Mck meet_the_team() L1478-1506 */
  private async _renderTeam(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const members: any[] = s.members || []
    const n = members.length
    const cardW = (628 - 11 * (n - 1)) / n  // Mck: gap=Inches(0.2)×0.75≈11pt
    const cardG = 11
    for (let i = 0; i < n; i++) {
      const cx = 46 + (cardW + cardG) * i
      // 卡片底色
      await this.addShape({ slideIndex, shapeType: 'rectangle', left: cx, top: 81, width: cardW, height: 270, fillColor: t.accentLight })
      // 头像圆圈
      const avatarLeft = cx + cardW / 2 - 27
      await this.addShape({ slideIndex, shapeType: 'oval', left: avatarLeft, top: 92, width: 54, height: 54, fillColor: t.accent })
      await this.addTextBox({ slideIndex, text: members[i].name.charAt(0), left: avatarLeft, top: 97, width: 54, height: 43, fontSize: 24, color: 'ffffff' })
      // 姓名
      await this.addTextBox({ slideIndex, text: members[i].name, left: cx + 8, top: 157, width: cardW - 16, height: 22, fontSize: 17, bold: true, color: t.title })
      // 角色
      await this.addTextBox({ slideIndex, text: members[i].role, left: cx + 8, top: 184, width: cardW - 16, height: 22, fontSize: 17, color: '666666' })
      await this.addLine({ slideIndex, startX: cx + 16, startY: 211, endX: cx + cardW - 16, endY: 211, color: 'cccccc', weight: 1 })
      // 简介
      if (members[i].bio) {
        await this.addTextBox({ slideIndex, text: members[i].bio, left: cx + 8, top: 222, width: cardW - 16, height: 108, fontSize: 13, color: t.body })
      }
    }
    return slideIndex
  }

  /** #15 数据表格 — 照抄 Mck data_table() L275-312 */
  private async _renderTable(spec: any, t: Theme): Promise<number> {
    const { slideIndex } = await this.createSlide({ layout: 'blank' })
    await this.addTitle(slideIndex, spec.title as string)
    const s = spec as any
    const headers: string[] = s.headers || []
    const rows: string[][] = s.rows || []
    const n = headers.length
    const colWidths: number[] = Array(n).fill(Math.round(628 / n))  // 等宽分布
    // 表头 (Mck: CONTENT_TOP + 0.1" ≈ 77pt)
    let cx = 46
    for (let i = 0; i < n; i++) {
      await this.addTextBox({ slideIndex, text: headers[i], left: cx, top: 77, width: colWidths[i], height: 22, fontSize: 13, bold: true, color: '666666' })
      cx += colWidths[i]
    }
    await this.addLine({ slideIndex, startX: 46, startY: 101, endX: 674, endY: 101, color: '000000', weight: 1 })
    // 数据行
    const rowH = 51  // Mck: max(Inches(0.95) × 0.75, ...)
    const rowFont = 13
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
