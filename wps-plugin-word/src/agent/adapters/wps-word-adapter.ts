/**
 * WPS 环境 Word 适配器
 *
 * 通过 WPSJS runtime API 操作真实 WPS Writer 文档。
 * 仅在 WPS 加载项运行时环境中可用。
 *
 * 注意：WPS Writer 无 TypeScript 声明（et-jsapi-declare 只有 Excel+PPT）。
 * 所有 API 访问通过 (window as any).Application.ActiveDocument。
 * 对象模型遵循 VBA Word 规范。
 */

import type {
  WordAdapter,
  ParagraphInfo,
  TextFormatOptions,
  ParagraphFormatOptions,
  TableCellData,
} from '../word-adapter'
import type { ToolResult, DocumentInfo } from '@wpsai/shared/agent/tool-adapter'

export class WpsWordAdapter implements WordAdapter {
  readonly name = 'WpsWordAdapter'

  /** 检测是否在 WPS Writer 加载项环境中 */
  static isAvailable(): boolean {
    try {
      const app = (window as any).Application
      // WPS Writer 的 ActiveDocument 存在即为 Writer 环境
      return !!(app?.ActiveDocument)
    } catch {
      return false
    }
  }

  private get app(): any {
    return (window as any).Application
  }

  private get doc(): any {
    return this.app?.ActiveDocument
  }

  // ========== 文档信息 ==========

  async getDocumentInfo(): Promise<DocumentInfo> {
    console.log('[WpsWordAdapter] getDocumentInfo 入参: (无)')
    try {
      const doc = this.doc
      if (!doc) {
        console.log('[WpsWordAdapter] getDocumentInfo 出参: count=0 (无文档)')
        return { count: 0 }
      }
      const result = {
        count: doc.Paragraphs?.Count || 0,
        title: doc.Name || '',
        sections: doc.Sections?.Count || 1,
      }
      console.log(`[WpsWordAdapter] getDocumentInfo 出参: ${JSON.stringify(result)}`)
      return result
    } catch (e: any) {
      console.error('[WpsWordAdapter] getDocumentInfo 异常:', e.message)
      return { count: 0 }
    }
  }

  // ========== 段落读取 ==========

  async getParagraphs(): Promise<ParagraphInfo[]> {
    console.log('[WpsWordAdapter] getParagraphs 入参: (无)')
    try {
      const doc = this.doc
      if (!doc) {
        console.log('[WpsWordAdapter] getParagraphs 出参: [] (无文档)')
        return []
      }

      const count = doc.Paragraphs?.Count || 0
      if (count === 0) {
        console.log('[WpsWordAdapter] getParagraphs 出参: [] (空文档)')
        return []
      }

      const result: ParagraphInfo[] = []
      for (let i = 1; i <= count; i++) {
        try {
          const para = doc.Paragraphs.Item(i)
          if (!para) continue

          const range = para.Range
          const text = (range?.Text || '').replace(/\r?\n?$/, '')  // 去除末尾换行符
          // WPS 中 Style 是对象，需取 .NameLocal 获取样式名
          let style = ''
          try {
            style = para.Style?.NameLocal || para.Style?.toString() || ''
          } catch {
            style = ''
          }

          result.push({
            index: i,
            text,
            style: style || undefined,
            preview: text.length > 80 ? text.substring(0, 80) + '...' : text,
          })
        } catch {
          // 跳过无法读取的段落
          continue
        }
      }

      console.log(`[WpsWordAdapter] getParagraphs 出参: ${result.length} 个段落`)
      return result
    } catch (e: any) {
      console.error('[WpsWordAdapter] getParagraphs 异常:', e.message)
      return []
    }
  }

