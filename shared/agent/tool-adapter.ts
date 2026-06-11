/**
 * 通用工具适配器接口
 *
 * 所有 WPS 插件（PPT/Excel/Word）的适配器都必须实现此接口。
 * 定义 AgentLoop 与文档操作之间的最小契约。
 */

// ============ 工具结果 ============

/** 工具执行结果 */
export interface ToolResult {
  /** 是否执行成功 */
  success: boolean
  /** 给 LLM 看的结果描述消息 */
  message: string
  /** 可选的附加数据 */
  data?: unknown
}

// ============ 文档信息 ============

/** 当前文档的通用信息 */
export interface DocumentInfo {
  /** 页数/幻灯片数/工作表数等（由具体插件定义语义） */
  count?: number
  /** 文档标题 */
  title?: string
  /** 扩展字段，各插件可自定义 */
  [key: string]: unknown
}

// ============ 适配器接口 ============

/** 通用工具适配器 */
export interface ToolAdapter {
  /** 适配器名称（用于日志和调试） */
  readonly name: string

  /** 获取当前文档信息，供 LLM 了解上下文 */
  getDocumentInfo(): Promise<DocumentInfo>
}
