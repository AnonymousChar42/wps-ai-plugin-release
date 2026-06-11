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

function getTableContent(shape) {
  if (!shape.HasTable) return ''
  let table = shape.Table;

  // 获取表格尺寸
  let rowCount = table.Rows.Count;
  let colCount = table.Columns.Count;

  // 构建Markdown格式表格
  let markdownTable = '';

  // 提取所有单元格内容并构建表格
  for (let row = 1; row <= rowCount; row++) {
    let rowContent = '|';
    for (let col = 1; col <= colCount; col++) {
      let cellText = table.Cell(row, col).Shape.TextFrame.TextRange.Text;
      // 转义管道符避免破坏格式
      cellText = cellText.replace(/\|/g, '\\|');
      rowContent += ' ' + cellText + ' |';
    }
    markdownTable += rowContent + '\n';

    // 如果是表头，添加分隔行
    if (row === 1) {
      let separator = '|';
      for (let col = 1; col <= colCount; col++) {
        separator += ' --- |';
      }
      markdownTable += separator + '\n';
    }
  }

  return markdownTable;
}

/**
 * 从形状中提取文本内容（支持递归处理组合形状）
 * @param {Object} shape - PowerPoint 形状对象
 * @returns {string} 提取的文本内容
 */
function extractTextFromShape(shape) {
  if (!shape) return '';
  // 处理组合形状（Type 6）
  if (shape.Type === 6 && shape.GroupItems && shape.GroupItems.Count > 0) {
    let combinedText = '';
    // 递归处理组合中的每个子形状
    for (let i = 1; i <= shape.GroupItems.Count; i++) {
      const subShape = shape.GroupItems.Item(i);
      const subShapeText = extractTextFromShape(subShape);
      if (subShapeText) {
        combinedText += subShapeText + '\n';
      }
    }
    return combinedText.trim();
  }
  // 处理表格形状
  else if (shape.HasTable) {
    return getTableContent(shape);
  }
  // 处理文本框架形状
  else if (shape.HasTextFrame) {
    return shape.TextFrame.TextRange.Text;
  }
  // 其他情况返回空字符串
  return '';
}

/**
 * 从形状范围中提取所有文本内容
 * @param {Object} shapeRange - PowerPoint 形状范围对象
 * @returns {string} 所有形状的文本内容
 */
function extractTextFromShapeRange(shapeRange) {
  if (!shapeRange) return '';
  let text = '';
  for (let i = 1; i <= shapeRange.Count; i++) {
    const shape = shapeRange.Item(i);
    const shapeText = extractTextFromShape(shape);
    if (shapeText) {
      text += shapeText + '\n';
    }
  }
  return text.trim();
}

/**
 * 从幻灯片范围中提取所有文本内容
 * @param {Object} slideRange - PowerPoint 幻灯片范围对象
 * @returns {string} 所有幻灯片的文本内容
 */
function extractTextFromSlideRange(slideRange) {
  let text = '';

  // 创建包含幻灯片及其索引的数组
  let slidesWithIndex = [];
  for (let i = 1; i <= slideRange.Count; i++) {
    const slide = slideRange.Item(i);
    slidesWithIndex.push({
      index: slide.SlideIndex,
      slide: slide
    });
  }

  // 按照幻灯片索引排序
  slidesWithIndex.sort((a, b) => a.index - b.index);

  // 按顺序遍历幻灯片中的所有形状
  for (let i = 0; i < slidesWithIndex.length; i++) {
    const slide = slidesWithIndex[i].slide;
    // 遍历幻灯片中的所有形状
    for (let j = 1; j <= slide.Shapes.Count; j++) {
      const shape = slide.Shapes.Item(j);
      const shapeText = extractTextFromShape(shape);
      if (shapeText) {
        text += shapeText + '\n';
      }
    }
  }
  return text.trim();
}

/**
 * 获取PowerPoint中选中对象的文字内容
 * @returns {string|null} 选中对象的文字内容，如果没有选中对象或不支持则返回null
 */
function GetSelectionValue() {
  // 检查是否存在可用的应用程序对象
  if (!window.Application) return null;

  // 获取当前活动窗口的选择对象
  const selection = window.Application.ActiveWindow.Selection;

  // 如果没有选中任何内容，返回null
  if (!selection) return null;

  try {
    switch (selection.Type) {
      case 0: {
        // ppSelectionNone - 
        // 有些表格被选中时会显示 type 0
        const shapeRange = selection.ShapeRange;
        const shapeText = extractTextFromShapeRange(shapeRange);
        if (shapeText) return shapeText;
        
        // 未选择任何内容，返回当前幻灯片内容
        const currentSlide = window.Application.ActiveWindow.View.Slide;
        if (currentSlide) {
          let text = '';
          // 遍历幻灯片中的所有形状
          for (let j = 1; j <= currentSlide.Shapes.Count; j++) {
            const shape = currentSlide.Shapes.Item(j);
            const shapeText = extractTextFromShape(shape);
            if (shapeText) {
              text += shapeText + '\n';
            }
          }
          return text.trim() || null;
        }
        return null;
      } case 1: {
        // ppSelectionSlide - 选择了幻灯片
        const slides = selection.SlideRange;
        return extractTextFromSlideRange(slides) || null;
      } case 2: {
        // ppSelectionShape - 选择了形状
        const shapeRange = selection.ShapeRange;
        return extractTextFromShapeRange(shapeRange) || null;
      } case 3:
        // ppSelectionText - 选择了文本
        return selection.TextRange.Text || extractTextFromShapeRange(selection.ShapeRange) || null;
      case 4:
        // ppSelectionSldView - 在幻灯片视图中
        return null;
      default:
        return null;
    }
  } catch (error) {
    // 发生错误时返回null
    console.error('Error getting selection value:', error);
    return null;
  }
}
function GetSelectionAddress() {
  // 检查是否存在可用的应用程序对象
  if (!window.Application) return '';

  // 获取当前活动窗口的选择对象
  const selection = window.Application.ActiveWindow.Selection;

  // 如果没有选中任何内容，返回空字符串
  if (!selection) return '';

  try {
    // 判断选择类型
    switch (selection.Type) {
      case 0: { // 没有选中返回
        return window.Application.ActiveWindow.View.Slide.SlideIndex
      } case 1: {// ppSelectionSlide - 选择了幻灯片
        // 获取所有选中幻灯片的索引
        const slideRange = selection.SlideRange;
        const slideIndexes = [];
        for (let i = 1; i <= slideRange.Count; i++) {
          slideIndexes.push(slideRange.Item(i).SlideIndex);
        }
        // 按索引顺序排序
        slideIndexes.sort((a, b) => a - b);
        return `slide:[${slideIndexes.join(',')}]`;
      } case 2: { // ppSelectionShape - 选择了形状
        // 通过形状获取其所在幻灯片索引
        const shapeSlide = selection.ShapeRange.Parent;
        return `slide:${shapeSlide.SlideIndex}`;
      } case 3: {// ppSelectionText - 选择了文本
        // 文本选择属于形状的一部分，需要先获取形状再获取幻灯片
        const shapeSlide = selection.ShapeRange.Parent;
        return `slide:${shapeSlide.SlideIndex}`;
      } case 4: {// ppSelectionSldView - 在幻灯片视图中
        return ``;
      } default:
        return '';
    }
  } catch (error) {
    console.error('Error getting selection address:', error);
    return '';
  }
}


export default {
  WPS_Enum,
  GetUrlPath,
  GetRouterHash,
  GetSelectionAddress,
  GetSelectionValue,
}