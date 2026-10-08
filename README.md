# 【闹闹鱼小学数学课堂】🐟

一个面向小学 1–6 年级的**趣味奥数学习网站**（PWA，可离线、可装到 iPad 桌面），纯静态、零依赖、无需服务器与数据库。

线上地址示例（部署后替换为自己的）：`https://<你的用户名>.github.io/<仓库名>/`

---

## 一、它能做什么

| 模块 | 说明 |
| --- | --- |
| 📚 课程体系 | 1–6 年级共 **96 讲**（每年级 16 讲），覆盖数与规律、计算巧算、图形几何、典型应用题、推理逻辑、行程、计数七大专题 |
| 🎬 动画讲解 | 每讲例题配**分步动画**（170 个脚本，每个 4~6 步）：▶ 播放 / ⏸ 暂停 / 单步 ◀▶ / 🔄 重播，并带**中文语音解说同步** |
| 📘 例题精讲 | 每道例题都能"**逐步展开解析**"，一步一步点开，不一次性剧透 |
| 🔁 举一反三 | 每讲 3 道变式题，同一方法换个场景再练一次 |
| ✍️ 练习小测 | 每讲 5 道练习，**在线作答、自动批改**，全部带答案与解析 |
| ⌨️ 中文数字兼容 | 输入 `12`、`十二`、`12个`、`3/5`、`五分之三`、`25%` 都能判对；多空答案用逗号/空格/顿号分开即可 |
| 🧯 错题本 | 做错自动收录，重做做对自动移出，可手动移除或加备注 |
| ⭐ 收藏 / ✅ 已掌握 | 每题都能标记，形成自己的重点题库 |
| ✏️ 每日一练 | 按日期确定性地抽 8 题（每年级至少 1 题 + 错题优先），每天不一样 |
| 📅 打卡统计 | 连续打卡天数、9 周学习热力图、正确率与学习建议 |
| 🔍 搜索 | 全站搜索课程、知识点、题干，高亮命中并保留搜索历史 |
| 🏷 筛选 | 年级 + 专题双维度筛选，课程卡片显示进度 |
| 💾 数据备份 | 一键导出 / 导入 JSON 学习记录，也可清空 |
| 🔠 阅读字号 | 小 / 标准 / 大 / 特大 四档，切换后立即生效并记住选择 |
| 📱 平板适配 | iPad 竖屏双列、横屏（≥1100px）三列，触控目标加大 |
| 🎉 鼓励动效 | 答对时小鱼与星星飘落 + 卡片轻微弹动（尊重系统"减弱动效"设置） |

**题目总量：1056 题**（例题 288 · 举一反三 288 · 练习 480），全部含答案与解析；**动画讲解 170 个**（每讲例题 e1、e2 各配一个，分 4~6 步演示）。

---

## 二、目录结构

```
小学奥数学习/
├── index.html                  # 单页应用入口
├── manifest.webmanifest        # PWA 清单
├── sw.js                       # Service Worker（离线缓存）
├── css/style.css               # 全部样式（含 iPad 安全区适配）
├── js/
│   ├── store.js                # 本地存储：进度/错题/收藏/打卡/备份
│   ├── grade.js                # 自动批改引擎（中文数字、分数、单位、多空）
│   ├── anim.js                 # 动画引擎（SVG 分步 + 语音解说）
│   ├── quiz.js                 # 题目卡片渲染与作答交互
│   ├── app.js                  # 路由与各页面
│   └── data/
│       ├── catalog.js          # 年级/专题/数据访问接口
│       └── g1.js … g6c.js      # 各年级课程内容与动画脚本（每年级 3 个文件，共 16 讲/年级）
├── icons/                      # 应用图标（含 apple-touch-icon）
├── tools/
│   ├── make_icons.py           # 生成图标（Pillow）
│   ├── validate.js             # 课程数据自检
│   └── test-grade.js           # 批改引擎回归测试
└── .github/workflows/deploy-pages.yml   # GitHub Pages 自动部署
```

---

## 三、本地预览

因为用到 Service Worker，需通过 HTTP 打开（直接双击 `index.html` 也能用，只是没有离线缓存）：

```bash
cd 小学奥数学习
node tools/serve.js 8899        # 自带的小服务器（也可用 python -m http.server 8899）
# 浏览器打开 http://127.0.0.1:8899
```

自检命令（需要 Node.js；带界面的两项需先启动上面的服务器）：

```bash
node tools/serve.js 8899 &      # 界面类测试要用 http 源（file:// 下无 localStorage）
node tools/validate.js          # 数据结构检查
node tools/test-grade.js        # 批改引擎全量回归（含 1056 题自洽检查）
node tools/check-layout.js      # 动画图元是否越界
node tools/smoke.js             # 页面交互冒烟
node tools/test-modal.js        # 弹窗可关闭性
node tools/test-ui.js           # 字号 / 平板布局 / 鼓励动效
```

---

## 四、部署到 GitHub Pages

### 方式 A：自动部署（推荐）

1. 新建一个 GitHub 仓库（例如 `naonaoyu-math`），把本目录所有文件推上去：
   ```bash
   git init
   git add .
   git commit -m "feat: 闹闹鱼小学数学课堂 v1.0"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/naonaoyu-math.git
   git push -u origin main
   ```
