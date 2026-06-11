/**
 * PPT 智能体工具定义
 *
 * 定义暴露给 LLM 的工具列表，每个工具有：
 * - 名称和描述（LLM 据此选择调用）
 * - JSON Schema 参数定义
 * - execute 方法调用 SlideToolAdapter
 *
 * 借鉴 page-agent 的工具注册模式。
 *
 * Phase 05: 工具返回消息统一截断至 120 字符。
 */

import type { SlideToolAdapter, AddShapeParams, ApplyTemplateParams } from './slide-tool-adapter'
import type { PptToolResult } from '@wpsai/shared/types/agent'
import type { ToolSchema, ToolParameterProperty } from '@wpsai/shared/agent/types'
import { clampMsg } from '@wpsai/shared/agent/tool-utils'

// ========== 工具参数 Schema 定义 ==========

/** 创建幻灯片工具参数 */
const createSlideSchema: Record<string, ToolParameterProperty> = {
  layout: {
    type: 'string',
    description: '幻灯片布局类型：title（标题页）、content（内容页）、blank（空白页）',
    enum: ['title', 'content', 'blank']
  },
  title: {
    type: 'string',
    description: '可选的初始标题文本，如果提供则在创建后立即设置'
  }
}

/** 添加标题工具参数 */
const addTitleSchema: Record<string, ToolParameterProperty> = {
  slide_index: {
    type: 'integer',
    description: '目标幻灯片序号（从 1 开始）'
  },
  title: {
    type: 'string',
    description: '标题文本'
  }
}

/** 添加内容工具参数 */
const addContentSchema: Record<string, ToolParameterProperty> = {
  slide_index: {
    type: 'integer',
    description: '目标幻灯片序号（从 1 开始）'
  },
  text: {
    type: 'string',
    description: '要添加的文本内容'
  },
  font_size: {
    type: 'integer',
    description: '字号（磅），默认 18'
  },
  top: {
    type: 'integer',
    description: '上边距（磅），默认 100'
  }
}

/** 删除幻灯片工具参数 */
const deleteSlideSchema: Record<string, ToolParameterProperty> = {
  slide_index: {
    type: 'integer',
    description: '要删除的幻灯片序号（从 1 开始）'
  }
}

/** 获取信息工具参数（无参数） */
const getInfoSchema: Record<string, ToolParameterProperty> = {}

/** 完成工具参数 */
const doneSchema: Record<string, ToolParameterProperty> = {
  message: {
    type: 'string',
    description: '任务完成摘要，包含创建的幻灯片数量和每页标题'
  },
  success: {
    type: 'boolean',
    description: '是否成功完成任务'
  }
}

/** 添加形状工具参数 */
const addShapeSchema: Record<string, ToolParameterProperty> = {
  slide_index: { type: 'integer', description: '目标幻灯片序号（从 1 开始）' },
  shape_type: { type: 'string', description: '形状类型', enum: ['rectangle', 'rounded_rectangle', 'oval', 'triangle', 'diamond'] },
  left: { type: 'number', description: '左边距（磅）' },
  top: { type: 'number', description: '上边距（磅）' },
  width: { type: 'number', description: '宽度（磅）' },
  height: { type: 'number', description: '高度（磅）' },
  fill_color: { type: 'string', description: '填充色 (RRGGBB 格式，如 "1a1a2e")，不传则透明' },
  line_color: { type: 'string', description: '边框色 (RRGGBB 格式)，不传则无边框' },
  line_weight: { type: 'number', description: '边框粗细（磅），默认 1' },
  transparency: { type: 'number', description: '透明度 0-1，默认 0' }
}

/** 添加线条工具参数 */
const addLineSchema: Record<string, ToolParameterProperty> = {
  slide_index: { type: 'integer', description: '目标幻灯片序号（从 1 开始）' },
  start_x: { type: 'number', description: '起点 X 坐标（磅）' },
  start_y: { type: 'number', description: '起点 Y 坐标（磅）' },
  end_x: { type: 'number', description: '终点 X 坐标（磅）' },
  end_y: { type: 'number', description: '终点 Y 坐标（磅）' },
  color: { type: 'string', description: '线条颜色 (RRGGBB)，默认 #333333' },
  weight: { type: 'number', description: '线宽（磅），默认 2' },
  dash_style: { type: 'string', description: '虚线样式', enum: ['solid', 'dash', 'dot'] }
}

