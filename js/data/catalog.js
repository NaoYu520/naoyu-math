/* ===== catalog.js —— 课程目录、年级/专题定义与数据访问接口 =====
   数据结构说明：
   lesson = {
     id:'g1-01', grade:1, topic:'number', title, subtitle, tags:[], emoji,
     story:'趣味导入', keyPoints:['要点1',...],
     examples:[Q], variants:[Q], practice:[Q]
   }
   Q = { id, type:'fill|choice|multi|judge', q, options:[], answer, tol?, hint?,
         steps:['分步解析第1步',...], solution:'完整解析', animKey:'a-xxx', fig:{h,items} }
*/
(function () {
  'use strict';

  var DATA = {
    appName: '【闹闹鱼小学数学课堂】',
    slogan: '每条小鱼都能游出漂亮的算式 🐟',
    grades: [
      { id: 1, name: '一年级', emoji: '🐣', short: '1年级', desc: '数感启蒙 · 一一对应 · 找规律' },
      { id: 2, name: '二年级', emoji: '🐥', short: '2年级', desc: '巧算 · 植树 · 数图形 · 推理' },
      { id: 3, name: '三年级', emoji: '🐠', short: '3年级', desc: '和差 · 周期 · 周长 · 鸡兔同笼' },
      { id: 4, name: '四年级', emoji: '🐬', short: '4年级', desc: '和倍差倍 · 年龄 · 行程 · 数列' },
      { id: 5, name: '五年级', emoji: '🐳', short: '5年级', desc: '还原 · 过桥 · 面积 · 位值' },
      { id: 6, name: '六年级', emoji: '🦈', short: '6年级', desc: '分数应用 · 工程 · 比和比例 · 圆柱圆锥' }
    ],
    topics: [
      { id: 'number', name: '数与规律', emoji: '🔢' },
      { id: 'calc', name: '计算与巧算', emoji: '🧮' },
      { id: 'geo', name: '图形与几何', emoji: '📐' },
      { id: 'apply', name: '典型应用题', emoji: '🍎' },
      { id: 'logic', name: '推理与逻辑', emoji: '🧠' },
      { id: 'travel', name: '行程问题', emoji: '🚄' },
      { id: 'count', name: '计数与枚举', emoji: '🔍' }
    ],
    lessons: [],
    anims: {}
  };

  DATA.gradeById = function (g) {
    for (var i = 0; i < DATA.grades.length; i++) if (DATA.grades[i].id === Number(g)) return DATA.grades[i];
    return null;
  };
  DATA.topicById = function (t) {
    for (var i = 0; i < DATA.topics.length; i++) if (DATA.topics[i].id === t) return DATA.topics[i];
    return null;
  };
  DATA.byId = function (id) {
    for (var i = 0; i < DATA.lessons.length; i++) if (DATA.lessons[i].id === id) return DATA.lessons[i];
    return null;
  };
  DATA.lessonsOfGrade = function (g) {
    return DATA.lessons.filter(function (l) { return l.grade === Number(g); });
  };
  DATA.lessonsOfTopic = function (t) {
    return DATA.lessons.filter(function (l) { return l.topic === t; });
  };
  /* 全部题目（附所属讲信息），用于搜索、每日一练、错题本、统计 */
  DATA.allQuestions = function () {
    var out = [];
    DATA.lessons.forEach(function (l) {
      ['examples', 'variants', 'practice'].forEach(function (sec) {
        (l[sec] || []).forEach(function (q, i) {
          out.push(Object.assign({}, q, { _lesson: l.id, _grade: l.grade, _topic: l.topic, _sec: sec, _idx: i }));
        });
      });
    });
    return out;
  };
  DATA.questionById = function (qid) {
    var all = DATA.allQuestions();
    for (var i = 0; i < all.length; i++) if (all[i].id === qid) return all[i];
    return null;
  };
  /* 讲的全部题目数 */
  DATA.lessonQuestionCount = function (l) {
    return (l.examples || []).length + (l.variants || []).length + (l.practice || []).length;
  };
  /* 每日一练：按日期确定性地抽取 6 道题（跨年级混合，含错题优先） */
  DATA.dailySet = function (dateStr, wrongIds) {
    var all = DATA.allQuestions().filter(function (q) { return q._sec === 'practice'; });
    var seed = 0;
    String(dateStr).split('').forEach(function (c) { seed = (seed * 31 + c.charCodeAt(0)) % 1000000; });
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    var pool = all.slice();
    var picked = [];
    /* 先保证每个年级各 1 题 */
    for (var g = 1; g <= 6; g++) {
      var gq = pool.filter(function (q) { return q._grade === g; });
      if (!gq.length) continue;
      picked.push(gq[Math.floor(rnd() * gq.length)]);
    }
    /* 再补 2 道错题巩固 */
    if (wrongIds && wrongIds.length) {
      var ws = wrongIds.map(function (id) { return DATA.questionById(id); }).filter(Boolean);
      ws = ws.filter(function (q) { return picked.indexOf(q) < 0; });
      for (var i = 0; i < ws.length && picked.length < 8; i++) picked.push(ws[i]);
    }
    /* 不足就随机补 */
    var guard = 0;
    while (picked.length < 8 && guard++ < 200) {
      var q = pool[Math.floor(rnd() * pool.length)];
      if (q && picked.indexOf(q) < 0) picked.push(q);
    }
    return picked;
  };

  window.NN_DATA = DATA;
})();
