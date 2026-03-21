import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { saveEmployee, fetchActivePositions } from '@/services/payroll.service';
import { Loader2 } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  position: string | null;
  phone: string | null;
  monthly_salary: number;
  status: 'active' | 'inactive';
}

interface Position {
  id: string;
  name: string;
}

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSuccess: () => void;
}

export function EmployeeForm({ open, onOpenChange, employee, onSuccess }: EmployeeFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    phone: '',
    monthly_salary: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Fetch positions from database
  useEffect(() => {
    fetchActivePositions().then(data => setPositions(data as Position[]));
  }, []);

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        position: employee.position || '',
        phone: employee.phone || '',
        monthly_salary: employee.monthly_salary.toString(),
        status: employee.status,
      });
    } else {
      setFormData({
        name: '',
        position: '',
        phone: '',
        monthly_salary: '',
        status: 'active',
      });
    }
  }, [employee, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: t('payroll.nameRequired'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await saveEmployee(
        {
          id: employee?.id,
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          position: formData.position.trim() || undefined,
          monthly_salary: parseFloat(formData.monthly_salary) || 0,
          status: formData.status,
        },
        user?.id,
        tenant?.id
      );
      toast({ title: employee ? t('common.updateSuccess') : t('common.addSuccess') });
      onSuccess();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {employee ? t('payroll.editEmployee') : t('payroll.newEmployee')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('payroll.employeeName')} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('payroll.enterName')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">{t('payroll.position')}</Label>
            <Select
              value={formData.position}
              onValueChange={(value) => setFormData({ ...formData, position: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('payroll.selectPosition')} />
              </SelectTrigger>
              <SelectContent>
                {positions.map(pos => (
                  <SelectItem key={pos.id} value={pos.name}>{pos.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('payroll.phone')}</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={t('payroll.enterPhone')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly_salary">{t('payroll.baseSalary')} (MYR)</Label>
            <Input
              id="monthly_salary"
              type="number"
              step="0.01"
              value={formData.monthly_salary}
              onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('common.status')}</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('payroll.statusActive')}</SelectItem>
                <SelectItem value="inactive">{t('payroll.statusInactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
