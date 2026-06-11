# WPS Assistant

这是一个基于 `wps-js` 开发的 WPS Excel 插件项目，采用 `Vue` + `Vite` + `Ant Design Vue` 技术栈构建。

## 功能特性
- 支持自由配置 LLM 服务器链接和模型
- 集成 Mermaid 图表绘制功能

## 技术实现
### 主要技术栈
- **前端框架**: Vue 3
- **构建工具**: Vite
- **UI 组件库**: Ant Design Vue
- **图表渲染**: Mermaid

## 项目架构

### 工作区结构
本项目由于 WPS 插件是脚手架生成的，采用 `pnpm` 工作区管理三个独立的 WPS 插件子项目：
- `wps-plugin-excel` - WPS 电子表格插件
- `wps-plugin-ppt` - WPS 演示文稿插件
- `wps-plugin-word` - WPS 文字文档插件

### 依赖管理方案

#### 设计考量
在设计依赖管理方案时，考虑了以下几种方案：

**方案一：强行融合为单项目**
- 将三个项目融合为一个，通过 if-else 逻辑处理不同的插件类型
- 缺点：会导致代码严重耦合，且 wpsjs 脚手架可能不支持这种方式

**方案二：三个项目共用根目录 `node_modules`**
- 所有子项目的 `dependencies` 都为空，依赖统一在根目录维护
- 缺点：违反了规范，容易产生幻影依赖，使依赖关系不清晰

**方案三：三个项目各自维护 `package.json`（采用方案）**
- 每个子项目都有自己的 `package.json` 和 `node_modules`
- 优势：符合规范，依赖关系清晰，避免幻影依赖问题
- 空间优化：由于 pnpm 的硬链接优化，子项目的 `node_modules` 仍然很小（约 116KB），不会造成额外的空间浪费

**验证 node_modules 大小：**
```bash
# 查看根目录 node_modules 大小
du -sk node_modules

# 查看各子项目 node_modules 大小
du -sk wps-plugin-excel/node_modules
du -sk wps-plugin-ppt/node_modules
du -sk wps-plugin-word/node_modules
```

#### Catalog 版本管理
为了避免在三个子项目中重复写同一个依赖版本（如 `"vue": "^3.4.29"`），我们使用 pnpm 的 `catalog` 功能来统一管理版本。

在 `pnpm-workspace.yaml` 中定义 `catalog` 版本，所有子项目只需通过以下方式声明依赖：
```json
{
  "dependencies": {
    "vue": "catalog:",
    "axios": "catalog:"
  }
}
```

这样做的好处是：
- 具体版本只需在一处维护（根目录）
- 三个项目共享相同版本
- 子项目的 `package.json` 看起来更干净整洁
- 更新某个依赖的版本时，只需修改一个地方

### wpsjs 依赖的特殊处理

#### 问题背景
使用 `wpsjs` 时发现它导致 Node.js 抛出 `UnhandledPromiseRejection` 错误。具体来说，`wpsjs@2.2.3` 的内部文件 `debug.js` 存在 Promise 处理不当的问题：
- `debug()` 函数内的 Promise 没有被 `return`
- Promise reject 时缺少 `.catch()` 处理器

#### 解决方案
为了解决这个问题，在 `scripts/fix-wpsjs.cjs` 中编写了一个自动修复脚本，在 `pnpm install` 的 postinstall 阶段自动修复：

1. **检测并替换** `debug()` 函数，为 Promise 添加 `return` 关键字和 `.catch()` 错误处理
2. **支持多种安装布局**：同时检查 pnpm 工作区的 `node_modules/.pnpm/` 和传统 npm 的 `node_modules/` 目录结构
3. **幂等性设计**：已经修复过的文件会被识别并跳过，避免重复处理

#### 版本固定
由于修复脚本是针对 `wpsjs@2.2.3` 具体版本编写的，为了避免将来 wpsjs 版本升级时修复脚本失效，已在 `pnpm-workspace.yaml` 中将 wpsjs 版本固定为 `2.2.3`。

如果需要升级 wpsjs 版本，必须同时验证修复脚本对新版本的兼容性，并根据需要调整脚本逻辑。

## 开发与部署
### WPS 入门教程
```bash
# 全局安装 wpsjs 工具
npm install -g wpsjs

# 创建一个新的 WPS 加载项项目（以电子表格为例）
wpsjs create HelloWps

# 进入项目目录
cd HelloWps

# 启动调试模式运行项目
wpsjs debug
```

