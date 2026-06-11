/**
 * 通用工具函数
 *
 * 所有 WPS 插件共享的工具函数。
 */

/** 工具返回消息最大长度（Excel 数据读取不在此限） */
export const MAX_MSG_LENGTH = 500

/** 截断过长消息 */
export function clampMsg(msg: string): string {
  if (msg.length <= MAX_MSG_LENGTH) return msg
  return msg.slice(0, MAX_MSG_LENGTH - 3) + '...'
}