/** 设置背景工具参数 */
const setSlideBgSchema: Record<string, ToolParameterProperty> = {
  slide_index: { type: 'integer', description: '目标幻灯片序号（从 1 开始）' },
  color: { type: 'string', description: '背景色 (RRGGBB 格式)' }
}

/** 设置形状样式工具参数 */
const setShapeStyleSchema: Record<string, ToolParameterProperty> = {
  slide_index: { type: 'integer', description: '目标幻灯片序号（从 1 开始）' },
  shape_index: { type: 'integer', description: '形状序号（从 1 开始，按添加顺序）' },
  fill_color: { type: 'string', description: '新的填充色 (RRGGBB)' },
  line_color: { type: 'string', description: '新的边框色 (RRGGBB)' },
  line_weight: { type: 'number', description: '新的边框粗细（磅）' },
  transparency: { type: 'number', description: '新的透明度 0-1' }
}

/** 删除形状工具参数 */
const deleteShapeSchema: Record<string, ToolParameterProperty> = {
  slide_index: { type: 'integer', description: '目标幻灯片序号（从 1 开始）' },
  shape_index: { type: 'integer', description: '要删除的形状序号（从 1 开始）' }
}

// ========== 工具 Schema 工厂 ==========

/** 构建指定工具的 JSON Schema */
function makeSchema(
  name: string,
  description: string,
  properties: Record<string, ToolParameterProperty>,
  required: string[] = []
): ToolSchema {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: {
        type: 'object',
        properties,
        required
      }
    }
  }
}

// ========== 工具列表构建 ==========

/**
 * 构建所有可用的工具 Schema 列表
 * 传给 LLM 的 tools 参数
 */
export function buildToolSchemas(): ToolSchema[] {
  return [
    makeSchema(
      'get_presentation_info',
      '获取当前演示文稿的信息，包括幻灯片数量、每页的文本内容摘要。通常在开始规划前调用，了解现有状态。',
      getInfoSchema
    ),
    makeSchema(
      'create_slide',
      '创建一张新的空白幻灯片。在末尾添加，返回新幻灯片的序号。可指定布局类型和可选的初始标题。',
      createSlideSchema,
      []
    ),
    makeSchema(
      'add_slide_title',
      '为指定幻灯片添加标题。标题固定使用 32pt 加粗，位于页面顶部（top=30）。',
      addTitleSchema,
      ['slide_index', 'title']
    ),
    makeSchema(
      'add_slide_content',
      '在指定幻灯片上添加文本框。正文使用 18pt 常规字重。如果内容较多，可多次调用此工具，每次用不同的 top 值分段添加。',
      addContentSchema,
      ['slide_index', 'text']
    ),
    makeSchema(
      'delete_slide',
      '删除指定序号的幻灯片。谨慎使用，仅在确实需要重做时调用。',
      deleteSlideSchema,
      ['slide_index']
    ),
    makeSchema(
      'done',
      '任务完成时调用此工具。总结创建了哪些幻灯片，报告最终状态。',
      doneSchema,
      ['message', 'success']
    ),
    // ===== Phase 03 新增：形状/线条/背景工具 =====
    makeSchema(
      'add_shape',
      '在幻灯片上添加形状。rectangle=矩形(适合做卡片底色), rounded_rectangle=圆角矩形(柔和卡片), oval=椭圆(做装饰圆点用 width=height=8~12), triangle=三角形(箭头指示), diamond=菱形(强调标记)。有 fill_color 时自动填充，无则透明。',
      addShapeSchema,
      ['slide_index', 'shape_type', 'left', 'top', 'width', 'height']
    ),
    makeSchema(
      'add_line',
      '在幻灯片上添加直线。适合做标题下方的分割线、内容区之间的分隔。放在标题下方 5-10pt 处可做装饰分割线。',
      addLineSchema,
      ['slide_index', 'start_x', 'start_y', 'end_x', 'end_y']
    ),
    makeSchema(
      'set_slide_bg',
      '设置幻灯片背景色。封面页可用深色背景+白色文字，内容页通常保持浅色或白色。',
      setSlideBgSchema,
      ['slide_index', 'color']
    ),
    makeSchema(
      'set_shape_style',
      '修改已有形状的样式。可单独修改填充色、边框色、粗细或透明度，只传需要改的字段即可。',
      setShapeStyleSchema,
      ['slide_index', 'shape_index']
    ),
    makeSchema(
      'delete_shape',
      '删除指定幻灯片上的某个形状。谨慎使用，通常只在需要重做时调用。',
      deleteShapeSchema,
      ['slide_index', 'shape_index']
    ),
    // ===== Phase 07 升级：语义层模板工具（15 种 type，schema 瘦身） =====
    // 详细模板说明见系统提示词「模板速查表」—— 缓存生效，不重复发送
    makeSchema(
      'apply_template',
      `批量创建幻灯片模板。内置坐标和样式，优先使用。
每项需 type 和 title 字段，各 type 的具体字段见系统提示中的模板速查表。
可选 theme 参数切换视觉风格。`,
      {
        slides: {
          type: 'array',
          description: '幻灯片数组，按顺序渲染。每个对象需 type 字段指定模板类型，其余字段按模板说明填写。',
          items: { type: 'object' }
        },
        theme: { type: 'string', description: '可选主题标识' }
      },
      ['slides']
    )
  ]
}

