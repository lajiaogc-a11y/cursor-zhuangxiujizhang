import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Calculator, Search, Plus, MoreVertical, Trash2, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useI18n } from '@/lib/i18n';
import { useResponsive } from '@/hooks/useResponsive';

export default function BudgetPage() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const { toast } = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isMobile } = useResponsive();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<'quotation' | 'manual'>('manual');
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [newBreakdown, setNewBreakdown] = useState({ name: '', quotedAmount: 0, managementFeePct: 10, taxPct: 6 });
  const { sortConfig, requestSort, sortData } = useSortableTable<any>();

  const { data: breakdowns = [], isLoading } = useQuery({
    queryKey: ['q_project_breakdowns', tenantId],
    queryFn: async () => {
      const data = await costService.fetchBreakdowns();
      return (data || []).map((b: any) => ({
        id: b.id, quotationId: b.quotation_id,
        quotationNo: b.q_quotations?.project_no || null,
        customerName: b.q_quotations?.q_customers?.name_zh || null,
        name: b.name || t('cost.unnamed'), status: b.status || 'draft',
        quotedAmount: Number(b.quoted_amount) || 0,
        managementFeePct: Number(b.management_fee_pct) || 0,
        taxPct: Number(b.tax_pct) || 0,
        totalMaterialCost: Number(b.total_material_cost) || 0,
        totalLaborCost: Number(b.total_labor_cost) || 0,
        totalCost: Number(b.total_cost) || 0,
        createdAt: b.created_at,
      }));
    },
    enabled: !!user && !!tenantId,
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ['q_quotations_for_budget', tenantId],
    queryFn: () => costService.fetchQuotationsForBudget(),
    enabled: !!user && !!tenantId && createOpen,
  });

  const createBreakdown = useMutation({
    mutationFn: async () => {
      const insertData: any = { name: newBreakdown.name, quoted_amount: newBreakdown.quotedAmount, management_fee_pct: newBreakdown.managementFeePct, tax_pct: newBreakdown.taxPct, created_by: user?.id };
      if (createMode === 'quotation' && selectedQuotationId) {
        const q = quotations.find((q: any) => q.id === selectedQuotationId);
        insertData.quotation_id = selectedQuotationId;
        insertData.quoted_amount = Number(q?.total_amount) || newBreakdown.quotedAmount;
        if (!insertData.name) insertData.name = `${q?.quotation_no || ''} - ${q?.customer_name || ''}`.trim();
      }
      return costService.createBreakdown(insertData);
    },
    onSuccess: (id: string) => {
      queryClient.invalidateQueries({ queryKey: ['q_project_breakdowns', tenantId] });
      toast({ title: t('cost.budgetCreated') });
      setCreateOpen(false);
      setNewBreakdown({ name: '', quotedAmount: 0, managementFeePct: 10, taxPct: 6 });
      setSelectedQuotationId('');
      navigate(`/cost/budget/${id}`);
    },
    onError: (e: any) => toast({ title: t('cost.createFailed'), description: e.message, variant: 'destructive' }),
  });

  const deleteBreakdown = useMutation({
    mutationFn: (id: string) => costService.deleteBreakdown(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_project_breakdowns', tenantId] });
      toast({ title: t('cost.budgetDeleted') }); setDeleteId(null);
    },
  });

  const filtered = useMemo(() =>
    breakdowns.filter((b: any) => b.name.includes(search) || b.quotationNo?.includes(search) || b.customerName?.includes(search)),
    [breakdowns, search]
  );

  const sorted = sortData(filtered, (item: any, key: string) => {
    switch (key) {
      case 'quotationNo': return item.quotationNo;
      case 'customerName': return item.customerName;
      case 'quotedAmount': return item.quotedAmount;
      case 'totalMaterialCost': return item.totalMaterialCost;
      case 'totalLaborCost': return item.totalLaborCost;
      case 'totalCost': return item.totalCost;
      case 'createdAt': return item.createdAt;
      case 'status': return item.status;
      default: return (item as any)[key];
    }
  });

  const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    draft: { label: t('cost.draft'), variant: 'secondary' },
    submitted: { label: t('cost.submitted'), variant: 'default' },
    approved: { label: t('cost.approved'), variant: 'outline' },
  };

  const renderTable = () => (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">#</TableHead>
            <SortableTableHead sortKey="quotationNo" sortConfig={sortConfig} onSort={requestSort}>{t('quotation.projectNo')}</SortableTableHead>
            <SortableTableHead sortKey="customerName" sortConfig={sortConfig} onSort={requestSort}>{t('quotation.customer')}</SortableTableHead>
            <SortableTableHead sortKey="quotedAmount" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('cost.quotedAmount')}</SortableTableHead>
            <SortableTableHead sortKey="totalMaterialCost" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('cost.materialCost') || '材料成本'}</SortableTableHead>
            <SortableTableHead sortKey="totalLaborCost" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('cost.laborCost') || '人工成本'}</SortableTableHead>
            <SortableTableHead sortKey="totalCost" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('cost.totalCost')}</SortableTableHead>
            <TableHead className="text-right">{t('cost.profit')}</TableHead>
            <SortableTableHead sortKey="status" sortConfig={sortConfig} onSort={requestSort}>{t('common.status')}</SortableTableHead>
            <SortableTableHead sortKey="createdAt" sortConfig={sortConfig} onSort={requestSort}>{t('common.date')}</SortableTableHead>
            <TableHead className="w-[60px]">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((b: any, i: number) => {
            const st = statusLabels[b.status] || statusLabels.draft;
            const profitRate = b.quotedAmount > 0 ? ((b.quotedAmount - b.totalCost) / b.quotedAmount * 100) : 0;
            return (
              <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/cost/budget/${b.id}`)}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">{b.quotationNo || '-'}</TableCell>
                <TableCell>{b.customerName || '-'}</TableCell>
                <TableCell className="text-right">RM {b.quotedAmount.toLocaleString()}</TableCell>
                <TableCell className="text-right">RM {b.totalMaterialCost.toLocaleString()}</TableCell>
                <TableCell className="text-right">RM {b.totalLaborCost.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">RM {b.totalCost.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <span className={profitRate >= 0 ? 'text-green-600' : 'text-destructive'}>{profitRate.toFixed(1)}%</span>
                </TableCell>
                <TableCell><Badge variant={st.variant} className="text-[10px]">{st.label}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(b.createdAt), 'yyyy-MM-dd')}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/cost/budget/${b.id}`); }}><Eye className="w-3.5 h-3.5 mr-1.5" />{t('cost.viewDetail')}</DropdownMenuItem>
                      {b.status === 'draft' && <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); setDeleteId(b.id); }}><Trash2 className="w-3.5 h-3.5 mr-1.5" />{t('common.delete')}</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const renderCards = () => (
    <div className="space-y-2">
      {sorted.map((b: any) => {
        const st = statusLabels[b.status] || statusLabels.draft;
        const profitRate = b.quotedAmount > 0 ? ((b.quotedAmount - b.totalCost) / b.quotedAmount * 100) : 0;
        return (
          <Card key={b.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/cost/budget/${b.id}`)}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2"><p className="text-sm font-semibold truncate">{b.name}</p><Badge variant={st.variant} className="text-[10px] shrink-0">{st.label}</Badge></div>
              {b.quotationNo && <p className="text-[10px] text-muted-foreground mt-0.5">{b.quotationNo} | {b.customerName}</p>}
              <div className="grid grid-cols-3 gap-x-2 mt-1.5 text-xs text-muted-foreground">
                <span>{t('cost.quotation')}: RM {b.quotedAmount.toLocaleString()}</span>
                <span>{t('cost.costLabel')}: RM {b.totalCost.toLocaleString()}</span>
                <span className={profitRate >= 0 ? 'text-green-600' : 'text-destructive'}>{t('cost.profit')}: {profitRate.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <MobilePageShell title={t('cost.budget')} icon={<Calculator className="w-5 h-5" />} backTo="/cost">
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t('cost.searchProjects')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Button size="sm" className="gap-1 h-9" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> {t('common.new')}</Button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="stat-card-v2"><div className="flex items-center gap-3"><Calculator className="w-8 h-8 text-primary/20" /><div><p className="text-lg font-bold">{breakdowns.length}</p><p className="text-[10px] text-muted-foreground">{t('cost.totalProjects')}</p></div></div></div>
          <div className="stat-card-v2"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center"><span className="text-xs font-bold text-amber-600">{breakdowns.filter((b: any) => b.status === 'draft').length}</span></div><div><p className="text-lg font-bold">{breakdowns.filter((b: any) => b.status === 'draft').length}</p><p className="text-[10px] text-muted-foreground">{t('cost.inProgress')}</p></div></div></div>
          <div className="stat-card-v2"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-[10px] font-bold text-primary">RM</span></div><div><p className="text-lg font-bold">{(breakdowns.reduce((s: number, b: any) => s + b.totalCost, 0) / 1000).toFixed(1)}K</p><p className="text-[10px] text-muted-foreground">{t('cost.totalCost')}</p></div></div></div>
        </div>

        {isLoading ? <AppSectionLoading label={t('common.loading')} compact />
        : filtered.length === 0 ? <div className="text-center py-12 text-sm text-muted-foreground">{search ? t('cost.noMatchingProjects') : t('cost.noBudgetProjects')}</div>
        : isMobile ? renderCards() : renderTable()}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('cost.newBudget')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant={createMode === 'manual' ? 'default' : 'outline'} size="sm" onClick={() => setCreateMode('manual')}>{t('cost.manualCreate')}</Button>
              <Button variant={createMode === 'quotation' ? 'default' : 'outline'} size="sm" onClick={() => setCreateMode('quotation')}>{t('cost.linkQuotation')}</Button>
            </div>
            {createMode === 'quotation' && (
              <div><Label>{t('cost.selectQuotation')}</Label>
                <Select value={selectedQuotationId} onValueChange={v => {
                  setSelectedQuotationId(v);
                  const q = quotations.find((q: any) => q.id === v);
                  if (q) setNewBreakdown(prev => ({ ...prev, name: `${q.quotation_no} - ${q.customer_name}`, quotedAmount: Number(q.total_amount) || 0 }));
                }}>
                  <SelectTrigger><SelectValue placeholder={t('cost.selectFormalQuotation')} /></SelectTrigger>
                  <SelectContent>{quotations.map((q: any) => <SelectItem key={q.id} value={q.id}>{q.quotation_no} - {q.customer_name} (RM {Number(q.total_amount).toLocaleString()})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>{t('cost.projectName')} *</Label><Input value={newBreakdown.name} onChange={e => setNewBreakdown(p => ({ ...p, name: e.target.value }))} placeholder={t('cost.enterProjectName')} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('cost.quotedAmount')}</Label><Input type="number" min={0} value={newBreakdown.quotedAmount} onChange={e => setNewBreakdown(p => ({ ...p, quotedAmount: Number(e.target.value) }))} /></div>
              <div><Label>{t('cost.managementFee')}</Label><Input type="number" min={0} max={100} value={newBreakdown.managementFeePct} onChange={e => setNewBreakdown(p => ({ ...p, managementFeePct: Number(e.target.value) }))} /></div>
              <div><Label>{t('cost.taxRate')}</Label><Input type="number" min={0} max={100} value={newBreakdown.taxPct} onChange={e => setNewBreakdown(p => ({ ...p, taxPct: Number(e.target.value) }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => createBreakdown.mutate()} disabled={!newBreakdown.name || createBreakdown.isPending}>{t('common.create')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('cost.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('cost.deleteDescription')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteBreakdown.mutate(deleteId)} className="bg-destructive text-destructive-foreground">{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}
