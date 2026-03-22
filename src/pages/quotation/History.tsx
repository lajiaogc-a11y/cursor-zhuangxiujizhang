import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { History, Plus, Search, FileText, Trash2, Eye, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQQuotations } from '@/hooks/useQQuotations';
import { useResponsive } from '@/hooks/useResponsive';
import { format } from 'date-fns';
import { useI18n } from '@/lib/i18n';

const statusTransitions: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: ['draft'],
  rejected: ['draft'],
  expired: ['draft'],
};

type FilterTab = 'all' | 'draft' | 'formal';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { quotations, loading, saveQuotation, deleteQuotation } = useQQuotations();
  const { isMobile } = useResponsive();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: t('qh.draft'), variant: 'secondary' },
    sent: { label: t('qh.sent'), variant: 'default' },
    accepted: { label: t('qh.accepted'), variant: 'default' },
    rejected: { label: t('qh.rejected'), variant: 'destructive' },
    expired: { label: t('qh.expired'), variant: 'outline' },
  };

  const filtered = quotations.filter(q => {
    const matchesSearch = (q.projectNo || '').includes(search) || (q.customerName || '').includes(search);
    if (!matchesSearch) return false;
    if (filterTab === 'draft') return q.status === 'draft';
    if (filterTab === 'formal') return q.status === 'sent' || q.status === 'accepted';
    return true;
  });

  const handleNew = () => navigate('/quotation/editor');

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('qh.all') },
    { key: 'draft', label: t('qh.draftTab') },
    { key: 'formal', label: t('qh.formalTab') },
  ];

  const renderStatusDropdown = (q: any) => {
    const st = statusMap[q.status] || statusMap.draft;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
          <button className="inline-flex items-center gap-0.5">
            <Badge variant={st.variant} className="text-[10px] cursor-pointer">{st.label}</Badge>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onClick={e => e.stopPropagation()}>
          {(statusTransitions[q.status] || []).map(nextStatus => {
            const ns = statusMap[nextStatus] || statusMap.draft;
            return (
              <DropdownMenuItem key={nextStatus} onClick={() => {
                saveQuotation.mutate({
                  id: q.id, projectNo: q.projectNo, quotationDate: q.quotationDate,
                  customerId: q.customerId || undefined, items: q.items,
                  summary: {
                    subtotal: q.subtotal, subtotalUSD: q.subtotal * 0.22, subtotalCNY: q.subtotal * 1.55,
                    discount: q.discountAmount, grandTotal: q.grandTotal,
                    grandTotalUSD: q.grandTotal * 0.22, grandTotalCNY: q.grandTotal * 1.55,
                    depositAmount: q.grandTotal * 0.5, progressAmount: q.grandTotal * 0.3, finalAmount: q.grandTotal * 0.2,
                  },
                  settings: q.settings || {} as any, costAnalysis: q.costAnalysis || { estimatedCost: 0, targetProfitRate: 30, estimatedProfit: 0, actualProfitRate: 0 },
                  quotationNotes: q.quotationNotes, status: nextStatus,
                });
              }}>
                <Badge variant={ns.variant} className="text-[10px]">{ns.label}</Badge>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderMobileCards = () => (
    <div className="space-y-2">
      {filtered.map(q => {
        const st = statusMap[q.status] || statusMap.draft;
        return (
          <div key={q.id} className="border rounded-lg p-3 bg-card hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0" onClick={() => navigate('/quotation/editor', { state: { quotationId: q.id } })} role="button">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{q.projectNo}</p>
                  {renderStatusDropdown(q)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{q.customerName || t('qh.noCustomer')}</p>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-muted-foreground">
                    {q.quotationDate ? format(new Date(q.quotationDate), 'yyyy-MM-dd') : ''}
                  </span>
                  <span className="text-sm font-semibold">
                    RM {q.grandTotal.toLocaleString('en', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0 ml-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/quotation/editor', { state: { quotationId: q.id } })}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(q.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderTable = () => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('qh.projectNo') || '报价编号'}</TableHead>
            <TableHead>{t('qh.customer') || '客户'}</TableHead>
            <TableHead>{t('qh.date') || '日期'}</TableHead>
            <TableHead>{t('qh.status') || '状态'}</TableHead>
            <TableHead className="text-right">{t('qh.amount') || '金额'}</TableHead>
            <TableHead className="w-24">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(q => (
            <TableRow key={q.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate('/quotation/editor', { state: { quotationId: q.id } })}>
              <TableCell className="font-medium text-sm">{q.projectNo}</TableCell>
              <TableCell className="text-sm">{q.customerName || t('qh.noCustomer')}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {q.quotationDate ? format(new Date(q.quotationDate), 'yyyy-MM-dd') : '-'}
              </TableCell>
              <TableCell onClick={e => e.stopPropagation()}>
                {renderStatusDropdown(q)}
              </TableCell>
              <TableCell className="text-right text-sm font-semibold">
                RM {q.grandTotal.toLocaleString('en', { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell onClick={e => e.stopPropagation()}>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/quotation/editor', { state: { quotationId: q.id } })}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(q.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <MobilePageShell
      title={t('qh.title')}
      icon={<History className="w-5 h-5" />}
      backTo="/quotation"
      headerActions={
        <Button size="sm" onClick={handleNew} className="h-8 gap-1">
          <Plus className="w-4 h-4" /> {t('qh.new')}
        </Button>
      }
    >
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('qh.searchQuotation')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="flex gap-1.5">
          {tabs.map(tab => (
            <Button
              key={tab.key}
              variant={filterTab === tab.key ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setFilterTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <AppSectionLoading label={t('common.loading')} compact />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{search ? t('qh.noMatch') : t('qh.noQuotations')}</p>
            <Button className="mt-4" onClick={handleNew}>{t('qh.createFirst')}</Button>
          </div>
        ) : isMobile ? renderMobileCards() : renderTable()}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('qh.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('qh.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deleteId) await deleteQuotation.mutateAsync(deleteId); setDeleteId(null); }}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}
