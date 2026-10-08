/* ===== grade.js —— 答案归一化与自动批改引擎 =====
   兼容：阿拉伯数字 / 中文数字（十二、一百零五、百分之二十五）/ 分数（3/5 与 五分之三）
       小数 / 百分数 / 带单位（3米、25个）/ 多空作答 / 多选 / 判断题 / 约等于容差
   设计原则：只要"数学含义相同"就算对，孩子写 12 或 十二 或 12个 都判对。
*/
(function () {
  'use strict';

  var D = { '零': 0, '〇': 0, '一': 1, '壹': 1, '二': 2, '两': 2, '贰': 2, '三': 3, '叁': 3, '四': 4, '肆': 4, '五': 5, '伍': 5, '六': 6, '陆': 6, '七': 7, '柒': 7, '八': 8, '捌': 8, '九': 9, '玖': 9 };
  var U = { '十': 10, '拾': 10, '百': 100, '佰': 100, '千': 1000, '仟': 1000 };
  var BIG = { '万': 10000, '亿': 100000000 };
  var NUMCH = '零〇一壹二两贰三叁四肆五伍六陆七柒八捌九玖十拾百佰千仟万';
  var NUMCH_ALL = NUMCH + '亿';

  var UNITS = ['千米', '平方厘米', '平方分米', '平方米', '立方米', '立方厘米', '厘米', '分米', '毫米',
    '小时', '分钟', '千克', '公斤', '公里', '元', '角', '分', '米', '吨', '克', '个小时',
    '岁', '年', '月', '日', '天', '秒', '人', '名', '位', '个', '只', '支', '张', '根', '棵', '朵',
    '辆', '条', '道', '次', '倍', '段', '块', '组', '种', '页', '盒', '箱', '袋', '间', '层', '度',
    '盏', '颗', '粒', '瓶', '杯', '盘', '套', '台', '件', '双', '对', '场', '题', '步', '楼', '圈',
    '排', '行', '列', '字', '张', '本', '堆', '份', '把', '顶', '副', '束', '架', '艘', '匹', '头'];
  UNITS.sort(function (a, b) { return b.length - a.length; });

  /* ---- 中文数字串 → 数值 ---- */
  function cnRun2num(s) {
    var result = 0, section = 0, number = 0, seen = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch in D) { number = D[ch]; seen = true; }
      else if (ch in U) {
        if (number === 0) number = 1;         /* 十二 → 10+2 */
        section += number * U[ch];
        number = 0; seen = true;
      } else if (ch in BIG) {
        section = (section + number) * BIG[ch];
        result += section; section = 0; number = 0; seen = true;
      }
    }
    if (!seen) return null;
    return result + section + number;
  }

  /* ---- 文本中的中文数字 / 分数 / 百分数 → 阿拉伯 ---- */
  function cnToArabic(str) {
    var s = str;
    /* 分之：A分之B → B/A */
    var reFen = new RegExp('([' + NUMCH_ALL.replace('亿', '') + '0-9]+)分之([' + NUMCH_ALL.replace('亿', '') + '0-9]+)', 'g');
    s = s.replace(reFen, function (m, a, b) {
      var na = /^[0-9]+$/.test(a) ? parseFloat(a) : cnRun2num(a);
      var nb = /^[0-9]+$/.test(b) ? parseFloat(b) : cnRun2num(b);
      if (na === null || nb === null || !na) return m;
      return nb + '/' + na;
    });
    /* 剩余的连续中文数字串 */
    var reRun = new RegExp('[' + NUMCH + ']+', 'g');
    s = s.replace(reRun, function (m) { var v = cnRun2num(m); return v === null ? m : String(v); });
    /* 廿 */
    s = s.replace(/廿/g, '20');
    return s;
  }

  /* ---- 预处理 ---- */
  function norm(s) {
    if (s === null || s === undefined) return '';
    s = String(s);
    /* 全角转半角 */
    s = s.replace(/[\uFF10-\uFF19]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[\uFF21-\uFF3A\uFF41-\uFF5A]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); });
    s = s.replace(/[／∕]/g, '/').replace(/[∶：]/g, ':').replace(/[＋]/g, '+').replace(/[－—–−]/g, '-')
      .replace(/[＊×]/g, '*').replace(/[÷]/g, '/')
      .replace(/[，,、；;]/g, ',')
      .replace(/[（(]/g, '(').replace(/[）)]/g, ')')
      .replace(/[。\.]+$/g, '')          /* 去掉句末句号 */
      .replace(/\s+/g, '');
    /* 常见前缀 */
    s = s.replace(/^(答案?是?[:：]?|答[:：]|等于|=|约等于|是|共|一共|大约|大约有)/g, '');
    s = s.replace(/^(是|有)/, '');
    s = s.replace(/\u00A0/g, '');
    /* 中文数字 → 阿拉伯 */
    s = cnToArabic(s);
    /* 百分数 */
    s = s.replace(/([0-9]+(?:\.[0-9]+)?)%/g, function (m, n) { return '(' + n + '/100)'; });
    /* 去掉尾随单位（循环，允许 "3厘米" → "3"） */
    var guard = 0;
    while (guard++ < 4) {
      var hit = false;
      for (var i = 0; i < UNITS.length; i++) {
        var u = UNITS[i];
        if (s.length > u.length && s.slice(-u.length) === u && /[0-9)\/]$/.test(s.slice(0, -u.length))) {
          s = s.slice(0, -u.length); hit = true; break;
        }
      }
      if (!hit) break;
    }
    return s;
  }

  /* ---- 数值/分数解析（精确分数，避免浮点误差） ---- */
  function parseFrac(s) {
    if (!s) return null;
    s = s.replace(/^\(+|\)+$/g, '');
    var m = s.match(/^(-?[0-9]+(?:\.[0-9]+)?)\/(-?[0-9]+(?:\.[0-9]+)?)$/);
    if (m) {
      var n = toFrac(m[1]), d = toFrac(m[2]);
      if (!n || !d || d.n === 0) return null;
      return reduce(n.n * d.d, n.d * d.n);
    }
    return toFrac(s);
  }
  function toFrac(str) {
    var m = String(str).match(/^(-?)([0-9]*)(?:\.([0-9]+))?$/);
    if (!m || (m[2] === '' && !m[3])) return null;
    var sign = m[1] === '-' ? -1 : 1;
    var ip = m[2] || '0', fp = m[3] || '';
    var den = Math.pow(10, fp.length);
    var num = parseInt(ip + fp, 10) || 0;
    return reduce(sign * num, den);
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function reduce(n, d) { var g = gcd(n, d); return { n: n / g, d: d / g }; }
  function fracEq(a, b) { return a && b && a.n * b.d === b.n * a.d; }
  function fracToStr(f) { if (!f) return ''; return f.d === 1 ? String(f.n) : (f.n + '/' + f.d); }

  /* ---- 单个答案判定 ---- */
  function oneEq(userRaw, stdRaw, opt) {
    opt = opt || {};
    var u = norm(userRaw), s = norm(stdRaw);
    if (u === '' || s === '') return u === s;
    if (u === s) return true;
    /* 选择题字母 */
    if (/^[a-e]+$/i.test(u) && /^[a-e]+$/i.test(s)) {
      return u.toUpperCase().split('').sort().join('') === s.toUpperCase().split('').sort().join('');
    }
    /* 判断/是非 */
    var YES = ['对', '正确', '是', 'true', 't', 'v', '√', 'shide', 'dui'], NO = ['错', '错误', '否', 'false', 'f', 'x', '×', 'budui', 'cuo'];
    if (YES.indexOf(s) >= 0 || NO.indexOf(s) >= 0) {
      var sv = YES.indexOf(s) >= 0;
      var uv = YES.indexOf(u) >= 0 ? true : (NO.indexOf(u) >= 0 ? false : null);
      if (uv !== null) return sv === uv;
    }
    /* 数值比较 */
    var fu = parseFrac(u), fs = parseFrac(s);
    if (fu && fs) {
      if (fracEq(fu, fs)) return true;
      if (opt.tol) {
        var du = fu.n / fu.d, ds = fs.n / fs.d;
        return Math.abs(du - ds) <= opt.tol + 1e-12;
      }
      /* 四舍五入到整数也接受（如 3.0 与 3） */
      return false;
    }
    /* 去尾零 / 去空格后字符串比较 */
    var u2 = u.replace(/(\.[0-9]*?)0+$/g, '$1').replace(/\.$/, '');
    var s2 = s.replace(/(\.[0-9]*?)0+$/g, '$1').replace(/\.$/, '');
    if (u2 === s2) return true;
    /* 集合式答案（顺序无关），如 "红黄蓝" */
    if (opt.unordered && u.length === s2.length) {
      return u.split('').sort().join('') === s2.split('').sort().join('');
    }
    return false;
  }

  /* 标准答案拆成多个可接受形式（用 | 分隔） */
  function alts(std) {
    return String(std).split('|').map(function (x) { return x.trim(); }).filter(function (x) { return x !== ''; });
  }

  function splitUser(input) {
    return String(input).split(/[,;，、]+|\s+/).map(function (x) { return x.trim(); }).filter(function (x) { return x !== ''; });
  }

  /* ---- 主判定 ---- */
  function check(q, input) {
    var type = q.type || 'fill';
    var std = q.answer;

    if (type === 'choice' || type === 'multi') {
      var stdLetters = (Array.isArray(std) ? std.join('') : String(std)).toUpperCase().replace(/[^A-E]/g, '');
      var userLetters = (Array.isArray(input) ? input.join('') : String(input)).toUpperCase().replace(/[^A-E]/g, '');
      var a = stdLetters.split('').sort().join(''), b = userLetters.split('').sort().join('');
      return { ok: !!b && a === b, expected: [stdLetters] };
    }

    if (type === 'judge') {
      var okj = oneEq(input, std);
      return { ok: okj, expected: [String(std)] };
    }

    /* 填空（可多空） */
    var stdArr = Array.isArray(std) ? std : [std];
    var userArr = splitUser(input);
    var ok = true, detail = [];
    if (stdArr.length > 1) {
      if (userArr.length !== stdArr.length) {
        /* 允许整体当作一个答案再试一次 */
        var allInOne = true;
        for (var i = 0; i < stdArr.length; i++) {
          if (!alts(stdArr[i]).some(function (s) { return oneEq(input, s, q); })) { allInOne = false; break; }
        }
        if (!allInOne) return { ok: false, expected: stdArr.map(function (s) { return alts(s)[0]; }), reason: '共 ' + stdArr.length + ' 空' };
      }
      for (var j = 0; j < stdArr.length; j++) {
        var uv = userArr.length === stdArr.length ? userArr[j] : input;
        var good = alts(stdArr[j]).some(function (s) { return oneEq(uv, s, q); });
        detail.push(good);
        if (!good) ok = false;
      }
    } else {
      ok = alts(stdArr[0]).some(function (s) { return oneEq(input, s, q); });
    }
    return { ok: ok, expected: stdArr.map(function (s) { return alts(s)[0]; }), detail: detail };
  }

  /* 展示用答案文本 */
  function show(answer) {
    var arr = Array.isArray(answer) ? answer : [answer];
    return arr.map(function (a) { return String(a).split('|')[0]; }).join('　');
  }

  /* 给"在线作答"自动生成提示：如答案含单位，判断用户是否漏写 */
  function hintLeak(q, input) {
    var e = show(q.answer);
    var u = norm(input);
    if (/^[0-9.]+$/.test(u) && /[^0-9.]$/.test(e)) {
      return '数字对了，别忘了写**单位**或**完整答句**哦～';
    }
    return '';
  }

  window.NNGrade = { check: check, norm: norm, show: show, cnToArabic: cnToArabic, oneEq: oneEq, hintLeak: hintLeak, fracToStr: fracToStr };
})();
