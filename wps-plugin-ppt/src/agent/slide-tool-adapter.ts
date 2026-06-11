/**
 * 幻灯片工具适配器 — 抽象接口层
 *
 * 解耦智能体工具与执行环境：
 * - BrowserSlideAdapter：内存 mock 实现（开发 + 自动化测试用）
 * - WpsSlideAdapter：真实 WPSJS API 实现（生产环境）
 *
 * 借鉴 page-agent 中 PageController 的抽象模式。
 */

/** 幻灯片摘要信息 */
export interface SlideInfo {
  /** 幻灯片序号（从 1 开始） */
  index: number
  /** 标题文本（如果有） */
  title?: string
  /** 幻灯片上全部文本内容 */
  textContent: string
  /** 幻灯片上的形状数量 */
  shapeCount: number
}

/** 创建幻灯片参数 */
export interface CreateSlideParams {
  /** 布局类型 */
  layout?: 'title' | 'content' | 'blank'
  /** 可选的初始标题 */
  title?: string
}

/** 添加文本框参数 */
export interface AddTextBoxParams {
  /** 目标幻灯片序号（从 1 开始） */
  slideIndex: number
  /** 文本内容 */
  text: string
  /** 左边距（磅），默认 50 */
  left?: number
  /** 上边距（磅），默认 100 */
  top?: number
  /** 宽度（磅），默认 600 */
  width?: number
  /** 高度（磅），默认 400 */
  height?: number
  /** 字号（磅），默认 18 */
  fontSize?: number
  /** 是否加粗，默认 false */
  bold?: boolean
  /** 文字颜色 (RRGGBB)，不传则默认黑色 */
  color?: string
}

// ========== Phase 03 新增：形状相关参数类型 ==========

/** 添加形状参数 */
export interface AddShapeParams {
  slideIndex: number
  /** 形状类型 */
  shapeType: 'rectangle' | 'rounded_rectangle' | 'oval' | 'triangle' | 'diamond'
  left: number
  top: number
  width: number
  height: number
  /** 填充色 (RRGGBB)，不传则无填充 */
  fillColor?: string
  /** 边框色 (RRGGBB)，不传则无边框 */
  lineColor?: string
  /** 边框粗细（磅），默认 1 */
  lineWeight?: number
  /** 透明度 0-1，默认 0 */
  transparency?: number
}

/** 添加线条参数 */
export interface AddLineParams {
  slideIndex: number
  startX: number
  startY: number
  endX: number
  endY: number
  /** 线条颜色 (RRGGBB)，默认 #333333 */
  color?: string
  /** 线宽（磅），默认 2 */
  weight?: number
  /** 虚线样式 */
  dashStyle?: 'solid' | 'dash' | 'dot'
}

/** 设置幻灯片背景参数 */
export interface SetSlideBgParams {
  slideIndex: number
  /** 背景色 (RRGGBB) */
  color: string
}

/**
 * 幻灯片工具适配器接口
 *
 * 所有幻灯片操作通过此接口调用，
 * 各环境提供各自的实现。
 */
export interface SlideToolAdapter {
  /** 获取当前演示文稿概览（幻灯片数量 + 每页摘要） */
  getPresentationInfo(): Promise<{ slideCount: number; slides: SlideInfo[] }>

  /** 实现 ToolAdapter.getDocumentInfo（通用文档信息，用于 AgentLoop 压缩） */
  getDocumentInfo(): Promise<{ count: number; title?: string; [key: string]: unknown }>

  /** 创建新幻灯片，返回其序号 */
  createSlide(params: CreateSlideParams): Promise<{ slideIndex: number }>

  /** 在指定幻灯片上添加文本框 */
  addTextBox(params: AddTextBoxParams): Promise<{ success: boolean }>

  /** 为指定幻灯片添加标题（预设位置 + 字号） */
  addTitle(slideIndex: number, title: string): Promise<{ success: boolean }>

  /** 删除指定序号的幻灯片 */
  deleteSlide(slideIndex: number): Promise<{ success: boolean }>

  /** 获取指定幻灯片的文本内容 */
  getSlideContent(slideIndex: number): Promise<string>

  // ========== Phase 03 新增：形状操作方法 ==========

  /** 添加形状（矩形/圆形/三角等） */
  addShape(params: AddShapeParams): Promise<{ success: boolean; shapeId?: number }>

  /** 添加线条 */
  addLine(params: AddLineParams): Promise<{ success: boolean }>

