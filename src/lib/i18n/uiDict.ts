/**
 * UI 字典
 *
 * 集中存放所有面向用户的 UI 文本。每条至少提供 zh 与 en。
 * 其他语言运行时 fallback 到 en → zh。命名规范：按页面/区域/类型划分。
 */

export type Language = string;

export type LocaleString = {
  zh: string;
  en: string;
  [lang: string]: string;
};

export const uiDict = {
  // ============================================================
  // 顶部导航
  // ============================================================
  nav: {
    edit: { zh: '编辑', en: 'Edit' },
    completeEdit: { zh: '完成编辑', en: 'Done' },
    import: { zh: '导入 PDF', en: 'Import PDF' },
    aiAssistant: { zh: 'AI 助手', en: 'AI Assistant' },
    applicationTracker: { zh: '投递追踪', en: 'Applications' },
    more: { zh: '更多操作', en: 'More' },
    previewPdf: { zh: '预览 PDF', en: 'Preview PDF' },
    exportingPdf: { zh: '生成中...', en: 'Generating...' },
    exportPdf: { zh: '导出 PDF', en: 'Export PDF' },
    restore: { zh: '恢复默认简历', en: 'Restore Default' },
    moreTitle: { zh: '更多操作', en: 'More' },
    pdfTemplate: { zh: 'PDF 模板', en: 'PDF Template' },
    autoThemeDescription: { zh: '当前深色', en: 'Currently dark' },
    autoThemeDescriptionLight: { zh: '当前浅色', en: 'Currently light' },
    lightThemeDescription: { zh: '明亮阅读', en: 'Light reading' },
    darkThemeDescription: { zh: '低亮阅读', en: 'Low-light reading' },
    auto: { zh: '自动', en: 'Auto' },
    light: { zh: '浅色', en: 'Light' },
    dark: { zh: '深色', en: 'Dark' },
    pageDisplayMode: { zh: '页面显示模式', en: 'Page display mode' },
    languageToggle: { zh: '界面语言', en: 'Interface language' },
  },

  // ============================================================
  // 区域标题（Section 标题、锚点导航）
  // ============================================================
  section: {
    hero: { zh: '首页摘要', en: 'Hero' },
    highlights: { zh: '核心亮点', en: 'Highlights' },
    skills: { zh: '技能矩阵', en: 'Skills' },
    experience: { zh: '工作经历', en: 'Experience' },
    education: { zh: '教育背景', en: 'Education' },
    certificates: { zh: '证书荣誉', en: 'Certificates' },
    contact: { zh: '联系信息', en: 'Contact' },
    experienceEyebrow: { zh: '经历', en: 'Experience' },
    skillsEyebrow: { zh: '技能', en: 'Skills' },
    educationEyebrow: { zh: '教育', en: 'Education' },
    certificatesEyebrow: { zh: '证书', en: 'Certificates' },
    highlightsEyebrow: { zh: '亮点', en: 'Highlights' },
    contactEyebrow: { zh: '联系', en: 'Contact' },
    heroEyebrow: { zh: '个人简历', en: 'Resume' },
    corePositioning: { zh: '核心定位', en: 'Core positioning' },
    focusTags: { zh: '关注标签', en: 'Focus tags' },
    workLocation: { zh: '工作地点', en: 'Location' },
    contactEntry: { zh: '联系入口', en: 'Contact' },
    contactMethod: { zh: '联系方式', en: 'Contact' },
  },

  // ============================================================
  // 简历草稿横幅
  // ============================================================
  draftBanner: {
    title: {
      zh: '当前展示的是保存在浏览器本地的简历草稿。',
      en: 'You are viewing a resume draft saved in this browser.',
    },
    description: {
      zh: '页面编辑内容会保存在当前浏览器中，不会直接修改 src/data/resume.ts 里的默认数据。',
      en: 'Your edits stay in this browser. The default data in src/data/resume.ts is not modified.',
    },
  },

  // ============================================================
  // 编辑操作
  // ============================================================
  editor: {
    editModeHint: {
      zh: '编辑模式下可以新增或删除当前模块内容。',
      en: 'In edit mode you can add or remove items in this section.',
    },
    emptyMessage: {
      zh: '当前还没有内容。',
      en: 'No content yet.',
    },
    addExperience: { zh: '新增经历卡片', en: 'Add experience' },
    addProject: { zh: '新增项目卡片', en: 'Add project' },
    addHighlight: { zh: '新增亮点卡片', en: 'Add highlight' },
    addSkill: { zh: '新增技能卡片', en: 'Add skill' },
    addEducation: { zh: '新增教育卡片', en: 'Add education' },
    addCertificate: { zh: '新增证书卡片', en: 'Add certificate' },
    addContact: { zh: '新增联系方式卡片', en: 'Add contact' },
    experienceEmpty: {
      zh: '当前没有工作经历卡片，先新增一项。',
      en: 'No experience yet. Add one to get started.',
    },
    highlightEmpty: {
      zh: '当前没有亮点卡片，先新增一项。',
      en: 'No highlights yet. Add one to get started.',
    },
    skillEmpty: {
      zh: '当前没有技能卡片，先新增一项。',
      en: 'No skill groups yet. Add one to get started.',
    },
    educationEmpty: {
      zh: '当前没有教育卡片，先新增一项。',
      en: 'No education yet. Add one to get started.',
    },
    certificateEmpty: {
      zh: '当前没有证书卡片，先新增一项。',
      en: 'No certificates yet. Add one to get started.',
    },
    contactEmpty: {
      zh: '当前没有联系方式卡片，先新增一项。',
      en: 'No contact entries yet. Add one to get started.',
    },
    delete: { zh: '删除', en: 'Delete' },
    aiPolish: { zh: 'AI 润色', en: 'AI Polish' },
    aiStar: { zh: 'STAR 改写', en: 'STAR Rewrite' },
    aiRewrittenLabel: { zh: 'AI 改写结果', en: 'AI Rewritten' },
    aiOptimizedLabel: { zh: 'AI 优化结果', en: 'AI Optimized' },
    aiPolishedLabel: { zh: 'AI 润色结果', en: 'AI Polished' },
    noProjectEntries: {
      zh: '当前工作经历没有匹配到可展示的项目经历。',
      en: 'No related projects for this experience.',
    },
    showDetails: { zh: '展开详情', en: 'Show details' },
    hideDetails: { zh: '收起详情', en: 'Hide details' },
    projectBackground: { zh: '项目背景', en: 'Background' },
    projectActions: { zh: '关键动作', en: 'Key actions' },
    projectOutcomes: { zh: '最终结果', en: 'Outcomes' },
    achievementsList: { zh: '成果列表', en: 'Achievements' },
    projectCount: { zh: '项目经历', en: 'Projects' },
    contactPlaceholder: { zh: '面议', en: 'Negotiable' },
    locationPlaceholder: { zh: '地点', en: 'Location' },
    degreePlaceholder: { zh: '学历', en: 'Degree' },
    majorPlaceholder: { zh: '专业', en: 'Major' },
    issuerPlaceholder: { zh: '颁发机构', en: 'Issuer' },
    datePlaceholder: { zh: '年份', en: 'Year' },
    placeholderTags: { zh: '使用逗号分隔标签', en: 'Comma-separated tags' },
    placeholderLines: { zh: '每行一条', en: 'One per line' },
    placeholderPositioning: { zh: '补充定位说明', en: 'Add positioning line' },
    placeholderSummary: { zh: '补充简历摘要', en: 'Add a summary' },
    placeholderProjectSummary: { zh: '补充项目摘要', en: 'Add project summary' },
    placeholderSubtitle: { zh: '补充一句定位或亮点描述', en: 'Add a positioning line' },
    placeholderFocusTags: { zh: '使用逗号分隔标签', en: 'Comma-separated tags' },
    placeholderHighlightTitle: { zh: '亮点标题', en: 'Highlight title' },
    placeholderContactHref: { zh: '链接地址，可留空', en: 'Link URL, optional' },
    achievementsTextarea: {
      zh: '每行一条成果',
      en: 'One achievement per line',
    },
    actionsTextarea: {
      zh: '每行一条关键动作',
      en: 'One action per line',
    },
    outcomesTextarea: {
      zh: '每行一条项目结果',
      en: 'One outcome per line',
    },
    unassignedProjectsTitle: { zh: '未归属项目经历', en: 'Unassigned projects' },
    unassignedProjectsDescription: {
      zh: '这些项目还没有匹配到具体工作经历，暂时集中在工作经历区查看。',
      en: 'These projects are not yet linked to a specific job. View them in the experience section.',
    },
  },

  // ============================================================
  // AI 助手
  // ============================================================
  ai: {
    title: { zh: 'AI 简历工作台', en: 'AI Resume Workbench' },
    description: {
      zh: '生成岗位版本、审核 AI 改动、检查证据强度，并模拟面试追问。',
      en: 'Generate role-targeted versions, review AI changes, score evidence, and simulate interview follow-ups.',
    },
    apiKeyMissing: {
      zh: '请先填写 API Key；AI 模块会在点击按钮后实时分析当前简历。',
      en: 'Please set an API Key first. AI runs in real time when you click a button.',
    },
    tabConfig: { zh: '配置', en: 'Config' },
    tabVersions: { zh: '版本', en: 'Versions' },
    tabEvidence: { zh: '证据', en: 'Evidence' },
    tabInterview: { zh: '追问', en: 'Interview' },
    tabAts: { zh: 'ATS', en: 'ATS' },
    provider: { zh: 'Provider', en: 'Provider' },
    apiKey: { zh: 'API Key', en: 'API Key' },
    model: { zh: 'Model', en: 'Model' },
    baseUrl: { zh: 'Base URL', en: 'Base URL' },
    privacyTitle: { zh: 'AI 配置与隐私', en: 'AI config & privacy' },
    privacyDetail: {
      zh: '点击测试连接只验证模型是否能返回结构化 JSON；点击 ATS、提取评分、生成追问或岗位版本时，才会把当前简历内容发送到你配置的模型服务。',
      en: 'Test connection only verifies structured JSON output. ATS, evidence scoring, interview prompts, and role versions send your current resume to the configured model.',
    },
    testConnection: { zh: '测试连接', en: 'Test connection' },
    testing: { zh: '测试中...', en: 'Testing...' },
    targetRole: { zh: '目标岗位', en: 'Target role' },
    targetRolePlaceholder: {
      zh: '例如：数据分析师 / 前端开发 / 产品经理',
      en: 'e.g. Data Analyst / Frontend Engineer / Product Manager',
    },
    jobDescription: { zh: '岗位描述 / 关键词', en: 'Job description / keywords' },
    jobDescriptionPlaceholder: {
      zh: '粘贴 JD、关键要求、核心技能、业务场景。',
      en: 'Paste the JD, key requirements, core skills, and business context.',
    },
    atsCheck: { zh: 'ATS 检查', en: 'ATS Check' },
    cancelCheck: { zh: '取消分析', en: 'Cancel' },
    generateRoleVersion: { zh: '生成岗位版本', en: 'Generate role version' },
    cancelOptimization: { zh: '取消优化', en: 'Cancel' },
    versionManager: { zh: '岗位版本管理', en: 'Role versions' },
    versionManagerDescription: {
      zh: '每次接受岗位优化后都会保存一个本地版本，投递追踪可绑定版本和反馈。',
      en: 'Each accepted role optimization is saved locally. Link it to an application to track feedback.',
    },
    versions: { zh: 'Versions', en: 'Versions' },
    compare: { zh: '对比', en: 'Compare' },
    applyVersion: { zh: '应用版本', en: 'Apply version' },
    aiDiffTitle: { zh: 'AI 修改前后对比', en: 'AI before/after' },
    targetRoleLabel: { zh: '目标岗位', en: 'Target role' },
    selectAll: { zh: '全选', en: 'Select all' },
    rejectAll: { zh: '全部拒绝', en: 'Reject all' },
    applyOptimization: { zh: '应用 {n} 条并保存版本', en: 'Apply {n} & save version' },
    applying: { zh: '应用中...', en: 'Applying...' },
    appliedOptimization: { zh: '已应用 {n} 条建议，并保存为岗位版本。', en: 'Applied {n} suggestions and saved as a role version.' },
    evidenceTitle: { zh: '可信度 / 证据强度评分', en: 'Evidence scoring' },
    evidenceDescription: {
      zh: '点击后由 AI 从当前简历实时提取素材，并按数据、上下文、个人动作和结果四项评分。',
      en: 'AI extracts evidence from your current resume and scores each item on metrics, context, ownership, and outcome.',
    },
    extractEvidence: { zh: 'AI 提取评分', en: 'Extract & score' },
    reextractEvidence: { zh: 'AI 重新提取', en: 'Re-extract' },
    cancelExtract: { zh: '取消提取', en: 'Cancel' },
    extractedCount: { zh: 'AI 已提取 {n} 条证据素材', en: 'Extracted {n} evidence items' },
    noExtracted: { zh: '未提取到证据素材', en: 'No evidence extracted' },
    noExtractedDetail: {
      zh: '请补充更具体的经历或项目成果后重试。',
      en: 'Add more specific achievements or project outcomes and try again.',
    },
    extractFailed: { zh: '证据提取失败', en: 'Evidence extraction failed' },
    itemsLabel: { zh: '素材', en: 'Items' },
    strongLabel: { zh: '强证据', en: 'Strong' },
    usableLabel: { zh: '可用', en: 'Usable' },
    weakLabel: { zh: '待加强', en: 'Weak' },
    dimensionMetric: { zh: '数据', en: 'Metric' },
    dimensionContext: { zh: '上下文', en: 'Context' },
    dimensionAction: { zh: '动作', en: 'Action' },
    dimensionResult: { zh: '结果', en: 'Result' },
    missingDimension: { zh: '待补', en: 'Missing' },
    locate: { zh: '定位', en: 'Locate' },
    copy: { zh: '复制', en: 'Copy' },
    interviewTitle: { zh: '面试追问模拟', en: 'Interview follow-ups' },
    interviewDescription: {
      zh: '点击后由 AI 基于当前简历生成追问，优先暴露数据口径、业务背景、个人贡献和结果复用性。',
      en: 'AI generates follow-up questions that probe metrics, context, ownership, and result validity.',
    },
    generateInterview: { zh: 'AI 生成追问', en: 'Generate questions' },
    regenerateInterview: { zh: 'AI 重新生成', en: 'Regenerate' },
    cancelGenerateInterview: { zh: '取消生成', en: 'Cancel' },
    questions: { zh: 'Questions', en: 'Questions' },
    evidenceScore: { zh: '证据', en: 'Evidence' },
    copyQuestions: { zh: '复制追问', en: 'Copy' },
    locateExperience: { zh: '定位经历', en: 'Locate experience' },
    atsTitle: { zh: 'ATS 检查清单', en: 'ATS Checklist' },
    score: { zh: 'Score', en: 'Score' },
    completed: { zh: '{done}/{total} 已处理', en: '{done}/{total} done' },
    completedDetail: {
      zh: '可逐项标记完成并定位到简历区块。',
      en: 'Mark items as done and jump to the relevant section.',
    },
    strengths: { zh: '优势', en: 'Strengths' },
    missingKeywords: { zh: '缺失关键词', en: 'Missing keywords' },
    noMissingKeywords: { zh: '暂无明显缺失。', en: 'No obvious gaps.' },
    noStrengths: { zh: '暂无明显优势摘要。', en: 'No notable strengths yet.' },
    versionCompare: { zh: '版本对比', en: 'Version compare' },
    fieldChanges: { zh: '{n} 项字段改动', en: '{n} field changes' },
    enhancedKeywords: { zh: '{n} 个增强关键词', en: '{n} enhanced keywords' },
    currentValue: { zh: '当前内容', en: 'Current' },
    suggestedValue: { zh: '建议改写', en: 'Suggested' },
    accepted: { zh: '已接受', en: 'Accepted' },
    rejected: { zh: '已拒绝', en: 'Rejected' },
    sharedKeywords: { zh: '与本次优化重合', en: 'Shared with this optimization' },
    atsEmptyMessage: {
      zh: '填写 API Key 后点击"ATS 检查"，这里才会显示 AI 生成的检查清单。',
      en: 'Set an API Key and click "ATS Check" to see AI-generated items.',
    },
    evidenceEmptyMessage: {
      zh: '填写 API Key 后点击"AI 提取评分"，这里才会显示 AI 分析结果。',
      en: 'Set an API Key and click "Extract & score" to see AI analysis.',
    },
    interviewEmptyMessage: {
      zh: '填写 API Key 后点击"AI 生成追问"，这里才会显示 AI 面试追问。',
      en: 'Set an API Key and click "Generate questions" to see AI follow-ups.',
    },
    noVersionPatches: { zh: '该版本没有保存字段级改动。', en: 'No field-level changes in this version.' },
    noVersions: { zh: '暂无岗位版本。运行岗位优化并接受建议后会自动生成。', en: 'No role versions yet. Run optimization and accept suggestions to create one.' },
    keyRequired: { zh: '请先填写 API Key。', en: 'Set an API Key first.' },
    setKeyFirst: { zh: '请先填写 API Key，再运行 ATS 检查。', en: 'Set an API Key before running ATS check.' },
    setKeyFirstOptimize: { zh: '请先填写 API Key，再生成岗位版本。', en: 'Set an API Key before generating a role version.' },
    setKeyFirstOptimizeTarget: { zh: '请先填写目标岗位，再运行岗位定向优化。', en: 'Set a target role before running role optimization.' },
    setKeyFirstExtract: { zh: '请先填写 API Key，再提取证据强度评分。', en: 'Set an API Key before extracting evidence.' },
    setKeyFirstInterview: { zh: '请先填写 API Key，再生成面试追问。', en: 'Set an API Key before generating follow-ups.' },
    setKeyFirstConfig: { zh: '请先填写可用的 AI API Key。', en: 'Set a valid AI API Key first.' },
    atsFailed: { zh: 'ATS 检查失败', en: 'ATS check failed' },
    optimizeFailed: { zh: '岗位定向优化失败', en: 'Role optimization failed' },
    retryLater: { zh: '请重试。', en: 'Please retry.' },
    acceptOnePatch: { zh: '请至少接受一条优化建议。', en: 'Accept at least one optimization suggestion.' },
    jobDescriptionEmpty: { zh: 'AI 未返回 ATS 检查结果。', en: 'AI returned no ATS results.' },
    jobOptimizationEmpty: { zh: 'AI 没有发现需要改写的字段。', en: 'AI found no fields worth rewriting.' },
    materialsEmpty: { zh: 'AI 未从当前简历中提取到可评分素材。', en: 'AI found no scorable material in this resume.' },
    interviewEmpty: { zh: 'AI 未从当前简历中找到适合追问的经历。', en: 'AI found no interview-worthy experience in this resume.' },
    insufficientMaterials: {
      zh: '当前简历没有足够具体的成果、项目动作或亮点可供评分。',
      en: 'This resume lacks specific achievements, project actions, or highlights to score.',
    },
    statusKeyMissing: { zh: '未配置 Key', en: 'Key missing' },
    statusKeyMissingDetail: { zh: '填写 API Key 后才能运行。', en: 'Set an API Key to run.' },
    statusRunning: { zh: '运行中', en: 'Running' },
    statusRunningDetail: { zh: '正在调用 AI 实时分析当前简历。', en: 'AI is analyzing your current resume.' },
    statusPending: { zh: '待运行', en: 'Pending' },
    statusPendingDetail: { zh: '点击按钮后才会生成结果。', en: 'Run a button to generate results.' },
    statusStale: { zh: '已过期', en: 'Stale' },
    statusEmpty: { zh: '空结果', en: 'No results' },
    statusDone: { zh: '已生成', en: 'Done' },
    statusDoneDetail: {
      zh: '基于当前简历，生成于 {time}。',
      en: 'Generated at {time} from current resume.',
    },
    severityHigh: { zh: '高', en: 'High' },
    severityMedium: { zh: '中', en: 'Medium' },
    severityLow: { zh: '低', en: 'Low' },
    markDone: { zh: '标记完成', en: 'Mark done' },
    markUndone: { zh: '标记未完成', en: 'Mark not done' },
    modalDescription: { zh: '统一管理 AI 配置、ATS 检查、岗位版本和素材库。', en: 'Manage AI config, ATS checks, role versions, and evidence.' },
    connectionNotTested: { zh: '尚未测试连接。', en: 'Connection not tested yet.' },
    testingConnection: { zh: '正在测试模型连接...', en: 'Testing model connection...' },
    connectionTestFailed: { zh: '连接测试失败，请检查配置。', en: 'Connection test failed. Check your configuration.' },
    noWorthwhileRewrites: { zh: 'AI 没有发现值得应用的岗位定向改写。', en: 'AI found no worthwhile role-specific rewrites to apply.' },
    noInterviewStatements: { zh: '当前简历没有足够明确的成果声明可生成追问。', en: 'Resume lacks clear outcome claims for generating follow-ups.' },
    interviewGeneratedCount: { zh: 'AI 已生成 {n} 组面试追问', en: 'AI generated {n} follow-up groups' },
    noInterviewGenerated: { zh: '未生成面试追问', en: 'No follow-ups generated' },
    noInterviewGeneratedDetail: { zh: '请补充更明确的成果、数据或项目描述后重试。', en: 'Add clearer outcomes, data, or project details and try again.' },
    interviewGenerateFailed: { zh: '面试追问生成失败', en: 'Follow-up generation failed' },
    deleteVersion: { zh: '删除', en: 'Delete' },
    currentResume: { zh: '当前简历', en: 'Current resume' },
    thisVersion: { zh: '该版本', en: 'This version' },
    currentEmpty: { zh: '当前为空', en: 'Empty' },
    supplementKeywordPrefix: { zh: '补充关键词：', en: 'Add keyword: ' },
    supplementKeywordDetail: { zh: '在摘要、技能或相关经历中自然补充该关键词。', en: 'Naturally include this keyword in your summary, skills, or related experience.' },
    atsGeneratedSummary: { zh: '已生成 ATS 分析结果。', en: 'ATS analysis generated.' },
    scoreUnit: { zh: '分', en: 'pts' },
    statusStaleDetail: { zh: '结果生成于 {time}，当前简历已变化。', en: 'Results from {time}; resume has changed since.' },
  },

  // ============================================================
  // 投递追踪
  // ============================================================
  tracker: {
    title: { zh: '投递追踪', en: 'Applications' },
    description: {
      zh: '管理求职投递、面试阶段、后续动作与归档记录。',
      en: 'Manage job applications, interview stages, follow-ups, and archive.',
    },
    badge: { zh: 'Applications', en: 'Applications' },
    titleHeadline: { zh: '投递追踪', en: 'Applications' },
    titleSubtitle: {
      zh: '跟进公司、岗位、阶段和下一步动作，数据仅保存在当前浏览器。',
      en: 'Track companies, roles, stages, and next actions. Data stays in this browser only.',
    },
    import: { zh: '导入', en: 'Import' },
    export: { zh: '导出', en: 'Export' },
    addApplication: { zh: '新增投递', en: 'Add application' },
    total: { zh: '全部', en: 'Total' },
    active: { zh: '进行中', en: 'Active' },
    interview: { zh: '面试', en: 'Interview' },
    offer: { zh: 'Offer', en: 'Offer' },
    overdue: { zh: '待跟进', en: 'Overdue' },
    showArchived: { zh: '显示归档 {n}', en: 'Show archived ({n})' },
    hideArchived: { zh: '隐藏归档', en: 'Hide archived' },
    mostApplied: { zh: '投递最多', en: 'Most applied' },
    bestInterviewRate: { zh: '面试率最高', en: 'Best interview rate' },
    bestOffer: { zh: 'Offer 表现', en: 'Best offer rate' },
    noData: { zh: '暂无', en: 'N/A' },
    noApplications: { zh: '{n} 次投递', en: '{n} applications' },
    noInterviewRate: { zh: '0% 面试率', en: '0% interview rate' },
    noOfferRate: { zh: '0% Offer 率', en: '0% offer rate' },
    rateInterview: { zh: '{rate}% 面试率', en: '{rate}% interview rate' },
    rateOffer: { zh: '{rate}% Offer 率', en: '{rate}% offer rate' },
    keywordsTitle: { zh: 'JD 高频关键词', en: 'JD keywords' },
    feedbackTitle: { zh: '面试反馈主题', en: 'Interview feedback' },
    noKeywords: { zh: '暂无 JD 关键词。', en: 'No JD keywords yet.' },
    noFeedback: { zh: '暂无面试反馈。', en: 'No interview feedback yet.' },
    searchPlaceholder: { zh: '搜索公司、岗位、城市、联系人或备注', en: 'Search company, role, city, contact, notes' },
    filterAll: { zh: '全部', en: 'All' },
    filterActive: { zh: '进行中', en: 'Active' },
    filterInterview: { zh: '面试', en: 'Interview' },
    filterOffer: { zh: 'Offer', en: 'Offer' },
    filterClosed: { zh: '已关闭', en: 'Closed' },
    statusApplied: { zh: '已投递', en: 'Applied' },
    statusScreening: { zh: '筛选中', en: 'Screening' },
    statusInterview: { zh: '面试中', en: 'Interview' },
    statusOffer: { zh: 'Offer', en: 'Offer' },
    statusRejected: { zh: '未通过', en: 'Rejected' },
    statusWithdrawn: { zh: '已放弃', en: 'Withdrawn' },
    archived: { zh: '已归档', en: 'Archived' },
    unbindVersion: { zh: '未绑定版本', en: 'Unlinked version' },
    pendingArrange: { zh: '待安排', en: 'To schedule' },
    pendingConfirm: { zh: '待确认', en: 'TBD' },
    websiteApply: { zh: '官网投递', en: 'Direct apply' },
    edit: { zh: '编辑', en: 'Edit' },
    archive: { zh: '归档', en: 'Archive' },
    unarchive: { zh: '取消归档', en: 'Unarchive' },
    detailApplied: { zh: '投递', en: 'Applied' },
    detailNext: { zh: '下一步', en: 'Next action' },
    detailConditions: { zh: '条件', en: 'Conditions' },
    detailVersion: { zh: '版本', en: 'Version' },
    contactPrefix: { zh: '联系', en: 'Contact' },
    jdPrefix: { zh: 'JD', en: 'JD' },
    feedbackPrefix: { zh: '面试反馈', en: 'Interview feedback' },
    deleteConfirmPrefix: { zh: '确认删除「', en: 'Delete "' },
    deleteConfirmSuffix: { zh: '」？', en: '"?' },
    deleteConfirmDefault: { zh: '确认删除这条投递记录？', en: 'Delete this application record?' },
    emptyTitle: { zh: '暂无投递记录', en: 'No applications yet' },
    emptyDescription: {
      zh: '添加公司与岗位后，可以在这里追踪阶段、下一步动作和归档状态。',
      en: 'Add a company and role to track stages, next actions, and archive status.',
    },
    clearAll: { zh: '清空投递记录', en: 'Clear all records' },
    clearAllConfirm: { zh: '确认清空全部投递记录？此操作无法撤销。', en: 'Clear all application records? This cannot be undone.' },
    importFailed: { zh: '导入失败，请确认文件是投递追踪导出的 JSON。', en: 'Import failed. Make sure the JSON is exported from this tracker.' },
    importEmpty: { zh: '未识别到有效投递记录。', en: 'No valid application records found.' },
    // 表单字段
    fieldCompany: { zh: '公司', en: 'Company' },
    fieldRole: { zh: '岗位', en: 'Role' },
    fieldLocation: { zh: '城市', en: 'City' },
    fieldChannel: { zh: '渠道', en: 'Channel' },
    fieldAppliedAt: { zh: '投递日期', en: 'Applied date' },
    fieldNextActionAt: { zh: '下一步', en: 'Next action' },
    fieldPriority: { zh: '优先级', en: 'Priority' },
    fieldContact: { zh: '联系人', en: 'Contact' },
    fieldCompensation: { zh: '薪资范围', en: 'Compensation' },
    fieldResumeVersion: { zh: '简历版本', en: 'Resume version' },
    fieldJobDescription: { zh: 'JD / 岗位关键词', en: 'JD / keywords' },
    fieldInterviewFeedback: { zh: '面试反馈', en: 'Interview feedback' },
    fieldNotes: { zh: '备注', en: 'Notes' },
    priorityHigh: { zh: '重点', en: 'High' },
    priorityMedium: { zh: '普通', en: 'Medium' },
    priorityLow: { zh: '观察', en: 'Low' },
    placeholderCompany: { zh: '例如：棱镜科技', en: 'e.g. Prism Tech' },
    placeholderRole: { zh: '例如：AI 产品负责人', en: 'e.g. AI Product Lead' },
    placeholderLocation: { zh: '上海 / 远程', en: 'Shanghai / Remote' },
    placeholderChannel: { zh: '官网 / Boss / 内推', en: 'Site / Boss / Referral' },
    placeholderContact: { zh: 'HR / 猎头 / 内推人', en: 'HR / Recruiter / Referrer' },
    placeholderCompensation: { zh: '例如：60-80k / 面议', en: 'e.g. 60-80k / Negotiable' },
    placeholderJD: {
      zh: '粘贴岗位描述、关键词、业务要求，便于回看版本命中情况。',
      en: 'Paste the JD, keywords, and business context for later version tracking.',
    },
    placeholderFeedback: {
      zh: '记录面试官追问、反馈、薄弱点和下一版简历需要强化的证据。',
      en: 'Capture interviewer follow-ups, feedback, weak spots, and evidence to strengthen the next version.',
    },
    placeholderNotes: {
      zh: '记录 JD 关键词、面试安排、跟进动作。',
      en: 'JD keywords, interview schedule, follow-up actions.',
    },
    saveApplication: { zh: '保存投递', en: 'Save application' },
    editApplication: { zh: '编辑投递', en: 'Edit application' },
    saveEdit: { zh: '保存修改', en: 'Save changes' },
    cancel: { zh: '取消', en: 'Cancel' },
  },

  // ============================================================
  // PDF 导入
  // ============================================================
  importer: {
    title: { zh: '导入 PDF 简历', en: 'Import PDF Resume' },
    description: {
      zh: '不导入也可使用内置 resume.ts 预览和导出 PDF；导入仅覆盖当前页面显示。',
      en: 'The built-in resume.ts is enough for preview and export. Importing only affects this session.',
    },
    statusHint: {
      zh: '可选上传 PDF，通过 AI 提取结构化简历并替换当前会话内容。',
      en: 'Optional. Upload a PDF and let AI extract a structured resume to replace this session.',
    },
    extracting: { zh: '正在准备 PDF 文件与本地文本预览', en: 'Preparing PDF and local text preview' },
    parsing: { zh: '正在调用 AI 提取结构化简历', en: 'AI is extracting the resume' },
    ready: { zh: '提取完成，请确认后应用到当前页面', en: 'Extraction complete. Review and apply to the current page.' },
    error: { zh: '导入失败', en: 'Import failed' },
    openaiResponsesHint: {
      zh: '原生 Responses API，可直接发送 PDF 文件。',
      en: 'Native Responses API, can send PDF directly.',
    },
    anthropicHint: {
      zh: '适合 Claude-format / Anthropic 兼容网关，依赖本地提取文本。',
      en: 'Claude-format / Anthropic compatible gateway, depends on local text extraction.',
    },
    openaiCompatibleHint: { zh: '', en: '' },
    importConfig: { zh: 'AI 导入配置', en: 'AI import config' },
    keySavedInSession: { zh: 'API Key 仅保存在当前浏览器会话中。', en: 'API Key is saved in the current browser session only.' },
    choosePdf: { zh: '选择 PDF', en: 'Choose PDF' },
    processing: { zh: '处理中...', en: 'Processing...' },
    clearResult: { zh: '清空结果', en: 'Clear result' },
    applyToCurrent: { zh: '应用到当前页面', en: 'Apply to current page' },
    generatedSessionDraft: { zh: '已生成会话简历草稿', en: 'Session resume draft generated' },
    basicInfo: { zh: '基本信息', en: 'Basic info' },
    fieldName: { zh: '姓名', en: 'Name' },
    fieldTitle: { zh: '职位标题', en: 'Title' },
    fieldSummary: { zh: '摘要', en: 'Summary' },
    notRecognized: { zh: '未识别', en: 'Not recognized' },
    summaryPreview: { zh: '解析结果概览', en: 'Parse summary' },
    summaryExperience: { zh: '工作经历', en: 'Experience' },
    summaryProjects: { zh: '项目经历', en: 'Projects' },
    summarySkills: { zh: '技能分组', en: 'Skill groups' },
    summaryEducation: { zh: '教育经历', en: 'Education' },
    summaryCertificates: { zh: '证书荣誉', en: 'Certificates' },
    summaryContacts: { zh: '联系方式', en: 'Contact links' },
    usedLocalPreview: {
      zh: '已附带本地文本预览作为辅助上下文。',
      en: 'A local text preview was also provided as context.',
    },
    noLocalPreview: {
      zh: '本次未生成本地文本预览，结果完全来自 AI 对 PDF 的理解。',
      en: 'No local text preview was generated. The result comes entirely from AI PDF understanding.',
    },
    manualConfirmTitle: { zh: '需要人工确认', en: 'Manual review required' },
    rawTextTitle: { zh: '本地文本预览', en: 'Local text preview' },
    importDetail: {
      zh: '支持最大 10MB 的 PDF，并尽量保留原文语言。导入结果只影响当前会话，不会修改仓库里的 resume.ts。',
      en: 'PDFs up to 10MB. Source language is preserved. The import affects only this session; src/data/resume.ts is unchanged.',
    },
  },

  // ============================================================
  // PDF 预览
  // ============================================================
  pdfPreview: {
    download: { zh: '下载 PDF', en: 'Download PDF' },
    openInNewTab: { zh: '新标签打开', en: 'Open in new tab' },
    notSupportedTitle: { zh: '当前浏览器不支持内嵌 PDF 预览。', en: 'Your browser does not support embedded PDF preview.' },
    notSupportedDetail: {
      zh: '可以通过新标签页直接打开 PDF，或下载到本地查看。',
      en: 'Open the PDF in a new tab, or download it to view locally.',
    },
    downloadOrOpen: { zh: '下载或打开 PDF', en: 'Download or open PDF' },
  },

  // ============================================================
  // Toast
  // ============================================================
  toast: {
    pdfGenerateError: { zh: '生成 PDF 失败', en: 'Failed to generate PDF' },
    pdfExportError: { zh: '导出 PDF 失败', en: 'Failed to export PDF' },
  },

  // ============================================================
  // API Key 警告
  // ============================================================
  apiKeyWarning: {
    description: {
      zh: 'API Key 仅保存在当前浏览器的 sessionStorage（关闭浏览器会清空）。数据经过简单混淆，但未加密，请勿在公共电脑使用。',
      en: 'The API Key is stored only in this browser sessionStorage (cleared when the browser closes). Data is lightly obfuscated, not encrypted. Do not use on shared computers.',
    },
    clearKey: { zh: '清除 Key', en: 'Clear key' },
  },

  // ============================================================
  // 项目经历弹窗
  // ============================================================
  projectModal: {
    title: { zh: '项目经历', en: 'Project Experience' },
    description: {
      zh: '展示该工作经历关联的项目内容，可在编辑模式下直接润色项目经历。',
      en: 'Show projects linked to this experience. Polish them directly in edit mode.',
    },
    noProjects: { zh: '当前工作经历没有匹配到可展示的项目经历。', en: 'No projects linked to this experience.' },
  },

  // ============================================================
  // 通用操作
  // ============================================================
  common: {
    cancel: { zh: '取消', en: 'Cancel' },
    close: { zh: '关闭', en: 'Close' },
    confirm: { zh: '确认', en: 'Confirm' },
    save: { zh: '保存', en: 'Save' },
    refresh: { zh: '刷新', en: 'Refresh' },
    optional: { zh: '可选', en: 'Optional' },
  },

  // ============================================================
  // 翻译提示（首次切换到 EN 时）
  // ============================================================
  translation: {
    translatingTitle: { zh: '正在翻译简历', en: 'Translating resume' },
    translatingDescription: {
      zh: '首次切换到英文，AI 正在批量翻译简历内容。',
      en: 'First switch to English. AI is translating the resume in batch.',
    },
    translationFailed: { zh: '翻译失败', en: 'Translation failed' },
    translationFailedDetail: {
      zh: '请检查 API Key 或稍后重试。',
      en: 'Check your API Key or try again later.',
    },
    retryTranslation: { zh: '重试翻译', en: 'Retry translation' },
  },
} as const;

type DeepKeys<T, P extends string = ''> = T extends LocaleString
  ? P
  : {
      [K in keyof T]: DeepKeys<T[K], P extends '' ? `${string & K}` : `${P}.${string & K}`>;
    }[keyof T];

export type UIDictKey = DeepKeys<typeof uiDict>;

export function translate(key: UIDictKey, lang: Language): string {
  const parts = key.split('.');
  let cursor: unknown = uiDict;
  for (const part of parts) {
    if (cursor && typeof cursor === 'object' && part in cursor) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  if (cursor && typeof cursor === 'object' && 'zh' in cursor) {
    const entry = cursor as Record<string, string>;
    if (lang in entry && entry[lang]) return entry[lang];
    if (entry.en) return entry.en;
    return entry.zh;
  }
  return key;
}
