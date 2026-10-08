/* ===== anim.js —— 例题动画引擎 =====
   特性：声明式场景（每步 items 列出生效元素）、播放/暂停/下一步/上一步/重播、
        中文语音解说同步（speechSynthesis）、进度点指示。
   写法示例：
   steps:[
     {say:'先摆出 3 个苹果', items:[{id:'a',t:'em',x:60,y:150,e:'🍎',n:3,gap:38}]},
     {say:'再摆 2 个',       items:['a', {id:'b',t:'em',x:300,y:150,e:'🍎',n:2,gap:38}]},
     {say:'一共 5 个',       items:['a','b',{t:'brace',x1:40,x2:520,y:190,label:'3+2=5'}]}
   ]
   每步 items 中：字符串 = 复用前面定义过的同 id 元素；对象 = 新增/更新元素。
   同 id 元素在不同步给不同 x/y，会自动产生位移动画。
*/
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var W = 640;
  var players = [];

  function el(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    return n;
  }
  function txtNode(s, attrs) {
    var t = el('text', Object.assign({ 'font-family': 'system-ui,-apple-system,"PingFang SC",sans-serif', 'font-size': 17, fill: '#123648', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, attrs || {}));
    t.textContent = s;
    return t;
  }
  function wrapLines(s, max) {
    var out = [];
    String(s).split('\n').forEach(function (line) {
      if (line.length <= max) { out.push(line); return; }
      var cur = '';
      for (var i = 0; i < line.length; i++) {
        cur += line.charAt(i);
        if (cur.length >= max) { out.push(cur); cur = ''; }
      }
      if (cur) out.push(cur);
    });
    return out;
  }
  function bracePath(x1, x2, y, h) {
    h = h || 9;
    var xm = (x1 + x2) / 2;
    return 'M' + x1 + ',' + y +
      ' A' + h + ',' + h + ' 0 0 1 ' + (x1 + h) + ',' + (y + h) +
      ' L' + (xm - h) + ',' + (y + h) +
      ' A' + h + ',' + h + ' 0 0 0 ' + xm + ',' + (y + 2 * h) +
      ' A' + h + ',' + h + ' 0 0 0 ' + (xm + h) + ',' + (y + h) +
      ' L' + (x2 - h) + ',' + (y + h) +
      ' A' + h + ',' + h + ' 0 0 1 ' + x2 + ',' + y;
  }

  var PALETTE = { blue: '#0ea5c6', deep: '#0b7f9b', orange: '#f59e0b', green: '#12a150', red: '#e11d48', purple: '#7c6cf0', gray: '#8aa9b8' };
  function col(c) { return PALETTE[c] || c || PALETTE.blue; }

  /* 元素"内容签名"：内容变了就重建（换来换去），只有位置变化才走位移动画 */
  function sig(item) {
    var t = item.t || 'txt';
    var keys = ['t', 's', 'label', 'n', 'e', 'w', 'h', 'r', 'color', 'fill', 'size', 'weight', 'anchor',
      'cs', 'rows', 'cols', 'fillCells', 'fillColor', 'x1', 'x2', 'y1', 'y2', 'pts', 'ticks', 'min', 'max',
      'tcolor', 'dash', 'sw', 'name', 'max', 'blabel', 'gap', 'dir', 'lx', 'ly', 'opacity', 'rx', 'alpha'];
    var parts = [t];
    keys.forEach(function (k) { if (item[k] !== undefined) parts.push(k + ':' + JSON.stringify(item[k])); });
    return parts.join('|');
  }

  /* ---- 生成单个元素的 DOM（不含定位） ---- */
  function build(item) {
    var g = el('g', { class: 'el' });
    var t = item.t;
    if (t === 'txt' || t === undefined) {
      var lines = wrapLines(item.s || item.label || '', item.wrap || 24);
      var lh = (item.size || 18) * 1.42;
      lines.forEach(function (ln, i) {
        g.appendChild(txtNode(ln, {
          x: 0, y: (i - (lines.length - 1) / 2) * lh,
          'font-size': item.size || 18,
          fill: col(item.color || '#123648'),
          'font-weight': item.weight || 600,
          'text-anchor': item.anchor || 'middle'
        }));
      });
    } else if (t === 'em') {
      var n = item.n || 1, gap = item.gap || 34, dir = item.dir || 'r';
      for (var i = 0; i < n; i++) {
        var e = txtNode(item.e || '⭐', {
          x: dir === 'r' ? i * gap : 0,
          y: dir === 'down' ? i * gap : 0,
          'font-size': (item.size || 30) * (item.scale || 1)
        });
        g.appendChild(e);
      }
      if (item.blabel) {
        g.appendChild(txtNode(item.blabel, { x: (n - 1) * gap / 2, y: -((item.size || 30) * 0.85), 'font-size': 14, fill: col('gray'), 'font-weight': 700 }));
      }
    } else if (t === 'seq') {
      /* 按顺序摆放一串字符（emoji），用于循环规律图 */
      var chars = Array.from(String(item.s || ''));
      var g2 = item.gap || 34;
      chars.forEach(function (c, i) {
        g.appendChild(txtNode(c, { x: (item.dir === 'down' ? 0 : i * g2), y: (item.dir === 'down' ? i * g2 : 0), 'font-size': (item.size || 30) * (item.scale || 1) }));
      });
    } else if (t === 'box') {
      var w = item.w || 90, h = item.h || 52, rx = item.rx === undefined ? 12 : item.rx;
      g.appendChild(el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: rx, fill: item.fill || '#fff', stroke: col(item.color || 'blue'), 'stroke-width': item.sw || 2.5 }));
      if (item.label) g.appendChild(txtNode(item.label, { x: 0, y: 1, 'font-size': item.size || 17, fill: item.tcolor || '#123648', 'font-weight': 700 }));
    } else if (t === 'bar') {
      var bw = item.w || 240, bh = item.h || 30;
      var ratio = item.max ? Math.max(0, Math.min(1, (item.val || 0) / item.max)) : 1;
      g.appendChild(el('rect', { x: 0, y: -bh / 2, width: bw, height: bh, rx: 8, fill: '#eef6fa', stroke: '#d9e9f1' }));
      g.appendChild(el('rect', { x: 0, y: -bh / 2, width: bw * ratio, height: bh, rx: 8, fill: col(item.color || 'blue'), opacity: .9, style: 'transition:width .55s ease' }));
      if (item.label) g.appendChild(txtNode(item.label, { x: bw * ratio + 12, y: 1, 'text-anchor': 'start', 'font-size': 15, 'font-weight': 700, fill: col(item.labelColor || '#2b5566') }));
      if (item.name) g.appendChild(txtNode(item.name, { x: -10, y: 1, 'text-anchor': 'end', 'font-size': 15, 'font-weight': 700, fill: '#6b8fa1' }));
    } else if (t === 'cir') {
      var r = item.r || 26;
      g.appendChild(el('circle', { cx: 0, cy: 0, r: r, fill: item.fill || '#fff', stroke: col(item.color || 'blue'), 'stroke-width': item.sw || 2.5 }));
      if (item.label) g.appendChild(txtNode(item.label, { x: 0, y: 1, 'font-size': item.size || 16, 'font-weight': 700, fill: item.tcolor || '#123648' }));
    } else if (t === 'dot') {
      g.appendChild(el('circle', { cx: 0, cy: 0, r: item.r || 5, fill: col(item.color || 'red') }));
    } else if (t === 'line') {
      g.appendChild(el('line', { x1: item.x1 - item.x, y1: item.y1 - item.y, x2: item.x2 - item.x, y2: item.y2 - item.y, stroke: col(item.color || 'gray'), 'stroke-width': item.sw || 2, 'stroke-dasharray': item.dash || null, 'stroke-linecap': 'round' }));
      if (item.label) g.appendChild(txtNode(item.label, { x: (item.x1 + item.x2) / 2 - item.x, y: (item.y1 + item.y2) / 2 - item.y - 12, 'font-size': 14, 'font-weight': 700, fill: col(item.color || 'gray') }));
    } else if (t === 'arrow') {
      var dx = item.x2 - item.x1, dy = item.y2 - item.y1;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / len, uy = dy / len;
      var head = 11, short = Math.max(0, len - head);
      var x2s = ux * short, y2s = uy * short;
      var arrow = el('g', {});
      arrow.appendChild(el('line', { x1: item.x1 - item.x, y1: item.y1 - item.y, x2: x2s, y2: y2s, stroke: col(item.color || 'orange'), 'stroke-width': item.sw || 2.6, 'stroke-linecap': 'round' }));
      var px = -uy, py = ux;
      arrow.appendChild(el('polygon', {
        points: (ux * len) + ',' + (uy * len) + ' ' + (x2s + px * head * .45) + ',' + (y2s + py * head * .45) + ' ' + (x2s - px * head * .45) + ',' + (y2s - py * head * .45),
        fill: col(item.color || 'orange')
      }));
      g.appendChild(arrow);
      if (item.label) g.appendChild(txtNode(item.label, { x: (item.x1 + item.x2) / 2 - item.x, y: (item.y1 + item.y2) / 2 - item.y - 14, 'font-size': 14.5, 'font-weight': 700, fill: col(item.color || 'orange') }));
    } else if (t === 'brace') {
      g.appendChild(el('path', { d: bracePath(item.x1 - item.x, item.x2 - item.x, item.y1 - item.y, item.h || 9), fill: 'none', stroke: col(item.color || 'deep'), 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
      if (item.label) g.appendChild(txtNode(item.label, { x: (item.x1 + item.x2) / 2 - item.x, y: item.y1 - item.y + 12 + (item.h || 9) * 2 + 4, 'font-size': item.size || 15, 'font-weight': 800, fill: col(item.color || 'deep') }));
    } else if (t === 'hl') {
      g.appendChild(el('rect', { x: item.w ? -item.w / 2 : -50, y: item.h ? -item.h / 2 : -24, width: item.w || 100, height: item.h || 48, rx: 10, fill: col(item.color || 'orange'), opacity: item.alpha || .18 }));
    } else if (t === 'grid') {
      var cs = item.cs || 34, rows = item.rows || 3, cols = item.cols || 4;
      var filled = item.fillCells || [];
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var key = r + ',' + c;
        var isF = filled.indexOf(key) >= 0;
        g.appendChild(el('rect', {
          x: c * cs, y: r * cs, width: cs, height: cs,
          fill: isF ? col(item.fillColor || 'blue') : (item.bg || '#fff'),
          opacity: isF ? .85 : 1,
          stroke: col(item.color || 'gray'), 'stroke-width': 1.5
        }));
      }
      if (item.label) g.appendChild(txtNode(item.label, { x: cols * cs / 2, y: rows * cs + 18, 'font-size': 14.5, 'font-weight': 700, fill: '#6b8fa1' }));
    } else if (t === 'poly' || t === 'tri') {
      g.appendChild(el('polygon', { points: (item.pts || []).join(' '), fill: item.fill || '#e2f6fb', stroke: col(item.color || 'blue'), 'stroke-width': item.sw || 2.4, 'stroke-linejoin': 'round', opacity: item.opacity || 1 }));
      if (item.label) g.appendChild(txtNode(item.label, { x: item.lx || 0, y: item.ly || 0, 'font-size': 14.5, 'font-weight': 700, fill: col(item.color || 'blue') }));
    } else if (t === 'axis') {
      var x1 = item.x1, x2 = item.x2, y = item.y, steps = item.ticks || 5, min = item.min || 0, max = item.max || steps;
      g.appendChild(el('line', { x1: x1 - item.x, y1: y - item.y, x2: x2 - item.x, y2: y - item.y, stroke: '#6b8fa1', 'stroke-width': 2, 'stroke-linecap': 'round' }));
      for (var k = 0; k <= steps; k++) {
        var px = x1 + (x2 - x1) * k / steps;
        g.appendChild(el('line', { x1: px - item.x, y1: y - item.y - 5, x2: px - item.x, y2: y - item.y + 5, stroke: '#6b8fa1', 'stroke-width': 1.6 }));
        g.appendChild(txtNode(String(min + (max - min) * k / steps), { x: px - item.x, y: y - item.y + 18, 'font-size': 12.5, fill: '#6b8fa1' }));
      }
    }
    return g;
  }

  function Player(host, spec, opts) {
    this.spec = spec || { steps: [] };
    this.opts = opts || {};
    this.idx = -1;
    this.playing = false;
    this.timer = null;
    this.registry = {};   /* id → item 定义 */
    this.nodes = {};      /* id → DOM */
    this.autoKey = 0;

    var wrap = document.createElement('div');
    wrap.className = 'anim-wrap';
    this.svg = el('svg', { class: 'anim-stage', viewBox: '0 0 ' + W + ' ' + (this.spec.h || 230), preserveAspectRatio: 'xMidYMid meet' });
    this.svg.style.height = 'auto';
    this.layer = el('g', {});
    this.svg.appendChild(this.layer);

    this.sayBox = document.createElement('div');
    this.sayBox.className = 'anim-say';
    this.sayBox.innerHTML = '<span class="say-ico">🐟</span><span class="say-text"></span>';
    this.sayText = this.sayBox.querySelector('.say-text');

    var ctrl = document.createElement('div');
    ctrl.className = 'anim-ctrl';
    ctrl.innerHTML =
      '<button class="btn btn-mini" data-a="prev">◀ 上一步</button>' +
      '<button class="btn btn-mini btn-primary" data-a="play">▶ 播放</button>' +
      '<button class="btn btn-mini" data-a="next">下一步 ▶</button>' +
      '<button class="btn btn-mini btn-ghost" data-a="replay">🔄 重播</button>' +
      '<span class="anim-progress"></span>';
    this.progress = ctrl.querySelector('.anim-progress');
    var self = this;
    ctrl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'prev') self.prev();
      else if (a === 'next') { self.pause(); self.go(self.idx + 1); }
      else if (a === 'play') self.playing ? self.pause() : self.play();
      else if (a === 'replay') self.replay();
    });
    this.playBtn = ctrl.querySelector('[data-a="play"]');

    wrap.appendChild(this.svg);
    wrap.appendChild(this.sayBox);
    wrap.appendChild(ctrl);
    host.appendChild(wrap);
    this.host = wrap;

    players.push(this);
    this.buildProgress();
    this.go(0, true);
  }

  Player.prototype.buildProgress = function () {
    this.progress.innerHTML = '';
    var n = this.spec.steps.length;
    for (var i = 0; i < n; i++) this.progress.appendChild(document.createElement('i'));
  };

  Player.prototype.resolve = function (list) {
    var out = [], self = this;
    (list || []).forEach(function (it) {
      if (typeof it === 'string') {
        var base = self.registry[it];
        if (base) out.push(Object.assign({}, base, { id: it, _reuse: true }));
      } else {
        var id = it.id || ('a' + (++self.autoKey));
        var def = Object.assign({}, it, { id: id });
        self.registry[id] = def;
        out.push(def);
      }
    });
    return out;
  };

  Player.prototype.go = function (i, silent) {
    var steps = this.spec.steps;
    if (!steps.length) return;
    if (i < 0) i = 0;
    if (i > steps.length - 1) { this.pause(); return; }
    var step = steps[i];
    this.idx = i;
    var items = this.resolve(step.items);
    var keep = {};
    var layer = this.layer, self = this;

    /* 需要隐藏的元素 */
    (step.hide || []).forEach(function (hid) {
      if (self.nodes[hid]) { self.nodes[hid].parentNode && self.nodes[hid].parentNode.removeChild(self.nodes[hid]); delete self.nodes[hid]; }
    });

    items.forEach(function (item) {
      keep[item.id] = true;
      var node = self.nodes[item.id];
      var s = sig(item);
      var needNew = !node || node.getAttribute('data-sig') !== s;
      if (needNew) {
        if (node && node.parentNode) node.parentNode.removeChild(node);
        node = build(item);
        node.setAttribute('data-sig', s);
        node.setAttribute('data-id', item.id);
        node.classList.add('enter');
        layer.appendChild(node);
        /* enter 动画结束后移除 class，避免重复 */
        setTimeout(function () { node.classList.remove('enter'); }, 560);
      }
      node.setAttribute('transform', 'translate(' + (item.x || 0) + ',' + (item.y || 0) + ')');
      self.nodes[item.id] = node;
    });

    /* 移除不再出现的元素 */
    Object.keys(this.nodes).forEach(function (id) {
      if (!keep[id]) {
        var n = self.nodes[id];
        n.classList.add('leave');
        setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 320);
        delete self.nodes[id];
      }
    });

    /* 解说文本 + 语音 */
    var say = step.say || '';
    this.sayText.textContent = say;
    if (!silent) speak(say);

    /* 进度点 */
    Array.prototype.forEach.call(this.progress.children, function (c, k) { c.className = k <= i ? 'on' : ''; });
    this.playBtn.textContent = this.playing ? '⏸ 暂停' : '▶ 播放';
    if (this.opts.onStep) this.opts.onStep(i, steps.length);
  };

  Player.prototype.next = function () { this.go(this.idx + 1); };
  Player.prototype.prev = function () { this.go(this.idx - 1); };
  Player.prototype.clearTimer = function () { if (this.timer) { clearTimeout(this.timer); this.timer = null; } };

  Player.prototype.play = function () {
    players.forEach(function (p) { if (p !== this) p.pause(); }, this);
    if (this.idx >= this.spec.steps.length - 1) { this.replay(); return; }
    this.playing = true;
    this.playBtn.textContent = '⏸ 暂停';
    var self = this;
    (function tick() {
      if (!self.playing) return;
      if (self.idx >= self.spec.steps.length - 1) { self.pause(); return; }
      var step = self.spec.steps[self.idx];
      var hold = step.hold || Math.max(1900, Math.min(7000, (step.say || '').length * 165));
      self.clearTimer();
      self.timer = setTimeout(function () {
        if (!self.playing) return;
        self.go(self.idx + 1);
        tick();
      }, hold);
    })();
  };

  Player.prototype.pause = function () {
    this.playing = false;
    this.clearTimer();
    if (this.playBtn) this.playBtn.textContent = '▶ 播放';
    stopSpeak();
  };

  Player.prototype.replay = function () {
    stopSpeak();
    Object.keys(this.nodes).forEach(function (id) {
      var n = this.nodes[id]; if (n.parentNode) n.parentNode.removeChild(n);
    }, this);
    this.nodes = {};
    this.idx = -1;
    this.go(0);
    this.playing = false;
    this.play();
  };

  /* ---- 语音解说 ---- */
  var voice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return null;
    var vs = window.speechSynthesis.getVoices() || [];
    for (var i = 0; i < vs.length; i++) {
      var v = vs[i];
      if (/zh[-_]?CN|zh[-_]?Hans|Chinese|普通话|中文/i.test(v.lang + ' ' + v.name)) return v;
    }
    return null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = function () { voice = pickVoice(); };
    voice = pickVoice();
  }
  function speak(text) {
    if (!text) return;
    var on = true;
    try { on = window.NNStore ? NNStore.settings().tts : true; } catch (e) {}
    if (!on || !window.speechSynthesis) return;
    try {
      stopSpeak();
      var u = new SpeechSynthesisUtterance(String(text).replace(/[（）()【】\[\]=＝]/g, ' '));
      u.lang = 'zh-CN';
      u.rate = 1.02; u.pitch = 1.06;
      if (!voice) voice = pickVoice();
      if (voice) u.voice = voice;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function stopSpeak() {
    if (window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch (e) {} }
  }

  /* ---- 静态图形（用于题目配图，无控制条） ---- */
  function figure(host, spec) {
    spec = spec || { items: [] };
    var h = spec.h || 160;
    var svg = el('svg', { class: 'anim-stage', viewBox: '0 0 ' + W + ' ' + h, preserveAspectRatio: 'xMidYMid meet' });
    svg.style.height = 'auto';
    var layer = el('g', {});
    svg.appendChild(layer);
    (spec.items || []).forEach(function (item, i) {
      var it = Object.assign({ id: 'f' + i }, item);
      var g = build(it);
      g.setAttribute('transform', 'translate(' + (it.x || 0) + ',' + (it.y || 0) + ')');
      layer.appendChild(g);
    });
    host.appendChild(svg);
    return svg;
  }

  function buildAll(scope) {
    var nodes = (scope || document).querySelectorAll('[data-anim]');
    Array.prototype.forEach.call(nodes, function (n) {
      if (n.__nnPlayer) return;
      var key = n.getAttribute('data-anim');
      var spec = window.NN_DATA && window.NN_DATA.anims ? window.NN_DATA.anims[key] : null;
      if (!spec) { n.innerHTML = '<div class="muted small">（本讲暂无动画）</div>'; return; }
      n.__nnPlayer = new Player(n, spec);
    });
  }

  window.NNAnim = {
    create: function (host, spec) { return new Player(host, spec); },
    figure: figure,
    buildAll: buildAll,
    speak: speak,
    stopSpeak: stopSpeak,
    pauseAll: function () { players.forEach(function (p) { p.pause(); }); }
  };
})();
