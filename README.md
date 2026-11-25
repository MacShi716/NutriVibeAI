# NutriVibe AI

生成式 AI 个性化饮食规划 + 购物清单网页应用(Next.js MVP),附带生成韩语项目计划书报告的 Python 工具链。

用户输入现有食材、偏好、忌口/过敏、人数、烹饪时间,系统生成 2~3 个家庭菜谱,用内置营养数据重算热量与营养,并把缺少的食材自动整理成购物清单。界面语言为韩语。

## 功能

- **菜谱生成**:首页表单(食材 / 偏好 / 忌口·过敏 / 人数 1~12 / 烹饪时间 5~180 分钟 / 目标热量)→ `POST /api/recipes`
- **两种生成模式**:智谱 GLM(经专用中转) / 演示模式(mock),失败自动回退(见下文)
- **演示菜谱库**:71 个韩国家常菜模板 + 匹配引擎(配料表必须包含输入食材;贪心覆盖所有输入食材;无匹配时显示道歉卡和 Naver/Google 搜索链接)
- **中→韩食材别名**:输入中文食材名也能匹配(110+ 条映射)
- **忌口/过敏过滤**:规则过滤 + 危险提示
- **营养计算**:68 种食材参考数据(每 100g/100ml),AI 给出的数值不作最终依据
- **菜谱详情**:热量明细、1 人份营养、保有食材利用率、收藏
- **购物清单**:缺料自动生成、按类别分组、勾选、复制
- **收藏 + 生成历史**(最近 20 条,可一键重新生成)
- **个人身体档案**:BMI、BMR(Mifflin-St Jeor)、TDEE、目标热量
- **游戏化**:积分 / 等级(Lv.1~10)/ 12 个成就 / 每日任务 / 菜谱轮盘 / 食材图鉴,全局 toast 通知
- **营养剂计划**(`/supplements`):用户自行添加/修改/删除项目、设定每日次数与单次用量,勾选今日服用,可选下次提醒时间。默认空列表,不预置个人补剂
- **份量确认**:添加食材或把菜谱记入今日营养时询问用量/份数,不默认假设
- **热量加法式**:在有分项数值时显示 `120 + 80 = 200 kcal` 这类算式,而不仅是一个总数
- **DiningCode 外食入口**:从首页、周食谱、购物清单、营养剂页跳转到公开搜索 `https://www.diningcode.com/list.dc?query=`
- **本地提醒**:用户可开启午餐前(11:50)、晚餐前(17:50)蔬菜提醒,以及周三/周日 18:00 购物清单提醒。静态站点用本机时间 + Notification API 或页内横幅,拒绝通知时仍可看横幅
- 所有用户数据保存在浏览器 localStorage(键前缀 `nutrivibe:`),无账号、无服务端数据库

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 14(App Router)、React 18、TypeScript、Tailwind CSS |
| 后端 | Next.js API Route(`app/app/api/recipes/route.ts`) |
| LLM | 智谱 GLM。菜谱/周计划用 `glm-4-flash-250414`(失败时 `glm-4-flash`),识材用 `glm-4v-flash`。公开站经专用中转调用,密钥不进前端 |
| 存储 | 浏览器 localStorage |
| 数据 | `app/data/nutrition-data.json`(68 种食材) |
| 质量 | ESLint(`next lint`)、TypeScript(`tsc --noEmit`),当前均 0 错误 |
| 报告工具链 | Python(reportlab、python-docx、matplotlib、Pillow、pypdf)+ PowerShell(Word COM) |

## 目录结构

