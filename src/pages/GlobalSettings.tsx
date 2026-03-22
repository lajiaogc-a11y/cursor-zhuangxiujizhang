import { useState, useEffect } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { User, Globe, Users, Settings, Key, TrendingUp, Lock, Eye, EyeOff, Shield, CircleDollarSign, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import { changePassword } from '@/services/profile.service';
import { checkIsAdmin, fetchDisplayName, updateDisplayName, logAuditEntry } from '@/services/settings.service';
import { toast } from '@/hooks/use-toast';
import { UserManagement } from '@/components/settings/UserManagement';
import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { InvitationCodeManagement } from '@/components/settings/InvitationCodeManagement';
import { ExchangeRatesContent } from '@/components/exchange/ExchangeRatesContent';
import { TenantDataCleanup } from '@/components/settings/TenantDataCleanup';
import { useSystemCurrency, CURRENCY_OPTIONS, SystemCurrency, CurrencyScope } from '@/hooks/useSystemCurrency';
import { useGlobalExchangeRates } from '@/hooks/useGlobalExchangeRates';
import { getCurrencySymbol } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';

function PasswordChangeCard() {
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast({ title: t('password.tooShort'), variant: 'destructive' }); return; }
    if (newPassword !== confirmPassword) { toast({ title: t('password.mismatch'), variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await changePassword(newPassword);
      toast({ title: t('password.changeSuccess') }); setNewPassword(''); setConfirmPassword('');
    } catch (error: any) {
      toast({ title: t('password.changeFailed'), description: error.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="w-4 h-4" />{t('password.change')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t('password.new')}</Label>
          <div className="relative">
            <Input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="≥ 8 characters" />
            <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowNew(!showNew)}>
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t('password.confirm')}</Label>
          <div className="relative">
            <Input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <Button onClick={handleChangePassword} disabled={saving || !newPassword || !confirmPassword}>
          {saving && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
          {t('password.change')}
        </Button>
      </CardContent>
    </Card>
  );
}

const SCOPE_OPTIONS: { value: CurrencyScope; labelKey: string }[] = [
  { value: 'all', labelKey: 'globalSettings.scopeAll' },
  { value: 'quotation', labelKey: 'globalSettings.scopeQuotation' },
  { value: 'cost', labelKey: 'globalSettings.scopeCost' },
  { value: 'purchasing', labelKey: 'globalSettings.scopePurchasing' },
  { value: 'finance', labelKey: 'globalSettings.scopeFinance' },
];

function CurrencySettingCard() {
  const { t } = useI18n();
  const { systemCurrency, currencyScopes, updateSystemCurrency } = useSystemCurrency();
  const { rates } = useGlobalExchangeRates();
  const [selected, setSelected] = useState<SystemCurrency>(systemCurrency);
  const [scopes, setScopes] = useState<CurrencyScope[]>(currencyScopes);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { setSelected(systemCurrency); }, [systemCurrency]);
  useEffect(() => { setScopes(currencyScopes); }, [currencyScopes]);

  const hasChanges = selected !== systemCurrency || JSON.stringify(scopes.sort()) !== JSON.stringify([...currencyScopes].sort());

  const toggleScope = (scope: CurrencyScope) => {
    if (scope === 'all') {
      setScopes(['all']);
      return;
    }
    let next: CurrencyScope[] = scopes.filter(s => s !== 'all');
    if (next.includes(scope)) {
      next = next.filter(s => s !== scope);
    } else {
      next.push(scope);
    }
    if (next.length === 0) next = ['all'];
    setScopes(next);
  };

  const handleSave = () => {
    if (selected !== systemCurrency) {
      setShowConfirm(true);
    } else {
      doSave();
    }
  };

  const doSave = async () => {
    setSaving(true);
    setShowConfirm(false);
    try {
      await updateSystemCurrency.mutateAsync({ currency: selected, scopes });
      await logAuditEntry({
        action: 'update',
        table_name: 'q_company_settings',
        record_id: '00000000-0000-0000-0000-000000000001',
        old_data: { system_currency: systemCurrency, currency_scopes: currencyScopes },
        new_data: { system_currency: selected, currency_scopes: scopes },
        action_display: `主币种变更: ${systemCurrency} → ${selected}`,
        table_display_name: '系统设置',
      });
      toast({ title: t('globalSettings.currencySaved') });
    } catch {
      toast({ title: t('globalSettings.currencySaveFailed'), variant: 'destructive' });
    }
    setSaving(false);
  };

  // Rate preview
  const otherCurrencies = ['MYR', 'CNY', 'USD'].filter(c => c !== selected);
  const getRateDisplay = (from: string, to: string) => {
    const rateMap: Record<string, number> = {
      'CNY_MYR': rates.cnyToMyr, 'MYR_CNY': rates.myrToCny,
      'USD_MYR': rates.usdToMyr, 'MYR_USD': rates.myrToUsd,
      'USD_CNY': rates.usdToCny, 'CNY_USD': rates.cnyToUsd,
    };
    return rateMap[`${from}_${to}`] || 1;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleDollarSign className="w-4 h-4" />
            {t('globalSettings.systemCurrency')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">{t('globalSettings.currencyDesc')}</p>

          {/* Current base currency */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <span className="text-sm font-medium">{t('globalSettings.currentBase')}:</span>
            <Badge variant="default" className="text-sm px-3 py-1">
              {getCurrencySymbol(systemCurrency)} {systemCurrency}
            </Badge>
          </div>

          {/* Target currency selector */}
          <div className="space-y-2">
            <Label>{t('globalSettings.targetCurrency')}</Label>
            <Select value={selected} onValueChange={(v) => setSelected(v as SystemCurrency)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rate preview */}
          {selected !== systemCurrency && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                {t('globalSettings.ratePreview')}
              </div>
              {otherCurrencies.map(c => (
                <div key={c} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>1 {c}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{getRateDisplay(c, selected).toFixed(4)} {selected}</span>
                </div>
              ))}
            </div>
          )}

          {/* Module scope checkboxes */}
          <div className="space-y-3">
            <Label>{t('globalSettings.moduleScopes')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {SCOPE_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={scopes.includes(opt.value)}
                    onCheckedChange={() => toggleScope(opt.value)}
                  />
                  {t(opt.labelKey)}
                </label>
              ))}
            </div>
          </div>

          {/* Safety notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">{t('globalSettings.noDataModified')}</p>
          </div>

          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
            {t('common.save')}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('globalSettings.confirmChange')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>{t('globalSettings.confirmChangeDesc')}</p>
              <div className="flex items-center justify-center gap-3 py-2">
                <Badge variant="outline" className="text-base px-4 py-1">{getCurrencySymbol(systemCurrency)} {systemCurrency}</Badge>
                <ArrowRight className="w-5 h-5 text-primary" />
                <Badge variant="default" className="text-base px-4 py-1">{getCurrencySymbol(selected)} {selected}</Badge>
              </div>
              <p className="text-sm">{t('globalSettings.confirmChangeWarning')}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={doSave}>{t('common.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  adminOnly?: boolean;
}

export default function GlobalSettings() {
  const { user, userRole } = useAuth();
  const { tenant } = useTenant();
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || '');
    const loadProfile = async () => {
      const name = await fetchDisplayName(user.id);
      setDisplayName(name);
    };
    loadProfile();
    // Check admin status: use global role check (userRole already loaded)
    // This is correct because user_roles reflect the highest-privilege role across tenants
    const loadAdmin = async () => {
      const admin = await checkIsAdmin(user.id);
      setIsAdmin(admin);
    };
    loadAdmin();
  }, [user, tenant?.id]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDisplayName(user.id, displayName);
      toast({ title: t('common.saveSuccess') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const navItems: NavItem[] = [
    { key: 'profile', icon: <User className="w-4 h-4" />, label: t('globalSettings.profile') },
    { key: 'language', icon: <Globe className="w-4 h-4" />, label: t('settings.language') },
    { key: 'exchange-rates', icon: <TrendingUp className="w-4 h-4" />, label: t('exchangeRates.title'), adminOnly: true },
    { key: 'currency', icon: <CircleDollarSign className="w-4 h-4" />, label: t('globalSettings.currency'), adminOnly: true },
    { key: 'users', icon: <Users className="w-4 h-4" />, label: t('settings.users'), adminOnly: true },
    { key: 'invite-codes', icon: <Key className="w-4 h-4" />, label: t('invite.title'), adminOnly: true },
    { key: 'data-cleanup', icon: <Trash2 className="w-4 h-4" />, label: t('tenantCleanup.navLabel'), adminOnly: true },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="w-4 h-4" />{t('globalSettings.profile')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('globalSettings.displayName')}</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('globalSettings.email')}</Label>
                  <Input value={email} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>{t('globalSettings.yourRole')}</Label>
                  <div>
                    <Badge variant={userRole === 'admin' ? 'destructive' : userRole === 'accountant' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                      <Shield className="w-3.5 h-3.5 mr-1.5" />
                      {userRole === 'admin' ? t('users.roleAdmin') : 
                       userRole === 'accountant' ? t('users.roleAccountant') : 
                       userRole === 'project_manager' ? t('users.roleProjectManager') : 
                       userRole === 'shareholder' ? t('users.roleShareholder') : t('users.roleViewer')}
                    </Badge>
                  </div>
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
                  {t('globalSettings.saveProfile')}
                </Button>
              </CardContent>
            </Card>
            <PasswordChangeCard />
          </div>
        );
      case 'language': return <LanguageSettings />;
      case 'exchange-rates': return <ExchangeRatesContent />;
      case 'currency': return <CurrencySettingCard />;
      case 'users': return <UserManagement />;
      case 'invite-codes': return <InvitationCodeManagement />;
      case 'data-cleanup': return <TenantDataCleanup />;
      default: return null;
    }
  };

  return (
    <MobilePageShell title={t('globalSettings.title')} icon={<Settings className="w-5 h-5" />} backTo="/">
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="flex gap-8 items-start">
          {/* Left sidebar navigation - desktop only */}
          {!isMobile && (
            <nav className="w-56 shrink-0 sticky top-4 self-start">
              <div className="space-y-1">
                {visibleNavItems.map(item => (
                  <button
                    key={item.key}
                    onClick={() => setActiveSection(item.key)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                      activeSection === item.key
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </nav>
          )}

          {/* Main content area */}
          <div className={cn("flex-1 min-w-0 min-h-[calc(100vh-120px)]", !isMobile && "max-w-3xl mx-auto")}>
            {/* Mobile: horizontal scrollable nav */}
            {isMobile && (
              <div className="overflow-x-auto mb-4 -mx-4 px-4">
                <div className="flex gap-1 pb-2">
                  {visibleNavItems.map(item => (
                    <button
                      key={item.key}
                      onClick={() => setActiveSection(item.key)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0",
                        activeSection === item.key
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {renderContent()}
          </div>
        </div>
      </div>
    </MobilePageShell>
  );
}
