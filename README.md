# 个人简历网站

基于 React 19 + TypeScript + Vite 8 构建的单页式简历网站。以中文简历为 master 数据源，通过 AI 实时翻译成任意目标语言；内置 AI 导入解析、在线编辑、多语种切换、投递追踪、ATS 检测、素材提取、面试追问模拟与 PDF 模板导出。

在线预览：[www.honorjiang.cloud](https://www.honorjiang.cloud/resume/index.html)

## 功能概览

### 简历展示与编辑

- 单页式简历展示，响应式布局，深色/浅色主题三档切换（跟随系统 / 浅色 / 深色）
- 编辑模式下可直接修改所有字段，支持新增/删除条目（亮点、技能、经历、项目、教育、证书、联系方式）
- 工作经历与项目经历支持关联管理：在某段工作经历下新增的项目会自动归属该经历
- AI 改动过的字段会高亮标注，方便识别哪些内容经过优化
- 修改自动保存到浏览器 localStorage，支持一键恢复默认数据
- 未归属项目入口：编辑模式下可创建不关联任何工作经历的独立项目

### 多语种支持（N 语言动态架构）

- 任意语言动态切换，顶栏下拉菜单提供中文 / English / 日本語 / 한국语 等常用语言快捷入口
- 自定义语言：支持输入任意语言代码（`fr`、`de`、`ru` 等）或语言名称，AI 实时翻译为目标语言
- **架构原则**：以中文简历为唯一 master 数据源；其他语言的 profile 全部由 AI 从中文实时翻译生成，按 `resume-draft-{lang}` 键缓存到 localStorage
- 已翻译的语言 profile 可独立编辑，与中文数据互不干扰
- 英文模式无 API Key 时自动走 `zhEnGlossary` 术语表兜底（不污染数据，不影响 PDF/AI 等后端逻辑）
- 其他语言无 API Key 时显示中文原文
- 25+ 种语言的 BCP 47 locale 映射、HTML `lang` 属性、列表分隔符（`、` vs `, `）均按当前语言自动适配
- 切换语言失败可重试；恢复默认一键清空所有非中文 profile
- 旧版 `resume-en-draft` 启动时自动迁移到 `resume-draft-en`，无数据丢失

### AI 能力

- **PDF 导入** — 上传 PDF 简历，AI 提取为结构化数据，预览确认后应用；输出语言跟随当前界面语言
- **文本润色 / STAR 改写** — 编辑模式下对任意字段调用 AI 改写，支持单行和段落模式
- **ATS 检测** — 分析 ATS 兼容性，输出评分、风险项与改进建议，以交互式检查清单展示
- **岗位定向优化** — 输入目标岗位和 JD，AI 生成逐字段优化补丁，逐条审核后一键应用
- **成就素材提取** — AI 从简历中提取成果、项目动作、技能和亮点，自动评估每条素材的证据强度（数据、上下文、动作、结果四维度）
- **面试追问模拟** — AI 分析简历中的经历声明，生成追问问题，帮助候选人准备深度面试
- 所有 AI 功能通过自带 API Key 调用，支持三种协议：
  - OpenAI Responses API（原生 PDF 文件支持）
  - OpenAI Compatible（通用兼容网关）
  - Anthropic Compatible（Claude 兼容网关）
- API Key 仅保存在当前浏览器 sessionStorage，关闭浏览器自动清空

### 岗位版本管理

- 每次接受岗位优化后自动保存为本地版本（最多 12 个），包含完整简历快照、改动补丁、关键词覆盖和 ATS 评分
- 版本对比视图：并排查看当前简历与目标版本的逐字段差异
- 后续可快速切回对应岗位简历，投递追踪记录可绑定特定版本

### PDF 模板导出

- 内置多套 PDF 模板（现代双栏、正式商务等），基于 Canvas + jsPDF 生成高保真 A4 页面
- 模板坐标配置在 `src/lib/pdf/pdfTemplateConfigs.json`，可扩展
- 新增 PDF 放到 `public/pdf-templates/` 即可自动发现
- 支持预览和直接下载导出

### 投递追踪

- 管理投递状态（已投递 / 筛选中 / 面试中 / Offer / 未通过 / 已放弃）、优先级、下一步动作与归档
- 支持按阶段筛选、关键词搜索、导入/导出 JSON
- 可关联岗位版本和面试反馈

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

点击顶栏「编辑」即可在线修改所有字段。也可直接编辑 `src/data/resume.ts`（中文 master 数据），类型定义在 `src/types/resume.ts`。所有其他语言的 profile 都不需要静态文件 — 切换语言时由 AI 翻译自动生成。

## 多语种架构说明

```
              ┌── zhProfile (master, 来自 src/data/resume.ts)
              │
records:zh ───┤
              │
              ├── enProfile (AI 翻译 / 用户编辑 → resume-draft-en)
              ├── jaProfile (AI 翻译 / 用户编辑 → resume-draft-ja)
              ├── koProfile (AI 翻译 / 用户编辑 → resume-draft-ko)
              ├── frProfile (AI 翻译 / 用户编辑 → resume-draft-fr)
              └── ... 任意语言
```

- `App.tsx` 维护 `Record<string, ResumeProfile>` 状态，按当前语言 key 路由
- `useLanguageMode` 接收任意语言代码字符串，HTML `lang` 属性通过 `LANG_TO_LOCALE` 映射
- `languageDirective(lang)` 共享函数为所有 AI 调用输出语言指令
- `translateResumeProfile` 支持 zh → 任意目标语言，prompt 内动态嵌入目标语言名
- 切换语言首次会触发 AI 翻译，结果按 `resume-draft-{lang}` 缓存
- 切换回中文时直接使用 master 数据，不重复翻译

## 项目结构

```
src/
├── App.tsx                          # 根组件，profiles Record 状态 + 多语种翻译调度
├── main.tsx                         # 入口，Provider 嵌套（语言、主题、Toast）
├── components/
│   ├── applications/                # 投递追踪弹窗
│   ├── editor/                      # 编辑器上下文、AI 工作台、可编辑文本、草稿工厂
│   ├── layout/                      # 页面框架、容器、段落导航、主题切换、语言选择器
│   ├── pdf/                         # PDF 预览与导入弹窗
│   ├── resume/                      # 简历段落渲染与 PDF 区块组件
│   ├── sections/                    # 各内容区：Hero、亮点、经历（含项目管理）、技能、教育、证书、联系方式
│   └── ui/                          # 通用组件：Button、Modal、Badge、Toast、Card
├── data/
│   └── resume.ts                    # 中文 master 数据（唯一静态数据源）
├── hooks/                           # 主题、语言、滚动导航、PDF 导入等 hooks
├── lib/
│   ├── ai/
│   │   ├── aiRequest.ts             # AI 请求层：超时、取消、结构化输出
│   │   ├── prompts.ts               # 所有 AI 提示词（集中管理）
│   │   └── resumeAssistant.ts       # AI 客户端：润色、ATS、岗位优化、素材提取、面试追问
│   ├── i18n/
│   │   ├── uiDict.ts                # UI 文案字典（zh + en + 任意语言 fallback）
│   │   ├── languageDirective.ts     # AI 输出语言指令生成器（25+ 语言）
│   │   ├── applyGlossary.ts         # 渲染时术语表兜底翻译（仅 en）
│   │   ├── translateResume.ts       # AI 全量翻译 zh → 任意语言
│   │   └── glossary.ts              # zhEnGlossary 术语表
│   ├── pdf/                         # PDF 生成、模板引擎、文本提取、AI 解析
│   ├── contact.ts                   # 联系方式工具函数
│   └── secureStorage.ts             # API Key 轻量混淆存储
├── styles/                          # 全局样式（含深色主题覆盖）与打印样式
└── types/                           # TypeScript 类型定义
```

## 技术栈

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · Framer Motion · Lucide React · pdfjs-dist · jsPDF · ESLint