// ========== 工具执行器 ==========

/**
 * 执行指定工具
 * @param toolName 工具名称
 * @param args 参数对象
 * @param adapter 幻灯片适配器实例
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  adapter: SlideToolAdapter
): Promise<PptToolResult> {
  try {
    switch (toolName) {
      case 'get_presentation_info': {
        const info = await adapter.getPresentationInfo()
        if (info.slideCount === 0) {
          return {
            success: true,
            message: '当前演示文稿为空，没有幻灯片。可以开始创建。',
            data: info
          }
        }
        // 格式化幻灯片信息给 LLM 阅读（限制最多 5 页避免超长）
        const slidesToShow = info.slides.slice(0, 5)
        const slideList = slidesToShow
          .map(s =>
            `  第${s.index}页: ${s.textContent.slice(0, 60) || '(无文本)'} [${s.shapeCount}个形状]`
          )
          .join('\n')
        const moreMsg = info.slides.length > 5 ? `（共${info.slides.length}页，仅显示前5页）` : ''
        return {
          success: true,
          message: clampMsg(`当前演示文稿共 ${info.slideCount} 页：\n${slideList}${moreMsg}`),
          data: info
        }
      }

      case 'create_slide': {
        const layout = (args.layout as CreateSlideParams['layout']) || 'content'
        const title = args.title as string | undefined
        const result = await adapter.createSlide({ layout, title })
        return {
          success: true,
          message: `成功创建第 ${result.slideIndex} 页幻灯片（布局：${layout}）${title ? `，标题：${title}` : ''}。`,
          data: result
        }
      }

      case 'add_slide_title': {
        const slideIndex = args.slide_index as number
        const title = args.title as string
        await adapter.addTitle(slideIndex, title)
        return {
          success: true,
          message: clampMsg(`已为第 ${slideIndex} 页添加标题："${title}"（32pt 加粗，顶部位置）。`)
        }
      }

      case 'add_slide_content': {
        const slideIndex = args.slide_index as number
        const text = args.text as string
        const fontSize = (args.font_size as number) || 18
        const top = (args.top as number) || 100
        await adapter.addTextBox({
          slideIndex,
          text,
          fontSize,
          top
        })
        // 截断过长文本用于反馈
        const preview = text.length > 50 ? text.slice(0, 50) + '...' : text
        return {
          success: true,
          message: clampMsg(`已为第 ${slideIndex} 页添加内容（${fontSize}pt，top=${top}）："${preview}"。`)
        }
      }

      case 'delete_slide': {
        const slideIndex = args.slide_index as number
        await adapter.deleteSlide(slideIndex)
        return {
          success: true,
          message: `已删除第 ${slideIndex} 页幻灯片。`
        }
      }

      case 'done': {
        const message = args.message as string
        const success = args.success !== false
        return {
          success,
          message: clampMsg(success
            ? `✅ 任务完成：${message}`
            : `❌ 任务未完成：${message}`)
        }
      }

      // ===== Phase 03 新增工具执行 =====

      case 'add_shape': {
        const result = await adapter.addShape({
          slideIndex: args.slide_index as number,
          shapeType: (args.shape_type as AddShapeParams['shapeType']) || 'rectangle',
          left: args.left as number,
          top: args.top as number,
          width: args.width as number,
          height: args.height as number,
          fillColor: args.fill_color as string | undefined,
          lineColor: args.line_color as string | undefined,
          lineWeight: args.line_weight as number | undefined,
          transparency: args.transparency as number | undefined
        })
        const shapeType = args.shape_type || 'rectangle'
        const fill = args.fill_color ? `，填充 #${args.fill_color}` : '（透明）'
        return {
          success: true,
          message: `已在第 ${args.slide_index} 页添加${shapeType}形状（${args.width}x${args.height}，位置 [${args.left},${args.top}]）${fill}。`,
          data: result
        }
      }

      case 'add_line': {
        const color = (args.color as string) || '333333'
        const weight = (args.weight as number) || 2
        await adapter.addLine({
          slideIndex: args.slide_index as number,
          startX: args.start_x as number,
          startY: args.start_y as number,
          endX: args.end_x as number,
          endY: args.end_y as number,
          color,
          weight,
          dashStyle: args.dash_style as 'solid' | 'dash' | 'dot' | undefined
        })
        return {
          success: true,
          message: clampMsg(`已在第 ${args.slide_index} 页添加线条（[${args.start_x},${args.start_y}]→[${args.end_x},${args.end_y}]，颜色 #${color}，线宽 ${weight}pt）。`)
        }
      }

      case 'set_slide_bg': {
        const color = args.color as string
        await adapter.setSlideBg({ slideIndex: args.slide_index as number, color })
        return {
          success: true,
          message: `已将第 ${args.slide_index} 页背景色设为 #${color}。`
        }
      }

      case 'set_shape_style': {
        await adapter.setShapeStyle(
          args.slide_index as number,
          args.shape_index as number,
          {
            fillColor: args.fill_color as string | undefined,
            lineColor: args.line_color as string | undefined,
            lineWeight: args.line_weight as number | undefined,
            transparency: args.transparency as number | undefined
          }
        )
        return {
          success: true,
          message: `已更新第 ${args.slide_index} 页第 ${args.shape_index} 个形状的样式。`
        }
      }

      case 'delete_shape': {
        await adapter.deleteShape(args.slide_index as number, args.shape_index as number)
        return {
          success: true,
          message: `已删除第 ${args.slide_index} 页第 ${args.shape_index} 个形状。`
        }
      }

      // ===== Phase 06 新增：语义层模板执行 =====

      case 'apply_template': {
        // 容错：LLM 可能把 slides 包在多余层级里
        let slides = args.slides
        if (!Array.isArray(slides) && slides && typeof slides === 'object') {
          // 尝试解包 { slides: [...] }
          slides = (slides as any).slides || Object.values(slides)[0]
        }
        if (!Array.isArray(slides)) {
          return { success: false, message: `apply_template 需要 slides 为数组，收到: ${JSON.stringify(args.slides).slice(0, 100)}` }
        }
        const result = await adapter.applyTemplate({
          slides: slides as any[],
          theme: args.theme as string | undefined
        })
        return { success: true, message: result.summary, data: result }
      }

      default:
        return {
          success: false,
          message: `未知工具：${toolName}`
        }
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      message: clampMsg(`工具 ${toolName} 执行失败：${errMsg}`)
    }
  }
}

// 重新导出类型，方便外部引入（避免循环依赖）
type CreateSlideParams = import('./slide-tool-adapter').CreateSlideParams
