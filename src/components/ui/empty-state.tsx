import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  FileText, FolderOpen, Receipt, Users, Package,
  BarChart3, Bell, ClipboardList, Inbox, Search,
  LucideIcon,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
  compact?: boolean;
}

/**
 * Reusable empty state with icon, title, description, and optional action.
 *
 * Usage:
 *   <EmptyState
 *     icon={FolderOpen}
 *     title="暂无项目"
 *     description="点击下方按钮创建第一个项目"
 *     action={{ label: "新建项目", onClick: () => {} }}
 *   />
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  children,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8' : 'py-16',
        className
      )}
    >
      {/* Icon circle with gradient background */}
      <div className={cn(
        'rounded-2xl bg-muted/60 flex items-center justify-center mb-4',
        compact ? 'w-12 h-12' : 'w-16 h-16'
      )}>
        <Icon className={cn(
          'text-muted-foreground/50',
          compact ? 'w-6 h-6' : 'w-8 h-8'
        )} />
      </div>

      <h3 className={cn(
        'font-semibold text-foreground',
        compact ? 'text-sm' : 'text-base'
      )}>
        {title}
      </h3>

      {description && (
        <p className={cn(
          'text-muted-foreground mt-1 max-w-sm',
          compact ? 'text-xs' : 'text-sm'
        )}>
          {description}
        </p>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          size={compact ? 'sm' : 'default'}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}

      {children}
    </div>
  );
}

/** Preset empty states for common modules */
export const EmptyPresets = {
  projects: (t: (k: string) => string, onAdd?: () => void) => ({
    icon: FolderOpen,
    title: t('common.noData'),
    description: t('projects.emptyHint') || undefined,
    action: onAdd ? { label: t('projects.addProject'), onClick: onAdd } : undefined,
  }),
  transactions: (t: (k: string) => string, onAdd?: () => void) => ({
    icon: Receipt,
    title: t('common.noData'),
    description: t('transactions.emptyHint') || undefined,
    action: onAdd ? { label: t('transactions.addTransaction'), onClick: onAdd } : undefined,
  }),
  contacts: (t: (k: string) => string, onAdd?: () => void) => ({
    icon: Users,
    title: t('common.noData'),
    action: onAdd ? { label: t('contacts.addContact'), onClick: onAdd } : undefined,
  }),
  invoices: (t: (k: string) => string) => ({
    icon: FileText,
    title: t('common.noData'),
  }),
  alerts: (t: (k: string) => string) => ({
    icon: Bell,
    title: t('common.noData'),
    description: t('alerts.emptyHint') || undefined,
  }),
  search: (t: (k: string) => string) => ({
    icon: Search,
    title: t('common.noSearchResult') || t('common.noData'),
  }),
  generic: (t: (k: string) => string) => ({
    icon: Inbox,
    title: t('common.noData'),
  }),
};
