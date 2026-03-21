import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2, ArrowRight } from 'lucide-react';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import { exchangesService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TablePagination } from '@/components/ui/table-pagination';
import { useResponsive } from '@/hooks/useResponsive';
import type { Tables } from '@/integrations/supabase/types';

type ExchangeTransaction = Tables<'exchange_transactions'> & { creator_name?: string | null; };

interface ExchangeListProps {
  exchanges: ExchangeTransaction[];
  onEdit: (exchange: ExchangeTransaction) => void;
  onRefresh: () => void;
  canEdit?: boolean;
}

const currencySymbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };

export function ExchangeList({ exchanges, onEdit, onRefresh, canEdit = true }: ExchangeListProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const { isMobile, isTablet } = useResponsive();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exchangesWithCreator, setExchangesWithCreator] = useState<ExchangeTransaction[]>([]);
  const { sortConfig, requestSort, sortData } = useSortableTable<ExchangeTransaction>();

  const getSortValue = (ex: ExchangeTransaction, key: string): any => {
    switch (key) {
      case 'sequence_no': return ex.sequence_no;
      case 'date': return ex.transaction_date;
      case 'out_amount': return ex.out_amount;
      case 'in_amount': return ex.in_amount;
      case 'exchange_rate': return ex.exchange_rate;
      case 'profit_loss': return ex.profit_loss;
      case 'creator': return ex.creator_name;
      default: return null;
    }
  };

  useEffect(() => {
    const fetchCreators = async () => {
      const userIds = [...new Set(exchanges.map(e => e.created_by).filter(Boolean))] as string[];
      if (userIds.length > 0) {
        const profileMap = await exchangesService.fetchCreatorNames(userIds);
        setExchangesWithCreator(exchanges.map(e => ({ ...e, creator_name: e.created_by ? profileMap.get(e.created_by) || null : null })));
      } else {
        setExchangesWithCreator(exchanges);
      }
    };
    fetchCreators();
  }, [exchanges]);

  const handleDelete = async (id: string) => {
    try {
      await exchangesService.deleteExchangeTransactionWithBalances(id);
      toast({ title: t('exchange.exchangeDeleted') });
      onRefresh();
    } catch (error: any) {
      toast({ title: t('toast.deleteFailed'), description: error.message, variant: 'destructive' });
    }
  };

  const formatAmount = (amount: number, currency: string) => `${currencySymbols[currency] || ''}${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const getAccountLabel = (accountType: string) => accountType === 'cash' ? t('account.cash') : t('account.bank');

  const sortedExchanges = sortData(exchangesWithCreator, getSortValue);
  const totalItems = sortedExchanges.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedExchanges = sortedExchanges.slice(startIndex, startIndex + pageSize);

  if (exchanges.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">{t('exchange.noRecords')}</div>;
  }

  if (isMobile) {
    return (
      <div className="space-y-2">
        {paginatedExchanges.map((ex) => {
          const isExpanded = expandedId === ex.id;
          return (
            <Card key={ex.id} className="p-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : ex.id)}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">{format(new Date(ex.transaction_date), 'yyyy-MM-dd')}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-destructive font-medium text-sm">{formatAmount(ex.out_amount, ex.out_currency)}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-success font-medium text-sm">{formatAmount(ex.in_amount, ex.in_currency)}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant={ex.profit_loss >= 0 ? 'default' : 'destructive'} className={ex.profit_loss >= 0 ? 'bg-success/10 text-success' : ''}>
                    {ex.profit_loss >= 0 ? '+' : ''}{formatAmount(ex.profit_loss, 'MYR')}
                  </Badge>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t space-y-1.5 text-sm" onClick={e => e.stopPropagation()}>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div><span className="text-muted-foreground">{t('exchange.exchangeRate')}:</span> {ex.exchange_rate.toFixed(4)}</div>
                    <div><span className="text-muted-foreground">{t('transactions.creator')}:</span> {ex.creator_name || '-'}</div>
                  </div>
                  {ex.remark && <div><span className="text-muted-foreground">{t('exchange.remark')}:</span> {ex.remark}</div>}
                  {canEdit && (
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(ex)}><Pencil className="w-3 h-3 mr-1" />{t('common.edit')}</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="text-destructive"><Trash2 className="w-3 h-3 mr-1" />{t('common.delete')}</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('exchange.deleteConfirm')}</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(ex.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
        <TablePagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalItems={totalItems} onPageChange={setCurrentPage} onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }} />
      </div>
    );
  }

  // Tablet compact table view
  if (isTablet) {
    return (
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table compact>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="date" sortConfig={sortConfig} onSort={requestSort} className="sticky left-0 z-10 bg-card">{t('common.date')}</SortableTableHead>
                <SortableTableHead sortKey="out_amount" sortConfig={sortConfig} onSort={requestSort}>{t('exchange.outSell')}</SortableTableHead>
                <TableHead></TableHead>
                <SortableTableHead sortKey="in_amount" sortConfig={sortConfig} onSort={requestSort}>{t('exchange.inBuy')}</SortableTableHead>
                <SortableTableHead sortKey="exchange_rate" sortConfig={sortConfig} onSort={requestSort}>{t('exchange.exchangeRate')}</SortableTableHead>
                <SortableTableHead sortKey="profit_loss" sortConfig={sortConfig} onSort={requestSort}>{t('exchange.estimatedProfitLoss')}</SortableTableHead>
                <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExchanges.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell className="sticky left-0 z-10 bg-card whitespace-nowrap">{format(new Date(ex.transaction_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell className="whitespace-nowrap text-destructive font-medium">{formatAmount(ex.out_amount, ex.out_currency)}</TableCell>
                  <TableCell><ArrowRight className="w-3 h-3 text-muted-foreground" /></TableCell>
                  <TableCell className="whitespace-nowrap text-success font-medium">{formatAmount(ex.in_amount, ex.in_currency)}</TableCell>
                  <TableCell className="font-mono">{ex.exchange_rate.toFixed(4)}</TableCell>
                  <TableCell>
                    <Badge variant={ex.profit_loss >= 0 ? 'default' : 'destructive'} className={ex.profit_loss >= 0 ? 'bg-success/10 text-success' : ''}>
                      {ex.profit_loss >= 0 ? '+' : ''}{formatAmount(ex.profit_loss, 'MYR')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(ex)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('exchange.deleteConfirm')}</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(ex.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">-</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalItems={totalItems} onPageChange={setCurrentPage} onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }} />
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead sortKey="sequence_no" sortConfig={sortConfig} onSort={requestSort} className="w-[80px]">{t('table.sequence')}</SortableTableHead>
            <SortableTableHead sortKey="date" sortConfig={sortConfig} onSort={requestSort}>{t('common.date')}</SortableTableHead>
            <SortableTableHead sortKey="out_amount" sortConfig={sortConfig} onSort={requestSort}>{t('exchange.outSell')}</SortableTableHead>
            <TableHead></TableHead>
            <SortableTableHead sortKey="in_amount" sortConfig={sortConfig} onSort={requestSort}>{t('exchange.inBuy')}</SortableTableHead>
            <SortableTableHead sortKey="exchange_rate" sortConfig={sortConfig} onSort={requestSort}>{t('exchange.exchangeRate')}</SortableTableHead>
            <SortableTableHead sortKey="profit_loss" sortConfig={sortConfig} onSort={requestSort}>{t('exchange.estimatedProfitLoss')}</SortableTableHead>
            <TableHead>{t('exchange.remark')}</TableHead>
            <SortableTableHead sortKey="creator" sortConfig={sortConfig} onSort={requestSort}>{t('transactions.creator')}</SortableTableHead>
            <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedExchanges.map((exchange) => (
            <TableRow key={exchange.id}>
              <TableCell className="font-mono text-sm">{exchange.sequence_no}</TableCell>
              <TableCell>{format(new Date(exchange.transaction_date), 'yyyy-MM-dd')}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium text-destructive">{formatAmount(exchange.out_amount, exchange.out_currency)}</div>
                  <div className="text-xs text-muted-foreground">{getAccountLabel(exchange.out_account_type)}</div>
                </div>
              </TableCell>
              <TableCell><ArrowRight className="w-4 h-4 text-muted-foreground" /></TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium text-success">{formatAmount(exchange.in_amount, exchange.in_currency)}</div>
                  <div className="text-xs text-muted-foreground">{getAccountLabel(exchange.in_account_type)}</div>
                </div>
              </TableCell>
              <TableCell className="font-mono">{exchange.exchange_rate.toFixed(4)}</TableCell>
              <TableCell>
                <Badge variant={exchange.profit_loss >= 0 ? 'default' : 'destructive'} className={exchange.profit_loss >= 0 ? 'bg-success/10 text-success' : ''}>
                  {exchange.profit_loss >= 0 ? '+' : ''}{formatAmount(exchange.profit_loss, 'MYR')}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[150px] truncate">{exchange.remark || '-'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{exchange.creator_name || '-'}</TableCell>
              <TableCell>
                {canEdit ? (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(exchange)}><Pencil className="w-4 h-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('exchange.deleteConfirm')}</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(exchange.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : <span className="text-xs text-muted-foreground">-</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalItems={totalItems} onPageChange={setCurrentPage} onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }} />
    </div>
  );
}