### 打包发布教程
```bash
# 打包项目 选择"在线插件"。构建后的文件夹放到服务器上，要保证 https://your-domain.com/ 可以访问
wpsjs build

# 部署项目 输入访问地址 https://your-domain.com/。构建后的文件夹放到服务器上，要保证 https://your-domain.com/publish.html 可以访问
wpsjs publish
```

### 构建说明
- **区分测试生产环境**
  - 由于不在流水线上运行 `wpsjs build` ，所以不同环境用同一套代码，仅仅环境配置不同
  - 测试环境使用 `publish-sit.html` 文件进行发布
  - 生产环境使用 `publish.html` 文件进行发布
  
- **构建产物处理**
  - 将最终生成的 `wps-addon-build` 目录移动到 `release/wpsai` 目录中

### 对应文件路径
- 插件主页面文件:  `release/wpsai/wps-plugin-excel/index.html`
- 发布配置页面文件:  `release/wpsai/publish.html`

### 最终访问地址
- 插件主页面: https://<your-domain>/wps-plugin-excel/index.html
- 发布配置页面: https://<your-domain>/publish.html
## 发布与安装原理

### 发布流程说明
插件的发布、安装与加载流程如下：

首先需要一个 `publish.html` 文件。该文件会部署到服务器，也可通过私信等方式发送给用户。文件中维护了一个 `addonList`，其中包含所有待发布的插件信息。页面在运行时还会获取用户已安装的插件，并一同展示。

当用户点击安装时，系统会在电脑的 `kingsoft/wps/jsaddons/publish.xml` 文件中写入一条记录，格式类似于：  
`<jspluginonline type="wps" url="http://example.com/" name="example" />`

启动 WPS 时，程序会读取本机的 `publish.xml` 文件，并根据其中的 `type` 和 `url` 定位对应插件，完成加载。

顶部加载项显示的按钮由 `http://example.com/ribbon.xml` 决定，而按钮点击后的所有业务逻辑则由 `http://example.com/index.html` 实现。

由此可见，安装插件类似于在浏览器中添加书签，而打开插件则等同于访问该书签对应的页面。因此，任何内容更新只需修改线上资源即可，用户重启 WPS 后即可访问最新版本。

### 发布优化说明
实际使用中发现，每次执行 `wpsjs publish` 命令都会保留历史记录。例如，在 a、b、c 三个不同项目目录下分别执行发布，则每个文件夹下都会生成一个 `publish.html` 文件，其中 a 目录下只有一条记录，b 有两条，c 有三条。

由于 `wpsjs publish` 会记录所有历史发布信息，并将已发布过的插件一并写入 `publish.html`，因此我们不再直接使用该命令进行发布。

优化方案是：准备一个 `publish-template.html` 模板文件，发布时仅替换其中的配置项。  
（实际上，该文件在测试或生产环境发布一次后基本不会变动，因为对应地址已固定。）

### 跨平台安装脚本
对于 macOS 端的安装，由于 WPS 相关端口未开放，我们编写一个 Shell 脚本，让其直接修改其配置文件：  
`~/Library/Containers/com.kingsoft.wpsoffice.mac/Data/.kingsoft/wps/jsaddons/publish.xml`。

Windows 平台也可采用类似方式，修改的目标文件为：  
`%AppData%/kingsoft/wps/jsaddons/publish.xml`。

具体操作为：向配置文件中插入一条形如 `<jspluginonline type="wps" url="http://example.com/" name="example" />` 的记录作为静态配置。

用户只需执行以下命令即可下载并执行安装脚本：  `curl https://example.com/install.sh | sh`

## API 参考
WPS 官方 API 文档：
- [https://open.wps.cn/previous/docs/client/wpsLoad](https://open.wps.cn/previous/docs/client/wpsLoad)
- [https://qn.cache.wpscdn.cn/encs/doc/office_v19/index.htm](https://qn.cache.wpscdn.cn/encs/doc/office_v19/index.htm)

> 注意：该文档地址在公司内网环境下可能无法访问


## Mermaid 集成说明
本项目直接使用了开源的 `mermaid-it-markdown` 包，但由于其功能较为单一无法完全满足需求，因此将源码拷贝并进行了修改：

1. **流式输出优化**：在 Markdown 流式输出过程中，为避免因语法不完整导致的图表闪烁问题，在完全返回后再渲染 Mermaid 图表
2. **语法校验增强**：通过向 AI 提示词中添加各类图表模板，确保 AI 严格按照模板生成符合语法规范的 Mermaid 代码
3. **语法验证工具**：可使用 [Mermaid 在线验证工具](https://www.jyshare.com/front-end/9729/) 验证生成代码的合法性