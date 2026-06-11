// useSvgImageCopy.js
// 将 SVG 转换为 PNG 并复制到粘贴板

// ===== 常量定义 =====
const CONFIG = {
  SVG_DEFAULT_WIDTH: 300,
  SVG_DEFAULT_HEIGHT: 150,
  CANVAS_SCALE: 2,
  BUTTON_REMOVE_DELAY: 100,
  STATE_DURATION: 2000,
  BUTTON_OFFSET: 5,
  Z_INDEX: '10000',
};

const BUTTON_STYLES = {
  normal: {
    backgroundColor: '#1890ff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  hover: {
    backgroundColor: '#40a9ff',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
  },
  success: {
    backgroundColor: '#52c41a',
  },
  error: {
    backgroundColor: '#ff4d4f',
  },
};

const BUTTON_STATES = {
  DEFAULT: { text: '复制', ...BUTTON_STYLES.normal },
  LOADING: { text: '处理中...' },
  SUCCESS: { text: '✓ 已复制', ...BUTTON_STYLES.success },
  ERROR: { text: '✗ 复制失败', ...BUTTON_STYLES.error },
};

// ===== SVG 转 Base64 =====
async function svgToBase64(svg) {
  // 获取尺寸
  const bbox = svg.getBBox();
  let width = bbox.width || parseInt(svg.getAttribute('width') || CONFIG.SVG_DEFAULT_WIDTH);
  let height = bbox.height || parseInt(svg.getAttribute('height') || CONFIG.SVG_DEFAULT_HEIGHT);
  width *= CONFIG.CANVAS_SCALE;
  height *= CONFIG.CANVAS_SCALE;

  // SVG 转 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  // SVG 转 dataURL 后渲染到 Canvas
  const svgString = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.crossOrigin = 'anonymous';

  return new Promise((resolve, reject) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width,
        height,
      });
    };
    img.onerror = () => reject(new Error('Failed to render SVG'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  });
}

// ===== 复制到粘贴板 =====
async function copyImageToClipboard(base64Url, width, height) {
  const img = document.createElement('img');
  img.src = base64Url;
  img.crossOrigin = 'anonymous';
  // 设置长宽与base64图片一致
  img.width = width;
  img.height = height;

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.appendChild(img);
      document.body.appendChild(container);

      const range = document.createRange();
      range.selectNodeContents(container);

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      try {
        document.execCommand('copy');
        selection.removeAllRanges();
        document.body.removeChild(container);
        resolve();
      } catch (error) {
        document.body.removeChild(container);
        reject(error);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
  });
}

// ===== 按钮管理 =====
function createCopyButton(svgElement) {
  const button = document.createElement('button');
  button.className = 'svg-copy-button';
  button.type = 'button';

  const parent = svgElement.parentElement;

  // 确保父级有 position: relative 以支持 absolute 定位
  const originalPosition = parent.style.position;
  if (!['static', 'relative', 'absolute'].includes(originalPosition)) {
    parent.style.position = 'relative';
  }

  const parentRect = parent.getBoundingClientRect();
  const svgRect = svgElement.getBoundingClientRect();

  // 计算相对于父级的位置
  const relativeTop = svgRect.top - parentRect.top + CONFIG.BUTTON_OFFSET;
  const relativeRight = parentRect.right - svgRect.right + CONFIG.BUTTON_OFFSET;

  Object.assign(button.style, {
    position: 'absolute',
    top: relativeTop + 'px',
    right: relativeRight + 'px',
    zIndex: CONFIG.Z_INDEX,
    padding: '6px 10px',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
    ...BUTTON_STYLES.normal,
  });

  setButtonState(button, 'DEFAULT');

  // 悬停效果
  button.onmouseover = () => {
    if (!button.disabled) {
      Object.assign(button.style, BUTTON_STYLES.hover);
    }
  };
  button.onmouseout = () => {
    if (!button.disabled) {
      Object.assign(button.style, BUTTON_STYLES.normal);
    }
  };

  return button;
}

function setButtonState(button, stateName) {
  const state = BUTTON_STATES[stateName];
  if (!state) return;

  button.innerHTML = state.text;
  button.disabled = stateName !== 'DEFAULT';

  if (state.backgroundColor) {
    button.style.backgroundColor = state.backgroundColor;
  }
  if (state.boxShadow) {
    button.style.boxShadow = state.boxShadow;
  }
}