  async getText(paragraphIndex: number): Promise<string> {
    console.log(`[WpsWordAdapter] getText 入参: paragraphIndex=${paragraphIndex}`)
    try {
      const doc = this.doc
      if (!doc) return ''

      const para = doc.Paragraphs.Item(paragraphIndex)
      if (!para) return ''

      const text = (para.Range?.Text || '').replace(/\r?\n?$/, '')
      console.log(`[WpsWordAdapter] getText 出参: length=${text.length}`)
      return text
    } catch (e: any) {
      console.error('[WpsWordAdapter] getText 异常:', e.message)
      return ''
    }
  }

  // ========== 文本操作 ==========

  async insertText(text: string, position?: number): Promise<ToolResult> {
    console.log(`[WpsWordAdapter] insertText 入参: text=${text.substring(0, 40)}, position=${position}`)
    try {
      const doc = this.doc
      if (!doc) return { success: false, message: '文档未打开' }

      if (position !== undefined && position > 0) {
        // 插入到指定段落之后：先在该段落末尾插入分段符，再设置新段落文本
        const para = doc.Paragraphs.Item(position)
        if (!para) return { success: false, message: `段落 ${position} 不存在` }
        para.Range.InsertParagraphAfter()
        // 新段落是 position+1
        const newPara = doc.Paragraphs.Item(position + 1)
        if (newPara) {
          newPara.Range.Text = text
        }
      } else {
        // 插入到文档末尾：用 Content.InsertParagraphAfter 然后设文本
        doc.Content.InsertParagraphAfter()
        const lastPara = doc.Paragraphs.Last
        if (lastPara) {
          lastPara.Range.Text = text
        }
      }

      const posMsg = position !== undefined ? `段落 ${position} 之后` : '文档末尾'
      return { success: true, message: `已在${posMsg}插入文本。` }
    } catch (e: any) {
      return { success: false, message: `插入文本失败：${e.message}` }
    }
  }

  async setText(paragraphIndex: number, text: string): Promise<ToolResult> {
    console.log(`[WpsWordAdapter] setText 入参: paragraphIndex=${paragraphIndex}, text=${text.substring(0, 40)}`)
    try {
      const doc = this.doc
      if (!doc) return { success: false, message: '文档未打开' }

      const para = doc.Paragraphs.Item(paragraphIndex)
      if (!para) return { success: false, message: `段落 ${paragraphIndex} 不存在` }

      para.Range.Text = text
      return { success: true, message: `已设置段落 ${paragraphIndex} 文本。` }
    } catch (e: any) {
      return { success: false, message: `设置文本失败：${e.message}` }
    }
  }

  // ========== 格式操作 ==========

  async formatText(paragraphIndex: number, options: TextFormatOptions): Promise<ToolResult> {
    console.log(`[WpsWordAdapter] formatText 入参: paragraphIndex=${paragraphIndex}, options=`, options)
    try {
      const doc = this.doc
      if (!doc) return { success: false, message: '文档未打开' }

      const para = doc.Paragraphs.Item(paragraphIndex)
      if (!para) return { success: false, message: `段落 ${paragraphIndex} 不存在` }

      const font = para.Range.Font
      if (options.bold !== undefined) font.Bold = options.bold
      if (options.italic !== undefined) font.Italic = options.italic
      if (options.underline !== undefined) font.Underline = options.underline ? 1 : 0  // wdUnderlineSingle=1
      if (options.size !== undefined) font.Size = options.size
      if (options.name !== undefined) font.Name = options.name
      if (options.color !== undefined) {
        // color 为 RRGGBB 字符串，WPS 用 RGB 数值
        font.Color = parseInt(options.color, 16)
      }

      const parts: string[] = []
      if (options.bold !== undefined) parts.push(options.bold ? '加粗' : '取消加粗')
      if (options.italic !== undefined) parts.push(options.italic ? '斜体' : '取消斜体')
      if (options.size !== undefined) parts.push(`字号${options.size}pt`)
      if (options.name !== undefined) parts.push(`字体${options.name}`)

      return {
        success: true,
        message: `已格式化段落 ${paragraphIndex}：${parts.join('、') || '已应用格式'}`,
      }
    } catch (e: any) {
      return { success: false, message: `格式化文本失败：${e.message}` }
    }
  }

