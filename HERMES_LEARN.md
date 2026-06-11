# WPS AI 插件项目 — 深入学习文档

> 适用读者：刚接手项目的开发者
> 最后更新：2026-05-26
> 项目路径：`D:/ai-codes/wps-ai-plugin-backup`

---

## 目录

1. [项目总览](#1-项目总览)
2. [目录结构全解](#2-目录结构全解)
3. [架构层次](#3-架构层次)
4. [核心数据流：用户输入 → WPS 文档变化](#4-核心数据流用户输入--wps-文档变化)
5. [所有数据结构速查](#5-所有数据结构速查)
6. [完整调用栈](#6-完整调用栈)
7. [Shared 公共层详解](#7-shared-公共层详解)
8. [WPS API 模式与陷阱](#8-wps-api-模式与陷阱)
9. [构建与调试](#9-构建与调试)

---

## 1. 项目总览

### 这是什么？

一个 **pnpm monorepo** 项目，为 WPS Office 的三个组件各提供一个「AI 智能体」面板：

| 插件 | 面板标题 | 能力 |
|------|---------|------|
| **PPT** (`wps-plugin-ppt`) | "AI 生成 PPT" | 创建幻灯片、排版、15 种模板（封面/要点/卡片/表格...） |
| **Excel** (`wps-plugin-excel`) | "AI 生成表格" | 读取/写入单元格、公式排查、格式化、图表 |
| **Word** (`wps-plugin-word`) | "AI 排版助理" | 读取/格式化段落、插入文本、创建表格、查找替换 |

### 核心概念

```
用户输入文字 → AI 智能体循环（ReAct 模式）
                 ├── 调用 LLM API
                 ├── LLM 决定用哪个工具
                 ├── 工具操作 WPS 文档
                 └── 结果返回给 LLM → 继续或完成
```

### 技术栈

- **前端**: Vue 3 + TypeScript + Vite
- **UI**: ant-design-vue + ant-design-x-vue
- **包管理**: pnpm monorepo (workspace + catalog)
- **测试**: vitest
- **WPS API**: `et-jsapi-declare` (Excel/PowerPoint 类型声明)
- **LLM**: OpenAI-compatible API（DeepSeek）

---

## 2. 目录结构全解

```
wps-ai-plugin-backup/
├── shared/                          ← 🔑 公共代码层（所有插件复用）
│   ├── agent/                       # AI 智能体核心
│   │   ├── agent-loop.ts            #   通用 Agent 循环（ReAct 模式）
│   │   ├── tool-adapter.ts          #   工具适配器接口
│   │   ├── types.ts                 #   OpenAI 格式消息/工具类型
│   │   ├── step-history.ts          #   步骤历史记录
│   │   ├── themes.ts                #   8 套 PPT 配色主题
│   │   ├── tool-utils.ts            #   clampMsg 等工具函数
│   │   └── __tests__/               #   公共层测试
│   ├── components/                  # Vue 公共组件
│   │   ├── AgentPane.vue            #   AI 智能体面板（核心 UI）
│   │   ├── AiPane.vue               #   通用 AI 聊天面板
│   │   └── StepProgress.vue         #   步骤进度组件
│   ├── types/                       # TypeScript 类型
│   │   ├── index.ts                 #   Agent, AIRequestConfig, ChatItem 等
│   │   └── agent.ts                 #   AgentStep, AgentResult
│   ├── config/                      # 配置
│   │   └── agents.ts                #   预设 agent 定义
│   ├── tsconfig.json
│   ├── package.json
│   └── env.d.ts
│
├── wps-plugin-ppt/                  ← PPT 插件
│   ├── src/
│   │   ├── agent/                   #   智能体逻辑
│   │   │   ├── slide-tool-adapter.ts #   幻灯片适配器接口
│   │   │   ├── tools.ts             #   12 个 LLM 工具
│   │   │   ├── prompts.ts           #   系统提示词
│   │   │   ├── agent-loop.ts        #   薄封装（~20 行）
│   │   │   ├── layout-rules.ts      #   排版常量（坐标/字号）
│   │   │   ├── composables/useAgent.ts
│   │   │   ├── adapters/
│   │   │   │   ├── wps-slide-adapter.ts   # WPS 生产实现
│   │   │   │   └── browser-slide-adapter.ts # 内存 mock
│   │   │   └── __tests__/
│   │   ├── components/
│   │   │   ├── AgentPane.vue        #   薄封装（~20 行）
│   │   │   ├── AiPane.vue
│   │   │   ├── ribbon.js            #   WPS 功能区事件
│   │   │   └── js/                  #   util, sensors 等辅助
│   │   ├── router/index.js
│   │   └── main.js
│   ├── public/
│   │   ├── ribbon.xml               #   WPS 功能区 XML 定义
│   │   └── images/                  #   图标（SVG）
│   └── package.json
│
├── wps-plugin-excel/               ← Excel 插件（结构同 PPT）
│   └── src/agent/
│       ├── excel-adapter.ts
│       ├── tools.ts                 #   10 个 LLM 工具
│       ├── prompts.ts
│       └── adapters/
│           ├── wps-excel-adapter.ts
│           └── browser-excel-adapter.ts
│
├── wps-plugin-word/                ← Word 插件（结构同 Excel）
│   └── src/agent/
│       ├── word-adapter.ts
│       ├── tools.ts                 #   13 个 LLM 工具
│       ├── prompts.ts
│       └── adapters/
│           ├── wps-word-adapter.ts
│           └── browser-word-adapter.ts
│
├── .planning/                       ← GSD 项目规划
│   ├── ROADMAP.md
│   └── phases/09-excel-word-agent/
│       ├── 09-CONTEXT.md
│       ├── 09-PLAN.md
│       ├── 09-LEARNINGS.md
│       └── ...
│
├── pnpm-workspace.yaml              ← monorepo 配置 + 依赖版本 catalog
└── AGENTS.md                        ← 开发指南
```

---

## 3. 架构层次

### 三层架构（自上而下）

```
┌──────────────────────────────────────────────┐
│           Vue 层（UI）                        │
│  AgentPane.vue (shared)                      │
│  └→ 薄封装 AgentPane.vue (每个插件 ~20 行)    │
│     └→ 用户输入 → createAgent(aiConfig)       │
├──────────────────────────────────────────────┤
│          Agent 层（逻辑）                      │
│  AgentLoop (shared)                          │
│  └→ 通过 AgentLoopConfig 依赖注入             │
│     ├── buildCorePrompt     (插件提供)        │
│     ├── buildToolSchemas    (插件提供)        │
│     ├── executeTool         (插件提供)        │
│     └── adapter             (插件提供)        │
├──────────────────────────────────────────────┤
│        Adapter 层（WPS 操作）                  │
│  ToolAdapter 接口 (shared)                   │
│  ├── WpsXxxAdapter       (WPSJS API)         │
│  └── BrowserXxxAdapter   (内存 mock 测试)     │
└──────────────────────────────────────────────┘
```

### 关键设计：依赖注入

```typescript
// shared/agent/agent-loop.ts
interface AgentLoopConfig {
  adapter: ToolAdapter                    // 插件注入
  buildCorePrompt: (t: Theme) => string   // 插件注入
  buildToolSchemas: () => ToolSchema[]    // 插件注入
  executeTool: (name, args) => ToolResult // 插件注入
  // ...
}

// 每个插件的 agent-loop.ts 只有 ~70 行，纯装配
export class WordAgentLoop extends AgentLoop {
  constructor(adapter: WordAdapter, aiConfig) {
    super({
      adapter,
      buildCorePrompt: (t) => buildCorePrompt(t),
      buildToolSchemas: () => buildToolSchemas(),
      executeTool: (name, args) => executeTool(name, args, adapter),
      // ...
    })
  }
}
```

---

## 4. 核心数据流：用户输入 → WPS 文档变化

### 完整链路（以 Word 为例）

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
第 1 步：用户在 AgentPane 输入框中输入
        "给我排版这篇文章"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AgentPane.vue (Vue)
  ├── handleGenerate() 
  ├── agentState.isRunning = true
  ├── agent.run(inputText)
  │     └→ WordAgentLoop.run({ inputText, onStepUpdate, maxSteps })
  │
  └── [AgentLoop.run() 内部]
      │
      ├── ① 获取文档状态
      │   adapter.getDocumentInfo()
      │   └→ { count: 10, title: "文字文稿1" }
      │
      ├── ② 构建初始 messages
      │   messages = [
      │     { role: "system",  content: corePrompt + refSummary + refPrompt },
      │     { role: "user",    content: "## 任务\n给我排版...\n\n## 当前文档状态\n10个段落" }
      │   ]
      │
      ├── ③ 进入循环（for i=0; i<maxSteps; i++）
      │   │
      │   ├── ④ maybeCompress() — 消息超过 24 条时压缩
      │   │
      │   ├── ⑤ callLLM()
      │   │   │  POST https://api.deepseek.com/chat/completions
      │   │   │  body: { model, messages, tools: [13个工具schema], temperature: 0.3 }
      │   │   │
      │   │   └── 返回:
      │   │       choices[0].message.tool_calls = [
      │   │         { function: { name: "get_paragraphs", arguments: "{}" } }
      │   │       ]
      │   │
      │   ├── ⑥ 批量执行 tool_calls
      │   │   for each tool_call:
      │   │     ├── describeAction("get_paragraphs", {}) → "正在读取段落列表..."
      │   │     ├── addStep("正在读取段落列表...", "running")
      │   │     ├── executeTool("get_paragraphs", {}, adapter)
      │   │     │   └→ adapter.getParagraphs()
      │   │     │       └→ WpsWordAdapter: doc.Paragraphs.Item(1..n).Range.Text
      │   │     │       └→ BrowserWordAdapter: this._paragraphs.map(...)
      │   │     │   └→ 返回 { message: "## 段落列表\n| # | 样式 | 预览 |\n..." }
      │   │     ├── messages.push({ role: "tool", content: result.message })
      │   │     └── updateLastStep("...", "done")
      │   │
      │   └── 回到 ③，LLM 收到 tool 结果后决定下一步操作
      │
      └── ⑦ LLM 返回 done → handleDone() → 返回 AgentResult
          { summary: "已完成排版...", success: true, steps: [...] }
```

### 消息格式（OpenAI 兼容）

```
轮次 1（发送）:
  system:  "你是 WPS 文字排版助理..."           ← buildCorePrompt + refSummary + refPrompt
  user:    "## 任务\n给我排版...\n\n## 当前文档状态\n10个段落"

轮次 1（接收）:
  assistant: { tool_calls: [{ name: "get_paragraphs", args: {} }] }

轮次 2（发送）:
  system:  (同上)
  user:    (同上)
  assistant: { tool_calls: [{ name: "get_paragraphs" }] }
  tool:    "文档共 10 个段落：\n| # | 样式 | 预览 |..."

轮次 2（接收）:
  assistant: { tool_calls: [
    { name: "set_style",     args: { paragraphIndex: 1, styleName: "Title" }},
    { name: "format_text",   args: { paragraphIndex: 1, bold: true, size: 22 }},
    { name: "set_style",     args: { paragraphIndex: [4,7,10], styleName: "Heading 1" }}
  ]}
```

---

## 5. 所有数据结构速查

### shared/agent/types.ts — OpenAI 格式

```typescript
// 消息角色
type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

// LLM 返回的工具调用
interface ToolCall {
  id: string                           // "call_0_0"
  type: 'function'
  function: {
    name: string                       // "get_paragraphs"
    arguments: string                  // '{"paragraphIndex":1}' (JSON字符串)
  }
}

// 对话消息
interface ChatMessage {
  role: MessageRole
  content?: string | null
  tool_calls?: ToolCall[]              // assistant 消息中的工具调用
  tool_call_id?: string                // tool 消息中对应的 assistant 调用 ID
  reasoning_content?: string           // DeepSeek thinking 模式
}

// 工具参数属性
interface ToolParameterProperty {
  type: string                         // "string" | "number" | "boolean" | "array"
  description: string
  enum?: string[]
  items?: Record<string, unknown>      // 数组元素类型
  properties?: Record<string, ToolParameterProperty>  // 嵌套对象
  required?: string[]
}

// 工具 Schema（发给 LLM 的 function definition）
interface ToolSchema {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, ToolParameterProperty>
      required: string[]
    }
  }
}
```

### shared/types/agent.ts — 智能体步骤

```typescript
interface AgentStep {
  id: string                           // "step_1711234567890_1"
  description: string                  // "正在读取段落列表..."
  status: 'pending' | 'running' | 'done' | 'error'
  error?: string
}

interface AgentResult {
  summary: string                      // LLM done 时给用户的消息
  success: boolean
  steps: AgentStep[]
  slideCount: number
}
```

### shared/types/index.ts — 通用类型

```typescript
interface AIRequestConfig {
  baseURL: string                      // "https://api.deepseek.com"
  model: string                        // "deepseek-v4-flash"
  apiKey: string                       // "sk-..."
}

interface Agent {
  label: string                        // 显示名称
  showedContent: string                // 展示的 prompt 模板
  extraPrompt: string                  // 额外系统提示
  useSelection?: boolean
}

interface ChatItem {
  key: string
  role: 'user' | 'assistant'
  content: string
  renderedHtml?: string
  loading?: boolean
  finished?: boolean
}
```

### shared/agent/tool-adapter.ts — 适配器契约

```typescript
interface ToolResult {
  success: boolean
  message: string                      // 给 LLM 看的结果描述
  data?: unknown
}

interface DocumentInfo {
  count?: number                       // 段落数/工作表数/幻灯片数
  title?: string
  [key: string]: unknown               // 插件可扩展
}

interface ToolAdapter {
  readonly name: string
  getDocumentInfo(): Promise<DocumentInfo>
}
```

### shared/agent/step-history.ts — 步骤历史

```typescript
interface StepRecord {
  index: number                        // 步序号（1-based）
  description: string
  toolNames: string[]                  // 本轮调用的工具名列表
  resultSummary: string                // 结果摘要（截断至 100 字）
  success: boolean
}

class StepHistory {
  push(step: StepRecord): void
  recent(n: number): StepRecord[]      // 最近 N 步，倒序
  count: number
  toPrompt(maxSteps?: number): string  // "## 最近操作\n- Step 1 ✅ 封面..."
  reset(): void
}
```

### shared/agent/themes.ts — PPT 配色

```typescript
interface Theme {
  name: string                         // "商务蓝"
  bg: string                           // "ffffff"
  title: string                        // "1a1a2e"
  body: string                         // "333333"
  accent: string                       // "2d6ff7" (强调色)
  accentLight: string                  // "e8f0fe" (卡片底色)
  titleSize: number
  bodySize: number
  scenario: string                     // "企业汇报"
}

const THEMES: Record<string, Theme>    // 8 套预设
```

### shared/agent/agent-loop.ts — Agent 循环配置

```typescript
interface AgentRunOptions {
  inputText: string
  onStepUpdate: (steps: AgentStep[]) => void  // UI 回调
  maxSteps?: number                            // 默认 999
  abortSignal?: AbortSignal
}

interface AgentLoopConfig {
  adapter: ToolAdapter
  aiConfig: AIRequestConfig
  themeKey: string
  buildCorePrompt: (theme: Theme) => string
  buildReferenceSummary: (theme: Theme) => string
  buildReferencePrompt: (theme: Theme) => string
  buildToolSchemas: () => ToolSchema[]
  executeTool: (name: string, args: Record<string, unknown>) => Promise<ToolResult>
  buildDocumentSummary: (info: DocumentInfo) => string
  describeAction: (toolName: string, args: Record<string, unknown>) => string
}
```

### Word 插件特有类型

```typescript
// word-adapter.ts
interface ParagraphInfo {
  index: number                        // 1-based
  text: string
  style?: string                       // "Heading 1", "Normal" 等
  preview: string                      // 前 80 字
}

interface TextFormatOptions {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  size?: number                        // 磅
  name?: string                        // "宋体"
  color?: string                       // "FF0000" (RRGGBB)
}

interface ParagraphFormatOptions {
  alignment?: 'left' | 'center' | 'right' | 'justify'
  spaceBefore?: number
  spaceAfter?: number
  lineSpacing?: number                 // 1.0=单倍, 1.5=1.5倍, 2.0=双倍
}

interface TableCellData {
  row: number                          // 1-based
  col: number                          // 1-based
  text: string
}

interface WordAdapter extends ToolAdapter {
  getParagraphs(): Promise<ParagraphInfo[]>
  getText(paragraphIndex: number): Promise<string>
  insertText(text: string, position?: number): Promise<ToolResult>
  setText(paragraphIndex: number, text: string): Promise<ToolResult>
  formatText(paragraphIndex: number, options: TextFormatOptions): Promise<ToolResult>
  formatParagraph(paragraphIndex: number, options: ParagraphFormatOptions): Promise<ToolResult>
  setStyle(paragraphIndex: number, styleName: string): Promise<ToolResult>
  createTable(rows: number, cols: number, position?: number): Promise<ToolResult>
  fillTable(tableIndex: number, cells: TableCellData[]): Promise<ToolResult>
  findReplace(findText: string, replaceText: string): Promise<ToolResult>
  insertPageBreak(position?: number): Promise<ToolResult>
}
```

### Excel 插件特有类型

```typescript
// excel-adapter.ts
interface WorkbookInfo {
  sheets: string[]
  activeSheet: string
  ranges: Record<string, string>       // "Sheet1": "D5"
  previews: Record<string, unknown[][]> // 每表前 5 行数据
}

interface CellData {
  address: string                      // "A1"
  value: unknown
  formula: string | null
  numberFormat?: string
}

interface RangeData {
  range: string
  cells: CellData[]
  rowCount: number
  colCount: number
}

interface FormatOptions {
  font?: { name?, size?, bold?, italic?, underline?, color? }
  border?: { style?, color?, edges? }
  fill?: { color?, pattern? }
  alignment?: { horizontal?, vertical?, wrapText? }
  numberFormat?: string
}

type ChartType = 'column' | 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'area'
type SortOrder = 'asc' | 'desc'
```

---

## 6. 完整调用栈

### 6.1 Word Agent 调用栈（从用户点击到结果渲染）

```
用户点击「生成」按钮
│
├── [Vue] AgentPane.vue: handleGenerate()
│   ├── 校验 aiConfig（baseURL, model, apiKey）
│   ├── agent.run(inputText)
│   │
│   └── [Agent] WordAgentLoop.run()
│       │ new WordAgentLoop(adapter, aiConfig)
│       │   └→ super(config)
│       │       └→ AgentLoop.constructor(config)
│       │           ├── toolSchemas = config.buildToolSchemas()
│       │           │   └→ tools.ts: buildToolSchemas()
│       │           │       └→ returns ToolSchema[13]
│       │           ├── stepHistory = new StepHistory()
│       │           ├── cachedCorePrompt = buildCorePrompt(theme)
│       │           │   └→ prompts.ts: 返回 ~1.5KB 字符串
│       │           ├── cachedRefSummary = buildReferenceSummary(theme)
│       │           └── cachedRefPrompt = buildReferencePrompt(theme)
│       │
│       ├── ① adapter.getDocumentInfo()
│       │   ├─[WPS] WpsWordAdapter.getDocumentInfo()
│       │   │   └→ (window as any).Application.ActiveDocument
│       │   │       └→ 读 Paragraphs.Count, Name, Sections.Count
│       │   └─[Test] BrowserWordAdapter.getDocumentInfo()
│       │       └→ { count: this._paragraphs.length, ... }
│       │
│       ├── ② messages = [system, user]
│       │   system = corePrompt + "\n\n" + refSummary + "\n\n" + refPrompt
│       │   user   = "## 任务\n{inputText}\n\n## 当前文档状态\n{docSummary}"
│       │
│       ├── ③ for (i = 0; i < maxSteps; i++):
│       │   │
│       │   ├── maybeCompress()
│       │   │   └→ if (messages.length > 24):
│       │   │       保留 [system, user, 压缩摘要, ...tail(14条)]
│       │   │
│       │   ├── callLLM()
│       │   │   └→ fetch(url, { method: 'POST', body: JSON.stringify({
│       │   │       model, messages, tools: toolSchemas,
│       │   │       temperature: 0.3, enable_thinking: false
│       │   │     })})
│       │   │   └→ 解析 response.choices[0].message.tool_calls
│       │   │   └→ 返回 { toolCalls: [{ toolName, toolArgs }, ...] }
│       │   │
│       │   └── 批量执行 tool_calls:
│       │       for each { toolName, toolArgs } in toolCalls:
│       │         │
│       │         ├── if toolName === 'done':
│       │         │   └→ handleDone(args) → return buildResult()
│       │         │
│       │         ├── addStep(describeAction(name, args), 'running')
│       │         │   └→ notify(onStepUpdate)
│       │         │       └→ [Vue] agentState.steps = newSteps
│       │         │           └→ <StepProgress> 组件重新渲染
│       │         │
│       │         ├── executeTool(name, args)
│       │         │   └→ tools.ts: executeTool(name, args, adapter)
│       │         │       └→ switch(name):
│       │         │           case 'get_paragraphs':
│       │         │             adapter.getParagraphs()
│       │         │             └→ 构建 Markdown 表格
│       │         │             └→ return { success: true, message: "| # | ..." }
│       │         │
│       │         │           case 'format_text':
│       │         │             getIndices(args)  // 支持 number | number[]
│       │         │             for idx in indices:
│       │         │               adapter.formatText(idx, options)
│       │         │               └→ [WPS] doc.Paragraphs.Item(idx).Range.Font.Bold = true
│       │         │               └→ [Test] this._paragraphs[idx-1].bold = true
│       │         │             └→ return { success: true, message: "已格式化4个段落（24-27）" }
│       │         │
│       │         │           case 'set_style':
│       │         │             adapter.setStyle(idx, styleName)
│       │         │             └→ [WPS] para.Style = doc.Styles.Item("Heading 1")
│       │         │
│       │         ├── messages.push({ role: 'tool', content: result.message })
│       │         └── updateLastStep(..., 'done')
│       │
│       └── ④ return { summary, success, steps }
│
└── [Vue] agentState.result = result.summary
    └→ <div class="result-text" v-html="renderedResult" />
        └→ computed: md.render(agentState.result)
            └→ markdown-it 渲染为 HTML
```

### 6.2 Excel Agent 调用栈（差异部分）

```
与 Word 相同，差异在于：
- adapter: ExcelAdapter (非 WordAdapter)
- tools: 10 个（get_workbook_info, get_range, set_value, set_formula, ...）
- executeTool 中的 switch 分支不同
- LLM 看到的工具 schema 不同
```

### 6.3 PPT Agent 调用栈（差异部分）

```
与 Word/Excel 相同，差异在于：
- adapter: SlideToolAdapter
  - 多了 getPresentationInfo, createSlide, addTextBox, addShape, addLine, 
    setSlideBg, setShapeStyle, deleteShape, applyTemplate
- tools: 12 个（含 apply_template 模板工具）
- prompts 有 PPT 专属的画布坐标约束 + 质量自检清单
```

---

## 7. Shared 公共层详解

### 7.1 AgentLoop（核心循环）

**文件**: `shared/agent/agent-loop.ts`（371 行）

**职责**: 管理 LLM 对话循环、工具调用、消息压缩。

**关键方法**:

| 方法 | 说明 |
|------|------|
| `run(options)` | 主入口：初始化 → 获取文档状态 → 进入循环 |
| `callLLM(abortSignal)` | POST OpenAI API，解析 tool_calls |
| `maybeCompress()` | 消息 > 24 条时触发压缩，保留尾部 14 条 |
| `handleDone(args)` | 处理 done 工具调用 |
| `addStep(desc, status)` | 记录步骤到 steps 数组 |
| `buildResult()` | 组装最终 AgentResult |

**压缩策略**:
```
消息数 > MSG_WINDOW(24) → 触发压缩
├── 计算 tailStart = messages.length - KEEP_TAIL(14)
├── 向前扫描确保以 assistant 消息开头（OpenAI 协议要求）
├── 重建消息：
│   [system] [user] [压缩摘要] [tail...]
│                     └→ 包含 docSummary + stepHistory.toPrompt(6)
└── 丢失的中间 tool 消息由压缩摘要替代
```

### 7.2 ToolAdapter（适配器接口）

**文件**: `shared/agent/tool-adapter.ts`（41 行）

**职责**: 定义最小契约——所有插件的适配器必须实现 `getDocumentInfo()`。

```typescript
interface ToolAdapter {
  readonly name: string
  getDocumentInfo(): Promise<DocumentInfo>
}
```

每个插件在这个基础上扩展自己的接口（WordAdapter, ExcelAdapter, SlideToolAdapter）。

### 7.3 StepHistory（步骤历史）

**文件**: `shared/agent/step-history.ts`（71 行）

**职责**: 记录每轮工具调用的结果，用于：
1. 消息压缩时注入历史摘要
2. UI 步骤进度展示

```
toPrompt(6) 输出示例:
## 最近操作
- Step 3 ✅ 设置样式 → 已对段落（1,4,7,10）应用样式"Heading 1"
- Step 2 ✅ 读取段落 → 文档共10个段落
- Step 1 ✅ 读取信息 → 当前文档有10个段落
```

### 7.4 Themes（配色主题）

**文件**: `shared/agent/themes.ts`（150 行）

**职责**: 8 套预设 PPT 配色方案。Word/Excel 也加载但实际不使用（prompt 中 `_theme` 参数被忽略）。

### 7.5 AgentPane（核心 UI 组件）

**文件**: `shared/components/AgentPane.vue`（~330 行）

**职责**: 通用 AI 面板 UI。
- 输入框（ant-design TextArea）
- 生成/停止按钮
- 步骤进度（<StepProgress>）
- 最终结果渲染（markdown-it → HTML）

**Props**:
```typescript
{
  title: string              // "AI 排版助理"
  emptyHint?: string         // 输入框 placeholder
  createAgent: (aiConfig) => AgentStateManager  // 工厂函数
}
```

**每个插件的 AgentPane.vue 只有 ~20 行**:
```vue
<SharedAgentPane
  title="AI 排版助理"
  empty-hint="在此描述你想要的操作..."
  :create-agent="createWordAgent"
/>
```

---

## 8. WPS API 模式与陷阱

### 8.1 双适配器模式（为什么需要）

```
WPS 环境：                           浏览器测试环境：
window.Application.ActiveDocument     BrowserWordAdapter
  └→ 操作真实 WPS 文档                  └→ 内存数组 mock
  └→ 只能在 WPS 加载项中运行             └→ vitest 可直接运行
```

**isAvailable() 检测**:
```typescript
// WpsWordAdapter
static isAvailable(): boolean {
  return !!(window as any).Application?.ActiveDocument
}

// BrowserWordAdapter
static isAvailable(): boolean {
  return false  // 永远返回 false，确保 fallback
}
```

**AgentPane 中的选择逻辑**:
```typescript
function createWordAgent(aiConfig) {
  const isWps = WpsWordAdapter.isAvailable()
  const adapter = isWps ? new WpsWordAdapter() : new BrowserWordAdapter()
  return createAgentState(adapter, aiConfig)
}
```

### 8.2 WPS API 铁律：先查 .d.ts

**类型文件位置**:
- Excel: `node_modules/.pnpm/et-jsapi-declare@2.5.0/.../lib.et.d.ts`
- PPT 形状: `lib.kso.d.ts`
- Word: **无类型声明**，全部 `(window as any).Application.ActiveDocument`

**Excel 常见踩坑**:
```
错误: rng.Cells(1, 1)       → "is not a function"
原因: Cells 是 readonly 属性，不是方法
正确: rng.Item(1, 1)

错误: rng.Value = 123        → "Cannot redefine property"
原因: Value 是重载方法，不是可写属性
正确: rng.Value2 = 123

错误: wb.Sheets("Sheet1")    → "is not a function"  
原因: Sheets 只有 Item(Index) 方法
正确: wb.Sheets.Item("Sheet1")
```

### 8.3 Word API（无 TS 声明模式）

WPS Writer 通过 `window.Application.ActiveDocument` 暴露 VBA 兼容的对象模型：

```javascript
const doc = (window as any).Application.ActiveDocument

// 段落
doc.Paragraphs.Count
doc.Paragraphs.Item(1).Range.Text
doc.Paragraphs.Last

// 字体
para.Range.Font.Bold = true
para.Range.Font.Size = 12
para.Range.Font.Name = "宋体"
para.Range.Font.Color = 0xFF0000

// 段落格式
para.Format.Alignment = 1  // 0=左, 1=中, 2=右, 3=两端

// 样式
para.Style = doc.Styles.Item("Heading 1")

// 表格
doc.Tables.Add(range, rows, cols)
doc.Tables.Item(1).Cell(1, 1).Range.Text = "内容"

// 分页
range.InsertBreak(7)  // wdPageBreak = 7
```

**insertText 的血泪教训**:
```javascript
// ❌ 错误 — \r 不创建段落分隔符
range.InsertAfter('\r' + text)

// ✅ 正确 — 先创建段落再设文本
range.InsertParagraphAfter()
doc.Paragraphs.Last.Range.Text = text
```

### 8.4 新增面板的 4 文件规则

WPS 加载项新增一个任务窗格按钮，必须同时改 4 处：

| # | 文件 | 修改内容 |
|---|------|---------|
| 1 | `public/ribbon.xml` | 注册 `<button>` 标签 |
| 2 | `src/components/ribbon.js` | `OnAction` case + `GetImage` case |
| 3 | `src/router/index.js` | 添加路由 |
| 4 | `src/components/XxxPane.vue` | 窗格组件 |

**ribbon.js 统一约定**:
```javascript
import Util from './js/util.js'

function OnAddinLoad(ribbonUI) { /* 初始化 */ }
function OnAction(control) { /* switch(control.Id) */ }
function GetImage(control) { /* 返回 SVG 路径 */ }
function OnGetEnabled(control) { return true }
function OnGetVisible(control) { return true }
function OnGetLabel(control) { return "" }
function OnNewDocumentApiEvent(doc) { return true }

export default { OnAddinLoad, OnAction, GetImage, OnGetEnabled, OnGetVisible, OnGetLabel, OnNewDocumentApiEvent }
```

---

## 9. 构建与调试

### 开发命令

```bash
# 安装依赖
pnpm install --no-frozen-lockfile

# 启动 Word 插件开发服务器
cd wps-plugin-word && pnpm dev

# 运行测试
cd wps-plugin-word && pnpm test        # vitest run (单次)
cd wps-plugin-word && pnpm test:watch  # vitest (持续)

# 类型检查
node node_modules/.pnpm/vue-tsc@*/node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.json

# 构建
cd wps-plugin-word && pnpm build
```

### 调试工具

- **eruda**: 在 `main.js` 中，本地调试时自动加载（`eruda.init()`），提供 Console/Elements/Network 面板
- **适配器日志**: WPS 适配器中每个方法都有 `console.log('[WpsWordAdapter] ...')`, 生产环境不显示（无 vConsole），不影响性能
- **AgentLoop 日志**: `console.log('[AgentLoop] → LLM tool消息 [...]')` 打印每次工具调用结果

### 测试模式

**Browser 适配器测试** (vitest):
```typescript
// 所有插件通用模式
const adapter = new BrowserWordAdapter()
adapter.initTestData(['标题', '正文段落', '...'])
// 测试工具调用
const result = await executeTool('get_paragraphs', {}, adapter)
expect(result.success).toBe(true)
```

**当前测试覆盖**:
- Word: 57 tests (28 browser-adapter + 29 tools)
- Excel: 13 tests
- PPT: 3 test files (agent-loop + browser-adapter + tools)

### 环境变量

`shared/.env`（三个插件共用 `envDir`）:
```
VITE_AI_BASE_URL=https://api.deepseek.com
VITE_AI_MODEL=deepseek-v4-flash
VITE_AI_API_KEY=sk-...
```

---

## 附录 A: Word Agent 13 个工具完整签名

| 工具 | 参数 | 返回 |
|------|------|------|
| `get_document_info` | (无) | 段落数、节数、标题 |
| `get_paragraphs` | (无) | Markdown 表格（#、样式、预览） |
| `get_text` | `paragraphIndex: number` | 段落全文 |
| `insert_text` | `text: string, position?: number` | 成功/失败 |
| `set_text` | `paragraphIndex: number, text: string` | 成功/失败 |
| `format_text` | `paragraphIndex: number\|number[], bold?, italic?, underline?, size?, name?, color?` | 成功/失败 |
| `format_paragraph` | `paragraphIndex: number\|number[], alignment?, spaceBefore?, spaceAfter?, lineSpacing?` | 成功/失败 |
| `set_style` | `paragraphIndex: number\|number[], styleName: string` | 成功/失败 |
| `create_table` | `rows: number, cols: number, position?: number` | 表格编号 |
| `fill_table` | `tableIndex: number, cells: [{row,col,text}]` | 成功/失败 |
| `find_replace` | `findText: string, replaceText: string` | 成功/失败 |
| `insert_page_break` | `position?: number` | 成功/失败 |
| `done` | `message: string` | 结束循环 |

## 附录 B: Excel Agent 10 个工具完整签名

| 工具 | 参数 | 返回 |
|------|------|------|
| `get_workbook_info` | (无) | 工作表列表、已用范围、预览 |
| `get_range` | `worksheet: string, range: string` | Markdown 表格（值+公式） |
| `set_value` | `worksheet: string, cell: string, value: string\|number\|boolean` | 成功/失败 |
| `set_formula` | `worksheet: string, cell: string, formula: string` | 成功/失败 |
| `format_range` | `worksheet: string, range: string, bold?, bgColor?, numberFormat?, alignment?, border?` | 成功/失败 |
| `create_table` | `worksheet: string, range: string, headers: string[]` | 成功/失败 |
| `add_chart` | `worksheet: string, range: string, chartType: string` | 成功/失败 |
| `merge_cells` | `worksheet: string, range: string` | 成功/失败 |
| `sort_range` | `worksheet: string, range: string, keyColumn: number, order: 'asc'\|'desc'` | 成功/失败 |
| `done` | `message: string` | 结束循环 |

---

*文档基于项目实际代码生成，所有接口名称、文件路径、行号均为 2026-05-26 最新状态。*
