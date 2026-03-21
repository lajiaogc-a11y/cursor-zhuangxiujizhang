import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchPayablePayments, deletePayablePayment } from '@/services/payables.service';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface PayableDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payable: any;
  onRefresh: () => void;
}

const formatCurrency = (amount: number, currency: string = 'MYR') => {
  const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
  return `${symbols[currency] || ''}${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function PayableDetail({ open, onOpenChange, payable, onRefresh }: PayableDetailProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('feature.edit');
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (open && payable) {
      fetchPayablePayments(payable.id).then(setPayments).catch(() => setPayments([]));
    }
  }, [open, payable]);

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await deletePayablePayment(paymentId);
      toast.success(t('common.deleteSuccess'));
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      onRefresh();
    } catch {
      toast.error(t('common.deleteFailed'));
    }
  };

  if (!payable) return null;

  const isReceivable = (payable.record_type || 'payable') === 'receivable';
  const statusVariant = payable.status === 'paid' ? 'default' : payable.status === 'partial' ? 'secondary' : 'destructive';

  const statusLabel = isReceivable
    ? (payable.status === 'paid' ? t('payables.receivablePaid') : payable.status === 'partial' ? t('payables.receivablePartial') : t('payables.receivablePending'))
    : t(`payables.${payable.status}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('payables.detail')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">{isReceivable ? t('payables.customerName') : t('payables.supplierName')}:</span>{' '}
              <strong>{payable.supplier_name}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">{t('payables.recordType')}:</span>{' '}
              <Badge variant="outline">{isReceivable ? t('payables.receivable') : t('payables.payable')}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">{t('payables.status')}:</span>{' '}
              <Badge variant={statusVariant as any}>{statusLabel}</Badge>
            </div>
            <div><span className="text-muted-foreground">{t('payables.description')}:</span> {payable.description}</div>
            <div><span className="text-muted-foreground">{t('payables.payableDate')}:</span> {payable.payable_date}</div>
            <div><span className="text-muted-foreground">{t('payables.totalAmount')}:</span> {formatCurrency(payable.total_amount, payable.currency)}</div>
            <div>
              <span className="text-muted-foreground">{isReceivable ? t('payables.totalReceived') : t('payables.paidAmount')}:</span>{' '}
              <span className="text-success">{formatCurrency(payable.paid_amount, payable.currency)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{isReceivable ? t('payables.totalUnreceived') : t('payables.unpaidAmount')}:</span>{' '}
              <span className="text-destructive font-bold">{formatCurrency(payable.unpaid_amount, payable.currency)}</span>
            </div>
            {payable.due_date && <div><span className="text-muted-foreground">{t('payables.dueDate')}:</span> {payable.due_date}</div>}
            {payable.remark && <div className="col-span-1 sm:col-span-2"><span className="text-muted-foreground">{t('common.remark')}:</span> {payable.remark}</div>}
          </div>

          <h3 className="font-semibold">{isReceivable ? t('payables.collectionHistory') : t('payables.paymentHistory')}</h3>
          {payments.length > 0 ? (
            isMobile ? (
              <div className="space-y-2">
                {payments.map(p => (
                  <Card key={p.id} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{p.payment_date}</span>
                      <Badge variant="outline">{t(`account.${p.account_type}`)}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{formatCurrency(p.amount, p.currency)}</span>
                      {p.currency !== 'MYR' && (
                        <span className="text-xs text-muted-foreground">≈ {formatCurrency(p.amount_myr)}</span>
                      )}
                    </div>
                    {p.remark && <p className="text-xs text-muted-foreground mt-1 truncate">{p.remark}</p>}
                    {canEdit && (
                      <div className="mt-2 flex justify-end">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-xs text-destructive"><Trash2 className="w-3 h-3 mr-1" />{t('common.delete')}</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePayment(p.id)}>{t('common.confirm')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isReceivable ? t('payables.collectionDate') : t('payables.paymentDate')}</TableHead>
                    <TableHead>{isReceivable ? t('payables.collectionAmount') : t('payables.paymentAmount')}</TableHead>
                    <TableHead>{t('transactions.myrEquivalent')}</TableHead>
                    <TableHead>{t('transactions.account')}</TableHead>
                    <TableHead>{t('common.remark')}</TableHead>
                    {canEdit && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.payment_date}</TableCell>
                      <TableCell>{formatCurrency(p.amount, p.currency)}</TableCell>
                      <TableCell>{formatCurrency(p.amount_myr)}</TableCell>
                      <TableCell>{t(`account.${p.account_type}`)}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{p.remark || '-'}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePayment(p.id)}>{t('common.confirm')}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            <p className="text-center text-muted-foreground py-4">{t('payables.noPayments')}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
