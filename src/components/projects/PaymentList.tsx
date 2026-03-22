import { useState, useEffect } from 'react';
import { projectsService } from '@/services';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Edit, Trash2, Image } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentForm } from './PaymentForm';
import { useI18n } from '@/lib/i18n';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { ImagePreviewDialog } from '@/components/ui/image-preview-dialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface Payment {
  id: string;
  payment_stage: string;
  amount: number;
  currency: string;
  account_type: string;
  exchange_rate: number;
  amount_myr: number;
  payment_date: string;
  remark: string | null;
  receipt_url: string | null;
}

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  contract_currency: string;
  contract_amount: number;
  contract_amount_myr: number;
  total_addition_myr?: number;
}

interface PaymentListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export function PaymentList({ open, onOpenChange, project }: PaymentListProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const stageLabels: Record<string, string> = {
    deposit_1: t('payment.deposit1'),
    deposit_2: t('payment.deposit2'),
    progress_3: t('payment.progress3'),
    progress_4: t('payment.progress4'),
    final_5: t('payment.final5'),
  };

  const fetchPayments = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const data = await projectsService.fetchProjectPayments(project.id);
      setPayments(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (open && project) {
      fetchPayments();
    }
  }, [open, project]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('paymentList.deleteConfirm'))) return;
    try {
      await projectsService.deleteProjectPayment(id);
      toast.success(t('paymentList.deleted'));
      fetchPayments();
    } catch {
      toast.error(t('common.deleteFailed'));
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
    return `${symbols[currency] || ''}${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalReceived = payments.reduce((sum, p) => sum + p.amount_myr, 0);
  // 待收款 = 合同金额 + 增项金额 - 已收款
  const contractAmount = project?.contract_amount_myr || 0;
  const additionAmount = project?.total_addition_myr || 0;
  const totalContract = contractAmount + additionAmount;
  // 如果合同金额和增项金额都为0，待收款为0；否则 = 总应收 - 已收，且不允许负数
  const remaining = (contractAmount === 0 && additionAmount === 0) ? 0 : Math.max(0, totalContract - totalReceived);

  if (!project) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('paymentList.title')} - {project.project_code} {project.project_name}
            </DialogTitle>
          </DialogHeader>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <div className="text-xs sm:text-sm text-muted-foreground">{t('paymentList.contractAmount')}</div>
              <div className="text-base sm:text-xl font-bold break-all">
                {formatCurrency(project.contract_amount, project.contract_currency)}
              </div>
              {project.contract_currency !== 'MYR' && (
                <div className="text-xs text-muted-foreground">
                  ≈ RM {project.contract_amount_myr.toLocaleString()}
                </div>
              )}
            </div>
            <div className="p-3 sm:p-4 bg-primary/10 rounded-lg">
              <div className="text-xs sm:text-sm text-muted-foreground">{t('paymentList.additionAmount')}</div>
              <div className="text-base sm:text-xl font-bold text-primary break-all">
                RM {(project.total_addition_myr || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 sm:p-4 bg-success/10 rounded-lg">
              <div className="text-xs sm:text-sm text-muted-foreground">{t('paymentList.received')}</div>
              <div className="text-base sm:text-xl font-bold text-success break-all">
                RM {totalReceived.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground">
                {totalContract > 0 ? ((totalReceived / totalContract) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="p-3 sm:p-4 bg-warning/10 rounded-lg">
              <div className="text-xs sm:text-sm text-muted-foreground">{t('paymentList.pending')}</div>
              <div className="text-base sm:text-xl font-bold text-warning break-all">
                RM {remaining.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* 添加按钮 */}
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditingPayment(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              {t('paymentList.addPayment')}
            </Button>
          </div>

          {/* 收款列表 */}
          {loading ? (
            <AppSectionLoading label={t('paymentList.loading')} compact />
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('paymentList.noRecords')}</div>
          ) : (
            isMobile ? (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <Card key={payment.id} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-[10px]">{stageLabels[payment.payment_stage]}</Badge>
                      <span className="text-xs text-muted-foreground">{payment.payment_date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{formatCurrency(payment.amount, payment.currency)}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {payment.account_type === 'cash' ? t('account.cash') : t('account.bank')}
                      </Badge>
                    </div>
                    {payment.currency !== 'MYR' && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ≈ RM {payment.amount_myr.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                    {payment.remark && <p className="text-xs text-muted-foreground mt-1 truncate">{payment.remark}</p>}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <div className="flex gap-1">
                        {payment.receipt_url && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewImage(payment.receipt_url!)}>
                            <Image className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingPayment(payment); setFormOpen(true); }}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(payment.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('paymentList.stage')}</TableHead>
                    <TableHead>{t('paymentList.date')}</TableHead>
                    <TableHead>{t('paymentList.account')}</TableHead>
                    <TableHead className="text-right">{t('paymentList.amount')}</TableHead>
                    <TableHead className="text-right">{t('paymentList.myrEquivalent')}</TableHead>
                    <TableHead>{t('common.receipt')}</TableHead>
                    <TableHead>{t('paymentList.remark')}</TableHead>
                    <TableHead className="text-right">{t('paymentList.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Badge variant="outline">{stageLabels[payment.payment_stage]}</Badge>
                      </TableCell>
                      <TableCell>{payment.payment_date}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {payment.account_type === 'cash' ? t('account.cash') : t('account.bank')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        RM {payment.amount_myr.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {payment.receipt_url ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewImage(payment.receipt_url!)}>
                            <Image className="w-4 h-4 text-primary" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{payment.remark || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingPayment(payment); setFormOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(payment.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </DialogContent>
      </Dialog>

      <PaymentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        projectId={project.id}
        projectCurrency={project.contract_currency}
        payment={editingPayment}
        onSuccess={fetchPayments}
      />

      <ImagePreviewDialog
        open={!!previewImage}
        onOpenChange={() => setPreviewImage(null)}
        imageUrl={previewImage}
        title={t('common.receipt')}
      />
    </>
  );
}
