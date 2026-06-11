/**
 * PPT 主题参数定义
 *
 * 5 套预设配色方案，LLM 可自动选择或用户手动选择。
 * 借鉴 html-ppt-skill 的 Design Token 系统和 slidev-ppt-agent 的 archetype 匹配。
 */

/** 主题定义 */
export interface Theme {
  /** 主题名称 */
  name: string
  /** 背景色 (RRGGBB) */
  bg: string
  /** 标题色 (RRGGBB) */
  title: string
  /** 正文色 (RRGGBB) */
  body: string
  /** 强调色 (RRGGBB) — 色块/线条/圆点装饰色 */
  accent: string
  /** 浅色强调色 (RRGGBB) — 用作卡片底色 */
  accentLight: string
  /** 标题字号 */
  titleSize: number
  /** 正文字号 */
  bodySize: number
  /** 适用场景描述 */
  scenario: string
}

/** 全部预设主题 */
export const THEMES: Record<string, Theme> = {
  business: {
    name: '商务蓝',
    bg: 'ffffff',
    title: '1a1a2e',
    body: '333333',
    accent: '2d6ff7',
    accentLight: 'e8f0fe',
    titleSize: 32,
    bodySize: 18,
    scenario: '企业汇报、工作总结、商业提案'
  },
  tech: {
    name: '科技暗',
    bg: '0a0a1a',
    title: '00d4ff',
    body: 'b0b8d0',
    accent: '7c3aed',
    accentLight: '1a1030',
    titleSize: 30,
    bodySize: 16,
    scenario: '技术分享、产品发布、黑客松'
  },
  minimal: {
    name: '极简白',
    bg: 'fafafa',
    title: '111111',
    body: '555555',
    accent: '059669',
    accentLight: 'ecfdf5',
    titleSize: 28,
    bodySize: 16,
    scenario: '学术报告、设计评审、文档演示'
  },
  creative: {
    name: '创意暖',
    bg: 'fffbeb',
    title: '991b1b',
    body: '44403c',
    accent: 'f59e0b',
    accentLight: 'fef3c7',
    titleSize: 36,
    bodySize: 20,
    scenario: '创意提案、品牌推广、活动策划'
  },
  academic: {
    name: '学术蓝',
    bg: 'ffffff',
    title: '1e3a5f',
    body: '334155',
    accent: '8b5cf6',
    accentLight: 'ede9fe',
    titleSize: 34,
    bodySize: 18,
    scenario: '论文答辩、学术报告、教育课件'
  },
  // ===== Phase 06 新增：照抄 html-ppt-skill =====
  tokyo_night: {
    name: '东京夜',
    bg: '1a1b26',
    title: 'c0caf5',
    body: 'a9b1d6',
    accent: '7aa2f7',
    accentLight: '24283b',
    titleSize: 30,
    bodySize: 16,
    scenario: '技术分享、开发者大会、暗色主题'
  },
  nord: {
    name: 'Nord 冰蓝',
    bg: '2e3440',
    title: 'eceff4',
    body: 'd8dee9',
    accent: '88c0d0',
    accentLight: '3b4252',
    titleSize: 28,
    bodySize: 16,
    scenario: '学术技术、设计评审、冷色调演示'
  },
  neo_brutal: {
    name: '新粗野',
    bg: 'fffef0',
    title: '000000',
    body: '222222',
    accent: 'ffd400',
    accentLight: 'fff38a',
    titleSize: 36,
    bodySize: 18,
    scenario: '创意提案、品牌设计、大胆风格'
  }
}

/** 默认主题 */
export const DEFAULT_THEME = 'business'

/**
 * 获取主题参数
 */
export function getTheme(key: string): Theme {
  return THEMES[key] || THEMES[DEFAULT_THEME]
}

/**
 * 将主题参数格式化为提示词片段
 */
export function themeToPrompt(theme: Theme): string {
  return `
## 当前配色方案：${theme.name}

| 用途 | 色值 |
|------|------|
| 背景 | #${theme.bg} |
| 标题文字 | #${theme.title}（${theme.titleSize}pt） |
| 正文文字 | #${theme.body}（${theme.bodySize}pt） |
| 强调色（色块/线条） | #${theme.accent} |
| 浅色底色（卡片） | #${theme.accentLight} |

使用颜色时直接传 RRGGBB 值（如 "${theme.accent}"），不需要 # 前缀。
`
}
