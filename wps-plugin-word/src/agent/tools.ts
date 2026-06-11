/**
 * Word 智能体工具定义
 *
 * 13 个工具：get_document_info / get_paragraphs / get_text /
 *   insert_text / set_text / format_text / format_paragraph /
 *   set_style / create_table / fill_table / find_replace /
 *   insert_page_break / done
 */

import type { WordAdapter } from './word-adapter'
import type { ToolSchema, ToolParameterProperty } from '@wpsai/shared/agent/types'
import type { ToolResult } from '@wpsai/shared/agent/tool-adapter'
import { clampMsg } from '@wpsai/shared/agent/tool-utils'

// ========== 工具 Schema 定义 ==========

/** 获取文档信息 */
const getDocInfoSchema: Record<string, ToolParameterProperty> = {
  // 无需参数
}

/** 列出所有段落 */
const getParagraphsSchema: Record<string, ToolParameterProperty> = {
  // 无需参数
}

/** 读取段落全文 */
const getTextSchema: Record<string, ToolParameterProperty> = {
  paragraphIndex: {
    type: 'number',
    description: '段落索引（从1开始，对应 get_paragraphs 返回的 index 字段）',
  },
}

/** 插入文本 */
const insertTextSchema: Record<string, ToolParameterProperty> = {
  text: { type: 'string', description: '要插入的文本内容' },
  position: {
    type: 'number',
    description: '插入位置：段落索引（插入到该段落之后）。省略则插入到文档末尾',
  },
}

/** 设置文本 */
const setTextSchema: Record<string, ToolParameterProperty> = {
  paragraphIndex: { type: 'number', description: '段落索引（从1开始）' },
  text: { type: 'string', description: '新文本内容' },
}

/** 格式化文本 */
const formatTextSchema: Record<string, ToolParameterProperty> = {
  paragraphIndex: {
    type: 'number',
    description: '段落索引（从1开始）。也支持数组如 [2,3,4,5,6,7,8] 批量格式化多个段落',
  },
  bold: { type: 'boolean', description: '是否加粗（可选）' },
  italic: { type: 'boolean', description: '是否斜体（可选）' },
  underline: { type: 'boolean', description: '是否下划线（可选）' },
  size: { type: 'number', description: '字号（磅，如 12=小四、16=三号），可选' },
  name: { type: 'string', description: '字体名称（如"宋体"、"黑体"、"微软雅黑"），可选' },
  color: { type: 'string', description: '字体颜色（RRGGBB 格式，如 "FF0000"=红色、"0000FF"=蓝色），可选' },
}

/** 格式化段落 */
const formatParagraphSchema: Record<string, ToolParameterProperty> = {
  paragraphIndex: {
    type: 'number',
    description: '段落索引（从1开始）。也支持数组如 [4,5,6,7,8] 批量格式化多个段落',
  },
  alignment: {
    type: 'string',
    description: '水平对齐：left=左对齐, center=居中, right=右对齐, justify=两端对齐（可选）',
    enum: ['left', 'center', 'right', 'justify'],
  },
  spaceBefore: { type: 'number', description: '段前间距（磅），可选' },
  spaceAfter: { type: 'number', description: '段后间距（磅），可选' },
  lineSpacing: { type: 'number', description: '行距倍数（1.0=单倍, 1.5=1.5倍, 2.0=双倍），可选' },
}

/** 应用样式 */
const setStyleSchema: Record<string, ToolParameterProperty> = {
  paragraphIndex: {
    type: 'number',
    description: '段落索引（从1开始）。也支持数组如 [1,4,7,10] 批量应用同一样式',
  },
  styleName: {
    type: 'string',
    description: '样式名称。常用：Heading 1-9（标题1-9级）、Title（文档标题）、Subtitle（副标题）、Normal（正文）、Body Text（正文）',
  },
}

/** 创建表格 */
const createTableSchema: Record<string, ToolParameterProperty> = {
  rows: { type: 'number', description: '行数' },
  cols: { type: 'number', description: '列数' },
  position: {
    type: 'number',
    description: '插入位置：段落索引（插入到该段落之后）。省略则插入到文档末尾',
  },
}

/** 填写表格 */
const fillTableSchema: Record<string, ToolParameterProperty> = {
  tableIndex: { type: 'number', description: '表格编号（从1开始，create_table 返回的编号）' },
  cells: {
    type: 'array',
    description: '单元格数据数组，每项含 {row, col, text}',
    items: {
      type: 'object',
      properties: {
        row: { type: 'number', description: '行号（从1开始）' },
        col: { type: 'number', description: '列号（从1开始）' },
        text: { type: 'string', description: '单元格文本' },
      },
      required: ['row', 'col', 'text'],
    },
  },
}

/** 查找替换 */
const findReplaceSchema: Record<string, ToolParameterProperty> = {
  findText: { type: 'string', description: '要查找的文本' },
  replaceText: { type: 'string', description: '替换为的文本' },
}

/** 插入分页符 */
const insertPageBreakSchema: Record<string, ToolParameterProperty> = {
  position: {
    type: 'number',
    description: '插入位置：段落索引（在该段落之前插入分页）。省略则插入到文档末尾',
  },
}

