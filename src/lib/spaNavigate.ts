/**
 * 在 class 组件或 Router 外层无法使用 useNavigate 时，通过注册函数执行 SPA 导航，避免整页刷新。
 * 由 App 内 BrowserRouter 子树中的 RouterNavigateRegistrar 注册。
 */
type NavigateFn = (to: string, options?: { replace?: boolean }) => void;

let registeredNavigate: NavigateFn | null = null;

export function registerSpaNavigate(fn: NavigateFn | null) {
  registeredNavigate = fn;
}

/** 站内 SPA 跳转；未注册时降级为 assign（极少见于 ErrorBoundary 早于 Router 挂载） */
export function spaNavigate(to: string, options?: { replace?: boolean }) {
  if (registeredNavigate) {
    registeredNavigate(to, options);
    return;
  }
  if (typeof window !== 'undefined') {
    window.location.assign(to);
  }
}
