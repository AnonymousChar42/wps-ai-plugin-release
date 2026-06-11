/**
 * 浏览器环境 Word 适配器（Mock）
 *
 * 在内存中维护 Word 文档模型，供 vitest 测试使用。
 * 模拟 WPS Word 的对象模型行为。
 */

import type {
  WordAdapter,
  ParagraphInfo,
  TextFormatOptions,
  ParagraphFormatOptions,
  TableCellData,
} from '../word-adapter'
import type { ToolResult, DocumentInfo } from '@wpsai/shared/agent/tool-adapter'

/** 内存中的段落 */
interface MockParagraph {
  text: string
  style: string
  bold: boolean
  italic: boolean
  underline: boolean
  fontSize: number
  fontName: string
  fontColor: string
  alignment: string
  spaceBefore: number
  spaceAfter: number
  lineSpacing: number
}

/** 内存中的表格 */
interface MockTable {
  rows: number
  cols: number
  cells: string[][]
}

export class BrowserWordAdapter implements WordAdapter {
  readonly name = 'BrowserWordAdapter'

  /** 段落列表 */
  private _paragraphs: MockParagraph[] = []
  /** 表格列表 */
  private _tables: MockTable[] = []
  /** 文档标题 */
  private _title = ''

  /** 创建默认段落 */
  private _defaultParagraph(): MockParagraph {
    return {
      text: '',
      style: 'Normal',
      bold: false,
      italic: false,
      underline: false,
      fontSize: 12,
      fontName: '宋体',
      fontColor: '000000',
      alignment: 'left',
      spaceBefore: 0,
      spaceAfter: 0,
      lineSpacing: 1.0,
    }
  }

  /** 是否在 WPS 环境中（永远 false —— 这是 mock） */
  static isAvailable(): boolean {
    return false
  }

  /** 初始化测试数据 */
  initTestData(paragraphs: string[]): void {
    this._paragraphs = paragraphs.map((text, i) => {
      const para = this._defaultParagraph()
      para.text = text
      // 简单检测标题：包含"标题"keyword 或短文本开头
      if (i === 0 && text.length < 30) {
        para.style = 'Title'
      }
      return para
    })
  }

  /** 获取当前段落数据（仅用于测试验证） */
  getParagraphData(): MockParagraph[] {
    return this._paragraphs
  }

  /** 获取当前表格数据（仅用于测试验证） */
  getTableData(): MockTable[] {
    return this._tables
  }

  // ========== 文档信息 ==========

  async getDocumentInfo(): Promise<DocumentInfo> {
    return {
      count: this._paragraphs.length,
      title: this._title || '未命名文档',
      sections: 1,
    }
  }

  // ========== 段落读取 ==========

  async getParagraphs(): Promise<ParagraphInfo[]> {
    return this._paragraphs.map((p, i) => ({
      index: i + 1,
      text: p.text,
      style: p.style || undefined,
      preview: p.text.length > 80 ? p.text.substring(0, 80) + '...' : p.text,
    }))
  }

  async getText(paragraphIndex: number): Promise<string> {
    const idx = paragraphIndex - 1
    if (idx < 0 || idx >= this._paragraphs.length) return ''
    return this._paragraphs[idx].text
  }

  // ========== 文本操作 ==========

  async insertText(text: string, position?: number): Promise<ToolResult> {
    const para = this._defaultParagraph()
    para.text = text

    if (position !== undefined && position > 0 && position <= this._paragraphs.length) {
      this._paragraphs.splice(position, 0, para)
      return { success: true, message: `已在段落 ${position} 之后插入文本（新段落 ${position + 1}）。` }
    } else {
      this._paragraphs.push(para)
      const newIndex = this._paragraphs.length
      return { success: true, message: `已在文档末尾插入文本（新段落 ${newIndex}）。` }
    }
  }

  async setText(paragraphIndex: number, text: string): Promise<ToolResult> {
    const idx = paragraphIndex - 1
    if (idx < 0 || idx >= this._paragraphs.length) {
      return { success: false, message: `段落 ${paragraphIndex} 不存在` }
    }
    this._paragraphs[idx].text = text
    return { success: true, message: `已设置段落 ${paragraphIndex} 文本。` }
  }

  // ========== 格式操作 ==========