  async formatParagraph(paragraphIndex: number, options: ParagraphFormatOptions): Promise<ToolResult> {
    console.log(`[WpsWordAdapter] formatParagraph 入参: paragraphIndex=${paragraphIndex}, options=`, options)
    try {
      const doc = this.doc
      if (!doc) return { success: false, message: '文档未打开' }

      const para = doc.Paragraphs.Item(paragraphIndex)
      if (!para) return { success: false, message: `段落 ${paragraphIndex} 不存在` }

      const fmt = para.Format

      if (options.alignment !== undefined) {
        const alignMap: Record<string, number> = {
          left: 0,      // wdAlignParagraphLeft
          center: 1,    // wdAlignParagraphCenter
          right: 2,     // wdAlignParagraphRight
          justify: 3,   // wdAlignParagraphJustify
        }
        fmt.Alignment = alignMap[options.alignment]
      }
      if (options.spaceBefore !== undefined) fmt.SpaceBefore = options.spaceBefore
      if (options.spaceAfter !== undefined) fmt.SpaceAfter = options.spaceAfter
      if (options.lineSpacing !== undefined) {
        fmt.LineSpacingRule = 5  // wdLineSpaceMultiple
        fmt.LineSpacing = options.lineSpacing * 12  // WPS 用磅值，1倍≈12pt
      }

      const parts: string[] = []
      if (options.alignment !== undefined) {
        const labelMap: Record<string, string> = { left: '左对齐', center: '居中', right: '右对齐', justify: '两端对齐' }
        parts.push(labelMap[options.alignment])
      }
      if (options.lineSpacing !== undefined) parts.push(`${options.lineSpacing}倍行距`)

      return {
        success: true,
        message: `已格式化段落 ${paragraphIndex}：${parts.join('、') || '已应用段落格式'}`,
      }
    } catch (e: any) {
      return { success: false, message: `格式化段落失败：${e.message}` }
    }
  }

  async setStyle(paragraphIndex: number, styleName: string): Promise<ToolResult> {
    console.log(`[WpsWordAdapter] setStyle 入参: paragraphIndex=${paragraphIndex}, styleName=${styleName}`)
    try {
      const doc = this.doc
      if (!doc) return { success: false, message: '文档未打开' }

      const para = doc.Paragraphs.Item(paragraphIndex)
      if (!para) return { success: false, message: `段落 ${paragraphIndex} 不存在` }

      // WPS 中设置样式：para.Style = doc.Styles.Item(styleName) 或直接赋值名称字符串
      try {
        para.Style = doc.Styles?.Item(styleName) || styleName
      } catch {
        // 某些样式可能不存在，尝试直接字符串赋值
        para.Style = styleName
      }

      return { success: true, message: `已对段落 ${paragraphIndex} 应用样式"${styleName}"。` }
    } catch (e: any) {
      return { success: false, message: `应用样式失败：${e.message}。可用样式：Heading 1-9, Title, Subtitle, Normal, Body Text` }
    }
  }

  // ========== 表格操作 ==========

  async createTable(rows: number, cols: number, position?: number): Promise<ToolResult> {
    console.log(`[WpsWordAdapter] createTable 入参: rows=${rows}, cols=${cols}, position=${position}`)
    try {
      const doc = this.doc
      if (!doc) return { success: false, message: '文档未打开' }

      let range: any
      if (position !== undefined && position > 0) {
        const para = doc.Paragraphs.Item(position)
        if (!para) return { success: false, message: `段落 ${position} 不存在` }
        range = para.Range
      } else {
        // 默认插入到文档末尾
        range = doc.Range(doc.Content.End - 1, doc.Content.End - 1)
      }

      // 先插入一个换行再把表格放在这里
      range.InsertParagraphAfter()
      const tableRange = doc.Range(doc.Content.End - 1, doc.Content.End - 1)
      doc.Tables.Add(tableRange, rows, cols)

      const tableIndex = doc.Tables.Count
      return { success: true, message: `已创建 ${rows}×${cols} 表格（编号 ${tableIndex}）。` }
    } catch (e: any) {
      return { success: false, message: `创建表格失败：${e.message}` }
    }
  }

