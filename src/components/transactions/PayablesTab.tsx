import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, AlertTriangle, DollarSign, CheckCircle, FileSpreadsheet, MoreVertical, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { fetchPayables, fetchProjectsList } from '@/services/payables.service';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { PayableForm } from '@/components/payables/PayableForm';
import { PayablePaymentForm } from '@/components/payables/PayablePaymentForm';
import { PayableDetail } from '@/components/payables/PayableDetail';
import { PayableList } from '@/components/payables/PayableList';
import { exportPayablesToPDF, exportPayablesToExcel, type PayableExportData } from '@/lib/exportUtils';
import { AgingAnalysis } from '@/components/payables/AgingAnalysis';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidationMap, invalidateQueriesWithTenant } from '@/lib/queryKeys';
import { useTenant } from '@/lib/tenant';

const formatCurrency = (amount: number, currency: string = 'MYR') => {
  const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
  return `${symbols[currency] || ''}${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function PayablesTab() {
  const { t, language } = useI18n();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const canEdit = hasPermission('feature.edit');
  const canExport = hasPermission('feature.export');
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'payable' | 'receivable'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formRecordType, setFormRecordType] = useState<'payable' | 'receivable'>('payable');
  const [editData, setEditData] = useState<any>(null);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<any>(null);

  const { data: payables = [] } = useQuery({
    queryKey: [...queryKeys.payables, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return fetchPayables(tenantId);
    },
    enabled: !!tenantId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: [...queryKeys.projects, 'list', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return fetchProjectsList(tenantId);
    },
    enabled: !!tenantId,
  });

  const invalidatePayables = () => {
    invalidateQueriesWithTenant(queryClient, tenantId, invalidationMap.payableMutation);
  };
  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects]);

  const filtered = useMemo(() => payables.filter(p => {
    if (typeFilter !== 'all' && (p.record_type || 'payable') !== typeFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (currencyFilter !== 'all' && p.currency !== currencyFilter) return false;
    if (search) {
      const kw = search.toLowerCase();
      const proj = p.project_id ? projectMap[p.project_id] : null;
      const projName = proj ? `${proj.project_code} ${proj.project_name}`.toLowerCase() : '';
      const amountStr = String(p.total_amount || '');
      const unpaidStr = String(p.unpaid_amount || '');
      if (!p.supplier_name.toLowerCase().includes(kw) && !(p.description || '').toLowerCase().includes(kw) && !(p.remark || '').toLowerCase().includes(kw) && !amountStr.includes(kw) && !unpaidStr.includes(kw) && !projName.includes(kw)) return false;
    }
    return true;
  }), [payables, typeFilter, statusFilter, currencyFilter, search, projectMap]);

  const payableItems = useMemo(() => filtered.filter(p => (p.record_type || 'payable') === 'payable'), [filtered]);
  const receivableItems = useMemo(() => filtered.filter(p => (p.record_type || 'payable') === 'receivable'), [filtered]);

  const payableStats = useMemo(() => ({
    total: payableItems.reduce((s, p) => s + Number(p.total_amount_myr || 0), 0),
    paid: payableItems.reduce((s, p) => s + Number(p.paid_amount_myr || 0), 0),
    unpaid: payableItems.reduce((s, p) => s + Number(p.unpaid_amount_myr || 0), 0),
  }), [payableItems]);

  const receivableStats = useMemo(() => ({
    total: receivableItems.reduce((s, p) => s + Number(p.total_amount_myr || 0), 0),
    received: receivableItems.reduce((s, p) => s + Number(p.paid_amount_myr || 0), 0),
    unreceived: receivableItems.reduce((s, p) => s + Number(p.unpaid_amount_myr || 0), 0),
  }), [receivableItems]);

  const overdueCount = filtered.filter(p => p.due_date && p.status !== 'paid' && new Date(p.due_date) < new Date()).length;

  const getExportData = (): PayableExportData => ({
    payables: filtered.map(p => ({
      date: p.payable_date, supplier: p.supplier_name, description: p.description,
      totalAmount: Number(p.total_amount || 0), currency: p.currency, paidAmount: Number(p.paid_amount || 0),
      unpaidAmount: Number(p.unpaid_amount || 0), status: p.status,
      project: projects.find(pr => pr.id === p.project_id)?.project_code || '',
      dueDate: p.due_date || '', remark: p.remark || '', recordType: p.record_type || 'payable',
    })),
    summary: { totalPayable: payableStats.total, totalPaid: payableStats.paid, totalUnpaid: payableStats.unpaid, overdueCount },
    language,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end flex-wrap gap-3">
        {isMobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm"><MoreVertical className="w-4 h-4 mr-1" />{t('common.actions')}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canExport && (<>
                <DropdownMenuItem onClick={() => { exportPayablesToPDF(getExportData()); toast.success(t('payables.exportSuccess')); }}><FileText className="w-4 h-4 mr-2" />{t('payables.exportPDF')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { exportPayablesToExcel(getExportData()); toast.success(t('payables.exportSuccess')); }}><FileSpreadsheet className="w-4 h-4 mr-2" />{t('payables.exportExcel')}</DropdownMenuItem>
              </>)}
              {canEdit && (<>
                <DropdownMenuItem onClick={() => { setEditData(null); setFormRecordType('payable'); setFormOpen(true); }}><Plus className="w-4 h-4 mr-2" />{t('payables.newPayable')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setEditData(null); setFormRecordType('receivable'); setFormOpen(true); }}><Plus className="w-4 h-4 mr-2" />{t('payables.newReceivable')}</DropdownMenuItem>
              </>)}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (<>
          {canExport && (<>
            <Button variant="outline" size="sm" onClick={() => { exportPayablesToPDF(getExportData()); toast.success(t('payables.exportSuccess')); }}><FileText className="w-4 h-4 mr-1" />{t('payables.exportPDF')}</Button>
            <Button variant="outline" size="sm" onClick={() => { exportPayablesToExcel(getExportData()); toast.success(t('payables.exportSuccess')); }}><FileSpreadsheet className="w-4 h-4 mr-1" />{t('payables.exportExcel')}</Button>
          </>)}
          {canEdit && (<>
            <Button variant="outline" onClick={() => { setEditData(null); setFormRecordType('receivable'); setFormOpen(true); }}><Plus className="w-4 h-4 mr-2" />{t('payables.newReceivable')}</Button>
            <Button onClick={() => { setEditData(null); setFormRecordType('payable'); setFormOpen(true); }}><Plus className="w-4 h-4 mr-2" />{t('payables.newPayable')}</Button>
          </>)}
        </>)}
      </div>

      <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">{t('payables.typeAll')}</TabsTrigger>
          <TabsTrigger value="payable">{t('payables.payable')}</TabsTrigger>
          <TabsTrigger value="receivable">{t('payables.receivable')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {(typeFilter === 'all' || typeFilter === 'payable') && (
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4 flex flex-col items-center text-center"><div className="p-2 rounded-xl bg-primary/10 mb-2"><ArrowUpCircle className="w-5 h-5 text-primary" /></div><p className="text-xs text-muted-foreground">{t('payables.totalPayable')}</p><p className="text-sm sm:text-xl font-bold break-all">{formatCurrency(payableStats.total)}</p></CardContent></Card>
            <Card><CardContent className="p-4 flex flex-col items-center text-center"><div className="p-2 rounded-xl bg-success/10 mb-2"><CheckCircle className="w-5 h-5 text-success" /></div><p className="text-xs text-muted-foreground">{t('payables.totalPaid')}</p><p className="text-sm sm:text-xl font-bold text-success break-all">{formatCurrency(payableStats.paid)}</p></CardContent></Card>
            <Card><CardContent className="p-4 flex flex-col items-center text-center"><div className="p-2 rounded-xl bg-destructive/10 mb-2"><DollarSign className="w-5 h-5 text-destructive" /></div><p className="text-xs text-muted-foreground">{t('payables.totalUnpaid')}</p><p className="text-sm sm:text-xl font-bold text-destructive break-all">{formatCurrency(payableStats.unpaid)}</p></CardContent></Card>
          </div>
        )}
        {(typeFilter === 'all' || typeFilter === 'receivable') && (
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4 flex flex-col items-center text-center"><div className="p-2 rounded-xl bg-blue-500/10 mb-2"><ArrowDownCircle className="w-5 h-5 text-blue-500" /></div><p className="text-xs text-muted-foreground">{t('payables.totalReceivable')}</p><p className="text-sm sm:text-xl font-bold break-all">{formatCurrency(receivableStats.total)}</p></CardContent></Card>
            <Card><CardContent className="p-4 flex flex-col items-center text-center"><div className="p-2 rounded-xl bg-success/10 mb-2"><CheckCircle className="w-5 h-5 text-success" /></div><p className="text-xs text-muted-foreground">{t('payables.totalReceived')}</p><p className="text-sm sm:text-xl font-bold text-success break-all">{formatCurrency(receivableStats.received)}</p></CardContent></Card>
            <Card><CardContent className="p-4 flex flex-col items-center text-center"><div className="p-2 rounded-xl bg-warning/10 mb-2"><AlertTriangle className="w-5 h-5 text-warning" /></div><p className="text-xs text-muted-foreground">{t('payables.totalUnreceived')}</p><p className="text-sm sm:text-xl font-bold text-warning break-all">{formatCurrency(receivableStats.unreceived)}</p></CardContent></Card>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input className="w-full sm:w-64" placeholder={t('payables.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[calc(50%-6px)] sm:w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('payables.allStatuses')}</SelectItem>
            <SelectItem value="pending">{t('payables.pending')}</SelectItem>
            <SelectItem value="partial">{t('payables.partial')}</SelectItem>
            <SelectItem value="paid">{t('payables.paid')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
          <SelectTrigger className="w-[calc(50%-6px)] sm:w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="MYR">MYR</SelectItem>
            <SelectItem value="CNY">CNY</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AgingAnalysis payables={filtered} />

      <Card><CardContent className="p-0">
        <PayableList payables={filtered} projects={projects} onEdit={(p) => { setEditData(p); setFormRecordType(p.record_type || 'payable'); setFormOpen(true); }} onAddPayment={p => { setPaymentTarget(p); setPaymentFormOpen(true); }} onViewDetail={p => { setDetailTarget(p); setDetailOpen(true); }} onRefresh={invalidatePayables} />
      </CardContent></Card>

      <PayableForm open={formOpen} onOpenChange={setFormOpen} onSuccess={invalidatePayables} editData={editData} defaultRecordType={formRecordType} />
      <PayablePaymentForm open={paymentFormOpen} onOpenChange={setPaymentFormOpen} onSuccess={invalidatePayables} payable={paymentTarget} />
      <PayableDetail open={detailOpen} onOpenChange={setDetailOpen} payable={detailTarget} onRefresh={invalidatePayables} />
    </div>
  );
}
