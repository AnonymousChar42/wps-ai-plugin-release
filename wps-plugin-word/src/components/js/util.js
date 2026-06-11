//在后续的wps版本中，wps的所有枚举值都会通过wps.Enum对象来自动支持，现阶段先人工定义
var WPS_Enum = {
  msoCTPDockPositionLeft: 0,
  msoCTPDockPositionRight: 2
}

function GetUrlPath() {
  // 在本地网页的情况下获取路径
  if (window.location.protocol === 'file:') {
    const path = window.location.href;
    // 删除文件名以获取根路径
    return path.substring(0, path.lastIndexOf('/'));
  }

  // 获取并解码当前URL，去除哈希部分
  let url = decodeURI(document.location.toString());
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    url = url.substring(0, hashIndex);
  }

  // 截取到最后一个斜杠之前的部分（如果存在斜杠）
  const lastSlashIndex = url.lastIndexOf("/");
  return lastSlashIndex !== -1 ? url.substring(0, lastSlashIndex) : url;
}

function GetRouterHash() {
  if (window.location.protocol === 'file:') {
    return '';
  }

  return '/#'
}

// 封装表格内容提取功能到独立函数
function extractTableData(selection) {
  // 检查选择区域是否包含表格
  if (selection && selection.Tables && selection.Tables.Count > 0) {
    // 处理表格内容
    const tables = [];
    for (let i = 1; i <= selection.Tables.Count; i++) {
      const table = selection.Tables.Item(i);
      
      // 构建 Markdown 表格
      let markdownTable = '';
      
      // 添加表头分隔符
      if (table.Rows.Count > 0) {
        const firstRow = table.Rows.Item(1);
        const columnCount = firstRow.Cells.Count;
        
        // 添加列标题行
        let headerRow = '|';
        let separatorRow = '|';
        for (let c = 1; c <= columnCount; c++) {
          const cell = firstRow.Cells.Item(c);
          let cellText = cell.Range.Text;
          if (cellText.endsWith('\r')) {
            cellText = cellText.slice(0, -1);
          }
          headerRow += ` ${cellText} |`;
          separatorRow += ' --- |';
        }
        markdownTable += headerRow + '\n' + separatorRow + '\n';
        
        // 添加数据行
        for (let r = 2; r <= table.Rows.Count; r++) {
          const row = table.Rows.Item(r);
          let dataRow = '|';
          for (let c = 1; c <= Math.min(row.Cells.Count, columnCount); c++) {
            const cell = row.Cells.Item(c);
            let cellText = cell.Range.Text;
            if (cellText.endsWith('\r')) {
              cellText = cellText.slice(0, -1);
            }
            dataRow += ` ${cellText} |`;
          }
          // 如果当前行的单元格数量少于表头列数，补充空单元格
          for (let c = row.Cells.Count + 1; c <= columnCount; c++) {
            dataRow += '  |';
          }
          markdownTable += dataRow + '\n';
        }
      }
      tables.push(markdownTable);
    }
    // 修改: 返回字符串而不是数组
    return tables.join('\n\n');
  }
  // 修改: 确保无表格时也返回空字符串
  return '';
}

function GetSelectionValue() {
  if (!window.Application) return ''
  const selection = window.Application.Selection;
  
  // 使用封装的函数处理表格内容
  const tables = extractTableData(selection);
  if (tables.length > 0) {
    // 如果有表格，返回组合内容
    const text = selection.Text;
    // 修改: 返回字符串格式
    return text + '\n\n' + tables;
  }
  
  // 原有的纯文本处理逻辑
  return selection.Text
}

function GetSelectionAddress() {
  if (!window.Application) return null
  const selection = window.Application.Selection;
  if (!selection) return ''
  const { Start, End } = selection.Range || {}
  if (!Start || !End) return ''
  return `${Start}~${End}`
}


export default {
  WPS_Enum,
  GetUrlPath,
  GetRouterHash,
  GetSelectionAddress,
  GetSelectionValue,
}