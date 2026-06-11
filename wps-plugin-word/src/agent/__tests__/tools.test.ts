/**
 * Word 工具 Schema + 执行测试
 *
 * 测试：13 个工具的 Schema 定义和 executeTool 完整调用链。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BrowserWordAdapter } from '../adapters/browser-word-adapter'
import { buildToolSchemas, executeTool } from '../tools'

describe('Word Tools', () => {
  let adapter: BrowserWordAdapter

  beforeEach(() => {
    adapter = new BrowserWordAdapter()
    adapter.initTestData([
      '项目进展报告',
      '本文档记录项目当前进展状态。',
      '一、已完成工作',
      '前端页面开发已完成80%。',
      '后端API接口已全部开发完毕。',
      '二、进行中工作',
      '性能优化正在进行中。',
      '三、下一步计划',
      '1. 完成前端剩余20%。',
      '2. 进行系统集成测试。',
      '3. 准备上线部署。',
    ])
  })

  // ========== Schema 测试 ==========

  describe('buildToolSchemas', () => {
    it('返回 13 个工具 schema', () => {
      const schemas = buildToolSchemas()
      expect(schemas.length).toBe(13)
    })

    it('每个 schema 都有 name 和 description', () => {
      const schemas = buildToolSchemas()
      for (const s of schemas) {
        expect(s.function.name).toBeTruthy()
        expect(typeof s.function.name).toBe('string')
        expect(s.function.description).toBeTruthy()
        expect(typeof s.function.description).toBe('string')
      }
    })

    it('包含所有必需工具', () => {
      const schemas = buildToolSchemas()
      const names = schemas.map(s => s.function.name)
      const required = [
        'get_document_info',
        'get_paragraphs',
        'get_text',
        'insert_text',
        'set_text',
        'format_text',
        'format_paragraph',
        'set_style',
        'create_table',
        'fill_table',
        'find_replace',
        'insert_page_break',
        'done',
      ]
      for (const name of required) {
        expect(names).toContain(name)
      }
    })
  })

  // ========== executeTool 测试 ==========

  describe('get_document_info', () => {
    it('返回文档信息', async () => {
      const result = await executeTool('get_document_info', {}, adapter)
      expect(result.success).toBe(true)
      expect(result.message).toContain('11')
      expect(result.message).toContain('段落')
    })
  })

  describe('get_paragraphs', () => {
    it('返回所有段落（Markdown 表格格式）', async () => {
      const result = await executeTool('get_paragraphs', {}, adapter)
      expect(result.success).toBe(true)
      expect(result.message).toContain('| # |')
      expect(result.message).toContain('| 1 |')
      expect(result.message).toContain('项目进展报告')
    })

    it('空文档返回提示', async () => {
      const empty = new BrowserWordAdapter()
      const result = await executeTool('get_paragraphs', {}, empty)
      expect(result.success).toBe(true)
      expect(result.message).toContain('空')
    })
  })

  describe('get_text', () => {
    it('读取指定段落全文', async () => {
      const result = await executeTool('get_text', { paragraphIndex: 1 }, adapter)
      expect(result.success).toBe(true)
      expect(result.message).toContain('项目进展报告')
    })

    it('paragraphIndex 无效报错', async () => {
      const result = await executeTool('get_text', { paragraphIndex: 0 }, adapter)
      expect(result.success).toBe(false)
    })
  })

  describe('insert_text', () => {
    it('插入文本到末尾', async () => {
      const result = await executeTool('insert_text', { text: '附录' }, adapter)
      expect(result.success).toBe(true)
      expect(result.message).toContain('末尾')
    })

    it('text 为空报错', async () => {
      const result = await executeTool('insert_text', { text: '' }, adapter)
      expect(result.success).toBe(false)
    })
  })

  describe('set_text', () => {
    it('替换段落文本', async () => {
      const result = await executeTool('set_text', { paragraphIndex: 1, text: '新标题' }, adapter)
      expect(result.success).toBe(true)

      const text = await adapter.getText(1)
      expect(text).toBe('新标题')
    })

    it('缺少参数报错', async () => {
      const result = await executeTool('set_text', { paragraphIndex: 1 }, adapter)
      expect(result.success).toBe(false)
    })
  })

  describe('format_text', () => {
    it('设置加粗', async () => {
      const result = await executeTool('format_text', { paragraphIndex: 1, bold: true }, adapter)
      expect(result.success).toBe(true)
      expect(result.message).toContain('格式化段落')
    })

    it('无任何格式选项报错', async () => {
      const result = await executeTool('format_text', { paragraphIndex: 1 }, adapter)
      expect(result.success).toBe(false)
    })

    it('数组批量格式化', async () => {
      const result = await executeTool('format_text', { paragraphIndex: [1, 2, 3], bold: true }, adapter)
      expect(result.success).toBe(true)
      expect(result.message).toContain('3 个段落')
    })
  })

  describe('format_paragraph', () => {
    it('设置对齐', async () => {
      const result = await executeTool('format_paragraph', { paragraphIndex: 1, alignment: 'center' }, adapter)
      expect(result.success).toBe(true)
    })

    it('设置行距', async () => {
      const result = await executeTool('format_paragraph', { paragraphIndex: 1, lineSpacing: 1.5 }, adapter)
      expect(result.success).toBe(true)
    })

    it('数组批量格式化', async () => {
      const result = await executeTool('format_paragraph', { paragraphIndex: [4, 5, 6, 7, 8], lineSpacing: 1.5 }, adapter)
      expect(result.success).toBe(true)
      expect(result.message).toContain('5 个段落')
    })
  })

  describe('set_style', () => {
    it('应用 Heading 1 样式', async () => {
      const result = await executeTool('set_style', { paragraphIndex: 1, styleName: 'Heading 1' }, adapter)
      expect(result.success).toBe(true)
      expect(result.message).toContain('Heading 1')
    })

    it('数组批量应用样式', async () => {
      const result = await executeTool('set_style', { paragraphIndex: [1, 4, 7, 10], styleName: 'Heading 1' }, adapter)
      expect(result.success).toBe(true)
      expect(result.message).toContain('4 个段落')
    })
  })

  describe('create_table', () => {
    it('创建表格', async () => {
      const result = await executeTool('create_table', { rows: 3, cols: 4 }, adapter)
      expect(result.success).toBe(true)
      expect(result.message).toContain('3×4')
    })

    it('rows 为 0 报错', async () => {
      const result = await executeTool('create_table', { rows: 0, cols: 4 }, adapter)
      expect(result.success).toBe(false)
    })
  })

  describe('fill_table', () => {
    it('填写表格', async () => {
      await executeTool('create_table', { rows: 2, cols: 2 }, adapter)
      const result = await executeTool('fill_table', {
        tableIndex: 1,
        cells: [
          { row: 1, col: 1, text: 'A1' },
          { row: 1, col: 2, text: 'B1' },
        ],
      }, adapter)
      expect(result.success).toBe(true)
    })

    it('cells 为空数组报错', async () => {
      const result = await executeTool('fill_table', { tableIndex: 1, cells: [] }, adapter)
      expect(result.success).toBe(false)
    })
  })

  describe('find_replace', () => {
    it('替换文本', async () => {
      const result = await executeTool('find_replace', { findText: '项目', replaceText: 'Project' }, adapter)
      expect(result.success).toBe(true)

      const text = await adapter.getText(1)
      expect(text).toContain('Project')
    })

    it('findText 为空报错', async () => {
      const result = await executeTool('find_replace', { findText: '', replaceText: 'x' }, adapter)
      expect(result.success).toBe(false)
    })
  })

  describe('insert_page_break', () => {
    it('插入分页符', async () => {
      const result = await executeTool('insert_page_break', {}, adapter)
      expect(result.success).toBe(true)
      expect(result.message).toContain('分页')
    })
  })

  describe('done', () => {
    it('完成操作', async () => {
      const result = await executeTool('done', { message: '已完成排版' }, adapter)
      expect(result.success).toBe(true)
      expect(result.message).toBe('已完成排版')
    })
  })

  describe('未知工具', () => {
    it('返回错误', async () => {
      const result = await executeTool('unknown_tool', {}, adapter)
      expect(result.success).toBe(false)
      expect(result.message).toContain('未知')
    })
  })
})
