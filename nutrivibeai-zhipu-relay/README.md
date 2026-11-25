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
python3 -m unittest test_relay.py
# 只有在本地自行配置密钥后才做真实调用
# python3 local_server.py   # http://127.0.0.1:8787
```

## 阿里云控制台部署摘要(本步骤不写密钥)

1. 在香港地域创建函数计算 3.0 函数 `nutrivibeai-zhipu-relay`,运行时 Python 3.10,处理入口 `index.handler`。
2. 上传 `index.py`(也可将本目录打成 zip)。
3. 打开 HTTP 触发器。
4. 在函数环境变量中只添加 `ZHIPU_API_KEY`,值从保险库写入。
5. 记下实际地址 `https://nutrivibeai-zhipu-relay-<suffix>.cn-hongkong.fcapp.run`,把它设为 NutriVibeAI 仓库的 Actions variable `NEXT_PUBLIC_RELAY_URL`,然后重新部署 Pages。

Vercel API 路由只作备份。若启用备份,密钥同样只写在 Vercel 控制台环境变量里。公开 github.io 主站不要只依赖 vercel.app。
