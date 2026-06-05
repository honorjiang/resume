# 个人简历网站

基于 React 19 + TypeScript + Vite 8 构建的单页式简历网站，内置 AI 导入解析、在线编辑、投递追踪、ATS 检测、素材提取、面试追问模拟与 PDF 模板导出。

在线预览：[www.honorjiang.cloud](https://www.honorjiang.cloud/resume/index.html)

## 功能

### 简历展示与编辑

- 单页式简历展示，响应式布局，深色/浅色主题三档切换（跟随系统 / 浅色 / 深色）
- 编辑模式下可直接修改所有字段，支持新增/删除条目
- AI 改动过的字段会高亮标注，方便识别哪些内容经过优化
- 修改自动保存到浏览器本地，支持一键恢复默认数据

### AI 能力

- **PDF 导入** — 上传 PDF 简历，AI 提取为结构化数据，确认后应用
- **文本润色 / STAR 改写** — 编辑模式下对任意字段调用 AI 改写
- **ATS 检测** — 分析 ATS 兼容性，输出评分、风险项与改进建议，以交互式检查清单展示
- **岗位定向优化** — 输入目标岗位和 JD，AI 生成逐字段优化补丁，逐条审核后一键应用
- **成就素材提取** — AI 从简历中提取成果、项目动作、技能和亮点，自动评估每条素材的证据强度（是否包含量化指标、业务上下文、候选人动作、结果影响）
- **面试追问模拟** — AI 分析简历中的每条经历声明，生成追问问题，帮助候选人准备深度面试
- 所有 AI 功能通过自带 API Key 调用，支持 OpenAI Responses、OpenAI Compatible、Anthropic Compatible 三种协议，Key 仅保存在当前浏览器会话

### 岗位版本管理

- 每次接受岗位优化后自动保存为本地版本（最多 12 个），包含完整简历快照、改动补丁、关键词覆盖和 ATS 评分
- 后续可快速切回对应岗位简历，投递追踪记录可绑定特定版本

### PDF 模板导出

- 内置多套 PDF 模板（现代双栏、正式商务等），基于 Canvas + jsPDF 生成高保真 A4 页面
- 模板坐标配置在 `src/lib/pdf/pdfTemplateConfigs.json`，可扩展
- 新增 PDF 放到 `public/pdf-templates/` 即可自动发现

### 投递追踪

- 管理投递状态（已投递 / 筛选中 / 面试中 / Offer / 未通过 / 已放弃）、优先级、下一步动作与归档
- 支持按阶段筛选、关键词搜索、导入/导出 JSON

## 快速开始

```bash
npm install
npm run dev
```

开发地址：`http://localhost:5173/resume/`

## 构建

```bash
npm run build
```

输出到 `dist/`。

## 部署

### Nginx 静态部署

构建后上传 `dist/` 到服务器：

```nginx
location /resume/ {
    alias /var/www/resume/;
    index index.html;
    try_files $uri $uri/ /resume/index.html;
}
```

### Docker 部署

内置 `Dockerfile`、`compose.yaml` 和 Nginx 配置：

```bash
docker compose up -d --build
```

访问 `http://localhost:9989/resume/`。修改子路径需同步更改 `vite.config.ts` 中的 `base`。

## 自定义简历

点击顶栏「编辑」即可在线修改所有字段。也可直接编辑 `src/data/resume.ts`，类型定义在 `src/types/resume.ts`。

## 项目结构

```
src/
├── App.tsx                          # 根组件，状态管理与功能编排
├── components/
│   ├── applications/                # 投递追踪弹窗
│   ├── editor/                      # 编辑器上下文、AI 工作台、可编辑文本
│   ├── layout/                      # 页面框架、容器、段落导航、主题切换
│   ├── pdf/                         # PDF 预览与导入弹窗
│   ├── resume/                      # 简历段落渲染
│   ├── sections/                    # 各内容区：Hero、亮点、经历、技能、教育、证书、联系方式
│   └── ui/                          # 通用组件：Button、Modal、Badge、Card
├── data/resume.ts                   # 默认简历数据
├── hooks/                           # 主题、滚动导航、PDF 导入等 hooks
├── lib/
│   ├── ai/
│   │   ├── prompts.ts               # 所有 AI 提示词（集中管理）
│   │   └── resumeAssistant.ts       # AI 客户端：润色、ATS、岗位优化、素材提取、面试追问
│   └── pdf/                         # PDF 生成、模板、文本提取、PDF 导入 AI 解析
├── styles/                          # 全局样式（含深色主题）与打印样式
└── types/                           # TypeScript 类型定义
```

## 技术栈

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · Framer Motion · Lucide React · pdfjs-dist · jsPDF · ESLint
