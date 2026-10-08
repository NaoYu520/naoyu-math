/* 弹窗可关闭性回归测试：防止 [hidden] 被组件 display 覆盖导致关不掉 */
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const TOKEN_PATH = 'C:/Users/HC04/.workbuddy/binaries/node/workspace/node_modules';
let JSDOMLib;
try { JSDOMLib = require('jsdom'); }
catch (e) { JSDOMLib = require(require('path').join(TOKEN_PATH, 'jsdom')); }

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

(async function () {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { fail++; console.log('  ✗ 运行期错误: ' + e.message); });

  /* 用 http 源加载：file:// 下 jsdom 没有 localStorage，"首次引导"逻辑无法正确模拟 */
  const BASE = process.env.NN_BASE || 'http://127.0.0.1:8900/index.html';
  const dom = await (JSDOMLib.JSDOM || JSDOM).fromURL(BASE, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) { win.scrollTo = function () {}; }
  });
  const w = dom.window, doc = w.document;
  w.speechSynthesis = undefined;

  await new Promise(r => setTimeout(r, 900));

  const root = doc.getElementById('modalRoot');
  ok('首次进入会弹出安装引导', !!root && !root.hidden);

  const btn = doc.getElementById('closeInstall');
  ok('引导弹窗有"知道啦"关闭按钮', !!btn);
  const xBtn = root && root.querySelector('.modal-x');
  ok('引导弹窗有右上角 ✕ 关闭按钮', !!xBtn);

  if (btn) {
    btn.click();
    await new Promise(r => setTimeout(r, 50));
    ok('点击"知道啦"后 hidden 置为 true', root.hidden === true);
    ok('关闭后弹窗内容被清空', root.innerHTML === '', JSON.stringify(root.innerHTML.slice(0, 40)));
  }

  /* 关键：即使 hidden 生效，也要确认 CSS 没有用 display 覆盖它 */
  const css = require('fs').readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
  const hasGlobalHidden = /\[hidden\]\s*\{[^}]*display\s*:\s*none[^}]*!important/.test(css);
  ok('CSS 存在全局 [hidden]{display:none !important} 兜底', hasGlobalHidden);

  /* 逐个检查带 display 的组件类，确认不会绕过 hidden */
  const risky = [];
  css.split('\n').forEach(line => {
    const m = line.match(/^([.#][\w-]+)\s*\{[^}]*display\s*:\s*(flex|grid|block|inline-flex)/);
    if (m) risky.push(m[1]);
  });
  ok('带 display 的组件类均受 [hidden] 兜底保护', risky.length === 0 || hasGlobalHidden,
    risky.join(','));

  /* 弹窗再次打开后仍能关闭（模拟二次触发） */
  if (w.NNQuiz) {
    root.hidden = false;
    root.innerHTML = '<div class="modal"><button id="tmpClose">x</button></div>';
    const escEv = new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    doc.dispatchEvent(escEv);
    await new Promise(r => setTimeout(r, 30));
    ok('按 ESC 可关闭弹窗', root.hidden === true);
  }

  console.log('--------------------------------');
  console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
  process.exit(fail ? 1 : 0);
})();
