import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerSpaNavigate } from '@/lib/spaNavigate';

/** 在 BrowserRouter 内注册 SPA 导航，供 ErrorBoundary 等无法使用 hook 的代码调用 */
export function RouterNavigateRegistrar() {
  const navigate = useNavigate();

  useEffect(() => {
    registerSpaNavigate((to, opts) => {
      navigate(to, { replace: opts?.replace });
    });
    return () => registerSpaNavigate(null);
  }, [navigate]);

  return null;
}