  /** 设置幻灯片背景色 */
  setSlideBg(params: SetSlideBgParams): Promise<{ success: boolean }>

  /** 设置形状样式（修改已有形状的填充/边框） */
  setShapeStyle(slideIndex: number, shapeIndex: number,
    options: { fillColor?: string; lineColor?: string; lineWeight?: number; transparency?: number }
  ): Promise<{ success: boolean }>

  /** 删除指定形状 */
  deleteShape(slideIndex: number, shapeIndex: number): Promise<{ success: boolean }>

  // ========== Phase 06+ 新增：语义层模板 ==========

  /** 批量创建幻灯片（type 驱动模板渲染），照抄 Mck engine.py */
  applyTemplate(params: ApplyTemplateParams): Promise<{
    slideIndices: number[]
    summary: string
  }>
}

// ========== Phase 07: 15种模板 — Discriminated Union ==========

/** 封面 — 照抄 Mck engine.py L62-121 */
export interface CoverSpec {
  type: 'cover'
  title: string
  subtitle?: string
}

/** 要点列表 — 照抄 html-ppt-skill bullets.html */
export interface BulletsSpec {
  type: 'bullets'
  title: string
  items: string[]
}

/** 卡片网格 — 照抄 Mck engine.py L243-273 metric_cards() */
export interface CardsSpec {
  type: 'cards'
  title: string
  cards: Array<{ title: string; desc: string }>
  columns?: 2 | 3
}

/** 结束页 — 照抄 Mck engine.py L158-175 closing() */
export interface EndingSpec {
  type: 'ending'
  title: string
  contact?: string
}

/** 大数字 — 照抄 Mck engine.py L181-216 big_number() */
export interface BigNumberSpec {
  type: 'big_number'
  title: string
  number: string
  label: string
  subtitle?: string
}

/** 时间线 — 照抄 Mck engine.py L1175-1200 timeline() */
export interface TimelineSpec {
  type: 'timeline'
  title: string
  events: Array<{ year: string; title: string; desc?: string }>
}

/** 双栏对比 — 照抄 Mck engine.py L1413-1442 pros_cons() */
export interface ComparisonSpec {
  type: 'comparison'
  title: string
  left: { title: string; items: string[] }
  right: { title: string; items: string[] }
  conclusion?: { label: string; text: string }
}

/** 双栏内容 — 照抄 Mck engine.py L1459-1477 two_column_text() */
export interface TwoColumnSpec {
  type: 'two_column'
  title: string
  columns: Array<{ letter: string; label: string; items: string[] }>
}

/** 引用/金句 — 照抄 Mck engine.py L1443-1458 quote() */
export interface BigQuoteSpec {
  type: 'big_quote'
  quote: string
  author?: string
  role?: string
}

/** 指标网格 — 照抄 Mck engine.py L470-503 scorecard() */
export interface StatGridSpec {
  type: 'stat_grid'
  title: string
  stats: Array<{ label: string; value: string; pct?: number }>
}

/** 流程步骤 — 照抄 Mck engine.py L726-768 process_chevron() */
export interface ProcessStepsSpec {
  type: 'process_steps'
  title: string
  steps: Array<{ label: string; title: string; desc?: string }>
}

/** 图文混排 — 照抄 Mck engine.py L1577-1598 content_right_image() */
export interface ImageTextSpec {
  type: 'image_text'
  title: string
  text: string
  subtitle?: string
  image?: string
}

/** 章节过渡 — 照抄 Mck engine.py L123-137 section_divider() */
export interface SectionDividerSpec {
  type: 'section_divider'
  title: string
  sectionLabel?: string
  subtitle?: string
}

/** 团队介绍 — 照抄 Mck engine.py L1478-1505 meet_the_team() */
export interface TeamSpec {
  type: 'team'
  title: string
  members: Array<{ name: string; role: string; avatar?: string; bio?: string }>
}

/** 数据表格 — 照抄 Mck engine.py L275-312 data_table() */
export interface TableSpec {
  type: 'table'
  title: string
  headers: string[]
  rows: string[][]
}

/**
 * 幻灯片规格 — Discriminated Union（15 种 type）
 *
 * 每种 type 一个独立接口，type 做判别键。
 * TypeScript 精确推导——写 spec.type === 'timeline' 后自动知道有 events。
 */
