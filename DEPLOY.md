# 部署到 GitHub Pages（iPad 可访问）

两种方式，**方式一最快、不需要令牌**；方式二需要你给我一个有效的 GitHub 令牌，由我帮你推送。

---

## 方式一：网页拖拽上传（推荐，2 分钟，无需令牌）

适合你已经有一个 GitHub 账号，不想折腾命令行/令牌的情况。

1. 打开 https://github.com 登录（用户名 **NaoYu520**）。
2. 右上角 **＋ → New repository（新建仓库）**。
   - Repository name 填：`naoyu-math`（或 `math-class`，随便起，英文/数字/中划线）
   - 选 **Public（公开）** —— 不公开无法用 GitHub Pages 免费托管
   - **不要**勾 "Add a README file"（我们已有内容）
   - 点 **Create repository**
3. 新仓库页面里，点 **"uploading an existing file"** 或中间的 **"upload files"** 链接。
4. 在本机找到文件夹 `C:/Users/HC04/Desktop/ABC/小学奥数学习/`，
   **把里面所有内容（index.html、css、js、icons、manifest.webmanifest、sw.js、.nojekyll 等）直接拖进网页的上传框**（可整文件夹拖）。
   ⚠️ 不要把 `小学奥数学习` 这个外层文件夹本身拖进去，要拖它**里面的文件**。
   ⚠️ `.nojekyll` 是隐藏文件，Windows 默认看不到——它已经在 zip 包里；若手动拖文件夹，请确认 `.nojekyll` 也被选中（可在文件夹选项里取消"隐藏受保护的操作系统文件"来看到它）。
5. 拖完后点绿色 **Commit changes**（提交）。
6. 进入仓库 **Settings → Pages**（左侧栏最下面），Source 选 **Deploy from a branch**，
   Branch 选 **main**（或 master，看你的默认分支名），目录选 **/ (root)**，点 Save。
7. 等 1–2 分钟，页面会显示网址：`https://NaoYu520.github.io/仓库名/`。
8. 用 **iPad 的 Safari** 打开该网址 → 点底部 **分享 ⬆️ → 添加到主屏幕** → 桌面出现 🐟 图标，全屏使用、可离线。

> 若你更想用我打好的 zip：`桌面\闹闹鱼小学数学课堂-部署包.zip`（238KB）。但 GitHub 网页**不会自动解压 zip**，请先解压，再把解压出的文件拖进第 4 步的上传框。

---

## 方式二：给我一个有效令牌，由我推送（一劳永逸）

如果你希望以后更新内容都让我来推，请这样生成令牌：

1. GitHub 右上角头像 → **Settings → Developer settings → Personal access tokens → Tokens (classic)**。
2. **Generate new token (classic)**。
3. Note 随便填（如 `deploy-math`），Expiration 选 **90 days** 或 No expiration（临时用选短一点）。
4. **勾选 `repo`**（这一项包含推送代码所需的所有子权限；若想用 Actions 自动部署，再勾 `workflow`）。
5. 拉到底点 **Generate token**，把生成的 `ghp_...` 整串复制发给我。
6. ⚠️ 复制时**不要多空格、不要少字符**；GitHub 只显示这一次，关掉页面就找不回了。

发我之后我会：建仓库 → 推送全部代码 → 开启 Pages → 把网址给你。

---

## 上线后更新内容怎么办

改了 `js/data/` 里的题目或 `css/`、`js/` 后，记得把 `sw.js` 顶部的
`const VERSION = 'v1.2.0';` 的版本号**加一位**（如 `v1.2.1`），
否则 iPad 缓存了旧文件，看不到更新。然后重新走上面的上传/推送步骤。

## 常见问题

- **页面打不开 / 白屏**：确认仓库是 **Public**；确认上传时包含了 `index.html` 且在根目录；确认已放 `.nojekyll`。
- **样式/动画没更新**：清掉 iPad Safari 的网站数据（设置 → Safari →  Advanced → Website Data → 删除本站点），或升级 `sw.js` 的 VERSION。
- **iPad 上动画没声音**：Safari 需用户先点一下页面才会允许语音；首次进入点任意按钮即可，设置页可关掉语音解说。
