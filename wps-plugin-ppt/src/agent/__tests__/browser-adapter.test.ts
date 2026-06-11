/**
 * BrowserSlideAdapter 单元测试
 *
 * 验证内存 mock 适配器的所有操作是否正确定。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BrowserSlideAdapter } from '../adapters/browser-slide-adapter'

describe('BrowserSlideAdapter', () => {
  let adapter: BrowserSlideAdapter

  beforeEach(() => {
    adapter = new BrowserSlideAdapter()
  })

  // ===== 基础操作 =====

  it('初始状态应为空', async () => {
    const info = await adapter.getPresentationInfo()
    expect(info.slideCount).toBe(0)
    expect(info.slides).toEqual([])
  })

  it('应能创建幻灯片', async () => {
    const result = await adapter.createSlide({ layout: 'content' })
    expect(result.slideIndex).toBe(1)

    const info = await adapter.getPresentationInfo()
    expect(info.slideCount).toBe(1)
  })

  it('幻灯片序号应递增', async () => {
    const r1 = await adapter.createSlide({ layout: 'content' })
    const r2 = await adapter.createSlide({ layout: 'content' })
    const r3 = await adapter.createSlide({ layout: 'blank' })

    expect(r1.slideIndex).toBe(1)
    expect(r2.slideIndex).toBe(2)
    expect(r3.slideIndex).toBe(3)
  })

  // ===== 文本框操作 =====

  it('应能为幻灯片添加文本框', async () => {
    await adapter.createSlide({ layout: 'content' })

    const result = await adapter.addTextBox({
      slideIndex: 1,
      text: '测试文本'
    })

    expect(result.success).toBe(true)

    const content = await adapter.getSlideContent(1)
    expect(content).toContain('测试文本')
  })

  it('文本框应保留字号和加粗属性', async () => {
    await adapter.createSlide({ layout: 'content' })

    await adapter.addTextBox({
      slideIndex: 1,
      text: '大号加粗文本',
      fontSize: 24,
      bold: true
    })

    const slides = adapter.getRawSlides()
    const textBox = slides[0].textBoxes[0]
    expect(textBox.fontSize).toBe(24)
    expect(textBox.bold).toBe(true)
  })

  it('添加不存在的幻灯片应抛出错误', async () => {
    await expect(
      adapter.addTextBox({ slideIndex: 999, text: '不存在' })
    ).rejects.toThrow('幻灯片 999 不存在')
  })

  // ===== 标题操作 =====

  it('应能为幻灯片添加标题（预设格式）', async () => {
    await adapter.createSlide({ layout: 'content' })

    await adapter.addTitle(1, '我的标题')

    const slides = adapter.getRawSlides()
    const titleBox = slides[0].textBoxes[0]
    expect(titleBox.text).toBe('我的标题')
    expect(titleBox.fontSize).toBe(32)
    expect(titleBox.bold).toBe(true)
    expect(titleBox.top).toBe(30)
  })

  // ===== 创建带标题的幻灯片 =====

  it('createSlide 带 title 参数应自动添加标题文本框', async () => {
    const result = await adapter.createSlide({
      layout: 'title',
      title: '首页标题'
    })

    expect(result.slideIndex).toBe(1)

    const slides = adapter.getRawSlides()
    expect(slides[0].textBoxes.length).toBe(1)
    expect(slides[0].textBoxes[0].text).toBe('首页标题')
  })

  // ===== 删除操作 =====

  it('应能删除幻灯片', async () => {
    await adapter.createSlide({ layout: 'content' })
    await adapter.createSlide({ layout: 'content' })

    const result = await adapter.deleteSlide(1)
    expect(result.success).toBe(true)

    const info = await adapter.getPresentationInfo()
    expect(info.slideCount).toBe(1)
    expect(info.slides[0].index).toBe(2)  // 第二页保留
  })

  it('删除不存在的幻灯片应抛出错误', async () => {
    await expect(
      adapter.deleteSlide(999)
    ).rejects.toThrow('幻灯片 999 不存在')
  })

  // ===== 多幻灯片场景 =====

  it('多页幻灯片应保持正确的顺序和内容', async () => {
    await adapter.createSlide({ layout: 'content' })
    await adapter.addTextBox({ slideIndex: 1, text: '第一页内容' })

    await adapter.createSlide({ layout: 'content' })
    await adapter.addTextBox({ slideIndex: 2, text: '第二页内容' })

    await adapter.createSlide({ layout: 'blank' })
    await adapter.addTextBox({ slideIndex: 3, text: '第三页内容' })

    const info = await adapter.getPresentationInfo()
    expect(info.slideCount).toBe(3)
    expect(info.slides[0].textContent).toContain('第一页内容')
    expect(info.slides[1].textContent).toContain('第二页内容')
    expect(info.slides[2].textContent).toContain('第三页内容')
    expect(info.slides[2].shapeCount).toBe(1)
  })

  // ===== getPresentationInfo 内容格式 =====

  it('getPresentationInfo 应返回正确格式的摘要', async () => {
    await adapter.createSlide({ layout: 'content' })
    await adapter.addTitle(1, '测试标题')
    await adapter.addTextBox({ slideIndex: 1, text: '正文第一段' })
    await adapter.addTextBox({ slideIndex: 1, text: '正文第二段', top: 160 })

    const info = await adapter.getPresentationInfo()
    const slide = info.slides[0]

    expect(slide.index).toBe(1)
    expect(slide.shapeCount).toBe(3)  // 标题 + 2个文本框
    expect(slide.textContent).toContain('测试标题')
    expect(slide.textContent).toContain('正文第一段')
    expect(slide.textContent).toContain('正文第二段')
  })

  // ===== 重置功能 =====

  it('reset 应清空所有数据', async () => {
    await adapter.createSlide({ layout: 'content' })
    await adapter.createSlide({ layout: 'content' })

    adapter.reset()

    const info = await adapter.getPresentationInfo()
    expect(info.slideCount).toBe(0)
  })

  // ===== Phase 07: 15 种模板渲染测试 =====

  it('applyTemplate type=big_number', async () => {
    const result = await adapter.applyTemplate({
      slides: [{ type: 'big_number', title: '指标', number: '85%', label: '增长率' }] as any
    })
    expect(result.slideIndices).toEqual([1])
    expect(result.summary).toContain('大数字')
  })

  it('applyTemplate type=timeline', async () => {
    const result = await adapter.applyTemplate({
      slides: [{ type: 'timeline', title: '历程', events: [{ year: '2022', title: '成立' }] }] as any
    })
    expect(result.slideIndices).toEqual([1])
    expect(result.summary).toContain('时间线')
  })

  it('applyTemplate type=comparison', async () => {
    const result = await adapter.applyTemplate({
      slides: [{ type: 'comparison', title: '分析', left: { title: 'L', items: ['a'] }, right: { title: 'R', items: ['b'] } }] as any
    })
    expect(result.slideIndices).toEqual([1])
    expect(result.summary).toContain('双栏对比')
  })

  it('applyTemplate type=big_quote', async () => {
    const result = await adapter.applyTemplate({
      slides: [{ type: 'big_quote', quote: '名言', author: '作者' }] as any
    })
    expect(result.slideIndices).toEqual([1])
    expect(result.summary).toContain('引用')
  })

  it('applyTemplate type=section_divider', async () => {
    const result = await adapter.applyTemplate({
      slides: [{ type: 'section_divider', title: '第二章', sectionLabel: '02' }] as any
    })
    expect(result.slideIndices).toEqual([1])
    expect(result.summary).toContain('章节过渡')
  })

  it('applyTemplate type=team', async () => {
    const result = await adapter.applyTemplate({
      slides: [{ type: 'team', title: '团队', members: [{ name: '张三', role: 'CEO' }] }] as any
    })
    expect(result.slideIndices).toEqual([1])
    expect(result.summary).toContain('团队')
  })

  it('applyTemplate type=table', async () => {
    const result = await adapter.applyTemplate({
      slides: [{ type: 'table', title: '对比', headers: ['项'], rows: [['值']] }] as any
    })
    expect(result.slideIndices).toEqual([1])
    expect(result.summary).toContain('表格')
  })

  it('applyTemplate 混合 8 种 type 批量创建', async () => {
    const result = await adapter.applyTemplate({
      slides: [
        { type: 'cover', title: '封面' },
        { type: 'big_number', title: '指标', number: '100', label: '万' },
        { type: 'bullets', title: '要点', items: ['A', 'B'] },
        { type: 'timeline', title: '历程', events: [{ year: '2022', title: '始' }] },
        { type: 'stat_grid', title: '网格', stats: [{ label: 'K', value: 'V' }] },
        { type: 'image_text', title: '图文', text: '内容' },
        { type: 'big_quote', quote: '名言' },
        { type: 'ending', title: '结束' }
      ] as any[]
    })
    expect(result.slideIndices.length).toBe(8)
    expect(result.summary).toContain('共创建8页')
  })
})
