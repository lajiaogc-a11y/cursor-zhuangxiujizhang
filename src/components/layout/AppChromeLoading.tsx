import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AppChromeLoadingProps {
  /** 读屏文案，默认英文（无 i18n 上下文时） */
  label?: string;
  className?: string;
}

/** 与全屏/区块加载共用的旋转图标（支持减少动效） */
export function ChromeLoadingSpinner({
  className,
  variant = 'primary',
}: {
  className?: string;
  /** primary：全屏主色；muted：列表/表格内嵌 */
  variant?: 'primary' | 'muted';
}) {
  return (
    <Loader2
      className={cn(
        'shrink-0 animate-spin motion-reduce:animate-none',
        variant === 'muted'
          ? 'h-6 w-6 text-muted-foreground'
          : 'h-8 w-8 text-primary opacity-90',
        className,
      )}
      aria-hidden
    />
  );
}

/**
 * 全屏加载壳：与 index.html critical-shell + 主题变量一致（bg-background、min-h-dvh），避免与首屏背景跳变。
 */
export function AppChromeLoading({ label = 'Loading…', className }: AppChromeLoadingProps) {
  return (
    <div
      className={cn(
        'min-h-dvh flex items-center justify-center bg-background text-foreground',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <ChromeLoadingSpinner variant="primary" />
    </div>
  );
}

export interface AppSectionLoadingProps {
  label?: string;
  className?: string;
  /** 列表/卡片内嵌，较矮区域 */
  compact?: boolean;
  /** 图标下方的可见说明（如「统计中」），读屏仍用 label */
  description?: ReactNode;
}

/**
 * 带顶栏、侧栏、MobilePageShell 时的内容区加载，避免全屏跳变、与 AppChromeLoading 视觉一致。
 */
export function AppSectionLoading({
  label = 'Loading…',
  className,
  compact = false,
  description,
}: AppSectionLoadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4',
        compact ? 'py-8 min-h-[140px]' : 'py-12 min-h-[min(50dvh,24rem)]',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <ChromeLoadingSpinner variant={compact ? 'muted' : 'primary'} />
      {description != null && description !== '' ? (
        <span className="mt-2 max-w-sm text-center text-sm text-muted-foreground">{description}</span>
      ) : null}
    </div>
  );
}
