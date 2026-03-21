import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';

interface EmployeeSalaryData {
  employeeId: string;
  name: string;
  position: string | null;
  baseSalary: number;
  commission: number;
  fullAttendanceBonus: number;
  otherBonus: number;
  companyInsurance: number;
  insuranceDeduction: number;
  advanceAmount: number;
  advanceIds: string[];
  leaveDays: number;
  workDays: number;
  penalty: number;
  netSalary: number;
  isIssued: boolean;
}

interface SalaryEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeSalaryData;
  onSave: (data: Partial<EmployeeSalaryData>) => void;
}

export function SalaryEditDialog({ open, onOpenChange, employee, onSave }: SalaryEditDialogProps) {
  const { t } = useI18n();
  
  const [formData, setFormData] = useState({
    fullAttendanceBonus: employee.fullAttendanceBonus,
    otherBonus: employee.otherBonus,
    insuranceDeduction: employee.insuranceDeduction,
    leaveDays: employee.leaveDays,
    workDays: employee.workDays,
    penalty: employee.penalty,
  });

  useEffect(() => {
    setFormData({
      fullAttendanceBonus: employee.fullAttendanceBonus,
      otherBonus: employee.otherBonus,
      insuranceDeduction: employee.insuranceDeduction,
      leaveDays: employee.leaveDays,
      workDays: employee.workDays,
      penalty: employee.penalty,
    });
  }, [employee]);

  // Calculate preview net salary
  const previewNetSalary = () => {
    return (
      employee.baseSalary +
      employee.commission +
      formData.fullAttendanceBonus +
      formData.otherBonus -
      formData.insuranceDeduction -
      employee.advanceAmount -
      formData.penalty
    );
  };

  const formatMoney = (amount: number) => {
    return `RM ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('payroll.editSalary')} - {employee.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Read-only info */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-muted-foreground">{t('payroll.baseSalary')}</Label>
              <div className="font-medium">{formatMoney(employee.baseSalary)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('payroll.commission')}</Label>
              <div className="font-medium text-primary">{formatMoney(employee.commission)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('payroll.advanceDeduction')}</Label>
              <div className="font-medium text-warning">-{formatMoney(employee.advanceAmount)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('payroll.companyInsurance')}</Label>
              <div className="font-medium">{formatMoney(employee.companyInsurance)}</div>
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('payroll.fullAttendanceBonus')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.fullAttendanceBonus}
                onChange={(e) => setFormData({ ...formData, fullAttendanceBonus: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('payroll.otherBonus')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.otherBonus}
                onChange={(e) => setFormData({ ...formData, otherBonus: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('payroll.insuranceDeduction')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.insuranceDeduction}
                onChange={(e) => setFormData({ ...formData, insuranceDeduction: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('payroll.penalty')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.penalty}
                onChange={(e) => setFormData({ ...formData, penalty: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('payroll.leaveDays')}</Label>
              <Input
                type="number"
                step="1"
                value={formData.leaveDays}
                onChange={(e) => setFormData({ ...formData, leaveDays: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('payroll.workDays')}</Label>
              <Input
                type="number"
                step="1"
                value={formData.workDays}
                onChange={(e) => setFormData({ ...formData, workDays: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Net salary preview */}
          <div className="p-3 bg-success/10 rounded-lg border border-success/20">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('payroll.netSalary')}</span>
              <span className="text-xl font-bold text-success">{formatMoney(previewNetSalary())}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
