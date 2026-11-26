# nutrivibeai-zhipu-relay

NutriVibe AI 专用的智谱(Zhipu)中转。GitHub Pages 是静态站,密钥不能进前端、仓库或 Pages 产物。浏览器只向本函数 POST,函数用服务端环境变量 `ZHIPU_API_KEY` 调用智谱。

不要复用其他产品(例如庆南大学 FAQ)的中转地址。系统提示和数据都不同。

## 推荐部署

- 平台:阿里云函数计算 Function Compute 3.0,HTTP 触发器
- 地域:`cn-hongkong`(国内可访问;公开主站不要只依赖 vercel.app)
- 建议函数名:`nutrivibeai-zhipu-relay`
- 运行时:Python 3.10+,处理入口 `index.handler`。部署包主要是本目录的 `index.py`,无额外依赖
- 触发器:HTTP,允许匿名。靠 CORS 与限流保护
- 预期 URL 形态:`https://nutrivibeai-zhipu-relay-<suffix>.cn-hongkong.fcapp.run`
  - suffix 在创建函数时由账号分配。拿到真实地址后,把它写入 NutriVibeAI 仓库的 GitHub Actions variable `NEXT_PUBLIC_RELAY_URL`(只放 URL,不放密钥),然后重新跑 Pages 工作流
- 函数超时:建议 60 秒以上(周计划 JSON 可能较长)
- 内存:256 MB 以上
- 请求体限制:至少 6 MB(照片识别)

## 环境变量

只写在函数控制台(或等价的服务端配置)里。不要写入代码、Git、Pages 产物,也不要放到 `NEXT_PUBLIC_*` / `VITE_*` 变量中。

| 名称 | 必需 | 说明 |
|---|---|---|
| `ZHIPU_API_KEY` | 是 | 智谱 API 密钥,仅本中转的服务端环境变量 |

不要在文档或聊天里填写密钥值。函数创建好后,由保管方从保险库写入并测通。

## 模型与上游

- 菜谱 / 周计划 / 换菜:`glm-4-flash-250414`,失败时再试 `glm-4-flash`
- 照片识材:只用 `glm-4v-flash`,不要用纯文本模型认图
- 上游:`https://open.bigmodel.cn/api/paas/v4/chat/completions`
- 认证头:`Authorization: Bearer <ZHIPU_API_KEY>`

## CORS 与限制

允许的 Origin:

- `https://macshi716.github.io`
- `http://localhost:<port>`
- `http://127.0.0.1:<port>`

其他 Origin 一律拒绝。日志和浏览器响应都不包含密钥或上游完整报错,失败时只返回通用错误码(`not_configured`、`upstream`、`rate_limited`、`bad_request`、`payload_too_large`)。

- 文本请求:每 IP 每分钟 12 次
- 照片识别:每 IP 每分钟 6 次
- 限制文本字段与提示长度;图片最大 4 MB(jpeg/png/webp/gif,不接受 svg);请求体最大 6 MB

## 请求格式

`POST` JSON,`Content-Type: application/json`。

菜谱:

```json
{ "task": "recipes", "ingredients": "두부, 달걀", "servings": 2, "cookMinutes": 20, "preferences": "", "restrictions": "", "prioritizeExpiring": false }
```

成功返回 `{ "recipes": [...], "provider": "zhipu", "usedMock": false }`。

周计划:

```json
{ "task": "meal_plan", "startDate": "2026-11-23", "conditions": { "ingredients": "두부, 달걀", "servings": 2, "cookMinutes": 20 }, "pinned": [] }
```

成功返回 `{ "text": "{...days JSON...}", "provider": "zhipu" }`。前端再用内置菜谱库补齐空档。

换菜:`{ "task": "swap", "slot": "lunch", "avoidTitles": [], "conditions": { ... } }` → `{ "recipe": {...}, "provider": "zhipu" }`。

识材:`{ "task": "vision", "image": "data:image/jpeg;base64,...", "restrictions": "" }` → `{ "ingredients": ["두부"], "demo": false, "provider": "zhipu" }`。

密钥未配置或上游失败时返回 5xx 和通用错误码,站点回退到内置演示菜谱库。

## 本地校验(不必填写密钥)

```bash
cd nutrivibeai-zhipu-relay
python3 -m unittest discover -s . -p 'test_*.py'
# 只有在本地自行配置密钥后才做真实调用
# python3 local_server.py   # http://127.0.0.1:8787
```

## 阿里云控制台部署摘要(本步骤不写密钥)

1. 在香港地域创建函数计算 3.0 函数 `nutrivibeai-zhipu-relay`,运行时 Python 3.10,处理入口 `index.handler`。
2. 上传 `index.py`(也可将本目录打成 zip)。
3. 打开 HTTP 触发器。
4. 在函数环境变量中只添加 `ZHIPU_API_KEY`,值从保险库写入。
5. 记下实际地址 `https://nutrivibeai-zhipu-relay-<suffix>.cn-hongkong.fcapp.run`,把它设为 NutriVibeAI 仓库的 Actions variable `NEXT_PUBLIC_RELAY_URL`,然后重新部署 Pages。

## Vercel Hobby 备份

阿里云函数计算仍是推荐部署,处理入口保持 `index.handler`。同一目录另有 Vercel Hobby 能构建的 HTTP 入口 `api/index.py`:标准库 `BaseHTTPRequestHandler` 子类 `handler`。它只把 HTTP 请求转成现有函数计算事件,再调用 `index.handler`。CORS、限流、任务和错误码都不在适配器里重写。

不要把仓库根目录的 Next.js 应用部署到这个项目,也不要把它的 Framework 设成 Next.js、FastAPI、Flask 或 Django。Framework 留空时,Vercel 把 `api/index.py` 建成一个 Python 函数。已有 Hobby 项目是 `nutrivibeai-zhipu-relay`(`prj_pDK3cpLSZmOaPh7fX72hVpdEswuZ`)。

部署时只使用本目录:

1. 在项目设置里把 Root Directory 设为 `nutrivibeai-zhipu-relay`,或在本目录执行 CLI(已登录 Vercel 账号时):

```bash
cd nutrivibeai-zhipu-relay
npx vercel link --project nutrivibeai-zhipu-relay --yes
npx vercel deploy --prod
```

2. 运行时是 Python 3.12(`.python-version`),无第三方依赖。`vercel.json` 只把该函数的 `maxDuration` 设为 120 秒,低于 Hobby 的 300 秒上限。不要加多区域、自定义内存、Edge Runtime 或其他付费项。
3. 函数创建成功后,只在该 Vercel 项目的服务端环境变量里添加 `ZHIPU_API_KEY`。不要写入 Git、PR 或 `NEXT_PUBLIC_*`。
4. 生产请求路径是 `POST /api`。`Content-Type: application/json`,请求体与上文的 `recipes`、`meal_plan`、`swap`、`vision` 相同。前端变量 `NEXT_PUBLIC_RELAY_URL` 应写成 `https://<该次部署分配的主机>/api`,并且去掉末尾斜杠。主机名以 Vercel 控制台显示的为准;在第一次成功部署之前没有可调用的生产地址。
5. 浏览器预检是 `OPTIONS /api`。允许的 Origin 仍只有 `https://macshi716.github.io` 和 localhost / `127.0.0.1`。

Hobby 与函数计算的平台差异:Vercel 请求体上限是 4.5 MB,所有套餐相同。函数计算侧仍按 6 MB 请求体和 4 MB 图片校验。经 Vercel 发送的照片,base64 JSON 需要小于 4.5 MB,否则平台会在函数运行前拒绝。公开 github.io 主站不要只依赖 vercel.app。
