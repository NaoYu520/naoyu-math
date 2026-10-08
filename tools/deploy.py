#!/usr/bin/env python3
# 部署脚本（API 直推版 v2）：删空仓库 -> 带 auto_init 重建 -> 提交全部文件 -> 开 Pages
# 令牌通过环境变量 TOK 传入（不写死在文件里）。绕开 git 命令行（环境代理与 git 不兼容）。
import os, sys, json, base64, urllib.request, urllib.error

TOK = os.environ.get('TOK', '').strip()
if not TOK:
    print('ERROR: 未设置 TOK 环境变量'); sys.exit(1)

OWNER = 'NaoYu520'
REPO = 'naoyu-math'
API = 'https://api.github.com'
HEADERS = {'Authorization': 'Bearer ' + TOK, 'User-Agent': 'naoyu-deploy',
           'Accept': 'application/vnd.github+json'}
EXCLUDE_DIRS = {'.git', '.workbuddy', 'node_modules', '.shots', '__pycache__'}

def api(method, url, data=None):
    req = urllib.request.Request(url, headers=HEADERS, method=method)
    if data is not None:
        req.add_header('Content-Type', 'application/json')
        req.data = json.dumps(data).encode('utf-8')
    try:
        r = urllib.request.urlopen(req, timeout=60)
        return r.status, (json.loads(r.read() or b'{}') if r.read else {})
    except urllib.error.HTTPError as e:
        try: body = json.loads(e.read() or b'{}')
        except: body = {}
        return e.code, body

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 收集要推送的文件
files = []
for dp, dns, fns in os.walk(ROOT):
    dns[:] = [d for d in dns if d not in EXCLUDE_DIRS]
    for fn in fns:
        full = os.path.join(dp, fn)
        rel = os.path.relpath(full, ROOT).replace(os.sep, '/')
        files.append((rel, full))
files.sort()
print(f'待推送文件: {len(files)} 个')

# 1) 删除已存在的空仓库（忽略报错）
st, _ = api('DELETE', f'{API}/repos/{OWNER}/{REPO}')
print('删除旧仓库:', st)

# 2) 带 auto_init 重建（自带初始提交，避免空仓库 409）
st, body = api('POST', f'{API}/user/repos',
               {'name': REPO, 'private': False, 'auto_init': True,
                'default_branch': 'master',
                'description': '闹闹鱼小学数学课堂 - 小学奥数学习网站（PWA）'})
if st != 201:
    print('❌ 创建仓库失败:', st, body); sys.exit(1)
print('✅ 仓库已创建:', body.get('html_url'))

# 3) 取 master 当前提交（auto_init 的初始提交），作为父提交
st, body = api('GET', f'{API}/repos/{OWNER}/{REPO}/branches/master')
if st != 200:
    print('❌ 获取分支失败:', st, body); sys.exit(1)
parent_sha = body['commit']['sha']
base_tree_sha = body['commit']['commit']['tree']['sha']
print('✅ 初始提交:', parent_sha[:10])

# 4) 逐个创建 blob
blobs = {}
for rel, full in files:
    with open(full, 'rb') as f:
        content = base64.b64encode(f.read()).decode('ascii')
    st, body = api('POST', f'{API}/repos/{OWNER}/{REPO}/git/blobs',
                   {'content': content, 'encoding': 'base64'})
    if st != 201:
        print('❌ blob 失败', rel, st, body); sys.exit(1)
    blobs[rel] = body['sha']

# 5) 创建完整 tree（不挂 base_tree，整树替换为我的文件）
tree = [{'path': rel, 'mode': '100644', 'type': 'blob', 'sha': blobs[rel]} for rel, _ in files]
st, body = api('POST', f'{API}/repos/{OWNER}/{REPO}/git/trees', {'tree': tree})
if st != 201:
    print('❌ tree 失败', st, body); sys.exit(1)
tree_sha = body['sha']
print('✅ tree 创建（%d 个文件）' % len(tree))

# 6) 创建 commit（父 = 初始提交）
st, body = api('POST', f'{API}/repos/{OWNER}/{REPO}/git/commits',
               {'message': '闹闹鱼小学数学课堂：96讲1056题 + 动画讲解 + PWA',
                'tree': tree_sha, 'parents': [parent_sha]})
if st != 201:
    print('❌ commit 失败', st, body); sys.exit(1)
commit_sha = body['sha']
print('✅ commit 创建:', commit_sha[:10])

# 7) 更新 master 引用到新提交
st, body = api('PATCH', f'{API}/repos/{OWNER}/{REPO}/git/refs/heads/master',
               {'sha': commit_sha, 'force': True})
print('✅ master 引用更新:', st)

# 8) 开启 Pages（master 分支根目录，legacy 构建避免 Jekyll）
st, body = api('POST', f'{API}/repos/{OWNER}/{REPO}/pages',
               {'source': {'branch': 'master', 'path': '/'}, 'build_type': 'legacy'})
if st in (200, 201):
    print('✅ Pages 已开启:', body.get('html_url'))
else:
    st, body = api('PUT', f'{API}/repos/{OWNER}/{REPO}/pages',
                   {'source': {'branch': 'master', 'path': '/'}})
    print('Pages 更新:', st, body.get('html_url', ''))

print('---')
print('🎉 站点地址: https://' + OWNER + '.github.io/' + REPO + '/')
print('⏳ GitHub Pages 首次构建约需 1-2 分钟，之后刷新即可访问。')