```
NutriVibeAI/
├── README.md
├── .gitignore
├── app/                              # Next.js 应用
│   ├── .env.local.example            # 环境变量模板(复制为 .env.local)
│   ├── package.json / package-lock.json
│   ├── next.config.mjs / tailwind.config.ts / postcss.config.mjs / tsconfig.json / .eslintrc.json
│   ├── app/
│   │   ├── layout.tsx                # 根布局、导航、免责声明
│   │   ├── page.tsx                  # 首页输入表单
│   │   ├── globals.css               # Tailwind + 动画
│   │   ├── api/recipes/route.ts      # POST:参数校验 → generateRecipes()
│   │   ├── recipes/page.tsx          # 推荐结果列表
│   │   ├── recipes/[id]/page.tsx     # 菜谱详情
│   │   ├── shopping-list/page.tsx    # 购物清单
│   │   ├── favorites/page.tsx        # 收藏 + 历史
│   │   ├── profile/page.tsx          # 身体档案
│   │   ├── supplements/page.tsx      # 营养剂计划与本地提醒
│   │   └── game/page.tsx             # 游戏中心
│   ├── components/                   # GameToast / VisitTracker / GenerationSteps / useCountUp
│   ├── lib/
│   │   ├── gemini.ts                 # LLM 调用(智谱)、Prompt、JSON 解析、过滤、generateRecipes()
│   │   ├── mock.ts                   # 71 个菜谱模板 + mockRecipes() 匹配引擎
│   │   ├── alias.ts                  # 中→韩食材别名
│   │   ├── nutrition.ts              # 食材量解析、营养计算
│   │   ├── shopping.ts               # 购物清单生成/合并/分类
│   │   ├── profile.ts                # BMI / BMR / 目标热量
│   │   ├── gamification.ts           # 积分、等级、成就、任务、图鉴
│   │   ├── storage.ts                # localStorage 封装
│   │   └── types.ts                  # 公共类型
│   └── data/nutrition-data.json      # 营养参考数据
├── nutrivibeai-zhipu-relay/           # 智谱专用中转(密钥只放服务端环境变量)
└── nutrivibe_build/                  # 韩语报告生成工具链
    ├── build_report.py               # 同源生成 PDF + DOCX(正文在脚本内 CONTENT 列表)
    ├── make_figures.py               # 生成 fig1_flow.png / fig2_arch.png
    ├── fig1_flow.png / fig2_arch.png # 报告插图(用户流程图、系统架构图)
    ├── convert.ps1                   # Word COM 把 DOCX 导出为 docx_preview.pdf(核对页数)
    └── verify_report.py              # 校验页数、孤悬标题、关键词
```

## 运行方式(app)

需要 Node.js 18.17+。

```powershell
cd app
npm install
copy .env.local.example .env.local   # 可选:填入 API key;不填则为演示模式
npm run dev                          # http://localhost:3000
```

其他命令:

```powershell
npm run build        # 生产构建(含 API Route, Vercel 备份用; 先停掉 dev)
npm run build:pages  # GitHub Pages 静态导出, 产物在 app/out
npm start            # 启动生产服务
npm run lint         # ESLint
npx tsc --noEmit     # 类型检查
```

注意事项:

1. **dev 运行期间不要执行 `npm run build`**:build 会重写 `.next`,导致 dev 的 chunk 404/500。先停 dev,build 后删除 `app/.next` 再重启 dev。
2. 修改源码或 `.env.local` 后,建议删除 `app/.next` 再重启 dev。
3. 页面 `<html lang>` 的 hydration 警告通常是浏览器自动翻译引起的,已用 `suppressHydrationWarning` 处理。

## 环境变量(`app/.env.local.example`)

把 `app/.env.local.example` 复制为 `app/.env.local` 后填写。`.env.local` 已被 `.gitignore` 排除,**不要提交**。密钥只能放在中转函数或 Vercel 控制台的服务端环境变量里,不要放进仓库、Pages 产物,也不要使用 `NEXT_PUBLIC_` / `VITE_` 前缀携带密钥。

