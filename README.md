# 闪铸装饰管理系统 | Flash Cast ERP

闪铸装饰企业管理平台 — 一站式管理报价、成本、采购与财务。

## 技术栈

- Vite + TypeScript + React 18
- shadcn/ui + Tailwind CSS
- Supabase（数据库、认证、Edge Functions）

## 本地开发

```sh
npm install
# 在项目根目录配置 .env：VITE_SUPABASE_URL、VITE_SUPABASE_PUBLISHABLE_KEY、VITE_SUPABASE_PROJECT_ID
npm run dev
```

默认开发地址：http://localhost:8080/

## 构建与部署

```sh
npm run build
npm run preview   # 本地预览 dist
```

可部署至 Cloudflare Pages、Vercel、Netlify 等静态托管。

### Cloudflare Pages（Wrangler）

1. **API Token 权限**：你当前的 Token 若仅能 `verify` 而无账户/Pages 权限，Wrangler 会报 `Authentication error`（无法访问 `/memberships`）。请在 [API Tokens](https://dash.cloudflare.com/profile/api-tokens) 新建 Token，至少包含：
   - **Account** → **Cloudflare Pages** → **Edit**
   - **Account** → **Account Settings** → **Read**（便于解析账户；若仍失败，在 `wrangler.toml` 里填写 `account_id`）
2. **Account ID**：在 Cloudflare 控制台右侧栏复制 **Account ID**，写入 `wrangler.toml` 的 `account_id`（取消注释）。
3. **构建与上传**（PowerShell 示例，勿把 Token 写进仓库）：

```powershell
$env:CLOUDFLARE_API_TOKEN = "你的新 Token"
npm install
npm run deploy:cf-pages
```

首次若项目不存在，Wrangler 会提示创建 **cursor-zhuangxiujizhang**；若要改名，改 `wrangler.toml` 的 `name` 与脚本里的 `--project-name`。

4. **删除以前部署的站点**：在 [Workers & Pages](https://dash.cloudflare.com) → **Pages** → 选中旧项目 → **Manage project** → **Settings** → 底部 **Delete project**。或用 CLI：`npx wrangler pages project delete 旧项目名`（需同上 Token 权限）。

5. **SPA 路由**：已添加 `public/_redirects`，构建后会进入 `dist`，避免刷新子路径 404。

**请勿在聊天或 Git 中发送 Cloudflare Token**；你此前提供的 Token 建议立即在控制台 **Roll** / 删除并重建。

## AI 功能（可选）

智能分类、聊天、报告摘要等 Edge Function 使用 OpenAI API。在 Supabase **Project Settings → Edge Functions → Secrets** 中配置：

- `OPENAI_API_KEY`：你的 OpenAI API Key

未配置时相关功能会返回 503，其余功能不受影响。

## 数据库迁移与切换项目

1. **前端环境变量**（`.env`，勿提交）：`VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`（或 Dashboard 里的 **anon** `eyJ...`）、`VITE_SUPABASE_PROJECT_ID`。
2. **CLI 用的直连串**（可选，仅本机）：在 `.env` 增加 `DATABASE_URL=postgresql://postgres:密码@db.<项目ref>.supabase.co:5432/postgres`（不要带 `VITE_` 前缀，避免打进前端包）。
3. **把 `supabase/migrations` 全部推到新库**（在项目根目录）：

```sh
npx supabase db push --db-url "postgresql://postgres:你的密码@db.你的项目ref.supabase.co:5432/postgres"
```

若 `sb_publishable_...` 登录异常，可在 Supabase **Project Settings → API** 使用 **anon public**（`eyJ...`）作为 `VITE_SUPABASE_PUBLISHABLE_KEY`。

4. **Edge Functions**：登录并关联项目后部署，并在 Secrets 中配置 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`OPENAI_API_KEY`（AI 功能需要）：

```sh
npx supabase login
npx supabase link --project-ref 你的项目ref
npx supabase functions deploy ai-categorize
npx supabase functions deploy ai-chat
npx supabase functions deploy ai-report-summary
```

5. **停用/删除旧 Supabase 项目**（例如之前的 `jnlzml...`）：打开 [Supabase Dashboard](https://supabase.com/dashboard) → 选中旧项目 → **Settings → General → Delete project**。删除前请确认数据已迁移或不再需要；**我无法代你在控制台删除**，需你本账号操作。

`supabase/config.toml` 里的 `project_id` 应与当前使用的项目 ref 一致，便于 `supabase link`。
