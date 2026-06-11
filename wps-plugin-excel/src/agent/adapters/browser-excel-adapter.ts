/**
 * 浏览器环境 Excel 适配器（Mock）
 *
 * 内存中维护表格数据，用于测试和浏览器开发模式。
 */

import type {
  ExcelAdapter,
  WorkbookInfo,
  RangeData,
  CellData,
  FormatOptions,
  ChartType,
  SortOrder,
} from '../excel-adapter'
import type { ToolResult, DocumentInfo } from '@wpsai/shared/agent/tool-adapter'

/** Mock 单元格 */
interface MockCell {
  value: unknown
  formula: string | null
  numberFormat: string
  fontBold: boolean
  fontItalic: boolean
  bgColor: string | null
}

/** Mock 工作表 */
interface MockSheet {
  name: string
  cells: Map<string, MockCell>
}

export class BrowserExcelAdapter implements ExcelAdapter {
  readonly name = 'BrowserExcelAdapter'

  private sheets: Map<string, MockSheet> = new Map()
  private activeSheetName: string | null = null

  constructor() {
    // 默认创建一个空工作表
    this._ensureSheet('Sheet1')
  }

  // ========== 文档信息 ==========

  async getDocumentInfo(): Promise<DocumentInfo> {
    const names = Array.from(this.sheets.keys())
    return { count: names.length, title: names[0] || '' }
  }

  async getWorkbookInfo(): Promise<WorkbookInfo> {
    const sheets = Array.from(this.sheets.keys())
    const ranges: Record<string, string> = {}
    const previews: Record<string, unknown[][]> = {}
    for (const name of sheets) {
      const usedRange = this._getUsedRange(name)
      if (usedRange) ranges[name] = usedRange
      // 取前 5 行预览
      const sheet = this.sheets.get(name)
      if (sheet) {
        const vals: unknown[][] = []
        for (let r = 1; r <= 5; r++) {
          const row: unknown[] = []
          for (let c = 1; c <= 10; c++) {
            const cell = this._getCell(name, r, c)
            if (cell.value !== null) row.push(cell.value)
            else { row.push(null); if (c > 1 && row.every(x => x === null)) break }
          }
          if (row.some(x => x !== null)) vals.push(row)
        }
        previews[name] = vals
      }
    }
    return { sheets, activeSheet: this.activeSheetName || '', ranges, previews }
  }

  // ========== 读取 ==========

