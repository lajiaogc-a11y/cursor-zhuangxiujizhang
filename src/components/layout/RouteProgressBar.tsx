import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * 路由切换时顶部细进度条（NProgress 风格），不占用页面中心。
 */
export function RouteProgressBar() {
  const location = useLocation();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBusy(true);
    const done = window.setTimeout(() => setBusy(false), 280);
    return () => window.clearTimeout(done);
  }, [location.pathname, location.search, location.hash]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] overflow-hidden bg-transparent"
      aria-hidden
    >
      <div
        className={cn(
          'h-full w-[40%] bg-primary/90 shadow-[0_0_8px_hsl(var(--primary))] motion-reduce:transition-none',
          'transition-transform duration-300 ease-out',
          busy ? 'translate-x-0 opacity-100 animate-route-bar motion-reduce:animate-none' : '-translate-x-full opacity-0',
        )}
      />
    </div>
  );
}
