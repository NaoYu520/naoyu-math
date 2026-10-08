/* 批改引擎回归测试：node tools/test-grade.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { console, Date };
sandbox.window = sandbox;
const ctx = vm.createContext(sandbox);
function load(f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }

load('js/grade.js');
load('js/data/catalog.js');
/* 自动发现全部年级数据文件（g1.js, g1b.js, g1c.js, ...） */
fs.readdirSync(path.join(ROOT, 'js/data'))
  .filter(f => /^g[1-6][a-z]*\.js$/.test(f))
  .sort()
  .forEach(f => load('js/data/' + f));

const G = sandbox.NNGrade;
const D = sandbox.NN_DATA;
let fail = 0, pass = 0;

function t(desc, got, want) {
  const ok = got === want;
  if (ok) pass++; else { fail++; console.log('  ✗ ' + desc + '　得到 ' + got + '，期望 ' + want); }
}
function chk(desc, q, input, want) {
  const r = G.check(q, input);
  t(desc + '（输入"' + input + '"）', r.ok, want);
}

console.log('--- 中文数字 / 单位 / 分数 兼容性 ---');
chk('阿拉伯数字', { type: 'fill', answer: '12' }, '12', true);
chk('中文数字', { type: 'fill', answer: '12' }, '十二', true);
chk('中文数字+单位', { type: 'fill', answer: '12' }, '十二个', true);
chk('带单位', { type: 'fill', answer: '3' }, '3个', true);
chk('答案带单位、学生不写', { type: 'fill', answer: '26' }, '26厘米', true);
chk('多余空格', { type: 'fill', answer: '6' }, ' 6 ', true);
chk('全角数字', { type: 'fill', answer: '74' }, '７４', true);
chk('三数中文', { type: 'fill', answer: '306' }, '三百零六', true);
chk('千位中文', { type: 'fill', answer: '1020' }, '一千零二十', true);
chk('万位中文', { type: 'fill', answer: '10005' }, '一万零五', true);
chk('百分数写法', { type: 'fill', answer: '25%' }, '百分之二十五', true);
chk('百分数转小数', { type: 'fill', answer: '0.25' }, '25%', true);
chk('分数等价小数', { type: 'fill', answer: '1/2' }, '0.5', true);
chk('分数中文读法', { type: 'fill', answer: '1/2' }, '二分之一', true);
chk('分数五分之三', { type: 'fill', answer: '3/5' }, '五分之三', true);
chk('多答案备选', { type: 'fill', answer: '5/2|2.5' }, '2.5', true);
chk('多答案备选2', { type: 'fill', answer: '5/2|2.5' }, '2分之5', true);
chk('比值冒号', { type: 'fill', answer: '2:3' }, '2:3', true);
chk('比值全角冒号', { type: 'fill', answer: '2:3' }, '2：3', true);
chk('答句前缀', { type: 'fill', answer: '8' }, '答：8', true);
chk('约数容差', { type: 'fill', answer: '400', tol: 1 }, '399', true);
chk('多空（逗号）', { type: 'fill', answer: ['12', '8'] }, '12,8', true);
chk('多空（空格）', { type: 'fill', answer: ['12', '8'] }, '12 8', true);
chk('多空（顿号）', { type: 'fill', answer: ['9', '11'] }, '9、11', true);
chk('多空中文', { type: 'fill', answer: ['9', '11'] }, '九和十一', false);
chk('判断题对', { type: 'judge', answer: '对' }, '对', true);
chk('判断题正确', { type: 'judge', answer: '对' }, '正确', true);
chk('判断题错', { type: 'judge', answer: '对' }, '错', false);
chk('选择题', { type: 'choice', options: ['甲', '乙'], answer: 'B' }, 'B', true);
chk('选择题小写', { type: 'choice', options: ['甲', '乙'], answer: 'B' }, 'b', true);
chk('选择题选错', { type: 'choice', options: ['甲', '乙'], answer: 'B' }, 'A', false);

console.log('--- 易错判：不该判对的要判错 ---');
chk('数字少了', { type: 'fill', answer: '174' }, '175', false);
chk('分数大小不同', { type: 'fill', answer: '3/5' }, '5/3', false);
chk('多空漏填', { type: 'fill', answer: ['12', '8'] }, '12', false);
chk('空答案', { type: 'fill', answer: '5' }, '', false);
chk('文字答案不同', { type: 'fill', answer: '星期三' }, '星期四', false);
chk('颜色答案不同', { type: 'fill', answer: '红' }, '蓝', false);
chk('字母答案', { type: 'fill', answer: 'B' }, 'C', false);

console.log('--- 全量自洽：每道题用自己的标准答案喂进去必须判对 ---');
let selfFail = 0;
D.allQuestions().forEach(q => {
  ['answer'].forEach(() => {
    let input;
    if (q.type === 'choice' || q.type === 'multi') input = String(q.answer).split('|')[0];
    else input = (Array.isArray(q.answer) ? q.answer.join(',') : String(q.answer)).split('|')[0];
    const r = G.check(q, input);
    if (!r.ok) { selfFail++; fail++; console.log('  ✗ ' + q.id + ' 答案 "' + input + '" 无法通过自检'); }
    else pass++;
  });
});
console.log('--------------------------------');
console.log('自洽检查：' + D.allQuestions().length + ' 题，失败 ' + selfFail + ' 题');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