  async formatText(paragraphIndex: number, options: TextFormatOptions): Promise<ToolResult> {
    const idx = paragraphIndex - 1
    if (idx < 0 || idx >= this._paragraphs.length) {
      return { success: false, message: `段落 ${paragraphIndex} 不存在` }
    }

    const p = this._paragraphs[idx]
    if (options.bold !== undefined) p.bold = options.bold
    if (options.italic !== undefined) p.italic = options.italic
    if (options.underline !== undefined) p.underline = options.underline
    if (options.size !== undefined) p.fontSize = options.size
    if (options.name !== undefined) p.fontName = options.name
    if (options.color !== undefined) p.fontColor = options.color

    const parts: string[] = []
    if (options.bold !== undefined) parts.push(options.bold ? '加粗' : '取消加粗')
    if (options.size !== undefined) parts.push(`字号${options.size}pt`)
    return {
      success: true,
      message: `已格式化段落 ${paragraphIndex}：${parts.join('、') || '已应用格式'}`,
    }
  }

  async formatParagraph(paragraphIndex: number, options: ParagraphFormatOptions): Promise<ToolResult> {
    const idx = paragraphIndex - 1
    if (idx < 0 || idx >= this._paragraphs.length) {
      return { success: false, message: `段落 ${paragraphIndex} 不存在` }
    }

    const p = this._paragraphs[idx]
    if (options.alignment !== undefined) p.alignment = options.alignment
    if (options.spaceBefore !== undefined) p.spaceBefore = options.spaceBefore
    if (options.spaceAfter !== undefined) p.spaceAfter = options.spaceAfter
    if (options.lineSpacing !== undefined) p.lineSpacing = options.lineSpacing

    return {
      success: true,
      message: `已格式化段落 ${paragraphIndex}。`,
    }
  }

  async setStyle(paragraphIndex: number, styleName: string): Promise<ToolResult> {
    const idx = paragraphIndex - 1
    if (idx < 0 || idx >= this._paragraphs.length) {
      return { success: false, message: `段落 ${paragraphIndex} 不存在` }
    }

    this._paragraphs[idx].style = styleName
    return { success: true, message: `已对段落 ${paragraphIndex} 应用样式"${styleName}"。` }
  }

  // ========== 表格操作 ==========

  async createTable(rows: number, cols: number, _position?: number): Promise<ToolResult> {
    const table: MockTable = {
      rows,
      cols,
      cells: Array.from({ length: rows }, () => Array(cols).fill('')),
    }
    this._tables.push(table)

    const tableIndex = this._tables.length
    return { success: true, message: `已创建 ${rows}×${cols} 表格（编号 ${tableIndex}）。` }
  }

  async fillTable(tableIndex: number, cells: TableCellData[]): Promise<ToolResult> {
    const idx = tableIndex - 1
    if (idx < 0 || idx >= this._tables.length) {
      return { success: false, message: `表格 ${tableIndex} 不存在` }
    }

    const table = this._tables[idx]
    let filled = 0
    for (const cell of cells) {
      if (cell.row >= 1 && cell.row <= table.rows && cell.col >= 1 && cell.col <= table.cols) {
        table.cells[cell.row - 1][cell.col - 1] = cell.text
        filled++
      }
    }

    return { success: true, message: `已填写表格 ${tableIndex} 的 ${filled} 个单元格。` }
  }

  // ========== 查找替换 ==========

  async findReplace(findText: string, replaceText: string): Promise<ToolResult> {
    let count = 0
    for (const para of this._paragraphs) {
      const before = para.text
      para.text = para.text.split(findText).join(replaceText)
      if (before !== para.text) count++
    }

    return { success: true, message: `查找替换完成："${findText}" → "${replaceText}"（${count} 处）。` }
  }

  // ========== 分页 ==========

  async insertPageBreak(position?: number): Promise<ToolResult> {
    const para = this._defaultParagraph()
    para.text = '--- 分页符 ---'

    if (position !== undefined && position > 0 && position <= this._paragraphs.length) {
      this._paragraphs.splice(position - 1, 0, para)
      return { success: true, message: `已在段落 ${position} 之前插入分页符。` }
    } else {
      this._paragraphs.push(para)
      return { success: true, message: '已在文档末尾插入分页符。' }
    }
  }
}
