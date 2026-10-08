/* 页面冒烟测试：node tools/smoke.js
   用 jsdom 真实加载 index.html，模拟"打开页面 → 学一讲 → 做题 → 看每日一练/错题本/统计/搜索"，
   捕获任何运行时错误。 */
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(process.env.NS || 'C:/Users/HC04/.workbuddy/binaries/node/workspace/node_modules', 'jsdom'));

const ROOT = path.resolve(__dirname, '..');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

let pass = 0, fail = 0;
function ok(desc, cond, extra) {
  if (cond) { pass++; }
  else { fail++; console.log('  ✗ ' + desc + (extra ? '　→ ' + extra : '')); }
}

(async () => {
  const dom = await JSDOM.fromFile(path.join(ROOT, 'index.html'), {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    url: 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html',
    virtualConsole: vc,
    beforeParse(window) {
      /* file:// 在 jsdom 里是不透明源，localStorage 不可用；这里注入内存版以完整测试持久化逻辑 */
      const mem = new Map();
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem: k => (mem.has(String(k)) ? mem.get(String(k)) : null),
          setItem: (k, v) => { mem.set(String(k), String(v)); },
          removeItem: k => { mem.delete(String(k)); },
          clear: () => mem.clear(),
          key: i => Array.from(mem.keys())[i] || null,
          get length() { return mem.size; }
        }
      });
      window.scrollTo = () => {};
    }
  });
  const w = dom.window, doc = w.document;
  w.confirm = () => true;
  w.speechSynthesis = undefined;

  await new Promise(r => setTimeout(r, 1500));

  console.log('--- 启动与首页 ---');
  ok('脚本全部加载（96 讲）', w.NN_DATA && w.NN_DATA.lessons.length === 96, w.NN_DATA ? w.NN_DATA.lessons.length : 'NN_DATA 缺失');
  ok('题库生成正常', w.NN_DATA.allQuestions().length === 96 * 11, String(w.NN_DATA.allQuestions().length));
  ok('首页渲染出内容', doc.querySelector('#view').children.length > 3);
  ok('首页有品牌标题', doc.body.textContent.includes('闹闹鱼'));

  console.log('--- 课程列表与筛选 ---');
  w.location.hash = '#/courses';
  await new Promise(r => setTimeout(r, 120));
  ok('课程列表渲染 96 张卡片', doc.querySelectorAll('.lesson-card').length === 96, String(doc.querySelectorAll('.lesson-card').length));
  const chips = doc.querySelectorAll('.chips .chip');
  ok('年级+专题筛选按钮存在', chips.length >= 14, String(chips.length));

  console.log('--- 课程详情页 ---');
  w.location.hash = '#/lesson/g3-04';
  await new Promise(r => setTimeout(r, 200));
  const cards = doc.querySelectorAll('#view .q-card');
  ok('g3-04 渲染题目卡片 11 张（3例+3变+5练）', cards.length === 11, String(cards.length));
  ok('有动画讲解容器', doc.querySelectorAll('#view .anim-wrap').length >= 1, String(doc.querySelectorAll('#view .anim-wrap').length));
  ok('有动画舞台 SVG', doc.querySelectorAll('#view .anim-stage').length >= 1);

  console.log('--- 动画播放器交互 ---');
  const animBtns = doc.querySelectorAll('#view .anim-ctrl button');
  ok('动画控制按钮存在（上一步/播放/下一步/重播）', animBtns.length >= 4, String(animBtns.length));
  const sayBefore = doc.querySelector('#view .anim-say .say-text').textContent;
  animBtns[2].click();                     // 下一步
  await new Promise(r => setTimeout(r, 60));
  const sayAfter = doc.querySelector('#view .anim-say .say-text').textContent;
  ok('单步切换后解说文字发生变化', sayBefore !== sayAfter, sayBefore + ' → ' + sayAfter);
  animBtns[3].click();                     // 重播
  await new Promise(r => setTimeout(r, 400));
  const sayReplay = doc.querySelector('#view .anim-say .say-text').textContent;
  ok('重播回到第一步解说', sayReplay === sayBefore, sayReplay);

  console.log('--- 在线作答与自动批改（含中文数字）---');
  const firstFill = doc.querySelector('#view .q-card .answer-input input');
  ok('填空题有输入框', !!firstFill);
  if (firstFill) {
    firstFill.value = '五';                 // 第1题答案 5，用中文数字
    const subBtn = doc.querySelector('#view .q-card .toolbar .btn-primary');
    subBtn.click();
    await new Promise(r => setTimeout(r, 60));
    const fb = doc.querySelector('#view .q-card .feedback');
    ok('中文数字"五"被判为正确', fb && fb.className.includes('ok') && fb.textContent.includes('完全正确'), fb ? fb.textContent.slice(0, 30) : '无反馈');
  }

  console.log('--- 答错进入错题本 ---');
  const cards2 = doc.querySelectorAll('#view .q-card');
  const card5 = cards2[6];                  // 练习第 1 题
  const inp5 = card5.querySelector('.answer-input input');
  ok('练习卡片可作答', !!inp5);
  if (inp5) {
    inp5.value = '999';
    card5.querySelector('.toolbar .btn-primary').click();
    await new Promise(r => setTimeout(r, 60));
    ok('错误答案给出红框反馈', card5.querySelector('.feedback').className.includes('bad'));
    ok('错误答案写入错题本', w.NNStore.wrongCount() >= 1, String(w.NNStore.wrongCount()));

    console.log('--- 逐步展开解析（例1 有 4 步）---');
    const exCard = cards2[0];
    const stepBtns = exCard.querySelectorAll('.step-ctrl button');
    ok('分步解析按钮存在（下一步/全部展开/收起）', stepBtns.length === 3, String(stepBtns.length));
    stepBtns[0].click(); await new Promise(r => setTimeout(r, 30));
    const n1 = exCard.querySelectorAll('.steps .step').length;
    ok('点"下一步解析"每次多展开 1 步', n1 >= 2, String(n1));
    stepBtns[1].click(); await new Promise(r => setTimeout(r, 30));
    ok('"全部展开"后解析 4 步', exCard.querySelectorAll('.steps .step').length === 4, String(exCard.querySelectorAll('.steps .step').length));
    stepBtns[2].click(); await new Promise(r => setTimeout(r, 30));
    ok('"收起"后解析隐藏', exCard.querySelector('.steps').hidden);
  }

  console.log('--- 收藏 / 已掌握 ---');
  const miniBtns = cards2[0].querySelectorAll('.q-head .mini-btn');
  ok('题目卡片有收藏/已掌握按钮', miniBtns.length === 2, String(miniBtns.length));
  miniBtns[0].click(); miniBtns[1].click();
  await new Promise(r => setTimeout(r, 40));
  ok('收藏记录写入', Object.keys(w.NNStore.favs()).length >= 1, String(Object.keys(w.NNStore.favs()).length));
  ok('已掌握记录写入', Object.keys(w.NNStore.master()).length >= 1, String(Object.keys(w.NNStore.master()).length));

  console.log('--- 选择题交互 ---');
  w.location.hash = '#/lesson/g1-01';
  await new Promise(r => setTimeout(r, 200));
  const optCards = doc.querySelectorAll('#view .q-card');
  const optCard = Array.from(optCards).find(c => c.querySelector('.opts'));
  ok('存在选择题卡片', !!optCard);
  if (optCard) {
    optCard.querySelectorAll('.opt')[0].click();
    await new Promise(r => setTimeout(r, 30));
    ok('点击选项后高亮', optCard.querySelectorAll('.opt.sel').length === 1);
    optCard.querySelector('.toolbar .btn-primary').click();
    await new Promise(r => setTimeout(r, 60));
    ok('选择题提交后给出判定', !!optCard.querySelector('.feedback').textContent);
  }

  console.log('--- 每日一练 ---');
  w.location.hash = '#/daily';
  await new Promise(r => setTimeout(r, 250));
  ok('每日一练渲染 8 题', doc.querySelectorAll('#view .q-card').length === 8, String(doc.querySelectorAll('#view .q-card').length));

  console.log('--- 错题本 ---');
  w.location.hash = '#/wrong';
  await new Promise(r => setTimeout(r, 200));
  ok('错题本渲染出内容', doc.querySelector('#view').textContent.includes('错题本'));

  console.log('--- 打卡统计 ---');
  w.location.hash = '#/stats';
  await new Promise(r => setTimeout(r, 200));
  ok('热力图格子渲染 70 个', doc.querySelectorAll('#view .heat i').length === 70, String(doc.querySelectorAll('#view .heat i').length));

  console.log('--- 搜索 ---');
  w.location.hash = '#/search?q=' + encodeURIComponent('鸡兔');
  await new Promise(r => setTimeout(r, 200));
  ok('搜索"鸡兔"有命中', doc.querySelector('#view').textContent.includes('相关课程') || doc.querySelector('#view').textContent.includes('相关题目'));

  console.log('--- 我的 / 设置 ---');
  w.location.hash = '#/mine'; await new Promise(r => setTimeout(r, 150));
  ok('我的页面渲染', doc.querySelector('#view').textContent.includes('我的学习中心'));
  w.location.hash = '#/settings'; await new Promise(r => setTimeout(r, 150));
  ok('设置页面渲染', doc.querySelector('#view').textContent.includes('设置与数据'));
  const tts = doc.querySelector('#ttsBtn');
  ok('语音开关可点击', !!tts);
  if (tts) { const before = w.NNStore.settings().tts; tts.click(); await new Promise(r => setTimeout(r, 60)); ok('语音开关状态切换', w.NNStore.settings().tts !== before); }

  console.log('--- 返回首页 ---');
  w.location.hash = '#/home'; await new Promise(r => setTimeout(r, 150));
  ok('返回首页正常', doc.querySelector('#view').textContent.includes('闹闹鱼小学数学课堂'));

  console.log('--------------------------------');
  if (errors.length) { console.log('运行期错误 ' + errors.length + ' 条：'); errors.slice(0, 20).forEach(e => console.log('  ✗ ' + e)); }
  console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项，运行期错误 ' + errors.length + ' 条');
  dom.window.close();
  process.exit(fail || errors.length ? 1 : 0);
})();
