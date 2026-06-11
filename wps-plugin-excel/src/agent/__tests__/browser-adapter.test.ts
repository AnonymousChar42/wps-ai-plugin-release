/**
 * Excel Browser 适配器测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BrowserExcelAdapter } from '../adapters/browser-excel-adapter'

describe('BrowserExcelAdapter', () => {
  let adapter: BrowserExcelAdapter

  beforeEach(() => {
    adapter = new BrowserExcelAdapter()
  })

  it('getDocumentInfo 返回空工作簿', async () => {
    const info = await adapter.getDocumentInfo()
    expect(info.count).toBe(1)
    expect(info.title).toBe('Sheet1')
  })

  it('getWorkbookInfo 返回工作表列表', async () => {
    const info = await adapter.getWorkbookInfo()
    expect(info.sheets).toContain('Sheet1')
    expect(info.activeSheet).toBe('Sheet1')
  })

  it('setValue 写入并 getRange 读取', async () => {
    await adapter.setValue('Sheet1', 'A1', 'Hello')
    const data = await adapter.getRange('Sheet1', 'A1:A1')
    expect(data.cells[0].value).toBe('Hello')
    expect(data.rowCount).toBe(1)
  })

  it('setFormula 设置公式', async () => {
    await adapter.setFormula('Sheet1', 'B1', '=SUM(A1:A10)')
    const data = await adapter.getRange('Sheet1', 'B1:B1')
    expect(data.cells[0].formula).toBe('=SUM(A1:A10)')
  })

  it('createTable 创建表头', async () => {
    const result = await adapter.createTable('Sheet1', 'A1:C1', ['姓名', '年龄', '部门'])
    expect(result.success).toBe(true)

    const data = await adapter.getRange('Sheet1', 'A1:C1')
    expect(data.cells[0].value).toBe('姓名')
    expect(data.cells[1].value).toBe('年龄')
    expect(data.cells[2].value).toBe('部门')
  })

  it('formatRange 设置格式', async () => {
    await adapter.setValue('Sheet1', 'A1', 'Test')
    const result = await adapter.formatRange('Sheet1', 'A1:A1', {
      font: { bold: true },
      fill: { color: 'ff0000' },
    })
    expect(result.success).toBe(true)
  })

  it('addChart Mock 返回成功', async () => {
    const result = await adapter.addChart('Sheet1', 'A1:B10', 'column')
    expect(result.success).toBe(true)
    expect(result.message).toContain('柱状')
  })

  it('mergeCells 返回成功', async () => {
    const result = await adapter.mergeCells('Sheet1', 'A1:C1')
    expect(result.success).toBe(true)
  })

  it('sortRange Mock 返回成功', async () => {
    const result = await adapter.sortRange('Sheet1', 'A2:D10', 1, 'desc')
    expect(result.success).toBe(true)
  })
})
