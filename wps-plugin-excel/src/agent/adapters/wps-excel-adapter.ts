/**
 * WPS 环境 Excel 适配器
 *
 * 通过 WPSJS Excel API 操作真实工作簿。
 * 仅在 WPS 加载项运行时环境中可用。
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

export class WpsExcelAdapter implements ExcelAdapter {
  readonly name = 'WpsExcelAdapter'

  /** 检测是否在 WPS 加载项环境中 */
  static isAvailable(): boolean {
    return !!(window as any).Application?.ActiveWorkbook
  }

  private get app(): any {
    return (window as any).Application
  }

  private get workbook(): any {
    return this.app.ActiveWorkbook
  }

  // ========== 文档信息 ==========

  async getDocumentInfo(): Promise<DocumentInfo> {
    console.log(`[WpsExcelAdapter] getDocumentInfo 入参: (无)`)
    try {
      const wb = this.workbook
      if (!wb) { console.log(`[WpsExcelAdapter] getDocumentInfo 出参: count=0 (无工作簿)`); return { count: 0 } }
      const result = { count: wb.Sheets?.Count || 0, title: wb.Name || '' }
      console.log(`[WpsExcelAdapter] getDocumentInfo 出参: ${JSON.stringify(result)}`)
      return result
    } catch (e: any) {
      console.error(`[WpsExcelAdapter] getDocumentInfo 异常:`, e.message)
      return { count: 0 }
    }
  }

  async getWorkbookInfo(): Promise<WorkbookInfo> {
    console.log(`[WpsExcelAdapter] getWorkbookInfo 入参: (无)`)
    try {
      const wb = this.workbook
      if (!wb) {
        const r = { sheets: [], activeSheet: '', ranges: {}, previews: {} }
        console.log(`[WpsExcelAdapter] getWorkbookInfo 出参: (无工作簿)`)
        return r
      }

      const sheets: string[] = []
      const ranges: Record<string, string> = {}
      const previews: Record<string, unknown[][]> = {}

      for (let i = 1; i <= wb.Sheets.Count; i++) {
        const sheet = wb.Sheets.Item(i)
        const name = sheet.Name
        sheets.push(name)

        try {
          const usedRange = sheet.UsedRange
          if (usedRange) {
            const rows = usedRange.Rows.Count
            const cols = usedRange.Columns.Count
            if (rows > 0 && cols > 0) {
              ranges[name] = `${this._colLetter(cols)}${rows}`
              try {
                const previewRange = rows <= 5 ? usedRange : sheet.Range(`A1:${this._colLetter(cols)}5`)
                const raw = (previewRange.Value2 || []) as unknown[][]
                // 过滤行列标头行（同 get_range 逻辑）
                previews[name] = raw.filter((row: unknown[]) => {
                  const vals = row.map(v => v != null ? String(v) : '')
                  const nonEmpty = vals.filter(v => v !== '')
                  // 全是单字符数字/字母/反斜杠 → 标头行，跳过
                  return !(nonEmpty.length > 0 && nonEmpty.every(v => /^[A-Z0-9\\]$/.test(v)))
                })
              } catch {
                previews[name] = []
              }
            }
          }
        } catch {
          // UsedRange 不可用时忽略
        }
      }

      const result = { sheets, activeSheet: wb.ActiveSheet?.Name || sheets[0] || '', ranges, previews }
      console.log(`[WpsExcelAdapter] getWorkbookInfo 出参: sheets=[${sheets.join(',')}], active=${result.activeSheet}`)
      return result
    } catch (e: any) {
      console.error(`[WpsExcelAdapter] getWorkbookInfo 异常:`, e.message)
      return { sheets: [], activeSheet: '', ranges: {}, previews: {} }
    }
  }

  // ========== 读取 ==========

  async getRange(worksheet: string, range: string): Promise<RangeData> {
    console.log(`[WpsExcelAdapter] getRange 入参: worksheet="${worksheet}", range="${range}"`)
    try {
      const ws = this._getSheet(worksheet)
      if (!ws) throw new Error(`工作表 "${worksheet}" 不存在`)

      const rng = ws.Range(range)
      if (!rng) throw new Error(`区域 "${range}" 无效`)

      const rowCount = rng.Rows.Count
      const colCount = rng.Columns.Count
      const startRow = rng.Row
      console.log(`[WpsExcelAdapter] getRange 范围: ${rowCount}行×${colCount}列, 起始行=${startRow}`)

      const cells: CellData[] = []
      for (let r = 1; r <= rowCount; r++) {
        for (let c = 1; c <= colCount; c++) {
          const cell = rng.Item(r, c)
          cells.push({
            address: this._colLetter(c) + (startRow + r - 1),
            value: cell.Value2,
            formula: cell.Formula || null,
            numberFormat: cell.NumberFormat || undefined,
          })
        }
      }

      console.log(`[WpsExcelAdapter] getRange 出参: ${cells.length} 个单元格, 首3个=${JSON.stringify(cells.slice(0,3).map(c=>({[c.address]:c.formula||c.value})))}`)
      return { range, cells, rowCount, colCount }
    } catch (e: any) {
      console.error(`[WpsExcelAdapter] getRange 失败:`, e.message || e)
      throw new Error(`读取区域失败: ${e.message || e}`)
    }
  }

  // ========== 写入 ==========

  async setValue(
    worksheet: string,
    cell: string,
    value: string | number | boolean,
  ): Promise<ToolResult> {
    console.log(`[WpsExcelAdapter] setValue 入参: worksheet="${worksheet}", cell="${cell}", value=${JSON.stringify(value)}`)
    try {
      const ws = this._getSheet(worksheet)
      if (!ws) throw new Error(`工作表 "${worksheet}" 不存在`)
      const target = ws.Range(cell)
      target.Value2 = value
      const verify = target.Value2
      console.log(`[WpsExcelAdapter] setValue 验证: 读回=${JSON.stringify(verify)}`)
      return { success: true, message: `已设置 ${cell} = ${value}` }
    } catch (e: any) {
      console.error(`[WpsExcelAdapter] setValue 失败:`, e.message)
      return { success: false, message: `设置失败: ${e.message || e}` }
    }
  }

  async setFormula(worksheet: string, cell: string, formula: string): Promise<ToolResult> {
    console.log(`[WpsExcelAdapter] setFormula 入参: worksheet="${worksheet}", cell="${cell}", formula="${formula}"`)
    try {
      const ws = this._getSheet(worksheet)
      if (!ws) throw new Error(`工作表 "${worksheet}" 不存在`)
      const target = ws.Range(cell)
      target.Formula = formula
      // WPSJS 不会自动重算，强制触发
      this._recalculate(ws)
      const verifyFormula = target.Formula
      const verifyValue = target.Value2
      console.log(`[WpsExcelAdapter] setFormula 验证: 公式="${verifyFormula}", 值=${JSON.stringify(verifyValue)}`)
      return { success: true, message: `已设置 ${cell} 公式 = ${formula}` }
    } catch (e: any) {
      console.error(`[WpsExcelAdapter] setFormula 失败:`, e.message)
      return { success: false, message: `设置公式失败: ${e.message || e}` }
    }
  }

  // ========== 格式化 ==========

  async formatRange(worksheet: string, range: string, options: FormatOptions): Promise<ToolResult> {
    console.log(`[WpsExcelAdapter] formatRange 入参: worksheet="${worksheet}", range="${range}", options=${JSON.stringify(options)}`)
    try {
      const ws = this._getSheet(worksheet)
      if (!ws) throw new Error(`工作表 "${worksheet}" 不存在`)
      const rng = ws.Range(range)

      if (options.font) {
        const f = options.font
        if (f.name) rng.Font.Name = f.name
        if (f.size) rng.Font.Size = f.size
        if (f.bold !== undefined) rng.Font.Bold = f.bold
        if (f.italic !== undefined) rng.Font.Italic = f.italic
        if (f.underline !== undefined) rng.Font.Underline = f.underline
        if (f.color) rng.Font.Color = parseInt(f.color, 16)
      }

      if (options.border) {
        const b = options.border
        const edges = b.edges || ['left', 'right', 'top', 'bottom']
        for (const edge of edges) {
          const borderObj = rng.Borders.Item(this._xlBorderIndex(edge))
          if (b.style !== 'none') {
            borderObj.LineStyle = this._xlLineStyle(b.style || 'thin')
            if (b.color) borderObj.Color = parseInt(b.color, 16)
          } else {
            borderObj.LineStyle = -4142
          }
        }
      }

      if (options.fill && options.fill.pattern !== 'none') {
        if (options.fill.color) {
          rng.Interior.Color = parseInt(options.fill.color, 16)
        }
      }

      if (options.alignment) {
        const a = options.alignment
        if (a.horizontal) rng.HorizontalAlignment = this._xlHAlign(a.horizontal)
        if (a.vertical) rng.VerticalAlignment = this._xlVAlign(a.vertical)
        if (a.wrapText !== undefined) rng.WrapText = a.wrapText
      }

      if (options.numberFormat) {
        rng.NumberFormat = options.numberFormat
      }

      console.log(`[WpsExcelAdapter] formatRange 完成`)
      return { success: true, message: `已格式化 ${range}` }
    } catch (e: any) {
      console.error(`[WpsExcelAdapter] formatRange 失败:`, e.message)
      return { success: false, message: `格式化失败: ${e.message || e}` }
    }
  }

  // ========== 表格 ==========

  async createTable(worksheet: string, range: string, headers: string[]): Promise<ToolResult> {
    console.log(`[WpsExcelAdapter] createTable 入参: worksheet="${worksheet}", range="${range}", headers=[${headers.join(',')}]`)
    try {
      const ws = this._getSheet(worksheet)
      if (!ws) throw new Error(`工作表 "${worksheet}" 不存在`)

      const parts = range.match(/([A-Z]+)(\d+)/)
      if (!parts) throw new Error(`无效的区域: ${range}`)
      const startCol = parts[1]
      const startRow = parseInt(parts[2])
      let col = startCol
      for (const header of headers) {
        ws.Range(`${col}${startRow}`).Value2 = header
        ws.Range(`${col}${startRow}`).Font.Bold = true
        col = this._nextCol(col)
      }

      console.log(`[WpsExcelAdapter] createTable 完成: ${startCol}${startRow}:${this._colLetter(this._colToNum(startCol)+headers.length-1)}${startRow}`)
      return { success: true, message: `已创建表格 ${range}，表头: ${headers.join(', ')}` }
    } catch (e: any) {
      console.error(`[WpsExcelAdapter] createTable 失败:`, e.message)
      return { success: false, message: `创建表格失败: ${e.message || e}` }
    }
  }

  // ========== 图表 ==========

  async addChart(worksheet: string, range: string, chartType: ChartType): Promise<ToolResult> {
    console.log(`[WpsExcelAdapter] addChart 入参: worksheet="${worksheet}", range="${range}", chartType="${chartType}"`)
    try {
      const ws = this._getSheet(worksheet)
      if (!ws) throw new Error(`工作表 "${worksheet}" 不存在`)

      const chartObj = ws.ChartObjects().Add(50, 50, 400, 300)
      const chart = chartObj.Chart
      chart.ChartType = this._xlChartType(chartType)
      chart.SetSourceData(ws.Range(range))

      console.log(`[WpsExcelAdapter] addChart 完成: ${this._chartTypeName(chartType)}图`)
      return { success: true, message: `已创建${this._chartTypeName(chartType)}图表，数据源: ${range}` }
    } catch (e: any) {
      console.error(`[WpsExcelAdapter] addChart 失败:`, e.message)
      return { success: false, message: `创建图表失败: ${e.message || e}` }
    }
  }

  // ========== 合并/排序 ==========

  async mergeCells(worksheet: string, range: string): Promise<ToolResult> {
    console.log(`[WpsExcelAdapter] mergeCells 入参: worksheet="${worksheet}", range="${range}"`)
    try {
      const ws = this._getSheet(worksheet)
      if (!ws) throw new Error(`工作表 "${worksheet}" 不存在`)
      ws.Range(range).Merge()
      console.log(`[WpsExcelAdapter] mergeCells 完成`)
      return { success: true, message: `已合并 ${range}` }
    } catch (e: any) {
      console.error(`[WpsExcelAdapter] mergeCells 失败:`, e.message)
      return { success: false, message: `合并失败: ${e.message || e}` }
    }
  }

  async sortRange(
    worksheet: string,
    range: string,
    keyColumn: number,
    order: SortOrder,
  ): Promise<ToolResult> {
    console.log(`[WpsExcelAdapter] sortRange 入参: worksheet="${worksheet}", range="${range}", keyColumn=${keyColumn}, order="${order}"`)
    try {
      const ws = this._getSheet(worksheet)
      if (!ws) throw new Error(`工作表 "${worksheet}" 不存在`)
      const rng = ws.Range(range)
      rng.Sort(rng.Columns(keyColumn), order === 'asc' ? 1 : 2)
      console.log(`[WpsExcelAdapter] sortRange 完成`)
      return { success: true, message: `已按第 ${keyColumn} 列${order === 'asc' ? '升序' : '降序'}排序 ${range}` }
    } catch (e: any) {
      console.error(`[WpsExcelAdapter] sortRange 失败:`, e.message)
      return { success: false, message: `排序失败: ${e.message || e}` }
    }
  }

  // ========== 工具方法 ==========

  private _getSheet(name: string): any {
    const wb = this.workbook
    if (!wb) return null
    try {
      return wb.Sheets.Item(name)
    } catch {
      try {
        return wb.Worksheets(name)
      } catch {
        return null
      }
    }
  }

  /** 触发重算（WPSJS 设置 Formula 后不会自动计算） */
  private _recalculate(_ws: any): void {
    try {
      // 主方案：应用级别全量重算
      this.app.CalculateFull()
      console.log('[WpsExcelAdapter] CalculateFull 已触发')
    } catch (e1: any) {
      console.warn('[WpsExcelAdapter] CalculateFull 失败:', e1.message)
      try {
        // 降级：工作表级别
        _ws.Calculate()
        console.log('[WpsExcelAdapter] ws.Calculate 已触发')
      } catch (e2: any) {
        console.warn('[WpsExcelAdapter] 重算均失败:', e2.message)
      }
    }
  }

  /** 列索引 → 字母（1→A, 2→B, 27→AA） */
  private _colLetter(n: number): string {
    let result = ''
    while (n > 0) {
      n--
      result = String.fromCharCode(65 + (n % 26)) + result
      n = Math.floor(n / 26)
    }
    return result
  }

  private _colToNum(col: string): number {
    let n = 0
    for (let i = 0; i < col.length; i++) {
      n = n * 26 + (col.charCodeAt(i) - 64)
    }
    return n
  }

  private _nextCol(col: string): string {
    return this._colLetter(this._colToNum(col) + 1)
  }

  private _xlBorderIndex(edge: string): number {
    switch (edge) {
      case 'left': return 1
      case 'right': return 2
      case 'top': return 3
      case 'bottom': return 4
      default: return 1
    }
  }

  private _xlLineStyle(style: string): number {
    switch (style) {
      case 'thin': return 1
      case 'medium': return -4119
      case 'thick': return 4
      case 'double': return -4119
      default: return 1
    }
  }

  private _xlHAlign(align: string): number {
    switch (align) {
      case 'left': return -4131
      case 'center': return -4108
      case 'right': return -4152
      default: return -4131
    }
  }

  private _xlVAlign(align: string): number {
    switch (align) {
      case 'top': return -4160
      case 'center': return -4108
      case 'bottom': return -4107
      default: return -4160
    }
  }

  private _xlChartType(type: ChartType): number {
    switch (type) {
      case 'column': return 51
      case 'bar': return 57
      case 'line': return 4
      case 'pie': return 5
      case 'doughnut': return -4120
      case 'scatter': return -4169
      case 'area': return 1
      default: return 51
    }
  }

  private _chartTypeName(type: ChartType): string {
    switch (type) {
      case 'column': return '柱状'
      case 'bar': return '条形'
      case 'line': return '折线'
      case 'pie': return '饼'
      case 'doughnut': return '环形'
      case 'scatter': return '散点'
      case 'area': return '面积'
      default: return ''
    }
  }
}