  async getRange(worksheet: string, range: string): Promise<RangeData> {
    this._ensureSheet(worksheet)
    const { startRow, startCol, endRow, endCol } = this._parseRange(range)
    const cells: CellData[] = []
    const rowCount = endRow - startRow + 1
    const colCount = endCol - startCol + 1

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const addr = this._colLetter(c) + r
        const cell = this._getCell(worksheet, r, c)
        cells.push({
          address: addr,
          value: cell.value,
          formula: cell.formula,
          numberFormat: cell.numberFormat || undefined,
        })
      }
    }
    return { range, cells, rowCount, colCount }
  }

  // ========== 写入 ==========

  async setValue(
    worksheet: string,
    cell: string,
    value: string | number | boolean,
  ): Promise<ToolResult> {
    this._ensureSheet(worksheet)
    const { row, col } = this._parseCell(cell)
    const mock = this._getCell(worksheet, row, col)
    mock.value = value
    mock.formula = null
    return { success: true, message: `已设置 ${cell} = ${value}` }
  }

  async setFormula(worksheet: string, cell: string, formula: string): Promise<ToolResult> {
    this._ensureSheet(worksheet)
    const { row, col } = this._parseCell(cell)
    const mock = this._getCell(worksheet, row, col)
    mock.formula = formula
    // 模拟公式计算结果（简单处理：直接存公式文本作为值）
    if (!mock.value) mock.value = `[${formula}]`
    return { success: true, message: `已设置 ${cell} 公式 = ${formula}` }
  }

  // ========== 格式化 ==========

  async formatRange(worksheet: string, range: string, options: FormatOptions): Promise<ToolResult> {
    this._ensureSheet(worksheet)
    const { startRow, startCol, endRow, endCol } = this._parseRange(range)

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = this._getCell(worksheet, r, c)
        if (options.font) {
          if (options.font.bold !== undefined) cell.fontBold = options.font.bold
          if (options.font.italic !== undefined) cell.fontItalic = options.font.italic
        }
        if (options.fill?.color) cell.bgColor = options.fill.color
        if (options.numberFormat) cell.numberFormat = options.numberFormat
      }
    }
    return { success: true, message: `已格式化 ${range}` }
  }

  // ========== 表格 ==========

  async createTable(worksheet: string, range: string, headers: string[]): Promise<ToolResult> {
    this._ensureSheet(worksheet)
    const { startRow, startCol } = this._parseRange(range)

    for (let i = 0; i < headers.length; i++) {
      const cell = this._getCell(worksheet, startRow, startCol + i)
      cell.value = headers[i]
      cell.fontBold = true
    }
    return { success: true, message: `已创建表格 ${range}，表头: ${headers.join(', ')}` }
  }

  // ========== 图表 ==========

  async addChart(worksheet: string, range: string, chartType: ChartType): Promise<ToolResult> {
    this._ensureSheet(worksheet)
    return { success: true, message: `[Mock] 已创建${this._chartName(chartType)}图表，数据源: ${range}` }
  }

  // ========== 合并/排序 ==========

  async mergeCells(worksheet: string, range: string): Promise<ToolResult> {
    this._ensureSheet(worksheet)
    return { success: true, message: `已合并 ${range}` }
  }

  async sortRange(
    worksheet: string,
    range: string,
    keyColumn: number,
    order: SortOrder,
  ): Promise<ToolResult> {
    this._ensureSheet(worksheet)
    return { success: true, message: `[Mock] 已按第 ${keyColumn} 列${order === 'asc' ? '升序' : '降序'}排序` }
  }

  // ========== 工具方法 ==========

  private _ensureSheet(name: string): void {
    if (!this.sheets.has(name)) {
      this.sheets.set(name, { name, cells: new Map() })
    }
    if (!this.activeSheetName) this.activeSheetName = name
  }

  private _getCell(worksheet: string, row: number, col: number): MockCell {
    this._ensureSheet(worksheet)
    const sheet = this.sheets.get(worksheet)!
    const key = `${row},${col}`
    if (!sheet.cells.has(key)) {
      sheet.cells.set(key, { value: null, formula: null, numberFormat: '', fontBold: false, fontItalic: false, bgColor: null })
    }
    return sheet.cells.get(key)!
  }

  private _getUsedRange(sheetName: string): string | null {
    const sheet = this.sheets.get(sheetName)
    if (!sheet || sheet.cells.size === 0) return null

    let minRow = Infinity, maxRow = 0, minCol = Infinity, maxCol = 0
    for (const key of sheet.cells.keys()) {
      const [r, c] = key.split(',').map(Number)
      if (r < minRow) minRow = r
      if (r > maxRow) maxRow = r
      if (c < minCol) minCol = c
      if (c > maxCol) maxCol = c
    }
    return `${this._colLetter(minCol)}${minRow}:${this._colLetter(maxCol)}${maxRow}`
  }

  private _parseRange(range: string): { startRow: number; startCol: number; endRow: number; endCol: number } {
    const parts = range.split(':')
    const start = this._parseCell(parts[0])
    const end = parts[1] ? this._parseCell(parts[1]) : start
    return { startRow: start.row, startCol: start.col, endRow: end.row, endCol: end.col }
  }

  private _parseCell(cell: string): { row: number; col: number } {
    const match = cell.match(/^([A-Z]+)(\d+)$/)
    if (!match) throw new Error(`无效的单元格地址: ${cell}`)
    let col = 0
    for (let i = 0; i < match[1].length; i++) {
      col = col * 26 + (match[1].charCodeAt(i) - 64)
    }
    return { row: parseInt(match[2]), col }
  }

  private _colLetter(n: number): string {
    let result = ''
    while (n > 0) {
      n--
      result = String.fromCharCode(65 + (n % 26)) + result
      n = Math.floor(n / 26)
    }
    return result
  }

  private _chartName(type: ChartType): string {
    const names: Record<ChartType, string> = { column: '柱状', bar: '条形', line: '折线', pie: '饼', doughnut: '环形', scatter: '散点', area: '面积' }
    return names[type] || type
  }
}
