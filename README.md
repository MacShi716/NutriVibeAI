# NutriVibe AI

生成式 AI 个性化饮食规划 + 购物清单网页应用(Next.js MVP),附带生成韩语项目计划书报告的 Python 工具链。

用户输入现有食材、偏好、忌口/过敏、人数、烹饪时间,系统生成 2~3 个家庭菜谱,用内置营养数据重算热量与营养,并把缺少的食材自动整理成购物清单。界面语言为韩语。

## 功能

- **菜谱生成**:首页表单(食材 / 偏好 / 忌口·过敏 / 人数 1~12 / 烹饪时间 5~180 分钟 / 目标热量)→ `POST /api/recipes`
- **三种生成模式**:Groq / Gemini / 演示模式(mock),失败自动回退(见下文)
- **演示菜谱库**:71 个韩国家常菜模板 + 匹配引擎(配料表必须包含输入食材;贪心覆盖所有输入食材;无匹配时显示道歉卡和 Naver/Google 搜索链接)
- **中→韩食材别名**:输入中文食材名也能匹配(110+ 条映射)
- **忌口/过敏过滤**:规则过滤 + 危险提示
- **营养计算**:68 种食材参考数据(每 100g/100ml),AI 给出的数值不作最终依据
- **菜谱详情**:热量明细、1 人份营养、保有食材利用率、收藏
- **购物清单**:缺料自动生成、按类别分组、勾选、复制
- **收藏 + 生成历史**(最近 20 条,可一键重新生成)
- **个人身体档案**:BMI、BMR(Mifflin-St Jeor)、TDEE、目标热量
- **游戏化**:积分 / 等级(Lv.1~10)/ 12 个成就 / 每日任务 / 菜谱轮盘 / 食材图鉴,全局 toast 通知
- 所有用户数据保存在浏览器 localStorage(键前缀 `nutrivibe:`),无账号、无服务端数据库

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 14(App Router)、React 18、TypeScript、Tailwind CSS |
| 后端 | Next.js API Route(`app/app/api/recipes/route.ts`) |
| LLM | Groq(OpenAI 兼容接口,默认 `openai/gpt-oss-120b`)、Google Gemini(默认 `gemini-3.8-flash`) |
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
│   │   └── game/page.tsx             # 游戏中心
│   ├── components/                   # GameToast / VisitTracker / GenerationSteps / useCountUp
│   ├── lib/
│   │   ├── gemini.ts                 # LLM 调用(Groq + Gemini)、Prompt、JSON 解析、过滤、generateRecipes()
│   │   ├── mock.ts                   # 71 个菜谱模板 + mockRecipes() 匹配引擎
│   │   ├── alias.ts                  # 中→韩食材别名
│   │   ├── nutrition.ts              # 食材量解析、营养计算
│   │   ├── shopping.ts               # 购物清单生成/合并/分类
│   │   ├── profile.ts                # BMI / BMR / 目标热量
│   │   ├── gamification.ts           # 积分、等级、成就、任务、图鉴
│   │   ├── storage.ts                # localStorage 封装
│   │   └── types.ts                  # 公共类型
│   └── data/nutrition-data.json      # 营养参考数据
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
npm run build      # 生产构建(先停掉 dev)
npm start          # 启动生产服务
npm run lint       # ESLint
npx tsc --noEmit   # 类型检查
```

注意事项:

1. **dev 运行期间不要执行 `npm run build`**:build 会重写 `.next`,导致 dev 的 chunk 404/500。先停 dev,build 后删除 `app/.next` 再重启 dev。
2. 修改源码或 `.env.local` 后,建议删除 `app/.next` 再重启 dev。
3. 页面 `<html lang>` 的 hydration 警告通常是浏览器自动翻译引起的,已用 `suppressHydrationWarning` 处理。

## 环境变量(`app/.env.local.example`)

把 `app/.env.local.example` 复制为 `app/.env.local` 后填写。这些变量只在服务端(API Route)读取,不会发送到浏览器。`.env.local` 已被 `.gitignore` 排除,**不要提交**。

| 变量 | 必需 | 说明 |
|---|---|---|
| `GROQ_API_KEY` | 否 | Groq API key(推荐,免费层无需绑卡) |
| `GROQ_MODEL` | 否 | Groq 模型,默认 `openai/gpt-oss-120b` |
| `GROQ_REASONING_EFFORT` | 否 | `low` / `medium` / `high`,默认 `medium`(仅 `openai/gpt-oss-*` 生效) |
| `GEMINI_API_KEY` | 否 | Google Gemini API key |
| `GEMINI_MODEL` | 否 | Gemini 模型,默认 `gemini-3.8-flash` |
| `LLM_PROVIDER` | 否 | 强制指定 `groq` / `gemini` / `mock`;留空自动选择 |

## 三种模式:Groq / Gemini / 演示(mock)

- **自动选择**(未设置 `LLM_PROVIDER`):有 `GROQ_API_KEY` → Groq;否则有 `GEMINI_API_KEY` → Gemini;都没有 → 演示模式。
- **失败回退**:选定的提供方失败(429 限流、403、返回格式错误等)→ 若另一个提供方有 key 则尝试它 → 仍失败则回退演示模式,页面显示演示模式横幅。
- **Groq 细节**:`openai/gpt-oss-*` 默认 `reasoning_effort=medium`(low 时 JSON 易损坏,high 消耗 token 多);有效菜谱少于 2 个时自动重试 1 次(429 不重试)。
- **演示模式**:使用 `lib/mock.ts` 的内置菜谱库和匹配引擎,无需任何 key,离线可用。
- 无论哪种模式,营养值都用 `nutrition-data.json` 重算,并统一经过忌口/过敏过滤。
- `/api/recipes` 响应:`{ conditions, recipes, warnings, usedMock, generatedAt, provider }`,其中 `provider` 为实际使用的 `groq` / `gemini` / `mock`。
- 服务端日志只记录提供方名称和错误信息,不记录 key。

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

## 已知限制

- 默认没有配置真实 API key 时运行于演示模式;真实 LLM 输出质量取决于模型和配额(Groq 免费层可能 429 限流)。
- 尚未部署到 Vercel。
- 营养数据为内部 68 种食材参考值,不是医疗级数据;菜谱与营养信息仅供参考。
- 无账号与云端同步,数据仅存于当前浏览器的 localStorage。
- 无食材图片识别、一周食谱、支付、IoT 等功能(MVP 范围外)。
- 报告工具链依赖 Malgun Gothic 字体;`convert.ps1` 需要 Windows + Microsoft Word。
- 暂无自动化测试脚本(`npm test`)。