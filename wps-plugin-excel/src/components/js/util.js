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

function convertToMarkdownTable(data) {
  if (!Array.isArray(data)) return data;
  if (data.length === 0) return '';

  // 确保是二维数组（即使只有一行）
  if (!Array.isArray(data[0])) {
    data = [data];
  }

  // 构建Markdown格式表格
  let markdownTable = '';

  // 遍历每一行
  for (let i = 0; i < data.length; i++) {
    let row = data[i];
    let rowContent = '|';

    // 遍历每一列
    for (let j = 0; j < row.length; j++) {
      let cellText = (row[j] !== null && row[j] !== undefined) ? String(row[j]) : '';
      // 转义管道符避免破坏格式
      cellText = cellText.replace(/\|/g, '\\|');
      rowContent += ' ' + cellText + ' |';
    }

    markdownTable += rowContent + '\n';

    // 如果是第一行，添加分隔行
    if (i === 0) {
      let separator = '|';
      for (let j = 0; j < row.length; j++) {
        separator += ' --- |';
      }
      markdownTable += separator + '\n';
    }
  }

  return markdownTable;
}

function GetSelectionValue() {
  if (!window.Application) return null
  const selection = window.Application.Selection;
  return convertToMarkdownTable(selection.Value2)
}

function GetSelectionAddress() {
  if (!window.Application) return null
  const selection = window.Application.Selection;
  return selection.Address();
}

function GetEntireSheetValue(useSelection = false) {
  try {
    let activeSheet = window.Application.ActiveSheet;
    let dataRange;

    if (useSelection && window.Application.Selection) {
      // 如果useSelection为true且有选中区域，则返回选中区域的值:cite[1]
      dataRange = window.Application.Selection;
    } else {
      // 否则获取整个已使用的区域:cite[2]
      dataRange = activeSheet.UsedRange;
    }

    if (!dataRange || dataRange.Count === 0) {
      return null; // 没有数据时返回null
    }

    // 返回区域的值（二维数组）
    return dataRange.Value2;

  } catch (error) {
    console.error("获取数据时出错: " + error.message);
    return null;
  }
}

export default {
  WPS_Enum,
  GetUrlPath,
  GetRouterHash,
  GetSelectionAddress,
  GetSelectionValue,
  GetEntireSheetValue,
}