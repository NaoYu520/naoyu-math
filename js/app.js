/* ===== app.js —— 路由与页面渲染 ===== */
(function () {
  'use strict';
  var D = window.NN_DATA, S = NNStore, Q = NNQuiz;
  var view, topbar;

  /* ---------- 小工具 ---------- */
  function E(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function esc(s) { return Q.esc(s); }
  function md(s) { return Q.mdBold(esc(s)); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function on(el, ev, fn) { el.addEventListener(ev, fn); }
  function go(hash) { location.hash = hash; }
  function fmtDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  /* ---------- 进度统计 ---------- */
  function lessonStats(l) {
    var total = D.lessonQuestionCount(l), ok = 0, seen = 0, master = 0;
    ['examples', 'variants', 'practice'].forEach(function (sec) {
      (l[sec] || []).forEach(function (q) {
        var r = S.getRecord(q.id);
        if (r) { seen++; if (r.last === 'ok') ok++; }
        if (S.isMaster(q.id)) master++;
      });
    });
    return { total: total, seen: seen, ok: ok, master: master, pct: total ? Math.round(seen / total * 100) : 0 };
  }
  function overallStats() {
    var rec = S.records(), ok = 0, bad = 0;
    for (var k in rec) { ok += rec[k].ok || 0; bad += rec[k].bad || 0; }
    var lessonsDone = 0;
    D.lessons.forEach(function (l) { if (lessonStats(l).seen >= D.lessonQuestionCount(l) && D.lessonQuestionCount(l) > 0) lessonsDone++; });
    return {
      answered: ok + bad, right: ok, wrong: bad, rate: (ok + bad) ? Math.round(ok / (ok + bad) * 100) : 0,
      wrongBook: S.wrongCount(), favs: Object.keys(S.favs()).length, master: Object.keys(S.master()).length,
      streak: S.streak(), days: S.totalDays(), lessonsDone: lessonsDone, totalLessons: D.lessons.length
    };
  }

  /* ================= 页面：首页 ================= */
  function pageHome() {
    var st = overallStats();
    var today = S.days()[S.today()] || { answered: 0, right: 0, lessons: [] };
    var hero = E('div', 'hero',
      '<div class="bubbles"><i></i><i></i><i></i></div>' +
      '<h1>🐟 闹闹鱼小学数学课堂</h1>' +
      '<p>小学 1–6 年级趣味奥数：动画讲解 · 分步解析 · 在线批改 · 错题本与打卡</p>' +
      '<div class="hero-actions">' +
      '<button class="btn light" id="heroDaily">✏️ 开始每日一练</button>' +
      '<button class="btn" id="heroContinue">📖 继续学习</button>' +
      '<button class="btn" id="heroInstall">📲 装到 iPad 桌面</button>' +
      '</div>');
    view.appendChild(hero);
    on($('#heroDaily'), 'click', function () { go('#/daily'); });
    on($('#heroContinue'), 'click', function () { var l = lastLesson(); go('#/lesson/' + l.id); });
    on($('#heroInstall'), 'click', showInstallHelp);

    /* 今日打卡 */
    var todayCard = E('div', 'card');
    todayCard.innerHTML =
      '<div class="row"><h3 class="mb0">今天的学习</h3><div class="spacer"></div>' +
      '<span class="badge g">连续打卡 ' + st.streak + ' 天</span></div>' +
      '<div class="grid three mt12">' +
      '<div class="stat"><b>' + today.answered + '</b><span>今日答题</span></div>' +
      '<div class="stat"><b>' + (today.answered ? Math.round((today.right || 0) / today.answered * 100) : 0) + '%</b><span>今日正确率</span></div>' +
      '<div class="stat"><b>' + (today.lessons ? today.lessons.length : 0) + '</b><span>今日学过讲次</span></div>' +
      '</div>';
    view.appendChild(todayCard);

    /* 总览 */
    var grid = E('div', 'grid three');
    [['累计答题', st.answered], ['正确率', st.rate + '%'], ['错题本', st.wrongBook],
    ['已掌握', st.master], ['收藏', st.favs], ['学完讲次', st.lessonsDone + '/' + st.totalLessons]].forEach(function (p) {
      grid.appendChild(E('div', 'stat', '<b>' + p[1] + '</b><span>' + p[0] + '</span>'));
    });
    view.appendChild(E('div', 'card', '<h3>我的成绩单</h3>'));
    view.appendChild(grid);

    /* 年级入口 */
    var gwrap = E('div', 'card', '<h3>按年级选课</h3><div class="small muted mb8">1–6 年级，每讲都含动画例题、举一反三和练习小测</div>');
    var gg = E('div', 'grid two');
    D.grades.forEach(function (g) {
      var ls = D.lessonsOfGrade(g.id);
      var done = 0; ls.forEach(function (l) { var s = lessonStats(l); if (s.seen >= D.lessonQuestionCount(l) && D.lessonQuestionCount(l) > 0) done++; });
      var t = E('div', 'tile',
        '<div class="ico">' + g.emoji + '</div><div><b>' + g.name + '（' + ls.length + '讲）</b>' +
        '<small>' + g.desc + '</small><br><small>' + (done ? '已学完 ' + done + ' 讲' : '还没开始') + '</small></div>' +
        '<div class="arrow">›</div>');
      on(t, 'click', function () { go('#/courses?grade=' + g.id); });
      gg.appendChild(t);
    });
    gwrap.appendChild(gg);
    view.appendChild(gwrap);

    /* 快速入口 */
    var quick = E('div', 'card', '<h3>常用功能</h3>');
    [['🧯 错题本', '#/wrong'], ['⭐ 收藏夹', '#/fav'], ['📅 打卡统计', '#/stats'], ['⚙️ 设置与数据', '#/settings']].forEach(function (p) {
      var b = E('button', 'btn btn-mini', p[0]);
      on(b, 'click', function () { go(p[1]); });
      quick.appendChild(b); quick.appendChild(document.createTextNode(' '));
    });
    view.appendChild(quick);
  }
  function lastLesson() {
    var read = S.readLog(), best = null, ts = 0;
    for (var k in read) if (read[k].ts > ts) { ts = read[k].ts; best = k; }
    return D.byId(best) || D.lessons[0];
  }

  /* ================= 页面：课程列表 ================= */
  var filter = { grade: 0, topic: '' };
  function pageCourses(query) {
    if (query && query.grade) filter.grade = Number(query.grade);
    if (query && query.topic) filter.topic = query.topic;

    var box = E('div', 'card');
    box.appendChild(E('h3', '', '课程筛选'));
    var gc = E('div', 'chips mb8');
    var allG = E('span', 'chip grade' + (filter.grade === 0 ? ' active' : ''), '全部年级');
    on(allG, 'click', function () { filter.grade = 0; render(); });
    gc.appendChild(allG);
    D.grades.forEach(function (g) {
      var c = E('span', 'chip grade' + (filter.grade === g.id ? ' active' : ''), g.emoji + ' ' + g.name);
      on(c, 'click', function () { filter.grade = g.id; render(); });
      gc.appendChild(c);
    });
    box.appendChild(gc);
    var tc = E('div', 'chips');
    var allT = E('span', 'chip' + (!filter.topic ? ' active' : ''), '全部专题');
    on(allT, 'click', function () { filter.topic = ''; render(); });
    tc.appendChild(allT);
    D.topics.forEach(function (t) {
      var c = E('span', 'chip' + (filter.topic === t.id ? ' active' : ''), t.emoji + ' ' + t.name);
      on(c, 'click', function () { filter.topic = t.id; render(); });
      tc.appendChild(c);
    });
    box.appendChild(tc);
    view.appendChild(box);

    var list = D.lessons.filter(function (l) {
      if (filter.grade && l.grade !== filter.grade) return false;
      if (filter.topic && l.topic !== filter.topic) return false;
      return true;
    });
    if (!list.length) { view.appendChild(E('div', 'empty', '<span class="e-ico">🐡</span>这个组合下暂时没有课程，换个筛选试试～')); return; }
    var byGrade = {};
    list.forEach(function (l) { (byGrade[l.grade] = byGrade[l.grade] || []).push(l); });
    Object.keys(byGrade).sort().forEach(function (g) {
      var gi = D.gradeById(g);
      view.appendChild(E('div', 'section-title', '<span class="bar"></span>' + gi.emoji + ' ' + gi.name));
      /* 平板上自动双/三列（CSS 里 .lesson-list 用 grid） */
      var wrap = E('div', 'lesson-list');
      byGrade[g].forEach(function (l) { wrap.appendChild(lessonCard(l)); });
      view.appendChild(wrap);
    });
  }

  function lessonCard(l) {
    var s = lessonStats(l), t = D.topicById(l.topic);
    var c = E('div', 'lesson-card');
    c.innerHTML =
      '<div class="lc-top"><span class="grade-pill">' + l.emoji + '</span>' +
      '<h3>' + esc(l.title) + '</h3></div>' +
      '<div class="desc">' + esc(l.subtitle) + '</div>' +
      '<div class="lc-meta"><span class="badge' + (l.grade <= 2 ? ' o' : l.grade <= 4 ? ' p' : ' g') + '">' + (t ? t.emoji + t.name : '') + '</span>' +
      '<span>' + s.total + ' 题</span><span>·</span><span>' + (s.seen ? '已做 ' + s.seen + ' 题' : '未开始') + '</span>' +
      (s.master ? '<span>·</span><span class="badge g">已掌握 ' + s.master + '</span>' : '') +
      '</div>' +
      '<div class="progress mt8"><i style="width:' + s.pct + '%"></i></div>' +
      (s.seen >= s.total && s.total ? '<div class="dotdone">🏆</div>' : '');
    on(c, 'click', function () { S.markRead(l.id, s.pct); go('#/lesson/' + l.id); });
    return c;
  }

  /* ================= 页面：课程详情 ================= */
  function pageLesson(id) {
    var l = D.byId(id);
    if (!l) { view.appendChild(E('div', 'empty', '没有找到这一讲')); return; }
    var gi = D.gradeById(l.grade), t = D.topicById(l.topic);
    S.markRead(l.id);
    S.markLesson(l.id);

    var head = E('div', 'lesson-head');
    head.innerHTML = '<div class="row wrap"><span class="badge">' + gi.emoji + ' ' + gi.name + '</span>' +
      '<span class="badge p">' + (t ? t.emoji + t.name : '') + '</span>' +
      '<div class="spacer"></div><button class="btn btn-mini" id="backList">← 返回课程</button></div>' +
      '<h1 class="mt8">' + esc(l.title) + '</h1>' +
      '<div class="muted">' + esc(l.subtitle) + '</div>' +
      '<div class="chips mt8">' + (l.tags || []).map(function (x) { return '<span class="chip soft">' + esc(x) + '</span>'; }).join('') + '</div>';
    view.appendChild(head);
    on($('#backList'), 'click', function () { history.length > 1 ? history.back() : go('#/courses'); });

    var prog = E('div', 'card card-tight');
    var ps = lessonStats(l);
    prog.innerHTML = '<div class="row"><span class="badge">本讲进度</span><span class="small muted">已做 ' + ps.seen + '/' + ps.total + ' 题　已掌握 ' + ps.master + '</span><div class="spacer"></div><button class="btn btn-mini btn-ghost" id="markAllRead">标记本讲已学</button></div>' +
      '<div class="progress mt8"><i style="width:' + ps.pct + '%"></i></div>';
    view.appendChild(prog);
    on($('#markAllRead'), 'click', function () { S.markRead(l.id, 100); S.markLesson(l.id); Q.toast('已记录：本讲学习完成 🐟'); render(); });

    /* 趣味导入 */
    if (l.story) view.appendChild(E('div', 'card', '<h3>🐚 趣味导入</h3><div class="story">' + md(l.story) + '</div>'));

    /* 知识要点 */
    if (l.keyPoints) {
      var kp = E('div', 'card', '<h3>🔑 知识要点</h3><ul class="kp-list">' +
        l.keyPoints.map(function (k) { return '<li>' + md(k) + '</li>'; }).join('') + '</ul>');
      view.appendChild(kp);
    }

    /* 例题 */
    addSection('📘 例题精讲（逐步展开解析）', l.examples, '例', l);
    /* 举一反三 */
    addSection('🔁 举一反三（变式练习）', l.variants, '变', l);
    /* 练习与小测 */
    var pcard = E('div', 'card');
    pcard.innerHTML = '<h3>✍️ 练习与小测</h3><div class="small muted">全部自动批改，做错的题会自动进入错题本。</div>';
    view.appendChild(E('div', 'section-title', '<span class="bar"></span>✍️ 练习与小测'));
    view.appendChild(pcard);
    (l.practice || []).forEach(function (q, i) {
      Q.render(view, q, { label: '练' + (i + 1), lessonId: l.id, onChange: onAnyChange });
    });

    /* 底部：上一讲 / 下一讲 */
    var idx = D.lessons.indexOf(l);
    var nav = E('div', 'card');
    var prev = D.lessons[idx - 1], next = D.lessons[idx + 1];
    var row = E('div', 'btn-row');
    if (prev) { var pb = E('button', 'btn', '← ' + esc(prev.title.slice(0, 10))); on(pb, 'click', function () { go('#/lesson/' + prev.id); }); row.appendChild(pb); }
    var tb = E('button', 'btn btn-ghost', '📚 课程列表'); on(tb, 'click', function () { go('#/courses'); }); row.appendChild(tb);
    if (next) { var nb = E('button', 'btn btn-primary', esc(next.title.slice(0, 10)) + ' →'); on(nb, 'click', function () { go('#/lesson/' + next.id); }); row.appendChild(nb); }
    nav.appendChild(row);
    view.appendChild(nav);

    function addSection(title, arr, prefix, lesson) {
      if (!arr || !arr.length) return;
      view.appendChild(E('div', 'section-title', '<span class="bar"></span>' + title));
      arr.forEach(function (q, i) {
        var cls = prefix === '例' ? 'ex-card' : 'ex-card variant';
        var holder = E('div', cls);
        view.appendChild(holder);
        Q.render(holder, q, { label: prefix + (i + 1), lessonId: lesson.id, onChange: onAnyChange });
      });
    }
  }
  var changeTimer = null;
  function onAnyChange() {
    clearTimeout(changeTimer);
    changeTimer = setTimeout(function () { /* 轻量刷新顶栏计数，不重绘页面避免打断作答 */ }, 300);
  }

  /* ================= 页面：每日一练 ================= */
  function pageDaily() {
    var key = S.today();
    var wrongIds = Object.keys(S.wrong());
    var set = D.dailySet(key, wrongIds);
    var doneToday = (S.days()[key] || {}).answered || 0;

    var head = E('div', 'card');
    head.innerHTML = '<h1>✏️ 每日一练</h1>' +
      '<div class="muted">' + key + '　每日 8 题，每个年级都会照顾到；错题会优先出现，帮你巩固。</div>' +
      '<div class="grid three mt12">' +
      '<div class="stat"><b>' + set.length + '</b><span>今日题量</span></div>' +
      '<div class="stat"><b>' + doneToday + '</b><span>今日已答</span></div>' +
      '<div class="stat"><b>' + S.streak() + '</b><span>连续打卡(天)</span></div>' +
      '</div>';
    view.appendChild(head);

    set.forEach(function (q, i) {
      var l = D.byId(q._lesson);
      var wrap = E('div', 'ex-card practice');
      wrap.appendChild(E('div', 'small muted', '来自 ' + (D.gradeById(q._grade) || {}).name + '　' + esc(l ? l.title : '')));
      view.appendChild(wrap);
      Q.render(wrap, q, { label: '日' + (i + 1), lessonId: q._lesson, onChange: onAnyChange });
    });
    view.appendChild(E('div', 'card center',
      '<div class="small muted mb8">做完今天的题，记得回首页看看打卡天数有没有 +1 🐟</div>' +
      '<button class="btn btn-accent" id="dailyDone">✅ 标记今天已完成打卡</button>'));
    on($('#dailyDone'), 'click', function () { S.markLesson('daily-' + key); Q.toast('打卡成功！连续 ' + S.streak() + ' 天啦 🎉'); render(); });
  }

  /* ================= 页面：错题本 ================= */
  function pageWrong() {
    var w = S.wrong();
    var ids = Object.keys(w).sort(function (a, b) { return (w[b].ts || 0) - (w[a].ts || 0); });
    var head = E('div', 'card');
    head.innerHTML = '<h1>🧯 错题本</h1><div class="muted">做错的题会自动收进来，答对一次就自动移出（也可以手动移除）。</div>' +
      '<div class="grid three mt12"><div class="stat"><b>' + ids.length + '</b><span>错题总数</span></div>' +
      '<div class="stat"><b>' + ids.filter(function (i) { return S.isMaster(i); }).length + '</b><span>其中已掌握</span></div>' +
      '<div class="stat"><b>' + Object.keys(S.favs()).length + '</b><span>收藏题目</span></div></div>' +
      '<div class="btn-row mt12"><button class="btn btn-mini" id="doWrong">🔁 重新练一遍</button>' +
      '<button class="btn btn-mini" id="goFav">⭐ 看收藏题</button></div>';
    view.appendChild(head);
    on($('#doWrong'), 'click', function () { go('#/redo/wrong'); });
    on($('#goFav'), 'click', function () { go('#/fav'); });

    if (!ids.length) { view.appendChild(E('div', 'empty', '<span class="e-ico">🎉</span>还没有错题，继续保持！')); return; }

    var byGrade = {};
    ids.forEach(function (id) {
      var q = D.questionById(id); if (!q) return;
      (byGrade[q._grade] = byGrade[q._grade] || []).push(q);
    });
    Object.keys(byGrade).sort().forEach(function (g) {
      var gi = D.gradeById(g);
      view.appendChild(E('div', 'section-title', '<span class="bar"></span>' + gi.emoji + ' ' + gi.name + '（' + byGrade[g].length + ' 题）'));
      byGrade[g].forEach(function (q) {
        var holder = E('div', 'ex-card practice');
        view.appendChild(holder);
        var r = Q.render(holder, q, {
          label: '错', lessonId: q._lesson, onChange: render
        });
        var bar = E('div', 'toolbar');
        var rm = E('button', 'mini-btn', '🗑 移出错题本');
        on(rm, 'click', function () { S.removeWrong(q.id); Q.toast('已移出错题本'); render(); });
        var lk = E('button', 'mini-btn', '📖 去这一讲');
        on(lk, 'click', function () { go('#/lesson/' + q._lesson); });
        bar.appendChild(rm); bar.appendChild(lk);
        holder.appendChild(bar);
      });
    });
  }

  /* ================= 页面：重练（错题 / 收藏） ================= */
  function pageRedo(kind) {
    var ids = kind === 'wrong' ? Object.keys(S.wrong()) : Object.keys(S.favs());
    var qs = ids.map(function (id) { return D.questionById(id); }).filter(Boolean);
    var head = E('div', 'card');
    head.innerHTML = '<h1>' + (kind === 'wrong' ? '🔁 错题重练' : '⭐ 收藏重练') + '</h1>' +
      '<div class="muted">共 ' + qs.length + ' 题。做对了就会自动从错题本移出。</div>' +
      '<div class="btn-row mt12"><button class="btn btn-mini" id="back">← 返回</button></div>';
    view.appendChild(head);
    on($('#back'), 'click', function () { go(kind === 'wrong' ? '#/wrong' : '#/fav'); });
    if (!qs.length) { view.appendChild(E('div', 'empty', '<span class="e-ico">🐠</span>这里还没有题目')); return; }
    qs.forEach(function (q, i) {
      var holder = E('div', 'ex-card');
      view.appendChild(holder);
      Q.render(holder, q, { label: '重' + (i + 1), lessonId: q._lesson, onChange: onAnyChange });
    });
  }

  /* ================= 页面：收藏 ================= */
  function pageFav() {
    var ids = Object.keys(S.favs());
    var head = E('div', 'card');
    head.innerHTML = '<h1>⭐ 收藏夹</h1><div class="muted">收藏重点题、易错题，随时回来复习。</div>' +
      '<div class="btn-row mt12"><button class="btn btn-mini" id="redo">🔁 重练收藏题</button>' +
      '<button class="btn btn-mini" id="backW">🧯 错题本</button></div>';
    view.appendChild(head);
    on($('#redo'), 'click', function () { go('#/redo/fav'); });
    on($('#backW'), 'click', function () { go('#/wrong'); });
    if (!ids.length) { view.appendChild(E('div', 'empty', '<span class="e-ico">⭐</span>还没有收藏。做题时点"⭐ 收藏"就能存到这里。')); return; }
    ids.forEach(function (id) {
      var q = D.questionById(id); if (!q) return;
      var l = D.byId(q._lesson);
      var holder = E('div', 'ex-card');
      view.appendChild(holder);
      holder.appendChild(E('div', 'small muted', (D.gradeById(q._grade) || {}).name + '　' + esc(l ? l.title : '')));
      Q.render(holder, q, { label: '藏', lessonId: q._lesson, onChange: render });
    });
  }

  /* ================= 页面：打卡统计 ================= */
  function pageStats() {
    var st = overallStats();
    var head = E('div', 'card');
    head.innerHTML = '<h1>📅 打卡统计</h1>' +
      '<div class="grid three mt12">' +
      '<div class="stat"><b>' + st.streak + '</b><span>连续打卡(天)</span></div>' +
      '<div class="stat"><b>' + st.days + '</b><span>累计学习(天)</span></div>' +
      '<div class="stat"><b>' + st.lessonsDone + '</b><span>学完讲次</span></div>' +
      '</div>' +
      '<h3 class="mt16">最近 9 周学习热力图</h3>' +
      '<div class="muted small mb8">颜色越深，说明那天学得越多</div>';
    view.appendChild(head);
    head.appendChild(buildHeat());

    var detail = E('div', 'card', '<h3>答题情况</h3>');
    detail.appendChild(E('div', 'grid three',
      '<div class="stat"><b>' + st.answered + '</b><span>累计答题</span></div>' +
      '<div class="stat"><b>' + st.rate + '%</b><span>总正确率</span></div>' +
      '<div class="stat"><b>' + st.master + '</b><span>已掌握题目</span></div>'));
    view.appendChild(detail);

    var tips = E('div', 'card');
    tips.innerHTML = '<h3>🐟 学习建议</h3><ul class="kp-list">' +
      '<li>' + (st.streak >= 3 ? '连续打卡 ' + st.streak + ' 天，太棒了！保持每天 2 讲，效果最好。' : '每天坚持 1–2 讲，比一次学 10 讲更有效。') + '</li>' +
      '<li>' + (st.wrongBook > 0 ? '错题本里还有 ' + st.wrongBook + ' 道题，每天重做 2 道，一周就能清空。' : '错题本很干净，说明你每一步都想清楚了。') + '</li>' +
      '<li>看过动画后，试着不看解析，自己讲一遍解题步骤——讲得出来才是真的会。</li></ul>';
    view.appendChild(tips);
  }
  function buildHeat() {
    var days = S.days();
    var wrap = E('div', '');
    var wk = E('div', 'heat-wrap');
    ['一', '二', '三', '四', '五', '六', '日'].forEach(function (d) { wk.appendChild(E('div', 'wk', d)); });
    wrap.appendChild(wk);
    var grid = E('div', 'heat');
    var today = new Date();
    var start = new Date(today.getTime() - (63 + ((today.getDay() + 6) % 7)) * 86400000);
    for (var i = 0; i < 70; i++) {
      var d = new Date(start.getTime() + i * 86400000);
      var k = fmtDate(d);
      var rec = days[k];
      var n = rec ? (rec.answered || 0) : 0;
      var lv = n === 0 ? '' : n <= 2 ? 'l1' : n <= 5 ? 'l2' : n <= 10 ? 'l3' : 'l4';
      var cell = E('i', lv);
      cell.title = k + '　答题 ' + n + ' 题';
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  /* ================= 页面：设置 ================= */
  function applyFont() {
    document.documentElement.setAttribute('data-fs', S.settings().fs || 'm');
  }
  function pageSettings() {
    var s = S.settings();

    /* 阅读字号 */
    var c0 = E('div', 'card');
    c0.innerHTML = '<h3>🔠 阅读字号</h3>' +
      '<div class="small muted">题目与解析的字号，看不清就调大一点（平板和电脑上效果最明显）。</div>' +
      '<div class="chips mt12" id="fsChips"></div>';
    view.appendChild(c0);
    var curFs = s.fs || 'm';
    [['s', '小'], ['m', '标准'], ['l', '大'], ['xl', '特大']].forEach(function (p) {
      var c = E('span', 'chip' + (curFs === p[0] ? ' active' : ''), p[1]);
      on(c, 'click', function () {
        S.setSettings({ fs: p[0] }); applyFont();
        Q.toast('字号已切换为「' + p[1] + '」'); render();
      });
      $('#fsChips').appendChild(c);
    });

    var c1 = E('div', 'card');
    c1.innerHTML = '<h1>⚙️ 设置与数据</h1>' +
      '<div class="row mt12"><div><b>动画语音解说</b><br><span class="small muted">播放动画时用中文朗读讲解（iPad 上需先点一次播放）</span></div>' +
      '<div class="spacer"></div><button class="btn btn-mini ' + (s.tts ? 'btn-primary' : '') + '" id="ttsBtn">' + (s.tts ? '已开启' : '已关闭') + '</button></div>';
    view.appendChild(c1);
    on($('#ttsBtn'), 'click', function () {
      var on = !S.settings().tts;
      S.setSettings({ tts: on });
      Q.toast(on ? '语音解说已开启 🔊' : '语音解说已关闭 🔇');
      render();
    });

    var c2 = E('div', 'card');
    c2.innerHTML = '<h3>数据备份</h3><div class="small muted">所有学习记录都保存在本机（不上传服务器）。换设备或清理浏览器前建议先导出备份。</div>' +
      '<div class="btn-row mt12">' +
      '<button class="btn btn-primary btn-mini" id="expBtn">⬇️ 导出备份文件</button>' +
      '<button class="btn btn-mini" id="impBtn">⬆️ 导入备份文件</button>' +
      '<button class="btn btn-mini" id="rstBtn">🗑 清空全部数据</button>' +
      '</div><input type="file" id="impFile" accept="application/json" hidden>';
    view.appendChild(c2);
    on($('#expBtn'), 'click', function () {
      var data = S.exportAll();
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '闹闹鱼数学课堂-学习记录-' + S.today() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
      Q.toast('备份文件已导出 ⬇️');
    });
    on($('#impBtn'), 'click', function () { $('#impFile').click(); });
    on($('#impFile'), 'change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try { S.importAll(JSON.parse(fr.result)); Q.toast('导入成功！'); render(); }
        catch (err) { Q.toast('导入失败：' + err.message); }
      };
      fr.readAsText(f);
    });
    on($('#rstBtn'), 'click', function () {
      if (confirm('确定要清空全部学习数据吗？此操作不可恢复（建议先导出备份）。')) {
        S.reset(); Q.toast('已清空'); render();
      }
    });

    var c3 = E('div', 'card');
    c3.innerHTML = '<h3>课程数据</h3><div class="small">共 ' + D.lessons.length + ' 讲、' + D.allQuestions().length + ' 道题、' + Object.keys(D.anims).length + ' 个动画讲解。</div>' +
      '<div class="btn-row mt12"><button class="btn btn-mini" id="instBtn2">📲 添加到 iPad 主屏幕</button></div>';
    view.appendChild(c3);
    on($('#instBtn2'), 'click', showInstallHelp);

    view.appendChild(E('div', 'card center small muted', '【闹闹鱼小学数学课堂】<br>愿每个孩子都能在思考中发现乐趣 🐟'));
  }

  /* ================= 页面：搜索结果 ================= */
  function pageSearch(kw) {
    kw = (kw || '').trim();
    var head = E('div', 'card');
    head.innerHTML = '<h1>🔍 搜索</h1>';
    var input = document.createElement('input');
    input.type = 'search'; input.value = kw; input.placeholder = '输入关键词，如：鸡兔、植树、周期、面积、分数';
    input.style.cssText = 'width:100%;min-height:46px;border:1.5px solid var(--line);border-radius:14px;padding:0 14px;outline:none';
    head.appendChild(input);
    var hist = E('div', 'chips mt8');
    S.history().forEach(function (k) {
      var c = E('span', 'chip soft', esc(k));
      on(c, 'click', function () { input.value = k; doSearch(k); });
      hist.appendChild(c);
    });
    if (S.history().length) head.appendChild(E('div', 'small muted mt8', '最近搜索'), hist);
    view.appendChild(head);
    var resultBox = E('div', '');
    view.appendChild(resultBox);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(input.value); });
    input.addEventListener('input', function () { if (input.value.length >= 1) doSearch(input.value, true); });
    if (kw) doSearch(kw);

    function highlight(text, k) {
      if (!k) return esc(text);
      var t = esc(text);
      try { return t.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), function (m) { return '<mark>' + m + '</mark>'; }); }
      catch (e) { return t; }
    }
    function doSearch(k, silent) {
      k = (k || '').trim();
      resultBox.innerHTML = '';
      if (!k) return;
      if (!silent) S.pushHistory(k);
      var lhits = D.lessons.filter(function (l) {
        return (l.title + l.subtitle + (l.tags || []).join('') + (l.keyPoints || []).join('') + (l.story || '')).indexOf(k) >= 0;
      });
      var qhits = D.allQuestions().filter(function (q) { return String(q.q).indexOf(k) >= 0; });
      if (!lhits.length && !qhits.length) {
        resultBox.appendChild(E('div', 'empty', '<span class="e-ico">🐡</span>没有找到"' + esc(k) + '"，换一个词试试？'));
        return;
      }
      if (lhits.length) {
        resultBox.appendChild(E('div', 'section-title', '<span class="bar"></span>相关课程（' + lhits.length + '）'));
        var c = E('div', 'card');
        lhits.forEach(function (l) {
          var it = E('div', 'sr-item', '<b>' + highlight(l.title, k) + '</b><small>' + (D.gradeById(l.grade) || {}).name + '　' + esc(l.subtitle) + '</small>');
          on(it, 'click', function () { go('#/lesson/' + l.id); });
          c.appendChild(it);
        });
        resultBox.appendChild(c);
      }
      if (qhits.length) {
        resultBox.appendChild(E('div', 'section-title', '<span class="bar"></span>相关题目（' + qhits.length + '）'));
        var c2 = E('div', 'card');
        qhits.slice(0, 40).forEach(function (q) {
          var l = D.byId(q._lesson);
          var it = E('div', 'sr-item', '<b>' + highlight(String(q.q).slice(0, 60), k) + '</b><small>' + (D.gradeById(q._grade) || {}).name + '　' + esc(l ? l.title : '') + '</small>');
          on(it, 'click', function () { go('#/lesson/' + q._lesson); });
          c2.appendChild(it);
        });
        if (qhits.length > 40) c2.appendChild(E('div', 'small muted', '仅显示前 40 条，输入更精确的关键词可以缩小范围'));
        resultBox.appendChild(c2);
      }
    }
  }

  /* ================= 页面：我的 ================= */
  function pageMine() {
    var st = overallStats();
    var c = E('div', 'card');
    c.innerHTML = '<h1>🐠 我的学习中心</h1>' +
      '<div class="grid three mt12">' +
      '<div class="stat"><b>' + st.streak + '</b><span>连续打卡</span></div>' +
      '<div class="stat"><b>' + st.answered + '</b><span>累计答题</span></div>' +
      '<div class="stat"><b>' + st.rate + '%</b><span>正确率</span></div>' +
      '</div>';
    view.appendChild(c);

    [['🧯 错题本（' + st.wrongBook + '）', '#/wrong', '收藏做错的题，随时重练'],
    ['⭐ 收藏夹（' + st.favs + '）', '#/fav', '你标记的重点题目'],
    ['📅 打卡统计', '#/stats', '热力图与学习建议'],
    ['📚 全部课程', '#/courses', '1–6 年级 ' + D.lessons.length + ' 讲'],
    ['⚙️ 设置与数据备份', '#/settings', '语音解说 · 导出导入 · 清空']].forEach(function (p) {
      var t = E('div', 'tile', '<div class="ico">' + p[0].slice(0, 2) + '</div><div><b>' + p[0].slice(2) + '</b><br><small>' + p[2] + '</small></div><div class="arrow">›</div>');
      on(t, 'click', function () { go(p[1]); });
      view.appendChild(t);
      view.appendChild(E('div', '', ''));
    });
    view.appendChild(E('div', 'card', '<h3>已掌握题目（' + st.master + '）</h3><div class="small muted">在题目卡片上点"✅ 已掌握"，这道题就会被标记并自动移出错题本。</div>' +
      '<div class="btn-row mt12"><button class="btn btn-mini" id="seeMaster">查看已掌握</button></div>'));
    on($('#seeMaster'), 'click', function () { go('#/master'); });
  }

  function pageMaster() {
    var ids = Object.keys(S.master());
    var head = E('div', 'card');
    head.innerHTML = '<h1>✅ 已掌握</h1><div class="muted">共 ' + ids.length + ' 题。这些题你都能讲得清清楚楚了。</div>';
    view.appendChild(head);
    if (!ids.length) { view.appendChild(E('div', 'empty', '<span class="e-ico">🐠</span>还没有标记过"已掌握"的题目')); return; }
    var byGrade = {};
    ids.forEach(function (id) { var q = D.questionById(id); if (q) (byGrade[q._grade] = byGrade[q._grade] || []).push(q); });
    Object.keys(byGrade).sort().forEach(function (g) {
      var gi = D.gradeById(g);
      view.appendChild(E('div', 'section-title', '<span class="bar"></span>' + gi.emoji + ' ' + gi.name));
      var c = E('div', 'card');
      byGrade[g].forEach(function (q) {
        var it = E('div', 'sr-item', '<b>' + esc(String(q.q).slice(0, 50)) + '</b><small>' + (D.byId(q._lesson) || {}).title + '</small>');
        on(it, 'click', function () { go('#/lesson/' + q._lesson); });
        c.appendChild(it);
      });
      view.appendChild(c);
    });
  }

  /* ================= 首次使用引导 ================= */
  function showInstallHelp() {
    var root = $('#modalRoot');
    root.hidden = false;
    root.innerHTML = '';
    var m = E('div', 'modal');
    m.innerHTML = '<h3>📲 把课堂装到 iPad 桌面</h3>' +
      '<div class="small">装好后就像 App 一样：全屏打开、可离线做题，不需要每次都输网址。</div>' +
      '<ol class="kp-list mt12">' +
      '<li>用 <b>Safari</b> 打开本站的网址。</li>' +
      '<li>点屏幕下方中间的 <b>分享按钮</b>（一个方框加向上箭头 ⬆️）。</li>' +
      '<li>在菜单里往下滑，选择 <b>"添加到主屏幕"</b>。</li>' +
      '<li>右上角点 <b>"添加"</b>，桌面上就会出现"闹闹鱼数学"的图标 🐟。</li>' +
      '</ol>' +
      '<div class="small muted">提示：电脑浏览器（Chrome / Edge）也可以点地址栏右侧的"安装"图标装成应用。</div>' +
      '<div class="btn-row mt16"><button class="btn btn-primary btn-block" id="closeInstall">知道啦</button></div>';
    var closeBtn = E('button', 'modal-x', '✕');
    m.insertBefore(closeBtn, m.firstChild);
    root.appendChild(m);
    function close() { root.hidden = true; root.innerHTML = ''; }
    on($('#closeInstall'), 'click', close);
    on(closeBtn, 'click', close);
    window.__nnCloseModal = close;
  }
  function closeModal() {
    var root = $('#modalRoot');
    if (!root || root.hidden) return;
    if (typeof window.__nnCloseModal === 'function') window.__nnCloseModal();
    else { root.hidden = true; root.innerHTML = ''; }
  }
  function maybeIntro() {
    var s = S.settings();
    if (!s.introShown) {
      S.setSettings({ introShown: true });
      setTimeout(showInstallHelp, 500);
    }
  }

  /* ================= 路由 ================= */
  function parse() {
    var raw = (location.hash || '').replace(/^#/, '') || '/home';
    var qs = {}, parts = raw.split('?');
    (parts[1] || '').split('&').forEach(function (kv) {
      if (!kv) return; var a = kv.split('='); qs[decodeURIComponent(a[0])] = decodeURIComponent(a[1] || '');
    });
    return { seg: parts[0].split('/').filter(Boolean), query: qs };
  }
  function render() {
    var r = parse(), seg = r.seg;
    NNAnim.pauseAll();
    if (window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (e) {} }
    view.innerHTML = '';
    window.scrollTo(0, 0);

    var top = seg[0] || 'home';
    var tabKey = { home: 'home', courses: 'courses', lesson: 'courses', daily: 'daily', wrong: 'wrong', redo: 'wrong', fav: 'wrong', mine: 'mine', stats: 'mine', settings: 'mine', master: 'mine', search: '' }[top] || 'home';
    $$('#tabbar .tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === tabKey); });

    switch (top) {
      case 'courses': pageCourses(r.query); break;
      case 'lesson': pageLesson(seg[1]); break;
      case 'daily': pageDaily(); break;
      case 'wrong': pageWrong(); break;
      case 'redo': pageRedo(seg[1] || 'wrong'); break;
      case 'fav': pageFav(); break;
      case 'stats': pageStats(); break;
      case 'settings': pageSettings(); break;
      case 'mine': pageMine(); break;
      case 'master': pageMaster(); break;
      case 'search': pageSearch(r.query.q || ''); break;
      default: pageHome();
    }
    /* 搜索关键词同步到输入框 */
    var kw = r.query.q || '';
    var si = $('#searchInput');
    if (si && top !== 'search') si.value = '';
  }

  /* ================= 顶栏行为 ================= */
  function initShell() {
    view = $('#view');
    topbar = $('#topbar');
    applyFont();
    on($('#brandHome'), 'click', function () { go('#/home'); });
    on($('#btnSearch'), 'click', function () {
      var sb = $('#searchbar');
      sb.hidden = !sb.hidden;
      if (!sb.hidden) $('#searchInput').focus();
    });
    on($('#searchClose'), 'click', function () { $('#searchbar').hidden = true; });
    var inp = $('#searchInput');
    on(inp, 'keydown', function (e) {
      if (e.key === 'Enter') { var v = inp.value.trim(); if (v) go('#/search?q=' + encodeURIComponent(v)); }
    });
    on($('#btnStats'), 'click', function () { go('#/stats'); });
    on($('#btnSettings'), 'click', function () { go('#/settings'); });
    on($('#modalRoot'), 'click', function (e) { if (e.target === this) closeModal(); });
    on(document, 'keydown', function (e) { if (e.key === 'Escape') closeModal(); });
    window.addEventListener('hashchange', render);
    render();
    maybeIntro();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initShell);
  else initShell();
})();
