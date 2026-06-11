/**
 * Excel 智能体工具定义
 *
 * 10 个工具：get_workbook_info / get_range / set_value / set_formula /
 *   format_range / create_table / add_chart / merge_cells / sort_range / done
 */

import type { ExcelAdapter, FormatOptions, ChartType, SortOrder } from './excel-adapter'
import type { ToolSchema, ToolParameterProperty } from '@wpsai/shared/agent/types'
import type { ToolResult } from '@wpsai/shared/agent/tool-adapter'
import { clampMsg } from '@wpsai/shared/agent/tool-utils'

// ========== 列字母工具函数 ==========

function letterToColIndex(letter: string): number {
  let n = 0
  for (let i = 0; i < letter.length; i++) {
    n = n * 26 + (letter.charCodeAt(i) - 64)
  }
  return n
}

function colIndexToLetter(n: number): string {
  let result = ''
  while (n > 0) {
    n--
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26)
  }
  return result
}

// ========== 工具 Schema 定义 ==========

/** 获取工作簿概况 */
const getWorkbookInfoSchema: Record<string, ToolParameterProperty> = {
  // 无需参数
}

/** 读取区域 */
const getRangeSchema: Record<string, ToolParameterProperty> = {
  worksheet: { type: 'string', description: '工作表名称' },
  range: { type: 'string', description: '区域地址，如 "A1:C10"' },
}

/** 设置单元格值 */
const setValueSchema: Record<string, ToolParameterProperty> = {
  worksheet: { type: 'string', description: '工作表名称' },
  cell: { type: 'string', description: '单元格地址，如 "A1"' },
  value: { type: 'string', description: '单元格值（数字或文本）' },
}

/** 设置公式 */
const setFormulaSchema: Record<string, ToolParameterProperty> = {
  worksheet: { type: 'string', description: '工作表名称' },
  cell: { type: 'string', description: '单元格地址，如 "B2"' },
  formula: { type: 'string', description: 'Excel 公式，如 "=SUM(A1:A10)"' },
}

/** 格式化区域 */
const formatRangeSchema: Record<string, ToolParameterProperty> = {
  worksheet: { type: 'string', description: '工作表名称' },
  range: { type: 'string', description: '区域地址，如 "A1:C10"' },
  bold: { type: 'boolean', description: '是否加粗（可选）' },
  bgColor: { type: 'string', description: '背景色，RRGGBB 格式（可选）' },
  numberFormat: { type: 'string', description: '数字格式，如 "0.00%"、"yyyy-mm-dd"（可选）' },
  alignment: { type: 'string', description: '水平对齐：left/center/right（可选）', enum: ['left', 'center', 'right'] },
  border: { type: 'boolean', description: '是否添加边框（可选）' },
}

/** 创建表格 */
const createTableSchema: Record<string, ToolParameterProperty> = {
  worksheet: { type: 'string', description: '工作表名称' },
  range: { type: 'string', description: '表格起始区域，如 "A1:D1"（仅表头行）' },
  headers: {
    type: 'array',
    description: '表头文本数组',
    items: { type: 'string' },
  },
}

/** 添加图表 */
const addChartSchema: Record<string, ToolParameterProperty> = {
  worksheet: { type: 'string', description: '工作表名称' },
  range: { type: 'string', description: '图表数据源区域，如 "A1:B10"' },
  chartType: {
    type: 'string',
    description: '图表类型',
    enum: ['column', 'bar', 'line', 'pie', 'doughnut', 'scatter', 'area'],
  },
}

/** 合并单元格 */
const mergeCellsSchema: Record<string, ToolParameterProperty> = {
  worksheet: { type: 'string', description: '工作表名称' },
  range: { type: 'string', description: '要合并的区域，如 "A1:C1"' },
}

/** 排序 */
const sortRangeSchema: Record<string, ToolParameterProperty> = {
  worksheet: { type: 'string', description: '工作表名称' },
  range: { type: 'string', description: '排序区域，如 "A2:D20"' },
  keyColumn: { type: 'integer', description: '排序依据列序号（从 1 开始）' },
  order: { type: 'string', description: '排序方向', enum: ['asc', 'desc'] },
}

/** 完成 */
const doneSchema: Record<string, ToolParameterProperty> = {
  message: { type: 'string', description: '给用户的总结消息' },
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
    makeSchema('get_workbook_info', '获取工作簿概况：工作表列表、已用范围、活动工作表', getWorkbookInfoSchema),
    makeSchema('get_range', '读取指定区域的单元格值和公式。排查问题时优先使用此工具了解当前状态。', getRangeSchema, ['worksheet', 'range']),
    makeSchema('set_value', '设置单元格的值', setValueSchema, ['worksheet', 'cell', 'value']),
    makeSchema('set_formula', '设置单元格的公式', setFormulaSchema, ['worksheet', 'cell', 'formula']),
    makeSchema('format_range', '格式化区域：加粗、背景色、边框、数字格式、对齐', formatRangeSchema, ['worksheet', 'range']),
    makeSchema('create_table', '创建带表头的格式化表格。表头自动加粗。', createTableSchema, ['worksheet', 'range', 'headers']),
    makeSchema('add_chart', '从数据区域创建图表（柱状/折线/饼图/环形等）', addChartSchema, ['worksheet', 'range', 'chartType']),
    makeSchema('merge_cells', '合并单元格区域', mergeCellsSchema, ['worksheet', 'range']),
    makeSchema('sort_range', '对区域按指定列排序（注意：不要包含表头行）', sortRangeSchema, ['worksheet', 'range', 'keyColumn', 'order']),
    makeSchema('done', '任务完成，向用户汇报结果', doneSchema, ['message']),
  ]
}

