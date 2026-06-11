import mermaid from "mermaid";
let getRandomValues;
const rnds8 = new Uint8Array(16);
function rng() {
  if (!getRandomValues) {
    getRandomValues = typeof crypto !== "undefined" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);
    if (!getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    }
  }
  return getRandomValues(rnds8);
}
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
}
const randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
const native = {
  randomUUID
};
function v4(options, buf, offset) {
  if (native.randomUUID && !buf && !options) {
    return native.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
const genUid = (split = "") => {
  return v4().split("-").join(split);
};
const sleep = async (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};
const renderMermaid = async (code, targetId) => {
  let limit = 100;
  while (limit-- > 0) {
    const container = document.getElementById(targetId);
    if (!container) {
      await sleep(100);
      continue;
    }
    try {
      const { svg } = await mermaid.render("mermaid-svg-" + genUid(), code, container);
      container.innerHTML = svg;
    } catch (e) {
    }
    break;
  }
};
const MermaidIt = function (md) {
  mermaid.initialize({
    startOnLoad: false,
    featureFlags: {
      xychartBeta: true
    }
  });
  const defaultRenderer = md.renderer.rules.fence.bind(md.renderer.rules);
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = token.info.trim();
    // 支持 mermaid 和 xychart-beta 代码块
    if (info === "mermaid" || info === "xychart-beta") {
      if (!env?.finished) return defaultRenderer(tokens, idx, options, env, self)
      const containerId = "mermaid-container-" + genUid();
      renderMermaid(token.content, containerId).then();
      const container = document.createElement("div");
      container.id = containerId;
      return container.outerHTML;
    }
    return defaultRenderer(tokens, idx, options, env, self);
  };
};
export {
  MermaidIt as default
};
