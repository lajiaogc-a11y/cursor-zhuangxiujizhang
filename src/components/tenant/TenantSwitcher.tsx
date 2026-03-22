import { useTenant } from '@/lib/tenant';
import { useI18n } from '@/lib/i18n';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function TenantSwitcher() {
  const { tenant, tenants, switching, switchTenant } = useTenant();
  const { language } = useI18n();

  // 用户属于多个组织时均可切换（此前仅超管可见会导致多租户成员无法换组织）
  if (tenants.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8 px-3 text-xs" disabled={switching}>
          {switching ? (
            <ChromeLoadingSpinner variant="muted" className="h-3.5 w-3.5" />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className="max-w-[120px] truncate">{tenant?.name || (language === 'zh' ? '选择组织' : 'Select org')}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {tenants.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => switchTenant(t.id)}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              {t.logo_url ? (
                <img src={t.logo_url} alt="" className="w-5 h-5 rounded object-cover" />
              ) : (
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  {t.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm truncate">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.plan}</p>
              </div>
            </div>
            {tenant?.id === t.id && <Check className="w-4 h-4 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
