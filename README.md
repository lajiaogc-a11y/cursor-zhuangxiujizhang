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

## AI 功能（可选）

智能分类、聊天、报告摘要等 Edge Function 使用 OpenAI API。在 Supabase **Project Settings → Edge Functions → Secrets** 中配置：

- `OPENAI_API_KEY`：你的 OpenAI API Key

未配置时相关功能会返回 503，其余功能不受影响。

## 数据库迁移

使用 Supabase CLI 或 Dashboard SQL Editor 执行 `supabase/migrations` 下的迁移文件。
