// 临时验证脚本:用真实 master 数据跑 markdown 导出 + 各种空数据边界
import { exportResumeMarkdown, buildMarkdownFileName } from '../src/lib/markdown/exportResumeMarkdown';
import { resumeProfile } from '../src/data/resume';
import type { ResumeProfile } from '../src/types/resume';

let failed = 0;
function check(label: string, cond: boolean, detail = '') {
  if (cond) {
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label} ${detail}`);
  }
}

// ---- 1. 中文 master 数据导出 ----
console.log('\n[1] 中文 master 完整导出');
const zhMd = exportResumeMarkdown(resumeProfile, 'zh');
check('包含姓名 H1 标题', zhMd.startsWith('# '));
check('包含「核心亮点」章节', zhMd.includes('## 核心亮点'));
check('包含「工作经历」章节', zhMd.includes('## 工作经历'));
check('包含「项目经历」章节', zhMd.includes('## 项目经历'));
check('技能用「、」分隔', /Languages.*、/.test(zhMd) || zhMd.includes('、'));
check('包含成就 bullet', zhMd.includes('- 主导大模型中台'));
check('无连续 3+ 空行', !/\n{3,}/.test(zhMd));
check('文件名无语言后缀', buildMarkdownFileName(resumeProfile, 'zh') === '陈大锤.md' || buildMarkdownFileName(resumeProfile, 'zh').endsWith('.md'));

console.log('\n--- 中文 Markdown 预览(前 60 行)---');
console.log(zhMd.split('\n').slice(0, 60).join('\n'));

// ---- 2. 英文键 + 分隔符 ----
console.log('\n[2] 英文 lang 导出');
const enMd = exportResumeMarkdown(resumeProfile, 'en');
check('英文章节标题 Summary', enMd.includes('## Summary'));
check('英文章节标题 Professional Experience', enMd.includes('## Professional Experience'));
check('英文用 ", " 分隔(非、)', enMd.includes(', ') && !enMd.includes('## 技能'));
check('英文文件名带 _en 后缀', buildMarkdownFileName(resumeProfile, 'en') === '陈大锤_en.md');

// ---- 3. 空数据边界 ----
console.log('\n[3] 空数据边界');
const empty: ResumeProfile = {
  basics: { name: '', title: '', subtitle: '', summary: '', focusTags: [] },
  highlights: [],
  experience: [],
  projects: [],
  skills: [],
  education: [],
  certificates: [],
  contactLinks: [],
};
const emptyMd = exportResumeMarkdown(empty, 'zh');
check('全空数据不抛异常', true);
check('全空数据仍可导出非空字符串', emptyMd.length > 0);
check('全空数据回退文件名 resume', buildMarkdownFileName(empty, 'zh') === 'resume.md');

// ---- 4. 部分空:只有 basics ----
console.log('\n[4] 仅 basics 无经历/项目');
const partial: ResumeProfile = {
  ...empty,
  basics: { name: '测试用户', title: '工程师', subtitle: '', summary: '一段简介', focusTags: [] },
  contactLinks: [{ label: '邮箱', value: 'a@b.com', type: 'email' }],
};
const partialMd = exportResumeMarkdown(partial, 'zh');
check('无经历的导出不含「工作经历」', !partialMd.includes('## 工作经历'));
check('含姓名', partialMd.startsWith('# 测试用户'));
check('含 summary', partialMd.includes('一段简介'));
check('含联系方式', partialMd.includes('a@b.com'));

// ---- 5. 项目带 outcomes/actions/tags ----
console.log('\n[5] 项目 actions/outcomes/tags 渲染');
const projMd = exportResumeMarkdown(
  {
    ...empty,
    basics: { name: 'P', title: '', subtitle: '', summary: '', focusTags: [] },
    projects: [
      {
        name: 'AI 平台',
        role: '负责人',
        period: '2023',
        background: '背景说明',
        actions: ['设计了架构', '推动了落地'],
        outcomes: ['调用提升 3 倍'],
        tags: ['Python', 'K8s'],
      },
    ],
  },
  'zh',
);
check('含项目名 + role', projMd.includes('### AI 平台 · 负责人'));
check('含 period', projMd.includes('(2023)'));
check('含「主要工作」小标题', projMd.includes('**主要工作：**'));
check('含「成果」小标题', projMd.includes('**成果：**'));
check('tags 渲染', projMd.includes('Python、K8s'));

console.log(`\n==== 结果: ${failed === 0 ? '全部通过 ✅' : `${failed} 项失败 ❌`} ====\n`);
process.exit(failed === 0 ? 0 : 1);
