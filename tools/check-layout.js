/* 动画版面校验：node tools/check-layout.js
   逐个计算每个图元的包围盒，检查是否超出画布（640 × h）或跑到负坐标，
   用来替代人工看图，避免动画元素被裁切、压字、跑出屏幕。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { console, Date };
sandbox.window = sandbox;
const ctx = vm.createContext(sandbox);
const load = f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
load('js/data/catalog.js');
/* 自动发现全部年级数据文件（g1.js, g1b.js, g1c.js, ...） */
fs.readdirSync(path.join(ROOT, 'js/data'))
  .filter(f => /^g[1-6][a-z]*\.js$/.test(f))
  .sort()
  .forEach(f => load('js/data/' + f));
const D = sandbox.NN_DATA;

const W = 640;
function textW(s, size) {
  let w = 0;
  for (const ch of String(s)) w += /[\u4e00-\u9fa5\uff00-\uffef]/.test(ch) ? size : size * 0.58;
  return w;
}
function bbox(item) {
  const x = item.x || 0, y = item.y || 0, t = item.t || 'txt';
  const anchor = item.anchor || 'middle';
  if (t === 'txt') {
    const lines = String(item.s || item.label || '').split('\n');
    const size = item.size || 18;
    const w = Math.max.apply(null, lines.map(l => textW(l, size)));
    const h = lines.length * size * 1.42;
    const x1 = anchor === 'middle' ? x - w / 2 : anchor === 'start' ? x : x - w;
    const x2 = anchor === 'middle' ? x + w / 2 : anchor === 'start' ? x + w : x;
    return { x1: x1, y1: y - h / 2, x2: x2, y2: y + h / 2, name: '文字' };
  }
  if (t === 'em') {
    const n = item.n || 1, gap = item.gap || 34, size = item.size || 30;
    const w = item.dir === 'down' ? size : (n - 1) * gap + size;
    const h = item.dir === 'down' ? (n - 1) * gap + size : size * 1.35;
    const top = item.blabel ? y - size * 1.1 : y - size / 2;
    return { x1: x - size / 2, y1: top, x2: x + w - size / 2, y2: y + h - h / 2, name: 'emoji×' + n };
  }
  if (t === 'seq') {
    const chars = Array.from(String(item.s || ''));
    const gap = item.gap || 34, size = item.size || 30;
    return { x1: x - size / 2, y1: y - size / 2, x2: x + (chars.length - 1) * gap + size / 2, y2: y + size / 2, name: '序列×' + chars.length };
  }
  if (t === 'box') {
    const w = item.w || 90, h = item.h || 52;
    return { x1: x - w / 2, y1: y - h / 2, x2: x + w / 2, y2: y + h / 2, name: '方框' };
  }
  if (t === 'bar') return { x1: Math.min(x, x - 0), y1: y - (item.h || 30) / 2 - 12, x2: x + (item.w || 240) + (item.label ? textW(item.label, 15) + 20 : 60), y2: y + (item.h || 30) / 2 + 8, name: '长条' };
  if (t === 'cir') { const r = item.r || 26; return { x1: x - r, y1: y - r, x2: x + r, y2: y + r, name: '圆' }; }
  if (t === 'dot') { const r = item.r || 5; return { x1: x - r, y1: y - r, x2: x + r, y2: y + r, name: '点' }; }
  if (t === 'hl') {
    const w = item.w || 100, h = item.h || 48;
    return { x1: x - w / 2, y1: y - h / 2, x2: x + w / 2, y2: y + h / 2, name: '高亮' };
  }
  if (t === 'grid') {
    const cs = item.cs || 34, rows = item.rows || 3, cols = item.cols || 4;
    return { x1: x, y1: y - 12, x2: x + cols * cs, y2: y + rows * cs + (item.label ? 24 : 0), name: '网格' };
  }
  if (t === 'line' || t === 'arrow') {
    const lx = Math.min(item.x1, item.x2), rx = Math.max(item.x1, item.x2);
    const ty = Math.min(item.y1, item.y2), by = Math.max(item.y1, item.y2);
    return { x1: lx - 6, y1: ty - (item.label ? 22 : 6), x2: rx + 6, y2: by + 10, name: t === 'line' ? '线段' : '箭头' };
  }
  if (t === 'brace') {
    const h = item.h || 9;
    const lw = item.label ? textW(item.label, item.size || 15) / 2 : 0;
    const cx = (item.x1 + item.x2) / 2;
    return { x1: Math.min(item.x1, cx - lw), y1: item.y1 - 4, x2: Math.max(item.x2, cx + lw), y2: item.y1 + 12 + 2 * h + (item.label ? 22 : 4), name: '大括号' };
  }
  if (t === 'axis') {
    return { x1: item.x1 - 24, y1: item.y - 14, x2: item.x2 + 24, y2: item.y + 26, name: '数轴' };
  }
  if (t === 'poly' || t === 'tri') {
    const pts = (item.pts || []).map(p => p.split(',').map(Number));
    const xs = pts.map(p => p[0] + x), ys = pts.map(p => p[1] + y);
    return { x1: Math.min.apply(null, xs), y1: Math.min.apply(null, ys), x2: Math.max.apply(null, xs), y2: Math.max.apply(null, ys), name: '多边形' };
  }
  return { x1: x, y1: y, x2: x, y2: y, name: t };
}

let problems = 0, checked = 0;
Object.keys(D.anims).forEach(key => {
  const a = D.anims[key], h = a.h || 230;
  /* 累积 registry：字符串引用需要先解析 */
  const reg = {};
  a.steps.forEach((step, si) => {
    const items = [];
    (step.items || []).forEach(it => {
      if (typeof it === 'string') { if (reg[it]) items.push(reg[it]); }
      else { const id = it.id || ('auto' + si + items.length); reg[id] = it; items.push(it); }
    });
    items.forEach(it => {
      checked++;
      const b = bbox(it);
      const tol = 2;
      const outX = b.x1 < -tol || b.x2 > W + tol;
      const outY = b.y1 < -tol || b.y2 > h + tol;
      if (outX || outY) {
        problems++;
        console.log('  ✗ ' + key + ' 第' + (si + 1) + '步 [' + b.name + '] 超出画布：' +
          'x ' + b.x1.toFixed(0) + '~' + b.x2.toFixed(0) + '（0~' + W + '）　' +
          'y ' + b.y1.toFixed(0) + '~' + b.y2.toFixed(0) + '（0~' + h + '）');
      }
    });
  });
});

/* 静态配图也检查 */
D.allQuestions().forEach(q => {
  if (!q.fig) return;
  const h = q.fig.h || 160;
  (q.fig.items || []).forEach(it => {
    checked++;
    const b = bbox(it);
    if (b.x1 < -2 || b.x2 > W + 2 || b.y1 < -2 || b.y2 > h + 2) {
      problems++;
      console.log('  ✗ ' + q.id + ' 配图 [' + b.name + '] 超出画布：x ' + b.x1.toFixed(0) + '~' + b.x2.toFixed(0) + '　y ' + b.y1.toFixed(0) + '~' + b.y2.toFixed(0) + '（高 ' + h + '）');
    }
  });
});

console.log('--------------------------------');
console.log('共检查 ' + checked + ' 个图元，越界 ' + problems + ' 处');
process.exit(problems ? 1 : 0);
