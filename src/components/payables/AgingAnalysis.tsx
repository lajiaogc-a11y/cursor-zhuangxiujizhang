import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';

interface AgingAnalysisProps {
  payables: any[];
}

const formatCurrency = (amount: number) =>
  `RM${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function AgingAnalysis({ payables }: AgingAnalysisProps) {
  const { t } = useI18n();
  const today = new Date();

  const unpaid = useMemo(() =>
    payables.filter(p => p.status !== 'paid' && p.due_date),
    [payables]
  );

  const buckets = useMemo(() => {
    const b = { current: [] as any[], d30: [] as any[], d60: [] as any[], d90: [] as any[], over90: [] as any[] };
    unpaid.forEach(p => {
      const due = new Date(p.due_date);
      const diffDays = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (diffDays <= 0) b.current.push(p);
      else if (diffDays <= 30) b.d30.push(p);
      else if (diffDays <= 60) b.d60.push(p);
      else if (diffDays <= 90) b.d90.push(p);
      else b.over90.push(p);
    });
    return b;
  }, [unpaid, today]);

  const sumUnpaid = (items: any[]) => items.reduce((s, p) => s + Number(p.unpaid_amount_myr || 0), 0);

  const rows = [
    { label: t('aging.current'), items: buckets.current, color: 'bg-green-500' },
    { label: t('aging.d30'), items: buckets.d30, color: 'bg-yellow-500' },
    { label: t('aging.d60'), items: buckets.d60, color: 'bg-orange-500' },
    { label: t('aging.d90'), items: buckets.d90, color: 'bg-red-400' },
    { label: t('aging.over90'), items: buckets.over90, color: 'bg-red-600' },
  ];

  const totalUnpaid = sumUnpaid(unpaid);
  const noDueDate = payables.filter(p => p.status !== 'paid' && !p.due_date);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('aging.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary bars */}
        <div className="flex h-6 rounded-full overflow-hidden mb-4">
          {rows.map(r => {
            const pct = totalUnpaid > 0 ? (sumUnpaid(r.items) / totalUnpaid) * 100 : 0;
            return pct > 0 ? (
              <div key={r.label} className={`${r.color} relative`} style={{ width: `${pct}%` }} title={`${r.label}: ${formatCurrency(sumUnpaid(r.items))}`} />
            ) : null;
          })}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('aging.period')}</TableHead>
              <TableHead className="text-center">{t('aging.count')}</TableHead>
              <TableHead className="text-right">{t('aging.unpaidAmount')}</TableHead>
              <TableHead className="text-right">{t('aging.percentage')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.label}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${r.color}`} />
                    {r.label}
                  </div>
                </TableCell>
                <TableCell className="text-center">{r.items.length}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(sumUnpaid(r.items))}</TableCell>
                <TableCell className="text-right">{totalUnpaid > 0 ? ((sumUnpaid(r.items) / totalUnpaid) * 100).toFixed(1) : '0'}%</TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold border-t-2">
              <TableCell>{t('aging.total')}</TableCell>
              <TableCell className="text-center">{unpaid.length}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(totalUnpaid)}</TableCell>
              <TableCell className="text-right">100%</TableCell>
            </TableRow>
            {noDueDate.length > 0 && (
              <TableRow className="text-muted-foreground">
                <TableCell>{t('aging.noDueDate')}</TableCell>
                <TableCell className="text-center">{noDueDate.length}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(sumUnpaid(noDueDate))}</TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
