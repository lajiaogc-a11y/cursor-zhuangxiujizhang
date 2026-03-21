import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Settings } from 'lucide-react';
import { adminService } from '@/services';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';

type Discrepancy = adminService.Discrepancy;

export function DataConsistencyAlert() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const { userRole, hasPermission } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Only show for users who can access settings
  const canView = userRole === 'admin' || hasPermission('nav.settings');

  useEffect(() => {
    checkConsistency();
  }, []);

  const checkConsistency = async () => {
    if (!tenantId) { setLoading(false); return; }
    try {
      const found = await adminService.checkDataConsistency(tenantId, {
        income: t('dataConsistency.income'),
        expense: t('dataConsistency.expense'),
        addition: t('dataConsistency.addition'),
      });
      setDiscrepancies(found);
    } catch (error) {
      console.error('Consistency check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || dismissed || discrepancies.length === 0 || !canView) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>
          {t('dataConsistency.alertTitle')}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">
          {t('dataConsistency.discrepanciesFound').replace('{count}', discrepancies.length.toString())}
        </p>
        <ul className="text-xs space-y-1 mb-3 max-h-32 overflow-y-auto">
          {discrepancies.slice(0, 10).map((d, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono">{d.projectCode}</span>
              <span>{d.projectName}</span>
              <span>- {d.field}:</span>
              <span>{t('dataConsistency.recorded')} {d.recorded.toFixed(2)}</span>
              <span>vs</span>
              <span>{t('dataConsistency.actual')} {d.calculated.toFixed(2)}</span>
            </li>
          ))}
          {discrepancies.length > 10 && (
            <li className="text-muted-foreground">...{t('dataConsistency.andMore').replace('{count}', String(discrepancies.length - 10))}</li>
          )}
        </ul>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings?tab=data-check')}
            className="text-destructive border-destructive hover:bg-destructive/10"
          >
            <Settings className="w-4 h-4 mr-2" />
            {t('dataConsistency.goToFix')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
