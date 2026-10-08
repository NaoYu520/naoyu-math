# 【闹闹鱼小学数学课堂】课程内容创作规范（v1.2）

本文件是编写课程数据（`js/data/gX*.js`）的**唯一权威规范**。所有新讲必须严格遵守，写完后必须通过文末的自检命令。

---

## 1. 文件与注册方式

- 每个文件是一个自包含 IIFE，只负责 `push` 课程与动画，不导出任何东西。
- 文件骨架（**必须逐字遵守**）：

```js
/* ===== X年级课程（第5-10讲） ===== */
(function () {
  'use strict';
  var D = window.NN_DATA;
  var L = D.lessons;

  /* ---------------- 第5讲 xxx ---------------- */
  L.push({
    id: 'g1-05', grade: 1, topic: 'apply', emoji: '⚖️',
    title: '第5讲 移多补少',
    subtitle: '一句副标题，12字以内',
    tags: ['标签1', '标签2', '标签3'],
    story: '故事……（含 **加粗**，60~110字）',
    keyPoints: ['要点1（20~40字）', '要点2', '要点3', '要点4'],
    examples: [ /* 3 题 */ ],
    variants: [ /* 3 题 */ ],
    practice: [ /* 5 题 */ ]
  });

  /* 动画：放在文件末尾统一注册 */
  D.anims['a-g1-05-e1'] = { h: 260, steps: [ /* ... */ ] };
})();
```

- **ID 规则**：讲 `g{年级}-{两位讲号}`；题 `{讲id}-e1|e2|e3 / -v1|v2|v3 / -p1..p5`；动画 `a-{讲id}-e1|e2`。**全站唯一，绝不重复**。
- 新讲放新文件，不要改动 `g1.js`~`g6.js` 旧文件。

## 2. 每讲结构（固定 11 题）

| 区块 | 数量 | 要求 |
| --- | --- | --- |
| `examples` | 3 | e1、e2 **必须各带一个动画**（`animKey`）；e3 可不带。每题 `steps`（2~4 步分步解析）+ `hint`（启发式提示，不直接给答案） |
| `variants` | 3 | 和例题**同方法换场景**，难度略升。每题写 `solution`（2~4 句）。可配 `fig` 静态图 |
| `practice` | 5 | 由易到难，第 4、5 题是本讲最难的。每题写 `solution`。题型混合：至少 1 道 `choice` 或 `judge` |

- `topic` 只能是：`number` 数与规律 / `calc` 计算与巧算 / `geo` 图形与几何 / `apply` 典型应用题 / `logic` 推理与逻辑 / `travel` 行程问题 / `count` 计数与枚举。

## 3. 题目字段与答案书写

```js
{ id, type:'fill|choice|multi|judge', q, options, answer, tol?, hint?,
  steps, solution, animKey?, fig? }
```

- `fill`：`answer` 写**纯阿拉伯数字/分数/小数**（如 `'12'`、`'3/5'`、`'2.5'`）。**不要**带单位（批改引擎会自动剥离学生输入的单位）。多种写法都接受时用 `|` 分隔：`'3/5|0.6'`。需要容差时加 `tol: 0.05`。
- 多个空：答案按顺序写一个字符串，用逗号分隔：`'3,5'`（学生可用逗号/空格/顿号作答）。
- `choice`：`options: ['A选项文本', 'B选项文本', ...]`（**不要**在文本里加 "A." 前缀，界面自动编号），`answer` 写字母 `'B'`。选项 3~4 个。
- `multi`：同 choice，`answer` 写字母组合 `'AC'`（顺序无关）。
- `judge`：`answer: '对'` 或 `'错'`，题干以"判断："开头。
- `q` 中可用 emoji 增强趣味，可用 `**加粗**`（仅 story/keyPoints/题干支持，解析文本不用）。
- 难度纪律：一年级数不超 20（个别到 50）；二年级两位数以内的加减、表内乘除；三年级三位数、两位数乘法；四年级多步混合运算；五六年级含分数小数。

## 4. 动画 DSL（重点，务必遵守）

画布：宽 **640**，高 `h`（自定，200~300）。坐标原点在左上，y 向下。**所有图元的包围盒必须落在 0≤x≤640、0≤y≤h 内**（有自动校验，越界即失败）。

```js
D.anims['a-g1-05-e1'] = {
  h: 260,
  steps: [
    {
      say: '这一步的解说词，30~70字，像老师在孩子耳边讲。',
      items: [
        { id: 'a1', t: 'em', x: 80, y: 70, e: '🍎', n: 8, gap: 52 },
        { t: 'txt', x: 320, y: 200, s: '8 个苹果', size: 20, weight: 800, color: 'deep' }
      ]
    },
    {
      say: '第二步……',
      items: ['a1', { t: 'txt', x: 320, y: 160, s: '拿走 3 个', size: 18, weight: 700, color: 'orange' }]
    }
  ]
};
```

