/* ===== quiz.js —— 题目渲染、在线作答、自动批改、分步解析、动画挂载 ===== */
(function () {
  'use strict';

  var TYPE_NAME = { fill: '填空题', choice: '选择题', multi: '多选题', judge: '判断题' };
  var TYPE_CLS = { fill: 'badge', choice: 'badge p', multi: 'badge p', judge: 'badge o' };

  function h(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; });
  }
  function letters(n) { return ['A', 'B', 'C', 'D', 'E'].slice(0, n); }

  function render(container, q, opts) {
    opts = opts || {};
    var qid = q.id;
    var state = { answered: false, ok: null, tries: 0, shownSteps: 0, sel: [] };

    var card = h('div', 'q-card');
    card.setAttribute('data-qid', qid);

    /* --- 头部 --- */
    var head = h('div', 'q-head');
    if (opts.label) head.appendChild(h('span', 'q-idx', esc(opts.label)));
    head.appendChild(h('span', TYPE_CLS[q.type || 'fill'] || 'badge', TYPE_NAME[q.type || 'fill']));
    if (q.animKey && window.NN_DATA.anims[q.animKey]) head.appendChild(h('span', 'badge g', '🎬 有动画'));
    var rec = NNStore.getRecord(qid);
    if (rec && rec.last === 'bad') head.appendChild(h('span', 'badge r', '错过'));
    if (rec && rec.last === 'ok') head.appendChild(h('span', 'badge g', '做过'));
    head.appendChild(h('div', 'spacer'));
    var favBtn = h('button', 'mini-btn' + (NNStore.isFav(qid) ? ' on' : ''), '⭐ 收藏');
    var mastBtn = h('button', 'mini-btn master' + (NNStore.isMaster(qid) ? ' on' : ''), '✅ 已掌握');
    head.appendChild(favBtn); head.appendChild(mastBtn);
    card.appendChild(head);

    /* --- 题干 --- */
    card.appendChild(h('div', 'q-text', esc(q.q)));

    /* --- 静态配图 --- */
    if (q.fig) {
      var fw = h('div', 'q-figure');
      NNAnim.figure(fw, q.fig);
      card.appendChild(fw);
    }

    /* --- 动画讲解 --- */
    if (q.animKey && window.NN_DATA.anims[q.animKey]) {
      var aw = h('div', 'mt8');
      card.appendChild(h('div', 'section-title', '<span class="bar"></span>动画讲解（可播放 / 暂停 / 单步 / 重播）'));
      NNAnim.create(aw, window.NN_DATA.anims[q.animKey]);
      card.appendChild(aw);
    }

    /* --- 作答区 --- */
    var area = h('div', 'answer-area');
    var inputRef = null;
    var optEls = [];
    if (q.type === 'choice' || q.type === 'multi') {
      var wrap = h('div', 'opts');
      (q.options || []).forEach(function (op, i) {
        var o = h('div', 'opt', '<span class="key">' + letters((q.options || []).length)[i] + '</span><span>' + esc(op) + '</span>');
        o.setAttribute('data-k', letters((q.options || []).length)[i]);
        o.addEventListener('click', function () {
          if (state.answered) return;
          if (q.type === 'multi') {
            o.classList.toggle('sel');
            state.sel = Array.prototype.slice.call(wrap.querySelectorAll('.opt.sel')).map(function (x) { return x.getAttribute('data-k'); });
          } else {
            optEls.forEach(function (x) { x.classList.remove('sel'); });
            o.classList.add('sel');
            state.sel = [o.getAttribute('data-k')];
          }
          feed('已选择：' + state.sel.join(''), '');
        });
        optEls.push(o); wrap.appendChild(o);
      });
      area.appendChild(wrap);
    } else if (q.type === 'judge') {
      var jw = h('div', 'opts');
      ['对', '错'].forEach(function (t) {
        var b = h('div', 'opt', '<span class="key">' + t + '</span><span>' + (t === '对' ? '说法正确' : '说法错误') + '</span>');
        b.setAttribute('data-k', t);
        b.addEventListener('click', function () {
          if (state.answered) return;
          jw.querySelectorAll('.opt').forEach(function (x) { x.classList.remove('sel'); });
          b.classList.add('sel'); state.sel = [t];
        });
        optEls.push(b); jw.appendChild(b);
      });
      area.appendChild(jw);
    } else {
      var n = Array.isArray(q.answer) ? q.answer.length : 1;
      var holder = h('div', 'answer-input');
      inputRef = document.createElement('input');
      inputRef.type = 'text';
      inputRef.inputMode = 'text';
      inputRef.placeholder = n > 1 ? '共 ' + n + ' 个空，用逗号或空格分开填写' : '在这里输入答案（中文数字也能识别）';
      inputRef.autocomplete = 'off';
      inputRef.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
      holder.appendChild(inputRef);
      area.appendChild(holder);
    }
    card.appendChild(area);

    /* --- 反馈区 --- */
    var fb = h('div', 'feedback'); fb.hidden = true;
    card.appendChild(fb);
    function feed(html, cls) { fb.hidden = false; fb.className = 'feedback ' + (cls || ''); fb.innerHTML = html; }

    /* --- 工具栏 --- */
    var tools = h('div', 'toolbar');
    var submitBtn = h('button', 'btn btn-primary btn-mini', '✔ 提交批改');
    var hintBtn = h('button', 'btn btn-mini', '💡 提示');
    var solBtn = h('button', 'btn btn-mini btn-ghost', '📖 看解析');
    var retryBtn = h('button', 'btn btn-mini', '↻ 再做一次');
    retryBtn.style.display = 'none';
    tools.appendChild(submitBtn);
    if ((q.steps && q.steps.length) || q.solution || q.animKey) tools.appendChild(solBtn);
    if (q.hint) tools.appendChild(hintBtn);
    tools.appendChild(retryBtn);
    card.appendChild(tools);

    /* --- 分步解析区 --- */
    var stepsWrap = h('div', 'steps');
    stepsWrap.hidden = true;
    var stepCtrl = h('div', 'step-ctrl');
    var nextStepBtn = h('button', 'btn btn-mini btn-purple', '下一步解析 ▶');
    var allStepBtn = h('button', 'btn btn-mini', '全部展开');
    var foldBtn = h('button', 'btn btn-mini', '收起');
    stepCtrl.appendChild(nextStepBtn); stepCtrl.appendChild(allStepBtn); stepCtrl.appendChild(foldBtn);
    card.appendChild(stepsWrap);
    card.appendChild(stepCtrl);

    var stepItems = q.steps && q.steps.length ? q.steps.slice() : (q.solution ? [q.solution] : []);
    if (!stepItems.length) { stepCtrl.style.display = 'none'; }
    stepCtrl.style.display = 'none';

    function paintSteps(upto) {
      stepsWrap.innerHTML = '';
      stepItems.slice(0, upto).forEach(function (t, i) {
        var row = h('div', 'step');
        row.appendChild(h('span', 'n', String(i + 1)));
        row.appendChild(h('span', 't', mdBold(esc(t))));
        stepsWrap.appendChild(row);
      });
      state.shownSteps = upto;
      stepsWrap.hidden = upto === 0;
      nextStepBtn.disabled = upto >= stepItems.length;
      nextStepBtn.textContent = upto >= stepItems.length ? '解析已全部展开' : '下一步解析 ▶（' + upto + '/' + stepItems.length + '）';
    }
    function mdBold(s) { return String(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
    nextStepBtn.addEventListener('click', function () { paintSteps(state.shownSteps + 1); });
    allStepBtn.addEventListener('click', function () { paintSteps(stepItems.length); });
    foldBtn.addEventListener('click', function () { paintSteps(0); });

    solBtn.addEventListener('click', function () {
      stepCtrl.style.display = '';
      paintSteps(stepItems.length);
      if (!state.answered) feed('这是完整解题过程，慢慢读一遍，再自己讲一遍就更牢了。', '');
    });
    if (q.hint) hintBtn.addEventListener('click', function () { feed('💡 提示：' + mdBold(esc(q.hint)), ''); });

    /* --- 收藏 / 已掌握 --- */
    favBtn.addEventListener('click', function () {
      var on = NNStore.toggleFav(qid);
      favBtn.classList.toggle('on', on);
      toast(on ? '已加入收藏 ⭐' : '已取消收藏');
    });
    mastBtn.addEventListener('click', function () {
      var on = NNStore.toggleMaster(qid);
      mastBtn.classList.toggle('on', on);
      if (on) NNStore.removeWrong(qid);
      toast(on ? '太棒了，标记为已掌握 ✅' : '已取消"已掌握"');
      if (opts.onChange) opts.onChange();
    });

    /* --- 提交判定 --- */
    function submit() {
      if (state.answered) return;
      var input;
      if (q.type === 'choice' || q.type === 'multi' || q.type === 'judge') {
        if (!state.sel.length) { toast('先选一个答案吧～'); return; }
        input = state.sel.join('');
      } else {
        input = inputRef.value.trim();
        if (!input) { toast('先写下你的答案吧～'); return; }
      }
      var res = NNGrade.check(q, input);
      finish(res.ok, input, res.expected);
    }

    function finish(isOk, input, expected) {
      state.answered = true;
      state.tries++;
      state.ok = isOk;
      NNStore.record(qid, isOk);

      if (isOk) {
        if (inputRef) { inputRef.classList.add('ok'); inputRef.disabled = true; }
        if (optEls.length) {
          optEls.forEach(function (o) {
            if (state.sel.indexOf(o.getAttribute('data-k')) >= 0) o.classList.add('ok');
          });
        }
        feed('<b>🎉 完全正确！</b><br>' + (state.tries > 1 ? '第二次就对了，很棒！' : '一次就对，真厉害！') +
          '　正确率正在提升中 🐟', 'ok');
        NNStore.removeWrong(qid);
        cheer(card);
      } else {
        if (inputRef) { inputRef.classList.add('bad'); inputRef.disabled = true; }
        if (optEls.length) {
          optEls.forEach(function (o) {
            var k = o.getAttribute('data-k');
            if (state.sel.indexOf(k) >= 0) o.classList.add('bad');
            if (String(q.answer).indexOf(k) >= 0) o.classList.add('ok');
          });
        }
        NNStore.addWrong(qid, opts.lessonId || q._lesson || '');
        var tip = NNGrade.hintLeak(q, input);
        feed('<b>✗ 还差一点点</b><br>正确答案是：<b>' + esc(NNGrade.show(q.answer)) + '</b>' +
          (tip ? '<br>' + tip.replace(/\*\*/g, '') : '') +
          '<br><span class="small">已经自动记入错题本，等会儿再来看一遍哦。</span>', 'bad');
      }
      submitBtn.style.display = 'none';
      retryBtn.style.display = '';
      stepCtrl.style.display = '';
      paintSteps(isOk ? Math.min(1, stepItems.length) : 1);
      if (opts.onAnswer) opts.onAnswer(q, isOk, state.tries);
      if (opts.onChange) opts.onChange();
    }

    submitBtn.addEventListener('click', submit);
    retryBtn.addEventListener('click', function () {
      /* 允许再练一次：保留历史记录，重置界面 */
      state.answered = false;
      state.sel = [];
      if (inputRef) { inputRef.value = ''; inputRef.disabled = false; inputRef.classList.remove('ok', 'bad'); }
      optEls.forEach(function (o) { o.classList.remove('sel', 'ok', 'bad'); });
      fb.hidden = true;
      paintSteps(0);
      stepCtrl.style.display = 'none';
      retryBtn.style.display = 'none';
      submitBtn.style.display = '';
    });

    container.appendChild(card);
    return { el: card, state: state };
  }

  /* ---- 答对鼓励动效：小鱼和星星飘落 ---- */
  function cheer(card) {
    if (!card || !card.appendChild) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var box = document.createElement('div');
    box.className = 'cheer';
    var emo = ['⭐', '🎉', '✨', '🐟', '💧', '🌟', '🎈'];
    for (var i = 0; i < 12; i++) {
      var s = document.createElement('i');
      s.textContent = emo[i % emo.length];
      s.style.left = (4 + Math.random() * 88) + '%';
      s.style.fontSize = (15 + Math.random() * 11).toFixed(0) + 'px';
      s.style.animationDelay = (Math.random() * 0.28).toFixed(2) + 's';
      box.appendChild(s);
    }
    card.appendChild(box);
    card.classList.add('pop');
    setTimeout(function () {
      if (box.parentNode) box.parentNode.removeChild(box);
      card.classList.remove('pop');
    }, 1600);
  }

  /* ---- 提示条 ---- */
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1900);
  }

  window.NNQuiz = { render: render, toast: toast, esc: esc, mdBold: function (s) { return String(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); } };
})();
