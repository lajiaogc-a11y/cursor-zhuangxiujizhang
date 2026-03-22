# SPA 路由、React Query 缓存与安全 / E2E 审计报告

> 生成说明：基于当前代码库静态审计 + 本轮已落地修改。完整验收需配合 Playwright/Cypress 与人工安全测试。

**续作（tenantId 对齐 + 预取）**：`refreshUserAccess` / Unauthorized SPA 刷新；`fetchSupplierPriceCounts(tenantId)`；材料/供应商/采购/报价/成本/CRM 等多处 `queryKey` 与 `invalidateQueries` 带 `tenantId`；成本材料页供应商下拉使用独立 key `q_active_suppliers_cost`；`prefetchTenantCommonData` 增加 `q_materials`、`q-quotation-stats`、`q-cost-control-stats`。

**本轮已补**：采购 `Receiving`/`Payments` 的 `purchaseReceiving`/`purchasePayments` 与 `orderDetail`/`q_purchase_orders` 失效与 `tenantId` 对齐；`TaxSettings` 的 `q_company_settings_tax`/`q_company_settings` 带 `tenantId`；`EditorSPA` 的 `getQueryData(['q_quotations', tenantId])`；预取增加 `q_quotations`、`q_products`、`q_customers`、`q_company_settings`（与 hooks 内 key 一致）。

**invalidationMap / 全局刷新扫尾（本轮）**：`queryKeys.ts` 增加 `invalidateQueriesWithTenant`、`invalidateAlertQueries`；`useDataRefresh` 对 `transactionMutation` / `projectMutation` / `exchangeMutation` / `accountMutation` 等均按 `[...prefix, tenantId]` 失效；项目交易/增项使用 `projectTransactionMutationPrefixes` / `projectAdditionMutationPrefixes`，并额外失效 `projectTransactions(tenantId, projectId)`、`projectAdditions(tenantId, projectId)`、`['projects', tenantId, 'financials', projectId]`。`Memos` / `Payables` / `Payroll` / `PayablesTab` / `PayrollTab` 的 `memoMutation` / `payableMutation` / `payrollMutation` 走同一辅助函数。`useAlertsService` 预警失效带 `tenantId`；`useToggleRule` / `useDeleteRule` 需传入 `tenantId`。换汇页 `Exchange` / `ExchangeTab` / `ExchangeRatesContent` 的 `invalidateQueries` 改为带 `tenantId`；`workforce/Payroll` 失效 `['workforce-payroll', tenantId]`。`useSystemCurrency`：`queryKey` 为 `['system_currency', tenantId]`，`fetchSystemCurrency(tenantId)` / `updateSystemCurrencySettings(..., tenantId)` 优先按 `tenant_id` 读写，无行时回退旧版单行。

**仍建议扫尾**：全局 `grep` 其他模块无 `tenantId` 的 `useQuery`；`queryKeys.ts` 中 `qCompanySettings` / `qBreakdownItems` 等若被引用需改为「前缀 + tenantId」用法。

**成本模块已对齐**：`Budget`、`BreakdownDetail`、`Labor`、`MethodMaterials`、`CategoryMapping`、`Methods`、`MethodLabor`、`WorkerTypes`、`MethodMaterialsDialog` 的 `queryKey` / `invalidateQueries` 已带 `tenantId`；Breakdown 人工费率子查询使用 `['q_labor_rates', tenantId, sortedMethodIds]`，与 `MethodLabor` 列表 `['q_labor_rates', tenantId]` 并存且切换租户时均可被 predicate 命中。

**CRM / 项目 / 仪表盘等补漏**：`Customers` 保存后失效 `['crm-customers', tenantId]`；`CustomerDetail` 的客户/活动/提醒查询与失效均带 `tenantId`；`useProjectsWithTransactions` 的 key 改为 `['projects', tenantId, statusFilter]`（与 `useProjects` 前缀一致）；`ProjectFinancialsPage` 财务页查询为 `['projects', tenantId, 'financials', projectId]`；`Dashboard` / `Projects` / `useRefreshProjects` / `useRefreshLedger` / `useDataRefresh.refreshDashboard` / `useMemoCount` / `useAlertCount` 的刷新失效改为带当前 `tenantId`，避免误刷新其它租户缓存。`useProject(tenantId, projectId)` 已带租户（暂无调用方）。

