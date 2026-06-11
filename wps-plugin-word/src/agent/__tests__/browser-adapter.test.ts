/**
 * Browser Word 适配器测试
 *
 * 测试内存 mock 的所有 12 个方法。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BrowserWordAdapter } from '../adapters/browser-word-adapter'

describe('BrowserWordAdapter', () => {
  let adapter: BrowserWordAdapter

  beforeEach(() => {
    adapter = new BrowserWordAdapter()
  })

  // ========== 文档信息 ==========

  describe('getDocumentInfo', () => {
    it('空文档返回 count=0', async () => {
      const info = await adapter.getDocumentInfo()
      expect(info.count).toBe(0)
      expect(info.title).toBe('未命名文档')
    })

    it('有段落时返回正确数量', async () => {
      adapter.initTestData(['标题', '正文内容'])
      const info = await adapter.getDocumentInfo()
      expect(info.count).toBe(2)
    })
  })

  // ========== 段落读取 ==========

  describe('getParagraphs', () => {
    it('空文档返回空数组', async () => {
      const paragraphs = await adapter.getParagraphs()
      expect(paragraphs).toEqual([])
    })

    it('返回所有段落（含样式和预览）', async () => {
      adapter.initTestData(['测试标题', '第一段正文内容，比较长的一段文字用来测试预览截断功能是否正常工作。'])
      const paragraphs = await adapter.getParagraphs()
      expect(paragraphs.length).toBe(2)
      expect(paragraphs[0].index).toBe(1)
      expect(paragraphs[0].text).toBe('测试标题')
      expect(paragraphs[0].style).toBe('Title')  // 短文本自动识别为 Title
      expect(paragraphs[1].index).toBe(2)
      // 短文本不截断（< 80 字符）
      expect(paragraphs[1].preview.endsWith('...')).toBe(false)
      expect(paragraphs[1].text).toBe(paragraphs[1].preview) // 全文 = 预览
    })
  })

  describe('getText', () => {
    it('读取存在的段落', async () => {
      adapter.initTestData(['第一段', '第二段'])
      const text = await adapter.getText(1)
      expect(text).toBe('第一段')
    })

    it('不存在的段落返回空字符串', async () => {
      const text = await adapter.getText(99)
      expect(text).toBe('')
    })
  })

  // ========== 文本操作 ==========

  describe('insertText', () => {
    it('默认插入到末尾', async () => {
      adapter.initTestData(['已有段落'])
      const result = await adapter.insertText('新增段落')
      expect(result.success).toBe(true)
      expect(result.message).toContain('末尾')

      const paragraphs = await adapter.getParagraphs()
      expect(paragraphs.length).toBe(2)
      expect(paragraphs[1].text).toBe('新增段落')
    })

    it('插入到指定位置之后', async () => {
      adapter.initTestData(['A', 'B', 'C'])
      const result = await adapter.insertText('插入', 1)
      expect(result.success).toBe(true)

      const paragraphs = await adapter.getParagraphs()
      expect(paragraphs.length).toBe(4)
      expect(paragraphs[1].text).toBe('插入')
    })

    it('插入到不存在的 position 时追加到末尾', async () => {
      const result = await adapter.insertText('测试', 999)
      expect(result.success).toBe(true)
      expect(result.message).toContain('末尾')
    })
  })

  describe('setText', () => {
    it('替换存在的段落', async () => {
      adapter.initTestData(['旧内容'])
      const result = await adapter.setText(1, '新内容')
      expect(result.success).toBe(true)

      const text = await adapter.getText(1)
      expect(text).toBe('新内容')
    })

    it('替换不存在的段落返回失败', async () => {
      const result = await adapter.setText(99, '内容')
      expect(result.success).toBe(false)
    })
  })

  // ========== 格式操作 ==========

  describe('formatText', () => {
    it('设置加粗', async () => {
      adapter.initTestData(['测试'])
      const result = await adapter.formatText(1, { bold: true })
      expect(result.success).toBe(true)
      expect(result.message).toContain('加粗')

      const data = adapter.getParagraphData()
      expect(data[0].bold).toBe(true)
    })

    it('设置字号', async () => {
      adapter.initTestData(['测试'])
      await adapter.formatText(1, { size: 16 })
      const data = adapter.getParagraphData()
      expect(data[0].fontSize).toBe(16)
    })

    it('设置字体名称', async () => {
      adapter.initTestData(['测试'])
      await adapter.formatText(1, { name: '微软雅黑' })
      const data = adapter.getParagraphData()
      expect(data[0].fontName).toBe('微软雅黑')
    })

    it('不存在的段落返回失败', async () => {
      const result = await adapter.formatText(99, { bold: true })
      expect(result.success).toBe(false)
    })
  })

  describe('formatParagraph', () => {
    it('设置居中对齐', async () => {
      adapter.initTestData(['测试'])
      const result = await adapter.formatParagraph(1, { alignment: 'center' })
      expect(result.success).toBe(true)

      const data = adapter.getParagraphData()
      expect(data[0].alignment).toBe('center')
    })

    it('设置行距', async () => {
      adapter.initTestData(['测试'])
      await adapter.formatParagraph(1, { lineSpacing: 1.5 })
      const data = adapter.getParagraphData()
      expect(data[0].lineSpacing).toBe(1.5)
    })
  })

  describe('setStyle', () => {
    it('应用标题样式', async () => {
      adapter.initTestData(['普通段落'])
      const result = await adapter.setStyle(1, 'Heading 1')
      expect(result.success).toBe(true)

      const data = adapter.getParagraphData()
      expect(data[0].style).toBe('Heading 1')
    })
  })

  // ========== 表格操作 ==========

  describe('createTable', () => {
    it('创建表格', async () => {
      const result = await adapter.createTable(3, 4)
      expect(result.success).toBe(true)
      expect(result.message).toContain('3×4')

      const tables = adapter.getTableData()
      expect(tables.length).toBe(1)
      expect(tables[0].rows).toBe(3)
      expect(tables[0].cols).toBe(4)
    })

    it('多次创建表格编号递增', async () => {
      await adapter.createTable(2, 2)
      await adapter.createTable(3, 3)
      const tables = adapter.getTableData()
      expect(tables.length).toBe(2)
    })
  })

  describe('fillTable', () => {
    it('填写表格单元格', async () => {
      await adapter.createTable(2, 3)
      const result = await adapter.fillTable(1, [
        { row: 1, col: 1, text: '姓名' },
        { row: 1, col: 2, text: '部门' },
        { row: 2, col: 1, text: '张三' },
      ])
      expect(result.success).toBe(true)
      expect(result.message).toContain('3')

      const tables = adapter.getTableData()
      expect(tables[0].cells[0][0]).toBe('姓名')
      expect(tables[0].cells[0][1]).toBe('部门')
      expect(tables[0].cells[1][0]).toBe('张三')
      expect(tables[0].cells[0][2]).toBe('')  // 未填写
    })

    it('表格不存在返回失败', async () => {
      const result = await adapter.fillTable(99, [{ row: 1, col: 1, text: 'x' }])
      expect(result.success).toBe(false)
    })

    it('超出表格范围的不填', async () => {
      await adapter.createTable(2, 2)
      const result = await adapter.fillTable(1, [
        { row: 3, col: 1, text: '越界' },
        { row: 1, col: 1, text: '正常' },
      ])
      expect(result.success).toBe(true)
      expect(result.message).toContain('1')  // 只填了1个

      const tables = adapter.getTableData()
      expect(tables[0].cells[0][0]).toBe('正常')
    })
  })

  // ========== 查找替换 ==========

  describe('findReplace', () => {
    it('替换所有匹配', async () => {
      adapter.initTestData(['Hello World', 'Hello WPS'])
      const result = await adapter.findReplace('Hello', '你好')
      expect(result.success).toBe(true)

      const paragraphs = await adapter.getParagraphs()
      expect(paragraphs[0].text).toBe('你好 World')
      expect(paragraphs[1].text).toBe('你好 WPS')
    })

    it('无匹配时不变', async () => {
      adapter.initTestData(['测试文字'])
      await adapter.findReplace('不存在', '替换')
      const paragraphs = await adapter.getParagraphs()
      expect(paragraphs[0].text).toBe('测试文字')
    })
  })

  // ========== 分页 ==========

  describe('insertPageBreak', () => {
    it('默认在末尾插入', async () => {
      adapter.initTestData(['第一段'])
      const result = await adapter.insertPageBreak()
      expect(result.success).toBe(true)

      const paragraphs = await adapter.getParagraphs()
      expect(paragraphs.length).toBe(2)
    })

    it('在指定位置之前插入', async () => {
      adapter.initTestData(['A', 'B', 'C'])
      const result = await adapter.insertPageBreak(2)
      expect(result.success).toBe(true)

      const paragraphs = await adapter.getParagraphs()
      expect(paragraphs.length).toBe(4)
    })
  })

  // ========== isAvailable ==========

  describe('isAvailable', () => {
    it('Browser 环境永远返回 false', () => {
      expect(BrowserWordAdapter.isAvailable()).toBe(false)
    })
  })
})
