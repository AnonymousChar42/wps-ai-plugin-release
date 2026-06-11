/**
 * Word 工具适配器接口
 *
 * 定义 Agent 与 Word/WPS Writer 文档之间的操作契约。
 * WPS 和 Browser 环境各自提供实现。
 *
 * API 设计参考：
 * - python-docx: Document → Paragraph → Run → Font 对象层级
 * - VBA Word: ActiveDocument.Paragraphs.Item(n).Range.Font/Format
 *
 * 注意：WPS Writer 无 TypeScript 声明（et-jsapi-declare 只有 Excel+PPT）。
 * 适配器通过 (window as any).Application.ActiveDocument 访问运行时 API。
 */

import type { ToolResult, DocumentInfo } from '@wpsai/shared/agent/tool-adapter'

// ============ 核心类型 ============

/** 段落信息 */
export interface ParagraphInfo {
  /** 段落索引（1-based，对齐 WPS 的 Paragraphs.Item(n)） */
  index: number
  /** 段落文本（纯文本，去除格式标记） */
  text: string
  /** 样式名称（如 "Heading 1"、"Normal"、"Title"），无则为空 */
  style?: string
  /** 文本前 80 字符预览（用于 LLM 快速了解内容） */
  preview: string
}

/** 文本格式选项 */
export interface TextFormatOptions {
  /** 加粗 */
  bold?: boolean
  /** 斜体 */
  italic?: boolean
  /** 下划线 */
  underline?: boolean
  /** 字号（磅，如 12 表示小四） */
  size?: number
  /** 字体名称（如 "宋体"、"黑体"） */
  name?: string
  /** 字体颜色（RRGGBB 格式，如 "FF0000" 红色） */
  color?: string
}

/** 段落格式选项 */
export interface ParagraphFormatOptions {
  /**
   * 水平对齐
   * - left: 左对齐（默认）
   * - center: 居中
   * - right: 右对齐
   * - justify: 两端对齐
   */
  alignment?: 'left' | 'center' | 'right' | 'justify'
  /** 段前间距（磅） */
  spaceBefore?: number
  /** 段后间距（磅） */
  spaceAfter?: number
  /** 行距倍数（1.0 = 单倍，1.5 = 1.5倍，2.0 = 双倍） */
  lineSpacing?: number
}

/** 表格单元格数据 */
export interface TableCellData {
  /** 行索引（1-based） */
  row: number
  /** 列索引（1-based） */
  col: number
  /** 单元格文本 */
  text: string
}

// ============ 适配器接口 ============

/** Word 工具适配器 */
export interface WordAdapter {
  readonly name: string

  /** 获取文档通用信息（实现 ToolAdapter） */
  getDocumentInfo(): Promise<DocumentInfo>

  /** 获取所有段落列表（含样式信息），供 LLM 了解文档结构 */
  getParagraphs(): Promise<ParagraphInfo[]>

  /** 读取指定段落的完整文本 */
  getText(paragraphIndex: number): Promise<string>

  /** 插入文本到文档末尾（默认）或指定段落之后 */
  insertText(text: string, position?: number): Promise<ToolResult>

  /** 替换指定段落的文本 */
  setText(paragraphIndex: number, text: string): Promise<ToolResult>

  /** 格式化文本（字体：加粗/斜体/下划线/字号/字体/颜色） */
  formatText(paragraphIndex: number, options: TextFormatOptions): Promise<ToolResult>

  /** 格式化段落（对齐/间距/行距） */
  formatParagraph(paragraphIndex: number, options: ParagraphFormatOptions): Promise<ToolResult>

  /** 应用样式（如 "Heading 1"、"Title"、"Normal"） */
  setStyle(paragraphIndex: number, styleName: string): Promise<ToolResult>

  /** 创建表格（rows × cols），默认插入到文档末尾 */
  createTable(rows: number, cols: number, position?: number): Promise<ToolResult>

  /** 填写表格单元格 */
  fillTable(tableIndex: number, cells: TableCellData[]): Promise<ToolResult>

  /** 查找替换（全文搜索） */
  findReplace(findText: string, replaceText: string): Promise<ToolResult>

  /** 插入分页符，默认在文档末尾 */
  insertPageBreak(position?: number): Promise<ToolResult>
}
