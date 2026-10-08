/* 界面增强回归测试：字号档位 / 课程列表容器 / 答对鼓励动效 / 平板布局规则 */
const path = require('path');
const fs = require('fs');
let jsdomLib;
try { jsdomLib = require('jsdom'); }
catch (e) { jsdomLib = require('C:/Users/HC04/.workbuddy/binaries/node/workspace/node_modules/jsdom'); }
const { JSDOM, VirtualConsole } = jsdomLib;

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

(async function () {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { fail++; console.log('  ✗ 运行期错误: ' + e.message); });

  /* 必须用 http 源加载：file:// 下 jsdom 没有 localStorage，设置无法持久化 */
  const BASE = process.env.NN_BASE || 'http://127.0.0.1:8899/index.html';
  const dom = await JSDOM.fromURL(BASE, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) { win.scrollTo = function () {}; win.speechSynthesis = undefined; }
  });
  const w = dom.window, doc = w.document;
  w.speechSynthesis = undefined;
  await new Promise(r => setTimeout(r, 800));
  doc.getElementById('modalRoot').hidden = true;

  /* ---------- 字号档位 ---------- */
  console.log('--- 阅读字号 ---');
  w.location.hash = '#/settings';
  await new Promise(r => setTimeout(r, 200));
  const chips = doc.querySelectorAll('#fsChips .chip');
  ok('设置页出现 4 个字号档位', chips.length === 4, String(chips.length));
  ok('默认是"标准"档', chips[1] && chips[1].className.includes('active'));

  chips[2].click();                       // 点"大"
  await new Promise(r => setTimeout(r, 150));
  ok('切换后 <html data-fs="l">', doc.documentElement.getAttribute('data-fs') === 'l',
    doc.documentElement.getAttribute('data-fs'));
  ok('字号设置已持久化', (w.NNStore.settings().fs || '') === 'l', String(w.NNStore.settings().fs));
  ok('切换后"大"档高亮', doc.querySelectorAll('#fsChips .chip')[2].className.includes('active'));

  chips[3].click();                       // 特大
  await new Promise(r => setTimeout(r, 120));
  ok('可切换到"特大"档', doc.documentElement.getAttribute('data-fs') === 'xl');
  chips[1].click();                       // 切回标准
  await new Promise(r => setTimeout(r, 120));
  ok('可切回"标准"档', doc.documentElement.getAttribute('data-fs') === 'm');

  /* ---------- 课程列表容器（平板双列用） ---------- */
  console.log('--- 课程列表 ---');
  w.location.hash = '#/courses';
  await new Promise(r => setTimeout(r, 250));
  const lists = doc.querySelectorAll('#view .lesson-list');
  ok('课程卡片包在 .lesson-list 容器里', lists.length >= 1, String(lists.length));
  ok('容器内确有课程卡片', lists.length > 0 && lists[0].querySelectorAll('.lesson-card').length >= 1);

  /* ---------- 答对鼓励动效 ---------- */
  console.log('--- 答对鼓励动效 ---');
  w.location.hash = '#/lesson/g3-04';
  await new Promise(r => setTimeout(r, 350));
  const cards = doc.querySelectorAll('#view .q-card');
  ok('课程页渲染出题目', cards.length > 0, String(cards.length));

  let cheered = false, target = null;
  for (const c of cards) {
    const inp = c.querySelector('.answer-input input');
    if (!inp) continue;
    const qid = c.getAttribute('data-qid') || '';
    /* 用标准答案回填，确保判对 */
    const ans = (w.NN_DATA.allQuestions().find(q => q.id === qid) || {}).answer;
    if (ans === undefined) continue;
    inp.value = String(ans);
    c.querySelectorAll('.toolbar .btn').forEach(b => { if (b.textContent.indexOf('提交') >= 0 || b.textContent.indexOf('检查') >= 0) b.click(); });
    await new Promise(r => setTimeout(r, 80));
    if (c.querySelector('.cheer')) { cheered = true; target = c; break; }
  }
  ok('答对后出现鼓励动效层', cheered);
  if (target) {
    ok('动效层内有多个飘落元素', target.querySelectorAll('.cheer i').length >= 8,
      String(target.querySelectorAll('.cheer i').length));
    ok('卡片同时有 pop 微动效', target.className.includes('pop'));
    await new Promise(r => setTimeout(r, 1700));
    ok('动效结束后自动移除，不留残留节点', !target.querySelector('.cheer'));
  }

  /* ---------- 平板布局 CSS 规则 ---------- */
  console.log('--- 平板适配规则 ---');
  const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
  ok('存在 min-width:760px 平板断点', /@media\(min-width:760px\)/.test(css));
  ok('平板断点内课程列表改为多列', /@media\(min-width:760px\)\{[\s\S]*?\.lesson-list\{[^}]*grid-template-columns/.test(css));
  ok('1100px 以上课程列表三列', /@media\(min-width:1100px\)\{[\s\S]*?\.lesson-list\{[^}]*1fr 1fr 1fr/.test(css));
  ok('存在横屏矮屏适配', /orientation:landscape/.test(css));
  ok('存在答对飘落动画关键帧', /@keyframes cheerFall/.test(css));

  console.log('--------------------------------');
  console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
  process.exit(fail ? 1 : 0);
})();
