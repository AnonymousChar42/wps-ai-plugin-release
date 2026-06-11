/**
 * Excel 工具 Schema 测试
 */

import { describe, it, expect } from 'vitest'
import { buildToolSchemas } from '../tools'

describe('buildToolSchemas', () => {
  it('返回 10 个工具', () => {
    const schemas = buildToolSchemas()
    expect(schemas).toHaveLength(10)
  })

  it('所有工具都有 name + description + parameters', () => {
    const schemas = buildToolSchemas()
    for (const s of schemas) {
      expect(s.type).toBe('function')
      expect(s.function.name).toBeTruthy()
      expect(s.function.description).toBeTruthy()
      expect(s.function.parameters.type).toBe('object')
    }
  })

  it('包含核心工具', () => {
    const schemas = buildToolSchemas()
    const names = schemas.map(s => s.function.name)
    expect(names).toContain('get_workbook_info')
    expect(names).toContain('get_range')
    expect(names).toContain('set_value')
    expect(names).toContain('set_formula')
    expect(names).toContain('format_range')
    expect(names).toContain('create_table')
    expect(names).toContain('add_chart')
    expect(names).toContain('merge_cells')
    expect(names).toContain('sort_range')
    expect(names).toContain('done')
  })

  it('add_chart 的 chartType 包含所有类型', () => {
    const schemas = buildToolSchemas()
    const chartSchema = schemas.find(s => s.function.name === 'add_chart')
    const chartTypeProp = chartSchema!.function.parameters.properties.chartType
    expect(chartTypeProp.enum).toContain('column')
    expect(chartTypeProp.enum).toContain('pie')
    expect(chartTypeProp.enum).toContain('line')
  })
})