/** 完成 */
const doneSchema: Record<string, ToolParameterProperty> = {
  message: { type: 'string', description: '完成消息，向用户说明执行了哪些操作' },
}

// ========== 构建工具 Schema ==========

function makeSchema(
  name: string,
  description: string,
  properties: Record<string, ToolParameterProperty>,
  required: string[] = [],
): ToolSchema {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  }
}

/** 构建所有工具 Schema */
export function buildToolSchemas(): ToolSchema[] {
  return [
    makeSchema('get_document_info', '获取 Word 文档基本信息（段落数、节数、标题）', getDocInfoSchema),
    makeSchema('get_paragraphs', '列出所有段落（含样式信息），了解文档结构。排版前必须调用此工具了解当前内容', getParagraphsSchema),
    makeSchema('get_text', '读取指定段落的完整文本', getTextSchema, ['paragraphIndex']),
    makeSchema('insert_text', '在文档中插入新文本（默认插入到末尾）', insertTextSchema, ['text']),
    makeSchema('set_text', '替换指定段落的文本内容', setTextSchema, ['paragraphIndex', 'text']),
    makeSchema('format_text', '设置文字格式：加粗/斜体/下划线/字号/字体/颜色', formatTextSchema, ['paragraphIndex']),
    makeSchema('format_paragraph', '设置段落格式：对齐方式/段间距/行距', formatParagraphSchema, ['paragraphIndex']),
    makeSchema('set_style', '对段落应用样式（Heading 1-9, Title, Subtitle, Normal 等）', setStyleSchema, ['paragraphIndex', 'styleName']),
    makeSchema('create_table', '在文档中插入表格（指定行数×列数）', createTableSchema, ['rows', 'cols']),
    makeSchema('fill_table', '填写表格单元格内容', fillTableSchema, ['tableIndex', 'cells']),
    makeSchema('find_replace', '全文查找并替换文本', findReplaceSchema, ['findText', 'replaceText']),
    makeSchema('insert_page_break', '插入分页符（默认插入到文档末尾）', insertPageBreakSchema),
    makeSchema('done', '完成操作，向用户汇报执行了哪些排版/编辑操作', doneSchema, ['message']),
  ]
}

/** 提取段落索引（支持单个数字或数组） */
function getIndices(args: Record<string, unknown>): number[] {
  const val = args.paragraphIndex
  if (Array.isArray(val)) return val.filter((n: unknown) => typeof n === 'number' && n >= 1)
  if (typeof val === 'number' && val >= 1) return [val]
  return []
}

// ========== 工具执行 ==========

