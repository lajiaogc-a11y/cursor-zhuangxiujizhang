import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { BarChart3, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQPurchaseOrders } from '@/hooks/useQPurchaseOrders';
import { useQSuppliers } from '@/hooks/useQSuppliers';
import { useI18n } from '@/lib/i18n';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subMonths, isAfter, parseISO } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#8884d8', '#82ca9d', '#ffc658'];

export default function SummaryPage() {
  const { orders, loading: ordersLoading } = useQPurchaseOrders();
  const { suppliers, loading: suppliersLoading } = useQSuppliers();
  const { t } = useI18n();
  const loading = ordersLoading || suppliersLoading;
  const [timePeriod, setTimePeriod] = useState('all');

  const filteredOrders = useMemo(() => {
    if (timePeriod === 'all') return orders;
    const months = timePeriod === '3m' ? 3 : timePeriod === '6m' ? 6 : 12;
    const cutoff = subMonths(new Date(), months);
    return orders.filter(o => isAfter(parseISO(o.createdAt), cutoff));
  }, [orders, timePeriod]);

  const stats = useMemo(() => {
    const totalAmount = filteredOrders.reduce((s, o) => s + o.totalAmount, 0);
    const totalPaid = filteredOrders.reduce((s, o) => s + o.paidAmount, 0);
    const activeSuppliers = new Set(filteredOrders.map(o => o.supplierId).filter(Boolean)).size;
    const pendingFinance = filteredOrders.filter(o => o.status === 'received').length;

    // By supplier
    const bySupplier = new Map<string, { name: string; total: number; count: number }>();
    filteredOrders.forEach(o => {
      const key = o.supplierId || 'unknown';
      const existing = bySupplier.get(key) || { name: o.supplierName || t('cost.unknown'), total: 0, count: 0 };
      existing.total += o.totalAmount;
      existing.count += 1;
      bySupplier.set(key, existing);
    });
    const supplierRanking = Array.from(bySupplier.values()).sort((a, b) => b.total - a.total).slice(0, 10);
    const maxSupplierTotal = supplierRanking[0]?.total || 1;

    // By month (trend)
    const byMonth = new Map<string, number>();
    filteredOrders.forEach(o => {
      const month = format(parseISO(o.createdAt), 'yyyy-MM');
      byMonth.set(month, (byMonth.get(month) || 0) + o.totalAmount);
    });
    const trendData = Array.from(byMonth.entries()).sort().slice(-12).map(([month, total]) => ({
      month: format(parseISO(month + '-01'), 'MM月'),
      total,
    }));

    // Supplier distribution (pie)
    const supplierPie = supplierRanking.slice(0, 6).map(s => ({ name: s.name, value: s.total }));

    // Status distribution (pie)
    const statusCount = new Map<string, number>();
    filteredOrders.forEach(o => {
      statusCount.set(o.status, (statusCount.get(o.status) || 0) + 1);
    });
    const statusLabels: Record<string, string> = {
      draft: t('po.statusDraft'), ordered: t('po.statusOrdered'), received: t('po.statusReceived'),
      submitted_to_finance: t('po.statusSubmitted'), archived: t('po.statusArchived'),
      partial_received: t('po.statusPartialReceived'),
    };
    const statusPie = Array.from(statusCount.entries()).map(([status, count]) => ({
      name: statusLabels[status] || status, value: count,
    }));

    return { totalAmount, totalPaid, activeSuppliers, pendingFinance, supplierRanking, maxSupplierTotal, trendData, supplierPie, statusPie, orderCount: filteredOrders.length };
  }, [filteredOrders, t]);

  return (
    <MobilePageShell title={t('purchasing.summaryModule')} icon={<BarChart3 className="w-5 h-5" />} backTo="/purchasing"
      headerActions={
        <div className="flex gap-1">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">{t('purchasing.last3Months')}</SelectItem>
              <SelectItem value="6m">{t('purchasing.last6Months')}</SelectItem>
              <SelectItem value="12m">{t('purchasing.lastYear')}</SelectItem>
              <SelectItem value="all">{t('purchasing.allTime')}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8"><Download className="w-3.5 h-3.5" /></Button>
        </div>
      }>
      <div className="p-4 space-y-4">
        {loading ? <AppSectionLoading label={t('common.loading')} compact /> : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="stat-card-v2"><div className="flex items-center gap-3"><BarChart3 className="w-8 h-8 text-primary/20" /><div><p className="text-xl font-bold">RM {stats.totalAmount.toLocaleString('en', { minimumFractionDigits: 0 })}</p><p className="text-xs text-muted-foreground">{t('purchasing.totalPurchase')}</p></div></div></div>
              <div className="stat-card-v2"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center"><span className="text-xs font-bold text-blue-600">{stats.orderCount}</span></div><div><p className="text-xl font-bold">{stats.orderCount}</p><p className="text-xs text-muted-foreground">{t('purchasing.orderCount')}</p><p className="text-[10px] text-muted-foreground">RM {stats.orderCount > 0 ? (stats.totalAmount / stats.orderCount).toLocaleString('en', { maximumFractionDigits: 0 }) : 0}/{t('purchasing.orderUnit')}</p></div></div></div>
              <div className="stat-card-v2"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center"><span className="text-xs font-bold text-emerald-600">{stats.activeSuppliers}</span></div><div><p className="text-xl font-bold">{stats.activeSuppliers}</p><p className="text-xs text-muted-foreground">{t('purchasing.activeSuppliers')}</p></div></div></div>
              <div className="stat-card-v2"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center"><span className="text-xs font-bold text-amber-600">{stats.pendingFinance}</span></div><div><p className="text-xl font-bold text-amber-600">{stats.pendingFinance}</p><p className="text-xs text-muted-foreground">{t('purchasing.pendingFinance')}</p></div></div></div>
            </div>

            {/* Trend Chart */}
            {stats.trendData.length > 0 && (
              <Card>
                <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">{t('purchasing.purchaseTrend')}</CardTitle></CardHeader>
                <CardContent className="p-3 pt-2">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.trendData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                        <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip formatter={(value: number) => [`RM ${value.toLocaleString()}`, t('purchasing.totalPurchase')]} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pie Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.supplierPie.length > 0 && (
                <Card>
                  <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">{t('purchasing.supplierDistribution')}</CardTitle></CardHeader>
                  <CardContent className="p-3 pt-2">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.supplierPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {stats.supplierPie.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value: number) => `RM ${value.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
              {stats.statusPie.length > 0 && (
                <Card>
                  <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">{t('purchasing.statusDistribution')}</CardTitle></CardHeader>
                  <CardContent className="p-3 pt-2">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                            {stats.statusPie.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Supplier Ranking */}
            <Card>
              <CardHeader className="p-3"><CardTitle className="text-sm">{t('purchasing.supplierRanking')}</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0">
                {stats.supplierRanking.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('purchasing.noDataYet')}</p>
                ) : (
                  <div className="space-y-3">
                    {stats.supplierRanking.map((s, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-5 font-medium">{i + 1}</span>
                            <span className="font-medium">{s.name}</span>
                            <Badge variant="secondary" className="text-[10px]">{s.count}{t('purchasing.orderUnit')}</Badge>
                          </div>
                          <span className="font-semibold">RM {s.total.toLocaleString('en', { minimumFractionDigits: 0 })}</span>
                        </div>
                        <Progress value={(s.total / stats.maxSupplierTotal) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MobilePageShell>
  );
}