  async fillTable(tableIndex: number, cells: TableCellData[]): Promise<ToolResult> {
    console.log(`[WpsWordAdapter] fillTable 入参: tableIndex=${tableIndex}, cells=${cells.length}个`)
    try {
      const doc = this.doc
      if (!doc) return { success: false, message: '文档未打开' }

      const table = doc.Tables.Item(tableIndex)
      if (!table) return { success: false, message: `表格 ${tableIndex} 不存在` }

      let filled = 0
      for (const cell of cells) {
        try {
          table.Cell(cell.row, cell.col).Range.Text = cell.text
          filled++
        } catch {
          // 跳过无效单元格
        }
      }

      return { success: true, message: `已填写表格 ${tableIndex} 的 ${filled} 个单元格。` }
    } catch (e: any) {
      return { success: false, message: `填写表格失败：${e.message}` }
    }
  }

  // ========== 查找替换 ==========

  async findReplace(findText: string, replaceText: string): Promise<ToolResult> {
    console.log(`[WpsWordAdapter] findReplace 入参: findText=${findText}, replaceText=${replaceText}`)
    try {
      const doc = this.doc
      if (!doc) return { success: false, message: '文档未打开' }

      const find = doc.Content.Find
      find.ClearFormatting()
      find.Text = findText

      // 使用 Execute 执行替换（VBA Find.Execute 签名）
      let count = 0
      const findForward = true
      const wrapFind = 1  // wdFindContinue = 1

      // WPS Find.Execute 参数顺序：(FindText, MatchCase, MatchWholeWord, MatchWildcards,
      //   MatchSoundsLike, MatchAllWordForms, Forward, Wrap, Format, ReplaceWith, Replace)
      const wdReplaceAll = 2
      try {
        const result = find.Execute(findText, false, false, false, false, false, findForward, wrapFind, false, replaceText, wdReplaceAll)
        count = result ? 1 : 0  // Execute 返回 boolean，无法获取精确替换次数
      } catch {
        // 降级：逐个查找替换
        while (find.Execute(findText, false, false, false, false, false, findForward, wrapFind, false, replaceText, 1)) {
          count++
        }
      }

      return { success: true, message: `查找替换完成："${findText}" → "${replaceText}"。` }
    } catch (e: any) {
      return { success: false, message: `查找替换失败：${e.message}` }
    }
  }

  // ========== 分页 ==========

  async insertPageBreak(position?: number): Promise<ToolResult> {
    console.log(`[WpsWordAdapter] insertPageBreak 入参: position=${position}`)
    try {
      const doc = this.doc
      if (!doc) return { success: false, message: '文档未打开' }

      let range: any
      if (position !== undefined && position > 0) {
        const para = doc.Paragraphs.Item(position)
        if (!para) return { success: false, message: `段落 ${position} 不存在` }
        range = para.Range
      } else {
        // 默认在文档末尾插入
        range = doc.Range(doc.Content.End - 1, doc.Content.End - 1)
        range.InsertParagraphAfter()
        range = doc.Range(doc.Content.End - 1, doc.Content.End - 1)
      }

      range.InsertBreak(7)  // wdPageBreak = 7

      const posMsg = position !== undefined ? `段落 ${position} 之前` : '文档末尾'
      return { success: true, message: `已在${posMsg}插入分页符。` }
    } catch (e: any) {
      return { success: false, message: `插入分页符失败：${e.message}` }
    }
  }
}
