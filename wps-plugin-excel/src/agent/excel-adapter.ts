/**
 * Excel 工具适配器接口
 *
 * 定义 Agent 与 Excel 文档之间的操作契约。
 * WPS 和 Browser 环境各自提供实现。
 *
 * API 设计参考：
 * - openpyxl: Workbook → Worksheet → Cell 对象层级
 * - XlsxWriter: Format 属性全集（font/border/fill/align/number）
 */

import type { ToolResult, DocumentInfo } from '@wpsai/shared/agent/tool-adapter'

// ============ 核心类型 ============

/** 工作簿概况 */
export interface WorkbookInfo {
  /** 工作表名称列表 */
  sheets: string[]
  /** 活动工作表名 */
  activeSheet: string
  /** 每个工作表的已用范围（如 "D5" 表示 A1:D5 有 5 行 4 列数据） */
  ranges: Record<string, string>
  /** 每个工作表的前几行数据预览（帮助 LLM 了解数据内容，无需再单独 get_range） */
  previews: Record<string, unknown[][]>
}

/** 单元格数据 */
export interface CellData {
  /** 单元格地址（如 "A1"） */
  address: string
  /** 显示值（格式化后的值） */
  value: unknown
  /** 原始公式（无公式则为 null） */
  formula: string | null
  /** 数字格式代码（如 "yyyy-mm-dd"、"0.00%"） */
  numberFormat?: string
}

/** 区域数据（读取结果） */
export interface RangeData {
  /** 区域地址 */
  range: string
  /** 单元格列表（行优先） */
  cells: CellData[]
  /** 行数 */
  rowCount: number
  /** 列数 */
  colCount: number
}

// ============ 格式化类型（参考 XlsxWriter Format 类） ============

/** 字体选项 */
export interface FontOptions {
  name?: string
  size?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string        // RRGGBB
}

/** 边框选项 */
export interface BorderOptions {
  style?: 'thin' | 'medium' | 'thick' | 'double' | 'none'
  color?: string        // RRGGBB
  /** 指定哪几边有边框 */
  edges?: ('left' | 'right' | 'top' | 'bottom')[]
}

/** 填充选项 */
export interface FillOptions {
  color?: string        // RRGGBB 背景色
  pattern?: 'solid' | 'none'
}

/** 对齐选项 */
export interface AlignOptions {
  horizontal?: 'left' | 'center' | 'right'
  vertical?: 'top' | 'center' | 'bottom'
  wrapText?: boolean
}

/** 格式化选项 */
export interface FormatOptions {
  font?: FontOptions
  border?: BorderOptions
  fill?: FillOptions
  alignment?: AlignOptions
  /** 数字格式代码 */
  numberFormat?: string
}

// ============ 图表类型 ============

/** 图表类型（参考 XlsxWriter Chart 类型枚举） */
export type ChartType =
  | 'column'      // 柱状图
  | 'bar'         // 条形图（横向）
  | 'line'        // 折线图
  | 'pie'         // 饼图
  | 'doughnut'    // 环形图
  | 'scatter'     // 散点图
  | 'area'        // 面积图

// ============ 排序 ============

export type SortOrder = 'asc' | 'desc'

// ============ 适配器接口 ============

/** Excel 工具适配器 */
export interface ExcelAdapter {
  readonly name: string

  /** 获取文档通用信息（实现 ToolAdapter） */
  getDocumentInfo(): Promise<DocumentInfo>

  /** 获取工作簿概况 */
  getWorkbookInfo(): Promise<WorkbookInfo>

  /** 读取区域数据（含值和公式） */
  getRange(worksheet: string, range: string): Promise<RangeData>

  /** 设置单元格值 */
  setValue(worksheet: string, cell: string, value: string | number | boolean): Promise<ToolResult>

  /** 设置单元格公式 */
  setFormula(worksheet: string, cell: string, formula: string): Promise<ToolResult>

  /** 格式化区域 */
  formatRange(worksheet: string, range: string, options: FormatOptions): Promise<ToolResult>

  /** 创建带表头的格式化表格 */
  createTable(worksheet: string, range: string, headers: string[]): Promise<ToolResult>

  /** 添加图表 */
  addChart(worksheet: string, range: string, chartType: ChartType): Promise<ToolResult>

  /** 合并单元格 */
  mergeCells(worksheet: string, range: string): Promise<ToolResult>

  /** 排序区域 */
  sortRange(worksheet: string, range: string, keyColumn: number, order: SortOrder): Promise<ToolResult>
}
