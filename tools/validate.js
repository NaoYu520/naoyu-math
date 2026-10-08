/* 数据自检脚本：node tools/validate.js
   检查课程数据的完整性（id 唯一、答案齐全、选择题选项与答案匹配、动画是否存在等） */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { console, window: {}, Date };
sandbox.window.NN_DATA = null;
const ctx = vm.createContext(sandbox);

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  vm.runInContext(code, ctx, { filename: file });
}

// 先建立 window 与 document 的最小替身（数据文件只用到 window.NN_DATA）
vm.runInContext('var window = globalThis.window; window.NN_DATA = undefined;', ctx);
load('js/data/catalog.js');
/* 自动发现全部年级数据文件（g1.js, g1b.js, g1c.js, ...） */
fs.readdirSync(path.join(ROOT, 'js/data'))
  .filter(f => /^g[1-6][a-z]*\.js$/.test(f))
  .sort()
  .forEach(f => load('js/data/' + f));

const D = sandbox.window.NN_DATA;
const errs = [];
const warns = [];

const ids = new Set();
const qids = new Set();
let totalQ = 0;
const perGrade = {};
const perSection = { examples: 0, variants: 0, practice: 0 };

const TYPES = ['fill', 'choice', 'multi', 'judge'];
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

function checkQ(q, lid, sec) {
  totalQ++;
  perSection[sec]++;
  if (!q.id) errs.push(`${lid}/${sec}: 缺 id`);
  else if (qids.has(q.id)) errs.push(`${lid}/${sec}: 题目 id 重复 ${q.id}`);
  else qids.add(q.id);

  if (!q.q) errs.push(`${q.id}: 缺题干`);
  if (q.answer === undefined || q.answer === null || q.answer === '') errs.push(`${q.id}: 缺答案`);
  const type = q.type || 'fill';
  if (!TYPES.includes(type)) errs.push(`${q.id}: 未知题型 ${type}`);
  if (type === 'choice' || type === 'multi') {
    if (!q.options || q.options.length < 2) errs.push(`${q.id}: 选择题选项不足`);
    const ans = Array.isArray(q.answer) ? q.answer.join('') : String(q.answer);
    for (const ch of ans) {
      if (!LETTERS.slice(0, (q.options || []).length).includes(ch)) errs.push(`${q.id}: 答案 ${ch} 超出选项范围`);
    }
  }
  if (type === 'judge') {
    const a = String(q.answer);
    if (!['对', '错', '正确', '错误'].includes(a)) errs.push(`${q.id}: 判断题答案应为 对/错，当前为 ${a}`);
  }
  if (type === 'fill' && Array.isArray(q.options)) warns.push(`${q.id}: 填空题不应有 options`);
  if (Array.isArray(q.answer) && q.answer.length > 1 && type !== 'fill') errs.push(`${q.id}: 非填空题不建议多答案数组`);
  if (!q.steps && !q.solution) warns.push(`${q.id}: 既无分步解析也无解析`);
  if (q.animKey && !D.anims[q.animKey]) errs.push(`${q.id}: 动画 ${q.animKey} 不存在`);
  if (q.fig && (!q.fig.items || !q.fig.items.length)) warns.push(`${q.id}: fig 为空`);
}

D.lessons.forEach(l => {
  perGrade[l.grade] = (perGrade[l.grade] || 0) + 1;
  if (ids.has(l.id)) errs.push(`讲 id 重复：${l.id}`);
  ids.add(l.id);
  ['title', 'subtitle', 'story', 'keyPoints'].forEach(k => { if (!l[k]) errs.push(`${l.id}: 缺 ${k}`); });
  if (!D.topicById(l.topic)) errs.push(`${l.id}: 未知专题 ${l.topic}`);
  if (!l.keyPoints || l.keyPoints.length < 3) warns.push(`${l.id}: 知识要点少于 3 条`);
  if (!l.examples || l.examples.length < 2) errs.push(`${l.id}: 例题不足`);
  if (!l.variants || l.variants.length < 2) warns.push(`${l.id}: 举一反三不足 2 题`);
  if (!l.practice || l.practice.length < 4) warns.push(`${l.id}: 练习不足 4 题`);
  ['examples', 'variants', 'practice'].forEach(sec => (l[sec] || []).forEach(q => checkQ(q, l.id, sec)));
});

// 校验动画脚本结构
Object.keys(D.anims).forEach(k => {
  const a = D.anims[k];
  if (!a.steps || !a.steps.length) errs.push(`动画 ${k}: 没有 steps`);
  a.steps.forEach((s, i) => {
    if (!s.say) warns.push(`动画 ${k} 第 ${i + 1} 步缺解说文本`);
    if (!s.items || !s.items.length) errs.push(`动画 ${k} 第 ${i + 1} 步没有 items`);
  });
});

// 关联检查：动画有没有被引用
const usedAnims = new Set();
D.allQuestions().forEach(q => { if (q.animKey) usedAnims.add(q.animKey); });
Object.keys(D.anims).forEach(k => { if (!usedAnims.has(k)) warns.push(`动画 ${k} 没有被任何题目引用`); });

console.log('========== 数据自检报告 ==========');
console.log('讲数：' + D.lessons.length + '　题目总数：' + totalQ + '　动画：' + Object.keys(D.anims).length);
console.log('每年级讲数：' + JSON.stringify(perGrade));
console.log('分节题量：例题 ' + perSection.examples + ' / 举一反三 ' + perSection.variants + ' / 练习 ' + perSection.practice);
console.log('每日一练可抽题（练习）：' + D.allQuestions().filter(q => q._sec === 'practice').length);
const daily = D.dailySet('2026-10-08', []);
console.log('每日一练抽样 ' + daily.length + ' 题，覆盖年级：' + Array.from(new Set(daily.map(q => q._grade))).sort().join(','));
console.log('--------------------------------');
if (warns.length) { console.log('提示（' + warns.length + ' 条）：'); warns.slice(0, 40).forEach(w => console.log('  · ' + w)); }
if (errs.length) {
  console.log('错误（' + errs.length + ' 条）：');
  errs.forEach(e => console.log('  ✗ ' + e));
  process.exit(1);
} else {
  console.log('✅ 全部检查通过，没有发现结构性错误。');
}