---

## 1. 问题总览

| 类别 | 状态 | 说明 |
|------|------|------|
| React Query 默认策略 | **已配置** | `App.tsx`：`staleTime=5min`，`refetchOnMount=false`，`refetchOnWindowFocus=false`，`retry=1`（查询） |
| 站内整页 `<a href>` | **已排查** | 站内链接主要为 `react-router-dom` 的 `Link`/`navigate`；外链/下载仍用 `<a>`（合理） |
| `window.location` 站内导航 | **极少** | `spaNavigate` 仅在 Router 未注册时降级；`main.tsx`/懒加载 chunk 失败会 `reload`（可接受） |
| 登录后预取 | **已接通** | `prefetchTenantCommonData` 在 `TenantProvider` 租户就绪后执行；切换租户时精确 invalidate + 再预取 |
| 租户切换缓存 | **已优化** | 由「全量 `invalidateQueries()`」改为「queryKey 含旧/新 `tenantId` 的查询」 |
| 路由懒加载 Fallback | **已调整** | Suspense 不再使用全屏 `AppChromeLoading`，依赖顶部 `RouteProgressBar` + 各页自身占位 |
| E2E | **未配置** | `package.json` 无 Playwright/Cypress；需单独引入 |
| 权限 / 安全自动化 | **未配置** | 需依赖 `ProtectedRoute` + Supabase RLS 审查 + 人工渗透 |

---

## 2. 可能导致整页刷新的位置（已知）

| 位置 | 行为 | 建议 |
|------|------|------|
| `src/lib/spaNavigate.ts` | Router 未注册时用 `location.assign` | 仅极端情况；保持 |
| `src/main.tsx` | chunk 加载失败防死循环 `reload` | 合理 |
| `src/routes/lazyRetry.ts` | 懒加载重试后 `reload` | 合理 |
| `ErrorBoundary.tsx` | 用户触发「重试」时 `reload` | 可改为 SPA 内恢复 / reset boundary |
| `Unauthorized.tsx` | ~~`reload`~~ | **已改**：`refreshUserAccess()` + `navigate('/')`（SPA 内刷新角色） |
| 外链 `<a target="_blank">` | 新开页，非 SPA 内跳转 | 保留 |

---

## 3. 建议逐步改为「纯 React Query」的模块（仍含 useEffect+fetch 的）

需后续用 `grep` / `codebase_search` 按文件扫：`useState`+`useEffect`+`fetch` / `supabase.from` 直查未走 `useQuery` 的页面。

优先：**Dashboard 衍生 hook、设置弹窗、报表大页、SuperAdmin 子模块**。  
原则：读用 `useQuery`，写用 `useMutation` + `invalidateQueries`（优先 `queryKeys` / `invalidationMap`）。

---

## 4. 建议增加的预取（按权限裁剪）

已在 `prefetchTenantCommonData`：`dashboard`、`projects`、`accounts`、`balances`、`employees`、`alertCount`、`memoCount`、`contacts`、`q_suppliers`、`q_materials`、`q-quotation-stats`、`q-cost-control-stats`、`q_quotations`、`q_products`、`q_customers`、`q_company_settings`。

**可追加（需核对接口与权限）：**

- 全局/租户 `exchangeRates`（有权限时）
- `notifications` / 收件箱类列表首屏
- 当前用户常访问模块（可按角色配置预取表）

**注意：** 无权限模块不要预取，避免无效请求与信息泄露面。

---

## 5. 应对齐 `invalidateQueries` 的 mutation

- 所有 `useMutation` 的 `onSuccess` 应调用 `queryClient.invalidateQueries`，key 取自 `queryKeys` 或 `invalidationMap`。
- 避免在 mutation 成功后 `window.location` 或整页 `reload`。
- 「重新计算项目摘要」类操作：成功后 `invalidateQueries`：`projectTransactions`、`financialSummary`、`dashboard` 等与该 `projectId` 相关的 key。