// ===== 主 Hook 函数 =====
export default function useSvgImageCopy(options = {}) {
  const { selector = 'svg', excludeSelector = '' } = options;
  const svgButtonMap = new Map();
  const removeTimeoutMap = new Map();

  let handleMouseOverEvent = null;
  let handleMouseOutEvent = null;

  // 获取 SVG 元素
  const getSvgElement = (el) => el?.closest(selector) || null;

  // 清除移除超时
  const clearRemoveTimeout = (svgElement) => {
    const timeoutId = removeTimeoutMap.get(svgElement);
    if (timeoutId) {
      clearTimeout(timeoutId);
      removeTimeoutMap.delete(svgElement);
    }
  };

  // 更新按钮状态并自动恢复
  const updateButtonState = (button, newState) => {
    setButtonState(button, newState);
    if (newState !== 'DEFAULT') {
      setTimeout(() => setButtonState(button, 'DEFAULT'), CONFIG.STATE_DURATION);
    }
  };

  // 处理鼠标进入
  const handleMouseEnter = (event) => {
    const svgElement = getSvgElement(event.target);
    if (!svgElement || (excludeSelector && svgElement.closest(excludeSelector))) return;

    clearRemoveTimeout(svgElement);
    if (svgButtonMap.has(svgElement)) return;

    const button = createCopyButton(svgElement);
    button.onclick = async (e) => {
      e.stopPropagation();
      e.preventDefault();

      try {
        updateButtonState(button, 'LOADING');
        const { dataUrl, width, height } = await svgToBase64(svgElement);
        await copyImageToClipboard(dataUrl, width, height);
        updateButtonState(button, 'SUCCESS');
      } catch (error) {
        console.error('Failed to copy SVG:', error);
        updateButtonState(button, 'ERROR');
        options.onError?.(error);
      }
    };

    button.onmouseenter = () => clearRemoveTimeout(svgElement);

    const parent = svgElement.parentElement;
    parent.appendChild(button);
    svgButtonMap.set(svgElement, button);
  };

  // 处理鼠标离开
  const handleMouseLeave = (event) => {
    const svgElement = getSvgElement(event.target);
    if (!svgElement) return;

    const timeoutId = setTimeout(() => {
      const button = svgButtonMap.get(svgElement);
      if (button?.parentNode) {
        button.parentNode.removeChild(button);
        svgButtonMap.delete(svgElement);
      }
      removeTimeoutMap.delete(svgElement);
    }, CONFIG.BUTTON_REMOVE_DELAY);

    removeTimeoutMap.set(svgElement, timeoutId);
  };

  // 安装 Hook
  const install = () => {
    handleMouseOverEvent = (event) => {
      const currentTarget = getSvgElement(event.target);
      if (currentTarget) handleMouseEnter({ target: currentTarget });
    };

    handleMouseOutEvent = (event) => {
      const currentTarget = getSvgElement(event.target);
      if (currentTarget) {
        const relatedTarget = event.relatedTarget;
        if (!relatedTarget || (!currentTarget.contains(relatedTarget) && relatedTarget !== currentTarget)) {
          handleMouseLeave({ target: currentTarget });
        }
      }
    };

    document.addEventListener('mouseover', handleMouseOverEvent);
    document.addEventListener('mouseout', handleMouseOutEvent);

    // 添加样式
    const style = document.createElement('style');
    style.setAttribute('data-svg-copy', 'true');
    style.textContent = `
      ${selector} {
        cursor: pointer;
        transition: opacity 0.2s;
      }
      ${selector}:hover {
        opacity: 0.95;
      }
      .svg-copy-button {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      .svg-copy-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);
  };

  // 卸载 Hook
  const uninstall = () => {
    if (handleMouseOverEvent) {
      document.removeEventListener('mouseover', handleMouseOverEvent);
    }
    if (handleMouseOutEvent) {
      document.removeEventListener('mouseout', handleMouseOutEvent);
    }

    svgButtonMap.forEach((button) => {
      if (button.parentNode) {
        button.parentNode.removeChild(button);
      }
    });
    svgButtonMap.clear();

    removeTimeoutMap.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    removeTimeoutMap.clear();

    document.querySelectorAll('style[data-svg-copy]').forEach(style => style.remove());
  };

  return { install, uninstall };
}