/**
 * 执行工具调用
 * @param name 工具名称
 * @param args 工具参数
 * @param adapter Word 适配器实例
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  adapter: WordAdapter,
): Promise<ToolResult> {
  switch (name) {
    case 'get_document_info': {
      const info = await adapter.getDocumentInfo()
      const msg = `文档信息：${info.count} 个段落，${(info as any).sections || 1} 节，标题：${info.title || '未命名'}\n提示：如需了解各段落内容，请调用 get_paragraphs。`
      return { success: true, message: msg, data: info }
    }

    case 'get_paragraphs': {
      const paragraphs = await adapter.getParagraphs()
      if (paragraphs.length === 0) {
        return { success: true, message: '文档为空，没有段落。使用 insert_text 添加内容。', data: paragraphs }
      }

      // Markdown 表格格式（LLM 训练数据大量出现，比紧凑格式更易理解）
      const lines: string[] = []
      lines.push(`文档共 ${paragraphs.length} 个段落：`)
      lines.push('')
      lines.push('| # | 样式 | 预览 |')
      lines.push('|---|------|------|')
      for (const p of paragraphs) {
        const style = p.style || '-'
        const preview = p.preview.replace(/\|/g, '\\|')  // 转义表格分隔符
        lines.push(`| ${p.index} | ${style} | ${preview} |`)
      }
      lines.push('')
      lines.push('提示：如需读取某段落全文，用 get_text(paragraphIndex=N)。')

      return { success: true, message: lines.join('\n'), data: paragraphs }
    }

    case 'get_text': {
      const paragraphIndex = args.paragraphIndex as number
      if (!paragraphIndex || paragraphIndex < 1) {
        return { success: false, message: 'paragraphIndex 必须是 >= 1 的数字' }
      }
      const text = await adapter.getText(paragraphIndex)
      if (!text) {
        return { success: false, message: `段落 ${paragraphIndex} 不存在或为空。请用 get_paragraphs 确认段落编号。` }
      }
      return {
        success: true,
        message: `段落 ${paragraphIndex} 的全文：\n\n${text}`,
        data: { paragraphIndex, text },
      }
    }

    case 'insert_text': {
      const text = args.text as string
      if (!text) return { success: false, message: 'text 参数不能为空' }
      const position = args.position as number | undefined
      const result = await adapter.insertText(text, position)
      return { success: result.success, message: clampMsg(result.message) }
    }

    case 'set_text': {
      const paragraphIndex = args.paragraphIndex as number
      const text = args.text as string
      if (!paragraphIndex || paragraphIndex < 1) return { success: false, message: 'paragraphIndex 必须是 >= 1 的数字' }
      if (text === undefined) return { success: false, message: 'text 参数不能为空' }
      const result = await adapter.setText(paragraphIndex, text)
      return { success: result.success, message: clampMsg(result.message) }
    }

    case 'format_text': {
      const indices = getIndices(args)
      if (indices.length === 0) return { success: false, message: 'paragraphIndex 必须是 >= 1 的数字或数字数组' }
      const options: Record<string, unknown> = {}
      if (args.bold !== undefined) options.bold = args.bold
      if (args.italic !== undefined) options.italic = args.italic
      if (args.underline !== undefined) options.underline = args.underline
      if (args.size !== undefined) options.size = args.size
      if (args.name !== undefined) options.name = args.name
      if (args.color !== undefined) options.color = args.color
      if (Object.keys(options).length === 0) {
        return { success: false, message: '至少需要指定一个格式选项（bold/italic/size/name/color 等）' }
      }

      const results: string[] = []
      for (const idx of indices) {
        const r = await adapter.formatText(idx, options as any)
        if (r.success) results.push(String(idx))
      }
      const label = indices.length === 1 ? '段落' : `${indices.length} 个段落`
      const range = indices.length <= 5 ? indices.join(',') : `${indices[0]}-${indices[indices.length - 1]}`
      return { success: true, message: `已格式化${label}（${range}）。` }
    }

    case 'format_paragraph': {
      const indices = getIndices(args)
      if (indices.length === 0) return { success: false, message: 'paragraphIndex 必须是 >= 1 的数字或数字数组' }
      const options: Record<string, unknown> = {}
      if (args.alignment !== undefined) options.alignment = args.alignment
      if (args.spaceBefore !== undefined) options.spaceBefore = args.spaceBefore
      if (args.spaceAfter !== undefined) options.spaceAfter = args.spaceAfter
      if (args.lineSpacing !== undefined) options.lineSpacing = args.lineSpacing
      if (Object.keys(options).length === 0) {
        return { success: false, message: '至少需要指定一个段落格式选项（alignment/spaceBefore/spaceAfter/lineSpacing）' }
      }

      const results: string[] = []
      for (const idx of indices) {
        const r = await adapter.formatParagraph(idx, options as any)
        if (r.success) results.push(String(idx))
      }
      const label = indices.length === 1 ? '段落' : `${indices.length} 个段落`
      const range = indices.length <= 5 ? indices.join(',') : `${indices[0]}-${indices[indices.length - 1]}`
      return { success: true, message: `已格式化${label}（${range}）。` }
    }

    case 'set_style': {
      const indices = getIndices(args)
      const styleName = args.styleName as string
      if (indices.length === 0) return { success: false, message: 'paragraphIndex 必须是 >= 1 的数字或数字数组' }
      if (!styleName) return { success: false, message: 'styleName 不能为空' }

      const results: string[] = []
      for (const idx of indices) {
        const r = await adapter.setStyle(idx, styleName)
        if (r.success) results.push(String(idx))
      }
      const label = indices.length === 1 ? '段落' : `${indices.length} 个段落`
      const range = indices.length <= 5 ? indices.join(',') : `${indices[0]}-${indices[indices.length - 1]}`
      return { success: true, message: `已对${label}（${range}）应用样式"${styleName}"。` }
    }

    case 'create_table': {
      const rows = args.rows as number
      const cols = args.cols as number
      if (!rows || !cols || rows < 1 || cols < 1) {
        return { success: false, message: 'rows 和 cols 必须是 >= 1 的数字' }
      }
      const position = args.position as number | undefined
      const result = await adapter.createTable(rows, cols, position)
      return { success: result.success, message: clampMsg(result.message) }
    }

    case 'fill_table': {
      const tableIndex = args.tableIndex as number
      const cells = args.cells as Array<{ row: number; col: number; text: string }>
      if (!tableIndex || tableIndex < 1) return { success: false, message: 'tableIndex 必须是 >= 1 的数字' }
      if (!cells || !Array.isArray(cells) || cells.length === 0) {
        return { success: false, message: 'cells 必须是非空数组' }
      }
      const result = await adapter.fillTable(tableIndex, cells)
      return { success: result.success, message: clampMsg(result.message, 300) }
    }

    case 'find_replace': {
      const findText = args.findText as string
      const replaceText = args.replaceText as string
      if (!findText) return { success: false, message: 'findText 不能为空' }
      const result = await adapter.findReplace(findText, replaceText || '')
      return { success: result.success, message: clampMsg(result.message) }
    }

    case 'insert_page_break': {
      const position = args.position as number | undefined
      const result = await adapter.insertPageBreak(position)
      return { success: result.success, message: clampMsg(result.message) }
    }

    case 'done': {
      const message = args.message as string
      return { success: true, message: message || '操作完成。' }
    }

    default:
      return { success: false, message: `未知工具：${name}` }
  }
}