2. 仓库 → **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 推送后 Actions 会自动运行 `Deploy 闹闹鱼小学数学课堂 to GitHub Pages`，完成后在 **Pages** 页面能看到地址：
   `https://<你的用户名>.github.io/naonaoyu-math/`

### 方式 B：分支直发（更简单）

仓库 → **Settings → Pages → Source** 选择 **Deploy from a branch** → 分支 `main`、目录 `/ (root)` → Save。
等 1 分钟左右即可访问同一地址。

> 仓库名如果直接叫 `<你的用户名>.github.io`，地址就是 `https://<你的用户名>.github.io/`。
> 本项目全部使用**相对路径**，放在子目录（如 `/naonaoyu-math/`）下也能正常工作。

---

## 五、iPad / iPhone 安装（像 App 一样用）

1. 用 **Safari** 打开部署好的网址。
2. 点底部中间的**分享按钮**（方框 + 向上箭头）。
3. 下滑选择 **"添加到主屏幕"** → 右上角 **添加**。
4. 桌面出现 🐟 图标，点开后全屏运行、无需网络即可做题。

> 首次打开会弹出安装引导；也可以在"我的 → 设置"里随时查看这个指南。
> 语音解说需要先点一次"播放"才能出声（iOS 对自动播放有限制）。

---

## 六、内容维护：怎么增加一讲

1. 打开 `js/data/gXc.js`（X 为年级，新讲加在最后一个数据文件里），往 `D.lessons` 里加一个讲对象（完整规范见 `tools/CONTENT_SPEC.md`）：

```js
D.lessons.push({
  id: 'g3-05', grade: 3, topic: 'geo', emoji: '🧩',
  title: '第5讲 ×××', subtitle: '一句话说明', tags: ['标签1', '标签2'],
  story: '趣味导入小故事（支持 **加粗**）',
  keyPoints: ['要点一', '要点二', '要点三'],
  examples: [{
    id: 'g3-05-e1', type: 'fill', answer: '42', animKey: 'a-g3-05-e1',
    q: '题干文字', hint: '给孩子的提示',
    steps: ['分步解析第1步', '第2步', '第3步']
  }],
  variants: [{ id: 'g3-05-v1', type: 'choice', options: ['选项A', '选项B'], answer: 'A', q: '题干', solution: '解析' }],
  practice: [{ id: 'g3-05-p1', type: 'fill', answer: '7', q: '题干', solution: '解析' }]
});
```

2. 如果要动画，在文件末尾的 `Object.assign(D.anims, { ... })` 里加：

```js
'a-g3-05-e1': {
  h: 250,
  steps: [
    { say: '第一步的语音解说文字', items: [{ id: 'a', t: 'box', x: 150, y: 110, label: '42', color: 'blue' }] },
    { say: '第二步', items: ['a', { t: 'txt', x: 430, y: 110, s: '结论', size: 20, color: 'deep' }] }
  ]
}
```

> `items` 里写字符串 = 复用前面定义过的同 id 元素；改 `x/y` 会自动产生位移动画。
> 图元类型：`txt / em(重复emoji) / seq(串 emoji) / box / bar / cir / dot / line / arrow / brace / hl / grid / poly / axis`。

3. 修改 `sw.js` 顶部的 `VERSION`（例如改成 `v1.1.0`），用户下次打开就会自动更新缓存。
4. 跑一遍 `node tools/validate.js && node tools/test-grade.js` 确认没有结构错误。

### 题目字段速查

| 字段 | 说明 |
| --- | --- |
| `type` | `fill` 填空 / `choice` 单选 / `multi` 多选 / `judge` 判断，缺省为 `fill` |
| `answer` | 字符串；多个空用数组（`['9','11']`）；一个答案多种写法用 `\|` 分隔（`'5/2\|2.5'`） |
| `options` | 选择题选项数组，答案写字母（`'B'`，多选写 `'AC'`） |
| `tol` | 允许的数值误差（如约等于题写 `1`） |
| `steps` | 分步解析（逐步展开）；`solution` 为整段解析 |
| `animKey` | 关联的动画键名 |
| `fig` | 静态配图 `{ h: 160, items: [...] }`，图元同动画 |

---

## 七、数据与隐私

- 所有学习记录（进度、错题、收藏、打卡）都保存在**浏览器本地 localStorage**，不上传任何服务器，无需注册登录。
- 换设备或清理浏览器数据前，请在"设置 → 导出备份文件"保存一份 JSON，之后在新设备导入即可。
- 不同仓库路径/域名下的数据互相独立。

---

## 八、技术说明

- 纯静态：HTML + CSS + 原生 JavaScript，**零第三方依赖**，无构建步骤。
- 动画引擎自研：声明式场景（`steps[].items`）+ SVG + CSS 过渡，支持元素复用、位移补间、内容替换。
- 语音解说使用浏览器 `speechSynthesis`（zh-CN），可一键关闭。
- 批改引擎支持中文数字（十二、三百零六、一万零五）、分数（3/5 与 五分之三）、百分数、带单位、多空答案、判断与选择。
- Service Worker：预缓存全部课程资源，导航请求"网络优先 + 离线回退"，静态资源"缓存优先 + 后台更新"。

---

【闹闹鱼小学数学课堂】—— 愿每个孩子都能在思考中发现乐趣。