| 变量 | 必需 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_RELAY_URL` | 否 | 浏览器可访问的专用中转地址,不含密钥。GitHub Pages 构建从仓库 Actions variable 读入。留空则公开站回退演示模式。 |
| `ZHIPU_API_KEY` | 否 | 智谱 API 密钥。只写在中转的服务端环境变量,或 Vercel 控制台(API 备份)。 |
| `LLM_PROVIDER` | 否 | 强制指定 `zhipu` / `mock`;留空则有服务端密钥时用智谱,否则演示模式。 |

专用中转源码在 `nutrivibeai-zhipu-relay/`。推荐部署到阿里云函数计算香港区域,函数名 `nutrivibeai-zhipu-relay`。不要复用其他项目的中转地址。

## 两种模式:智谱 / 演示(mock)

- **公开 GitHub Pages 站**:浏览器用 `NEXT_PUBLIC_RELAY_URL` 向专用中转 POST。中转用服务端 `ZHIPU_API_KEY` 调用智谱。中转未配置或失败时,回退到内置菜谱库,页面显示演示说明。
- **本地 / Vercel 备份**:未设置中转地址时,调用同域 `/api/*`。API 路由读取控制台里的 `ZHIPU_API_KEY`(不要写进前端变量)。没有密钥或调用失败同样回退演示模式。公开主站不要只依赖 vercel.app。
- **模型**:菜谱与周计划使用 `glm-4-flash-250414`,失败时再试 `glm-4-flash`;照片识材只使用 `glm-4v-flash`,不用纯文本模型认图。
- **演示模式**:使用 `lib/mock.ts` 的内置菜谱库和匹配引擎,无需任何 key,离线可用。
- 无论哪种模式,营养值都用 `nutrition-data.json` 重算,并统一经过忌口/过敏过滤。
- `/api/recipes` 或中转成功时的 `provider` 为 `zhipu` 或 `mock`。
- 服务端日志不记录密钥,也不把上游完整报错返回给浏览器。

## 报告工具链(`nutrivibe_build/`)

用于生成项目计划书(韩语)的 PDF 与 DOCX。依赖:

```powershell
pip install reportlab python-docx matplotlib pillow pypdf
```

默认使用 Windows 自带的 Malgun Gothic 字体(`%WINDIR%\Fonts\malgun.ttf`);其他系统可用 `NV_FONT_DIR` 指定含 `malgun.ttf` / `malgunbd.ttf` 的目录。

个人信息(姓名、学号)**不写在代码里**,通过环境变量传入:

| 变量 | 说明 | 默认 |
|---|---|---|
| `NV_STUDENT_NAME` | 封面"성명"栏 | 空 |
| `NV_STUDENT_ID` | 封面"학번"栏 | 空 |
| `NV_REPORT_NAME` | 输出文件名(不含扩展名) | `NutriVibeAI_report` |
| `NV_OUT_DIR` | 输出目录 | 仓库根目录 |
| `NV_FONT_DIR` | 字体目录 | `%WINDIR%\Fonts` |

```powershell
# 在仓库根目录执行
$env:NV_STUDENT_NAME = "<姓名>"; $env:NV_STUDENT_ID = "<学号>"   # 可选
python nutrivibe_build\make_figures.py      # 重新生成插图(可选)
python nutrivibe_build\build_report.py      # 生成 PDF + DOCX
powershell -ExecutionPolicy Bypass -File nutrivibe_build\convert.ps1   # 需要 Microsoft Word;输出 EXPORT_OK 即成功
python nutrivibe_build\verify_report.py     # 校验页数 / 孤悬标题 / 关键词
```

生成的 PDF / DOCX / `docx_preview.pdf` 已被 `.gitignore` 排除,不会提交。修改报告正文就是修改 `build_report.py` 中的 `CONTENT` 列表。

## GitHub Pages 与 Vercel

公开测试地址为 GitHub Pages: `https://macshi716.github.io/NutriVibeAI/`。仓库保持私有时, Pages 需要仓库设置里启用,且账号需支持私有仓库 Pages(GitHub Pro 及以上)。路径: **Settings → Pages → Build and deployment → Source: GitHub Actions**。工作流是 `.github/workflows/pages.yml`,向 `main` 推送后构建并部署。Vercel 项目保留作带 API 的备份,不要改成静态导出。

`GITHUB_PAGES=true` 时 `next.config.mjs` 使用 `output: 'export'`、`basePath` / `assetPrefix` `/NutriVibeAI` 和 `trailingSlash`。同一次构建设置 `NEXT_PUBLIC_STATIC_HOST=true`,页面不会请求不存在的同域 `/api/*`。若同时设置了 `NEXT_PUBLIC_RELAY_URL`,浏览器用该地址 POST 到专用中转;中转未配置或失败时再回退内置演示逻辑。`output: 'export'` 不能编译 Route Handler,所以 `npm run build:pages` 会在构建期间把 `app/app/api` 临时移走,构建结束后放回。API 源码仍在仓库里,Vercel 继续用 `npm run build`(不强制静态托管,因此可走 API 备份)。

| 能力 | github.io(静态站 + 可选中转) | 带 API 的服务器(Vercel 备份) |
|---|---|---|
| 页面、韩语界面、localStorage、同步码 / JSON 备份、蛋白质目标、保质期提示、购物清单、收藏、游戏化 | 可用 | 可用 |
| 菜谱生成、再生成、周计划与换菜 | 有中转地址则 POST 到中转(智谱);否则或失败时用内置菜谱库(`lib/mock.ts`) | 服务端 `ZHIPU_API_KEY` 调用智谱,失败则演示模式 |
| 照片识材 | 有中转则把图片 POST 到中转(`glm-4v-flash`);否则或失败时显示示例食材 | 有服务端密钥时识别照片;没有密钥时同样是示例食材 |

静态站点没有动态路由,菜谱详情是 `/recipes/view/?id=...`,数据仍来自当前浏览器的 localStorage。

## 已知限制

- 默认没有配置中转地址或服务端密钥时运行于演示模式;真实 LLM 输出质量取决于模型和配额。GitHub Pages 在中转未就绪时回退演示模式,不会在前端保存密钥。
- Vercel 仍可作为带 API Route 的备份部署;公开测试站是 GitHub Pages。
- 营养数据为内部 68 种食材参考值,不是医疗级数据;菜谱与营养信息仅供参考。
- 无账号与云端同步,数据仅存于当前浏览器的 localStorage。
- 无食材图片识别、一周食谱、支付、IoT 等功能(MVP 范围外)。
- 报告工具链依赖 Malgun Gothic 字体;`convert.ps1` 需要 Windows + Microsoft Word。
- 暂无自动化测试脚本(`npm test`)。