---

## 6. 重复 fetch / 应删除的临时逻辑

- 搜索：`hasLoadedRef`、`loadedOnce`、仅用于防抖重复请求的 ref —— 改为统一 `queryKey` + 上述默认 `staleTime`。
- 与 `prefetchTenantCommonData` 重复的页面级「进入即拉同一接口」可保留（缓存命中 0 等待），但避免二次手动 `fetch` 不写缓存。

---

## 7. 权限与安全（回归清单）

1. `ProtectedRoute` + `permissionKey` 与后端 RLS 一致。  
2. `signOut` 已 `queryClient.clear()`，避免下一用户看到缓存。  
3. 扫描环境变量与 `supabase` anon key 是否仅前端公开 key（预期）。  
4. 禁止将 service role key 打进前端 bundle。  
5. XSS：富文本/备注渲染处是否 `DOMPurify`（若有 HTML 展示需核对）。  
6. 租户切换：仅失效含 tenantId 的 query，避免跨租户数据通过缓存残留（仍需保证 **所有** 租户数据 queryKey 含 `tenantId` —— **持续代码审查项**）。

---

## 8. 建议补的 E2E 用例（Playwright 示例场景）

1. 登录 → Network 出现预取相关请求（或自第二次进入 Dashboard 无重复拉取）。  
2. 侧栏多点切换路由 → 无完整 document 导航（Performance/Memory 或 `performance.getEntriesByType('navigation')`）。  
3. 列表页筛选后切走再切回 → （若需）用 sessionStorage 或 URL query 持久化策略验证。  
4. 项目摘要重算：管理员 / 会计各执行一次 → 成功 toast + 相关列表更新。  
5. 写操作后仅相关列表刷新（Network 过滤）。  
6. 登出再登录不同账号 → 无上一用户数据闪现。  
7. 未授权 URL 直进 → 403/重定向。  
8. 慢网：loading / error / retry UI 可见。

---

## 9. 本轮已修改文件清单

- `src/lib/tenant.tsx` — 租户就绪预取、切换租户精确 invalidate + 预取  
- `src/App.tsx` — Query 默认 `retry`；路由 Suspense fallback 改为 `null`  
- `src/lib/auth.tsx` — 注释说明预取位置  
- `src/components/quotation/QuotationSummaryPanel.tsx` — 站内链改用 `Link`  
- `docs/SPA_AND_CACHE_AUDIT.md` — 本文档  

---

## 10. 后续代码修改建议（优先级）

| P0 | 全站审计：所有 `useQuery` 的 `queryKey` 必须包含 `tenantId`（租户数据） |
| P1 | 引入 Playwright + CI 跑最小冒烟（登录 + 切 3 个路由） |
| P1 | `Unauthorized` / `ErrorBoundary` 尽量避免 `location.reload` |
| P2 | 大表单页：筛选/分页状态入 URL 或 sessionStorage |
| P2 | 合并重复 `queryKey` 字符串（如 `q_suppliers` 与 `queryKeys` 常量） |
| P3 | 角色化预取配置表 |

---

## 11. 修复后验证清单（手工）

- [ ] Chrome DevTools → Network：勾选 Preserve log，侧栏切换 5 个页面，无 `document` 类型全页刷新  
- [ ] Application → Clear site data 后登录，首次进入 Dashboard，确认预取请求发生且二次进入命中缓存（Size from disk cache / 极短耗时）  
- [ ] 切换租户：旧租户数据不应闪现  
- [ ] 任意创建/编辑后返回列表：数据已更新且无整页刷新  
- [ ] 登出后无敏感数据残留 UI  

---

## 12. 验收标准对照

| 标准 | 当前 |
|------|------|
| 站内切页不整页刷新 | **主路径满足**；chunk 失败等仍可能 reload |
| 不闪白大壳 loading | **Suspense 已去全屏壳**；各页仍可有区块 loading |
| 登录后预取 | **租户就绪后执行** |
| 写操作缓存更新 | **依赖各 mutation 已写的 invalidate**；需持续审计 |
| E2E 全过 | **需新增工程** |
| 安全无高危 | **需专项渗透** |
