/* ===== store.js —— 本地数据存储（离线可用，无需登录） ===== */
(function () {
  'use strict';
  var P = 'nn_';

  function read(key, def) {
    try {
      var v = localStorage.getItem(P + key);
      return v ? JSON.parse(v) : def;
    } catch (e) { return def; }
  }
  function write(key, val) {
    try { localStorage.setItem(P + key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  var S = {
    KEY: P,
    /* ---------- 设置 ---------- */
    settings: function () {
      return Object.assign({ tts: true, speed: 1, haptic: true, nickname: '' }, read('settings', {}));
    },
    setSettings: function (patch) {
      var s = S.settings(); Object.assign(s, patch); write('settings', s); return s;
    },

    /* ---------- 答题记录 ---------- */
    records: function () { return read('records', {}); },
    record: function (qid, isOk, extra) {
      var r = read('records', {});
      var item = r[qid] || { ok: 0, bad: 0, last: null, ts: 0 };
      if (isOk) item.ok++; else item.bad++;
      item.last = isOk ? 'ok' : 'bad';
      item.ts = Date.now();
      if (extra) item.tag = extra;
      r[qid] = item;
      write('records', r);
      S.dayLog(isOk ? 1 : 0);
      return r;
    },
    getRecord: function (qid) { return S.records()[qid] || null; },

    /* ---------- 错题本 ---------- */
    wrong: function () { return read('wrong', {}); },
    isWrong: function (qid) { return !!S.wrong()[qid]; },
    addWrong: function (qid, lessonId, note) {
      var w = read('wrong', {});
      var it = w[qid] || { lessonId: lessonId, ts: Date.now(), count: 0, note: '' };
      it.count++; it.ts = Date.now(); it.lessonId = lessonId;
      if (note !== undefined) it.note = note;
      w[qid] = it; write('wrong', w); return w;
    },
    removeWrong: function (qid) {
      var w = read('wrong', {}); delete w[qid]; write('wrong', w); return w;
    },
    setWrongNote: function (qid, lessonId, note) {
      var w = read('wrong', {});
      var it = w[qid] || { lessonId: lessonId, ts: Date.now(), count: 1 };
      it.note = note; w[qid] = it; write('wrong', w); return w;
    },
    wrongCount: function () { return Object.keys(S.wrong()).length; },

    /* ---------- 收藏 / 已掌握 ---------- */
    favs: function () { return read('favs', {}); },
    isFav: function (qid) { return !!S.favs()[qid]; },
    toggleFav: function (qid) {
      var f = read('favs', {});
      if (f[qid]) delete f[qid]; else f[qid] = Date.now();
      write('favs', f); return !!f[qid];
    },
    master: function () { return read('master', {}); },
    isMaster: function (qid) { return !!S.master()[qid]; },
    toggleMaster: function (qid) {
      var m = read('master', {});
      if (m[qid]) delete m[qid]; else m[qid] = Date.now();
      write('master', m); return !!m[qid];
    },

    /* ---------- 每日打卡 ---------- */
    days: function () { return read('days', {}); },
    today: function () {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    dayLog: function (rightCount) {
      var days = read('days', {});
      var k = S.today();
      var d = days[k] || { answered: 0, right: 0, lessons: [] };
      d.answered = (d.answered || 0) + 1;
      d.right = (d.right || 0) + (rightCount ? 1 : 0);
      days[k] = d; write('days', days); return d;
    },
    markLesson: function (lessonId) {
      var days = read('days', {});
      var k = S.today();
      var d = days[k] || { answered: 0, right: 0, lessons: [] };
      d.lessons = d.lessons || [];
      if (d.lessons.indexOf(lessonId) < 0) d.lessons.push(lessonId);
      days[k] = d; write('days', days); return d;
    },
    streak: function () {
      var days = read('days', {});
      var n = 0, d = new Date();
      for (var i = 0; i < 400; i++) {
        var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        var rec = days[k];
        if (rec && (rec.answered > 0 || (rec.lessons && rec.lessons.length))) { n++; d.setDate(d.getDate() - 1); }
        else if (i === 0) { d.setDate(d.getDate() - 1); continue; } /* 今天还没学不断签 */
        else break;
      }
      return n;
    },
    totalDays: function () {
      var days = read('days', {}), n = 0;
      for (var k in days) if (days[k].answered > 0 || (days[k].lessons && days[k].lessons.length)) n++;
      return n;
    },

    /* ---------- 课程浏览记录 ---------- */
    readLog: function () { return read('read', {}); },
    markRead: function (lessonId, pct) {
      var r = read('read', {});
      var it = r[lessonId] || { ts: 0, pct: 0 };
      it.ts = Date.now();
      if (pct !== undefined) it.pct = Math.max(it.pct || 0, pct);
      r[lessonId] = it; write('read', r); return r;
    },
    readCount: function () { return Object.keys(S.readLog()).length; },

    /* ---------- 搜索历史 ---------- */
    history: function () { return read('hist', []); },
    pushHistory: function (kw) {
      if (!kw) return [];
      var h = read('hist', []);
      h = h.filter(function (x) { return x !== kw; });
      h.unshift(kw);
      h = h.slice(0, 12);
      write('hist', h); return h;
    },
    clearHistory: function () { write('hist', []); },

    /* ---------- 备份 / 恢复 ---------- */
    exportAll: function () {
      var out = { app: 'naonaoyu-math', version: 1, exportedAt: new Date().toISOString(), data: {} };
      ['settings', 'records', 'wrong', 'favs', 'master', 'days', 'read', 'hist'].forEach(function (k) {
        out.data[k] = read(k, null);
      });
      return out;
    },
    importAll: function (obj) {
      if (!obj || !obj.data) throw new Error('文件格式不正确');
      Object.keys(obj.data).forEach(function (k) {
        if (obj.data[k] !== null && obj.data[k] !== undefined) write(k, obj.data[k]);
      });
      return true;
    },
    reset: function () {
      ['settings', 'records', 'wrong', 'favs', 'master', 'days', 'read', 'hist'].forEach(function (k) {
        try { localStorage.removeItem(P + k); } catch (e) {}
      });
    },

    /* ---------- 统计汇总 ---------- */
    summary: function () {
      var rec = S.records(), ok = 0, bad = 0;
      for (var k in rec) { ok += rec[k].ok || 0; bad += rec[k].bad || 0; }
      return {
        answered: ok + bad, right: ok, wrong: bad,
        rate: (ok + bad) ? Math.round(ok / (ok + bad) * 100) : 0,
        wrongBook: S.wrongCount(), favs: Object.keys(S.favs()).length,
        master: Object.keys(S.master()).length, days: S.totalDays(), streak: S.streak(),
        lessons: S.readCount()
      };
    }
  };

  window.NNStore = S;
})();