// ========== 执行工具 ==========

/** 执行工具调用 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  adapter: ExcelAdapter,
): Promise<ToolResult> {
  switch (name) {
    case 'get_workbook_info': {
      const info = await adapter.getWorkbookInfo()
      const sheetList = info.sheets.join('、')
      const rangeInfo = Object.entries(info.ranges)
        .map(([k, v]) => `${k}(${v})`)
        .join(', ')
      // 数据预览摘要
      const previewSummary = Object.entries(info.previews || {})
        .map(([name, rows]) => `${name} 前${rows.length}行: ${JSON.stringify(rows).slice(0, 200)}`)
        .join('; ')
      return {
        success: true,
        message: clampMsg(`工作表: ${sheetList}。活动表: ${info.activeSheet}。已用范围: ${rangeInfo || '无'}。数据预览: ${previewSummary || '无'}`),
        data: info,
      }
    }

    case 'get_range': {
      const data = await adapter.getRange(
        args.worksheet as string,
        args.range as string,
      )
      // 从 range 提取起始信息
      const rangeMatch = data.range.match(/^([A-Z]+)(\d+)/)
      const startColLetter = rangeMatch ? rangeMatch[1] : 'A'
      const startRowNum = rangeMatch ? parseInt(rangeMatch[2]) : 1

      // 列字母（A, B, C, D...）
      const colLetters: string[] = []
      for (let c = 0; c < data.colCount; c++) {
        colLetters.push(colIndexToLetter(letterToColIndex(startColLetter) + c))
      }

        // 从 raw cells 判断标头行（不经过 formula 格式）
        const rawIsLabel = (rowCells: typeof data.cells): boolean => {
          const vals = rowCells.map(c => c.value != null ? String(c.value) : '')
          const nonEmpty = vals.filter(v => v !== '')
          return nonEmpty.length > 0 && nonEmpty.every(v => /^[A-Z0-9\\]$/.test(v))
        }

      const lines: string[] = []
      for (let r = 0; r < data.rowCount; r++) {
        const rowCells = data.cells.slice(r * data.colCount, (r + 1) * data.colCount)
        // 用原始值判断是否为标头行
        if (rawIsLabel(rowCells)) continue
        const vals = rowCells.map(c => {
          if (c.formula && c.formula.startsWith('=')) return `[${c.formula}]`
          return c.value != null ? String(c.value) : ''
        })
        if (vals.some(v => v !== '')) {
          const excelRow = startRowNum + r
          lines.push(
            `行${excelRow}: ` + colLetters.map((l, i) => {
              const val = vals[i] || ''
              return `${l}${excelRow}=${val || '(空)'}`
            }).join(', ')
          )
        }
      }

      const msg = `${data.range}:\n${lines.join('\n')}`
      console.log(`[tools] get_range:\n${msg}`)
      return { success: true, message: msg, data }
    }

    case 'set_value':
      return adapter.setValue(
        args.worksheet as string,
        args.cell as string,
        args.value as string | number | boolean,
      )

    case 'set_formula':
      return adapter.setFormula(
        args.worksheet as string,
        args.cell as string,
        args.formula as string,
      )

    case 'format_range': {
      const options: FormatOptions = {}
      if (args.bold !== undefined) {
        options.font = { bold: args.bold as boolean }
      }
      if (args.bgColor) {
        options.fill = { color: args.bgColor as string }
      }
      if (args.numberFormat) {
        options.numberFormat = args.numberFormat as string
      }
      if (args.alignment) {
        options.alignment = { horizontal: args.alignment as 'left' | 'center' | 'right' }
      }
      if (args.border) {
        options.border = { style: 'thin', edges: ['left', 'right', 'top', 'bottom'] }
      }
      return adapter.formatRange(args.worksheet as string, args.range as string, options)
    }

    case 'create_table':
      return adapter.createTable(
        args.worksheet as string,
        args.range as string,
        args.headers as string[],
      )

    case 'add_chart':
      return adapter.addChart(
        args.worksheet as string,
        args.range as string,
        args.chartType as ChartType,
      )

    case 'merge_cells':
      return adapter.mergeCells(
        args.worksheet as string,
        args.range as string,
      )

    case 'sort_range':
      return adapter.sortRange(
        args.worksheet as string,
        args.range as string,
        args.keyColumn as number,
        args.order as SortOrder,
      )

    case 'done':
      return {
        success: true,
        message: args.message as string || '任务完成',
      }

    default:
      return { success: false, message: `未知工具: ${name}` }
  }
}
