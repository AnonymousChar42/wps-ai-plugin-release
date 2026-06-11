/**
 * 工具系统单元测试
 *
 * 验证工具 schema 构建和执行逻辑。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { buildToolSchemas, executeTool } from '../tools'
import { BrowserSlideAdapter } from '../adapters/browser-slide-adapter'
import { validateSlideSpec } from '../slide-tool-adapter'

describe('buildToolSchemas', () => {
  it('应返回 12 个工具 schema', () => {
    const schemas = buildToolSchemas()
    expect(schemas.length).toBe(12)
  })

  it('每个工具应有 type: function', () => {
    const schemas = buildToolSchemas()
    for (const s of schemas) {
      expect(s.type).toBe('function')
      expect(s.function.name).toBeTruthy()
      expect(s.function.description).toBeTruthy()
    }
  })

  it('应包含 get_presentation_info 工具', () => {
    const schemas = buildToolSchemas()
    const info = schemas.find(s => s.function.name === 'get_presentation_info')
    expect(info).toBeDefined()
    // 无参数工具应有空的 required 数组
    expect(info!.function.parameters.required).toEqual([])
  })

  it('应包含 done 工具（含 message 和 success 参数）', () => {
    const schemas = buildToolSchemas()
    const done = schemas.find(s => s.function.name === 'done')
    expect(done).toBeDefined()
    expect(done!.function.parameters.properties).toHaveProperty('message')
    expect(done!.function.parameters.properties).toHaveProperty('success')
    expect(done!.function.parameters.required).toContain('message')
    expect(done!.function.parameters.required).toContain('success')
  })

  it('add_slide_content 的 slide_index 和 text 应为必填', () => {
    const schemas = buildToolSchemas()
    const content = schemas.find(s => s.function.name === 'add_slide_content')
    expect(content).toBeDefined()
    expect(content!.function.parameters.required).toContain('slide_index')
    expect(content!.function.parameters.required).toContain('text')
  })

  it('应包含 add_shape 工具', () => {
    const schemas = buildToolSchemas()
    const tool = schemas.find(s => s.function.name === 'add_shape')
    expect(tool).toBeDefined()
    expect(tool!.function.parameters.properties).toHaveProperty('shape_type')
    expect(tool!.function.parameters.properties).toHaveProperty('fill_color')
  })

  it('应包含 add_line 工具', () => {
    const schemas = buildToolSchemas()
    const tool = schemas.find(s => s.function.name === 'add_line')
    expect(tool).toBeDefined()
    expect(tool!.function.parameters.properties).toHaveProperty('start_x')
  })

  it('应包含 set_slide_bg 工具', () => {
    const schemas = buildToolSchemas()
    const tool = schemas.find(s => s.function.name === 'set_slide_bg')
    expect(tool).toBeDefined()
    expect(tool!.function.parameters.required).toContain('color')
  })

  it('create_slide 的 layout 参数应有 enum 选项', () => {
    const schemas = buildToolSchemas()
    const create = schemas.find(s => s.function.name === 'create_slide')
    expect(create).toBeDefined()
    const layoutProp = create!.function.parameters.properties.layout
    expect(layoutProp).toBeDefined()
    expect(layoutProp.enum).toEqual(['title', 'content', 'blank'])
  })
})

describe('executeTool', () => {
  let adapter: BrowserSlideAdapter

  beforeEach(async () => {
    adapter = new BrowserSlideAdapter()
  })

  // ===== get_presentation_info =====

  it('空演示文稿应返回相应消息', async () => {
    const result = await executeTool('get_presentation_info', {}, adapter)
    expect(result.success).toBe(true)
    expect(result.message).toContain('为空')
  })

  it('非空演示文稿应列出所有幻灯片', async () => {
    await adapter.createSlide({ layout: 'content', title: '第一页' })
    await adapter.createSlide({ layout: 'content', title: '第二页' })

    const result = await executeTool('get_presentation_info', {}, adapter)
    expect(result.success).toBe(true)
    expect(result.message).toContain('共 2 页')
  })

  // ===== create_slide =====

  it('应成功创建幻灯片', async () => {
    const result = await executeTool('create_slide', { layout: 'content' }, adapter)
    expect(result.success).toBe(true)
    expect(result.message).toContain('成功创建')
    expect(result.message).toContain('第 1 页')
  })

  it('创建带标题的幻灯片应显示标题', async () => {
    const result = await executeTool(
      'create_slide',
      { layout: 'content', title: '测试标题' },
      adapter
    )
    expect(result.success).toBe(true)
    expect(result.message).toContain('测试标题')
  })

  // ===== add_slide_title =====

  it('应成功添加标题', async () => {
    await adapter.createSlide({ layout: 'content' })

    const result = await executeTool(
      'add_slide_title',
      { slide_index: 1, title: '我的标题' },
      adapter
    )
    expect(result.success).toBe(true)
    expect(result.message).toContain('我的标题')
  })

  // ===== add_slide_content =====

  it('应成功添加内容', async () => {
    await adapter.createSlide({ layout: 'content' })

    const result = await executeTool(
      'add_slide_content',
      { slide_index: 1, text: '正文内容' },
      adapter
    )
    expect(result.success).toBe(true)
    expect(result.message).toContain('正文内容')
  })

  it('超长文本应截断预览', async () => {
    await adapter.createSlide({ layout: 'content' })
    const longText = 'A'.repeat(100)

    const result = await executeTool(
      'add_slide_content',
      { slide_index: 1, text: longText },
      adapter
    )
    expect(result.success).toBe(true)
    expect(result.message).toContain('...')
  })

  // ===== delete_slide =====

  it('应成功删除幻灯片', async () => {
    await adapter.createSlide({ layout: 'content' })

    const result = await executeTool('delete_slide', { slide_index: 1 }, adapter)
    expect(result.success).toBe(true)
    expect(result.message).toContain('已删除')
  })

  // ===== done =====

  it('done 工具成功时应带 ✅', async () => {
    const result = await executeTool(
      'done',
      { message: '创建了 3 页幻灯片', success: true },
      adapter
    )
    expect(result.success).toBe(true)
    expect(result.message).toContain('✅')
    expect(result.message).toContain('创建了 3 页幻灯片')
  })

  it('done 工具失败时应带 ❌', async () => {
    const result = await executeTool(
      'done',
      { message: '内容不足', success: false },
      adapter
    )
    expect(result.success).toBe(false)
    expect(result.message).toContain('❌')
  })

  // ===== 错误处理 =====

  it('未知工具应返回失败', async () => {
    const result = await executeTool('unknown_tool', {}, adapter)
    expect(result.success).toBe(false)
    expect(result.message).toContain('未知工具')
  })

  it('工具执行异常应捕获', async () => {
    // 删除不存在的幻灯片会抛异常
    const result = await executeTool('delete_slide', { slide_index: 999 }, adapter)
    expect(result.success).toBe(false)
    expect(result.message).toContain('执行失败')
  })

  // ===== Phase 07: validateSlideSpec 15种类型校验 =====

  it('validateSlideSpec 无效 type 返回错误', () => {
    const err = validateSlideSpec({ type: 'invalid', title: 'test' })
    expect(err).toBeTruthy()
    expect(err).toContain('type 必须是')
  })

  it('validateSlideSpec big_quote 需 quote 字段', () => {
    const err = validateSlideSpec({ type: 'big_quote', title: 'test' })
    expect(err).toBeTruthy()
    expect(err).toContain('quote')
  })

  it('validateSlideSpec big_quote 合法返回 null', () => {
    expect(validateSlideSpec({ type: 'big_quote', quote: '名言' })).toBeNull()
  })

  it('validateSlideSpec timeline 需 events 数组', () => {
    const err = validateSlideSpec({ type: 'timeline', title: 'test' })
    expect(err).toBeTruthy()
    expect(err).toContain('events')
  })

  it('validateSlideSpec comparison 需 left.title', () => {
    const err = validateSlideSpec({ type: 'comparison', title: 'T', left: {}, right: { title: 'R', items: ['a'] } })
    expect(err).toBeTruthy()
  })

  it('validateSlideSpec team 需 members name+role', () => {
    const err = validateSlideSpec({ type: 'team', title: 'T', members: [{ role: 'CEO' }] })
    expect(err).toBeTruthy()
    expect(err).toContain('name')
  })

  it('validateSlideSpec section_divider 合法返回 null', () => {
    expect(validateSlideSpec({ type: 'section_divider', title: '章节' })).toBeNull()
  })
})