export type SlideSpec =
  | CoverSpec
  | BulletsSpec
  | CardsSpec
  | EndingSpec
  | BigNumberSpec
  | TimelineSpec
  | ComparisonSpec
  | TwoColumnSpec
  | BigQuoteSpec
  | StatGridSpec
  | ProcessStepsSpec
  | ImageTextSpec
  | SectionDividerSpec
  | TeamSpec
  | TableSpec

/** 模板工具参数 */
export interface ApplyTemplateParams {
  slides: SlideSpec[]
  theme?: string
}

/** 有效 type 值（15 种） */
const VALID_TYPES = [
  'cover', 'bullets', 'cards', 'ending',
  'big_number', 'timeline', 'comparison', 'two_column',
  'big_quote', 'stat_grid', 'process_steps', 'image_text',
  'section_divider', 'team', 'table',
]

/**
 * 校验 SlideSpec（手写，参考 page-agent Zod 模式）
 * @returns 错误消息，通过返回 null
 */
export function validateSlideSpec(spec: any): string | null {
  if (!spec.type || !VALID_TYPES.includes(spec.type))
    return `type 必须是 ${VALID_TYPES.join('/')}，收到: ${JSON.stringify(spec.type)}`
  if (!spec.title && spec.type !== 'big_quote')
    return '缺少必填字段 title（字符串）'

  switch (spec.type) {
    case 'cover':
      break  // title 必填已检查，其他全可选

    case 'bullets':
      if (!Array.isArray(spec.items) || spec.items.length === 0)
        return 'type=bullets 需要 items 为非空字符串数组'
      if (spec.items.length > 8)
        return 'type=bullets 的 items 最多 8 条'
      break

    case 'cards':
      if (!Array.isArray(spec.cards) || spec.cards.length === 0)
        return 'type=cards 需要 cards 为非空数组'
      for (const c of spec.cards) {
        if (!c.title || !c.desc)
          return 'cards 每项需要 title 和 desc 字段'
      }
      break

    case 'ending':
      break  // title 必填

    case 'big_number':
      if (!spec.number || !spec.label)
        return 'type=big_number 需要 number 和 label 字段'
      break

    case 'timeline':
      if (!Array.isArray(spec.events) || spec.events.length === 0)
        return 'type=timeline 需要 events 为非空数组'
      for (const e of spec.events) {
        if (!e.title)
          return 'timeline 每项需要 title 字段'
      }
      break

    case 'comparison':
      if (!spec.left?.title || !spec.right?.title)
        return 'type=comparison 需要 left.title 和 right.title'
      if (!Array.isArray(spec.left?.items) || !Array.isArray(spec.right?.items))
        return 'type=comparison 需要 left.items 和 right.items 为非空数组'
      break

    case 'two_column':
      if (!Array.isArray(spec.columns) || spec.columns.length < 2)
        return 'type=two_column 需要 columns 为至少 2 项的数组'
      for (const c of spec.columns) {
        if (!c.label || !Array.isArray(c.items))
          return 'two_column 每项需要 label 和 items 字段'
      }
      break

    case 'big_quote':
      if (!spec.quote || typeof spec.quote !== 'string')
        return 'type=big_quote 需要 quote 字段（字符串）'
      break

    case 'stat_grid':
      if (!Array.isArray(spec.stats) || spec.stats.length === 0)
        return 'type=stat_grid 需要 stats 为非空数组'
      for (const s of spec.stats) {
        if (!s.label || !s.value)
          return 'stat_grid 每项需要 label 和 value 字段'
      }
      break

    case 'process_steps':
      if (!Array.isArray(spec.steps) || spec.steps.length === 0)
        return 'type=process_steps 需要 steps 为非空数组'
      for (const s of spec.steps) {
        if (!s.title)
          return 'process_steps 每项需要 title 字段'
      }
      break

    case 'image_text':
      if (!spec.text || typeof spec.text !== 'string')
        return 'type=image_text 需要 text 字段'
      break

    case 'section_divider':
      break  // title 必填已检查

    case 'team':
      if (!Array.isArray(spec.members) || spec.members.length === 0)
        return 'type=team 需要 members 为非空数组'
      for (const m of spec.members) {
        if (!m.name || !m.role)
          return 'team 每项需要 name 和 role 字段'
      }
      break

    case 'table':
      if (!Array.isArray(spec.headers) || spec.headers.length === 0)
        return 'type=table 需要 headers 为非空数组'
      if (!Array.isArray(spec.rows) || spec.rows.length === 0)
        return 'type=table 需要 rows 为非空数组'
      break
  }
  return null
}
