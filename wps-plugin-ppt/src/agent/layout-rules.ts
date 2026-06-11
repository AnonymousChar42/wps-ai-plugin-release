/**
 * 排版规范常量 — Phase 04 新增
 *
 * 从 Phase 02 调研的四个库中提取的精确数值。
 * 基于 WPS 16:9 幻灯片 (720pt × 405pt)。
 *
 * 来源：
 * - slidev-ppt-agent: Bento Grid 布局尺寸（px → pt 换算）
 * - Mck-ppt-design-skill: 护栏规则 + 字号阶梯
 * - Hermes内置PPT skill: 间距/对比度规则
 */

// ===== 画布常量 =====
/** 幻灯片宽度 (16:9, 10" × 5.625") */
export const SLIDE_WIDTH = 720
/** 幻灯片高度 */
export const SLIDE_HEIGHT = 405
/** 页面边距 */
export const MARGIN = 46

/** 可用内容区 */
export const CONTENT_WIDTH = SLIDE_WIDTH - MARGIN * 2  // 628
export const CONTENT_HEIGHT = SLIDE_HEIGHT - 60         // 345（上留标题区下留底边）

// ===== 字号阶梯（严格，从 Mck + Hermes 提取） =====
export const FONT = {
  /** 封面大标题 */
  coverTitle: 40,
  /** 页面标题 */
  title: 30,
  /** 副标题 */
  subtitle: 20,
  /** 正文 */
  body: 17,
  /** 标签/注释 */
  caption: 13,
  /** 大数字展示 */
  bigNumber: 52,
  /** 脚注 */
  footnote: 9,
} as const

// ===== 间距系统 =====
export const SPACING = {
  /** 标题上方间距 */
  titleTop: 26,
  /** 标题下方间距（到正文或分割线） */
  titleBottom: 10,
  /** 正文行距系数 */
  lineHeight: 1.4,
  /** 卡片间距 */
  cardGap: 20,
  /** 内容块最小间距 */
  minGap: 13,         // 约 0.35" 来自 Mck guard-rail-10
  /** 底部安全距离 */
  bottomSafe: 28,     // 约 0.3" 上方空间
} as const

// ===== 分割线规范 =====
export const DIVIDER = {
  /** 线宽 */
  weight: 2,
  /** 距标题下方距离 */
  offsetFromTitle: 8,
  /** 左右边距（与标题对齐） */
  left: MARGIN,
  /** 宽度（与内容区等宽） */
  width: CONTENT_WIDTH,
} as const

// ===== 装饰圆点规范 =====
export const BULLET_DOT = {
  /** 直径 */
  size: 8,
  /** 距正文左侧偏移（在 margin 内） */
  left: MARGIN - 14,
  /** 垂直偏移（对齐正文首行基线） */
  topOffset: 4,
} as const

// ===== 卡片网格布局参数（从 Bento Grid px → pt 换算） =====
// 原始: 980×552px canvas, 换算: pt = px * 720/980 (约 0.735)

/** 2列对称布局 */
export const GRID_2COL = {
  colWidth: 292,      // 435 * 0.735 → 318, 留 gap
  colGap: 20,
  height: 280,
} as const

/** 3列布局 */
export const GRID_3COL = {
  colWidth: 196,      // 280 * 0.735 ≈ 205, 留 gap
  colGap: 20,
  height: 280,
} as const

/** 2×2 网格 */
export const GRID_2X2 = {
  colWidth: 292,
  rowHeight: 132,
  colGap: 20,
  rowGap: 16,
} as const

/** 大数字展示区域 */
export const BIG_NUMBER = {
  boxLeft: CONTENT_WIDTH * 0.3,
  boxWidth: CONTENT_WIDTH * 0.4,
  boxTop: 110,
  boxHeight: 180,
  numberSize: 56,
  labelSize: 14,
} as const

// ===== 字符预算（从 Mck layout-matrix 提取） =====
export const CHAR_BUDGET = {
  /** 标题最大字数 */
  title: 40,
  /** 正文每行最大字数 */
  bodyPerLine: 60,
  /** 卡片标题最大字数 */
  cardTitle: 15,
  /** 卡片描述最大字数 */
  cardDesc: 80,
  /** 大数字标签最大字数 */
  bigNumberLabel: 12,
  /** 每页最多正文行数 */
  maxLinesPerSlide: 7,
  /** 最多要点数（带圆点列表） */
  maxBullets: 5,
  /** 时间线最多节点 */
  maxTimelineNodes: 5,
} as const

// ===== 颜色对比度检查阈值 =====
export const CONTRAST = {
  /** 正文与背景最小对比度 (WCAG AA) */
  minRatio: 4.5,
  /** 大文字（≥18pt）与背景最小对比度 */
  minRatioLarge: 3.0,
} as const