**规则**：
- `items` 里写**字符串** = 引用前面步骤已定义的同 id 元素（原样保留）；写**对象** = 新增或替换。给元素起 `id` 后，后续步骤可通过 `'id'` 引用、或写 `{ id:'a1', x: 新x }` 移动它（位置变化会走补间动画）。
- 每个动画 **4~6 步**，每步 **2~4 个图元**，每步 `say` 必须像"分步演示"（先…再…最后…）。
- 颜色只能用：`blue deep orange green red purple gray`（或写十六进制）。
- 文本宽度估算：一个汉字 ≈ size 像素宽，一个字母/数字 ≈ 0.58×size。默认 `anchor:'middle'`（以 x 为中心），长句请换行（`s` 里用 `\n`）或 `anchor:'start'` 从左边排。标题类文字 x 放 320 附近（居中），左排文字 x 从 30~60 起。

**图元清单**（`t` 字段，默认 'txt'）：

| t | 说明 | 关键参数 | 默认尺寸（估算包围盒用） |
| --- | --- | --- | --- |
| `txt` | 文字 | `s size(18) weight color anchor('middle')` | 宽=字数×size，高=行数×size×1.42，以 x,y 为中心 |
| `em` | 一排 emoji | `e n gap(34) size(30) dir('right'/'down') blabel` | 宽=(n-1)×gap+size，从 x−size/2 起向右 |
| `seq` | 一排字符（如数字/图案串） | `s gap(34) size(30)` | 宽=(字数-1)×gap+size |
| `box` | 圆角方框（可带字） | `w(90) h(52) label size color fill rx` | 以 x,y 为中心 |
| `bar` | 比例长条 | `w(240) h(30) val max label name color` | 从 x 向右 w；右侧 label 占位再 +60 |
| `cir` | 圆（可带字） | `r(26) label size color fill` | 以 x,y 为中心 |
| `dot` | 小圆点 | `r(5) color` | 以 x,y 为中心 |
| `line` | 线段 | `x1 y1 x2 y2 label color dash sw` | 标注在上方 22px |
| `arrow` | 箭头 | `x1 y1 x2 y2 label color` | 标注在上方 22px |
| `brace` | 大括号（横向） | `x1 x2 y1 h(9) label size color` | 标注在下方，高约 34+ |
| `hl` | 半透明高亮块 | `w(100) h(48) color alpha` | 以 x,y 为中心 |
| `grid` | 方格阵 | `cs(34) rows cols fillCells:['r,c'] fillColor label` | 从 x,y 向右下 rows×cs 高、cols×cs 宽 |
| `poly`/`tri` | 多边形 | `pts:['0,0','80,0','40,70']（相对 x,y） fill color label lx ly` | 按 pts 范围 |
| `axis` | 数轴 | `x1 x2 y ticks min max` | 下方刻度字高约 26 |

**动画叙事要求**（"更细"的验收标准）：
1. 第 1 步先"摆出题目场景"（原始对象都在场），不要一上来就给结论；
2. 中间步一次只演示一个操作（圈出一组 / 拿走一份 / 画一条辅助线 / 标出一个量）；
3. 结论步给出算式与结果（用 `txt`，`color:'green'`、`weight:800`）；
4. 如有公式/口诀，最后一步单独展示（`color:'deep'`）。

## 5. 写作风格

- `story`：延续"闹闹鱼"海底世界角色（闹闹鱼、小海龟、章鱼老师、海马村长、螃蟹教练等），故事要和本讲方法有关，结尾点出本讲要学什么。
- `keyPoints`：4 条，每条是"一句话方法"，孩子读完能照着用；别抄定义。
- `steps`（例题分步解析）：每步只做一件事，用"①先…②再…"的口语，最后一步写算式和答案。
- `solution`：2~4 句，先思路后算式，最后一句必须含答案和单位。
- `hint`：只给"往哪想"的提示，不剧透答案。
- 全程无错别字；算式用 `−`（减号 U+2212）`×` `÷` `＋` 与全角括号（ ），与现有题目保持一致。

## 6. 写完必须自检（缺一不可）

```bash
cd 项目根目录
C:/Users/HC04/.workbuddy/binaries/node/versions/22.22.2-6/node.exe --check js/data/g1b.js
C:/Users/HC04/.workbuddy/binaries/node/versions/22.22.2-6/node.exe --check js/data/g1c.js
```

语法不过不准交付。交付时报告：文件路径、讲数、题目数、动画数、check 结果。
