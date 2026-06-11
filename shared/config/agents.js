// 通用 agent 定义 - 所有相同的 agent 对象都在这里

export const analyzeData = {
  label: '分析数据',
  showedContent: '请帮我分析以下表格数据',
  extraPrompt: `
## 任务描述：
请根据[任务要求],对输入的[选中内容]进行分析。
## 任务要求：
1. 请用通俗易懂的语言回答，避免使用"数组"、"null"、"[]"等技术术语。
2. 把我当成一个不太懂技术的普通办公人员，用"数据"、"表格第几行"这样的日常用语来分析。
3. 无视空白，不需要浅显的信息，给我偏向总结的回答。`,
  useSelection: true,
  onClick: null
}

export const analyzeContent = {
  label: '分析内容',
  showedContent: '请帮我分析以下文档内容',
  extraPrompt: `
## 任务描述：
请根据[任务要求],对输入的[选中内容]进行分析。
## 任务要求：
1. 请用通俗易懂的语言回答，避免使用"数组"、"null"、"[]"等技术术语。
2. 把我当成一个不太懂技术的普通办公人员，用"文本"、"内容"、"文档第几页"这样的日常用语来分析。
3. 无视空白，不需要浅显的信息，给我偏向总结的回答。`,
  useSelection: true,
  onClick: null
}

export const generateChart = {
  label: '生成图表',
  showedContent: '请帮我依据数据生成图表',
  extraPrompt: `
## 任务描述：
请根据[任务要求],对输入的[选中内容]生成图表。图表必须使用mermaid语法，根据数据特点选择最适合的[图表模板]，并严格按照模板格式生成对应图表。
## 任务要求：
1. 必须根据数据特征选择最合适的[图表模板]；
2. 若使用的是[图表模板]中的类型，必须严格按照模板；
3. 忽略空白数据，不要在图表中体现空值；
4. 为图表添加合适的标题(title)；
5. 不要解释绘制方式细节；
6. 简要总结数据内容，字数控制在50字以内；
### 图表模板：
#### 1. 柱状图 (Bar Chart)
\`\`\`mermaid
xychart-beta
	title "图表标题"
	x-axis "横轴标签" ["标签1", "标签2", "标签3"]
	y-axis "纵轴标签" 0 --> 100
	bar [25, 50, 75]
\`\`\`

#### 2. 折线图 (Line Chart)
\`\`\`mermaid
xychart-beta
	title "图表标题"
	x-axis "横轴标签" ["一月", "二月", "三月"]
	y-axis "纵轴标签" 0 --> 100
	line [30, 45, 60]
\`\`\`

#### 3. 饼图 (Pie Chart)
\`\`\`mermaid
pie
	title 各部分占比
	"部分A" : 30
	"部分B" : 45
	"部分C" : 25
\`\`\`

#### 4. 流程图 (Flowchart)
\`\`\`mermaid
flowchart LR
	A[步骤A] -->|连接描述| B(步骤B)
	B --> C{判断条件}
	C -->|分支1| D[结果1]
	C -->|分支2| E[结果2]
\`\`\`

#### 5. 序列图 (Sequence Diagram)
\`\`\`mermaid
sequenceDiagram
	participant A as 参与者A
	participant B as 参与者B
	A->>B: 消息描述
	loop 循环描述
		B->>B: 内部处理
	end
	B-->>A: 返回响应
\`\`\`

`,
  useSelection: true,
  onClick: null
}

export const translate = {
  label: '翻译',
  showedContent: '请帮我翻译以下内容',
  extraPrompt: `
## 任务描述：
请根据[任务要求],对输入的[选中内容]进行双语翻译，专门处理中文和其他语言之间的互译。
## 任务要求：
1. 当选中内容为中文时，将其准确翻译成英文；
2. 当选中内容为其他语言时，将其准确翻译成中文；
3. 保持原文的语气、风格和语境；
4. 确保翻译自然流畅，符合目标语言的表达习惯；
5. 对于专业术语或文化特定内容，提供恰当的翻译；
6. 如果选中内容是表格结构，输出时必须使用Markdown表格格式保持相同的表格结构；
7. 请专注于提供高质量的翻译，不需要添加额外解释或评论。`,
  useSelection: true,
  onClick: null
}

export const summarize = {
  label: '摘要',
  showedContent: '请帮我总结以下内容',
  extraPrompt: `
## 任务描述：
请根据[任务要求],对输入的[选中内容]进行信息整理，提炼核心要点。
## 任务要求：
1. 准确提取关键信息和核心观点；
2. 简化复杂表述，突出重要内容；
3. 保持逻辑清晰，层次分明；
4. 用简洁明了的语言概括全文；
5. 忽略次要细节，聚焦主要议题；
6. 根据内容类型提供结构化总结（如：要点罗列、分段概述等）；
7. 请用通俗易懂的语言提供精准的内容总结。`,
  useSelection: true,
  onClick: null
}

export const generatePPTOutline = {
  label: '生成PPT大纲',
  showedContent: '请帮我依据信息生成PPT大纲',
  extraPrompt: `
## 任务描述：
请根据[任务要求],对输入的[选中内容]生成一份PPT演示文稿的大纲。
## 任务要求：
1. 结构清晰，包含标题、主要章节和关键要点；
2. 使用简洁明了的语言；
3. 大纲层级分明，适合办公汇报使用；
4. 遵循金字塔原则。`,
  useSelection: true,
  onClick: null
}
