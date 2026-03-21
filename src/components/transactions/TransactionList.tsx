import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, ArrowUpRight, ArrowDownRight, Image, ChevronDown, ChevronUp } from 'lucide-react';
import { deleteTransactionWithBalanceUpdate } from '@/services/transactions.service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TablePagination } from '@/components/ui/table-pagination';
import { ColumnSettings } from '@/components/ui/column-settings';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ImagePreviewDialog } from '@/components/ui/image-preview-dialog';
import { useI18n } from '@/lib/i18n';
import { useResponsive } from '@/hooks/useResponsive';
import { Card } from '@/components/ui/card';
import { useBaseCurrency } from '@/hooks/useBaseCurrency';
import { Checkbox } from '@/components/ui/checkbox';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { BulkActionsToolbar } from '@/components/ui/bulk-actions-toolbar';

interface Transaction {
  id: string;
  sequence_no: number;
  transaction_date: string;
  type: string;
  ledger_type: string;
  category_name: string;
  summary: string;
  amount: number;
  currency: string;
  account_type: string;
  amount_myr: number;
  remark_1: string | null;
  remark_2: string | null;
  receipt_url_1?: string | null;
  receipt_url_2?: string | null;
  created_by: string | null;
  creator_name?: string | null;
  project_id?: string | null;
  project_code?: string | null;
  project_name?: string | null;
}

interface ServerPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onRefresh: () => void;
  serverPagination?: ServerPaginationProps;
  canEdit?: boolean;
}

export function TransactionList({ transactions, onEdit, onRefresh, serverPagination, canEdit = true }: TransactionListProps) {
  const { t } = useI18n();
  const { isMobile, isTablet } = useResponsive();
  const { baseCurrency, formatAmountWithBase, active } = useBaseCurrency('finance');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // 本地分页状态（仅在非服务端分页时使用）
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(10);
  const { sortConfig, requestSort, sortData } = useSortableTable<Transaction>();

  const isSyncedRecord = (tx: Transaction) => {
    return tx.remark_1 === '项目支出' || tx.remark_1 === '项目收款' || tx.remark_1 === '换汇交易' ||
           tx.remark_1 === 'Project Expense' || tx.remark_1 === 'Project Payment' || tx.remark_1 === 'Exchange Transaction';
  };

  // Bulk selection - only for non-synced, editable records
  const editableTransactions = transactions.filter(tx => canEdit && !isSyncedRecord(tx));
  const bulk = useBulkSelection(transactions);

  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(bulk.selectedIds).filter(id => {
      const tx = transactions.find(t => t.id === id);
      return tx && !isSyncedRecord(tx);
    });
    if (idsToDelete.length === 0) return;
    setBulkDeleting(true);
    try {
      let successCount = 0;
      for (const id of idsToDelete) {
        await deleteTransactionWithBalanceUpdate(id);
        successCount++;
      }
      toast.success(`${successCount} ${t('common.deleteSuccess')}`);
      bulk.clearSelection();
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || t('common.deleteFailed'));
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleBulkExport = () => {
    const selected = transactions.filter(tx => bulk.selectedIds.has(tx.id));
    const headers = ['序号', '日期', '收支', '账本', '分类', '摘要', '金额', '币种', '账户', '来源', '备注', '记账人'];
    const rows = selected.map(tx => [
      tx.sequence_no, tx.transaction_date, tx.type === 'income' ? '收入' : '支出',
      tx.ledger_type || '', tx.category_name, tx.summary, tx.amount, tx.currency,
      tx.account_type === 'cash' ? '现金' : '网银',
      tx.project_code || tx.remark_1 || '', tx.remark_2 || '', tx.creator_name || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('bulk.export') + ` (${selected.length})`);
  };

  const getSortValue = (tx: Transaction, key: string): any => {
    switch (key) {
      case 'sequence_no': return tx.sequence_no;
      case 'date': return tx.transaction_date;
      case 'type': return tx.type;
      case 'ledger': return tx.ledger_type;
      case 'category': return tx.category_name;
      case 'summary': return tx.summary;
      case 'amount': return tx.amount_myr;
      case 'account': return tx.account_type;
      case 'creator': return tx.creator_name;
      default: return null;
    }
  };

  const DEFAULT_COLUMNS: ColumnConfig[] = [
    { id: 'sequence_no', label: t('table.sequence'), visible: true, minWidth: 80 },
    { id: 'date', label: t('table.date'), visible: true, minWidth: 100 },
    { id: 'type', label: t('table.type'), visible: true, minWidth: 80 },
    { id: 'ledger', label: t('table.ledger'), visible: true, minWidth: 80 },
    { id: 'category', label: t('table.category'), visible: true, minWidth: 100 },
    { id: 'summary', label: t('table.summary'), visible: true, minWidth: 150 },
    { id: 'amount', label: t('table.amount'), visible: true, minWidth: 120 },
    { id: 'account', label: t('table.account'), visible: true, minWidth: 80 },
    { id: 'receipt', label: t('table.receipt'), visible: true, minWidth: 80 },
    { id: 'source', label: t('table.source'), visible: true, minWidth: 100 },
    { id: 'remark', label: t('table.remark'), visible: true, minWidth: 120 },
    { id: 'creator', label: t('transactions.creator'), visible: true, minWidth: 100 },
    { id: 'actions', label: t('table.actions'), visible: true, minWidth: 80 },
  ];
  
  const { columns, visibleColumns, toggleColumn, resetColumns } = useColumnSettings({
    storageKey: 'transaction-list-columns',
    defaultColumns: DEFAULT_COLUMNS,
  });

  // 货币格式化：精确到小数点后两位
  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
    return `${symbols[currency] || ''}${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteTransactionWithBalanceUpdate(deleteId);
      toast.success(t('common.deleteSuccess'));
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || t('common.deleteFailed'));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const getLedgerBadge = (type: string) => {
    switch (type) {
      case 'company_daily':
        return <Badge variant="outline">{t('transactions.daily')}</Badge>;
      case 'project':
        return <Badge variant="secondary">{t('transactions.project')}</Badge>;
      case 'exchange':
        return <Badge className="bg-accent/10 text-accent">{t('transactions.exchange')}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // 判断是否使用服务端分页
  const useServerPagination = !!serverPagination;
  
  const currentPage = useServerPagination ? serverPagination.currentPage : localCurrentPage;
  const pageSize = useServerPagination ? serverPagination.pageSize : localPageSize;
  const totalItems = useServerPagination ? serverPagination.totalItems : transactions.length;
  const totalPages = useServerPagination ? serverPagination.totalPages : Math.ceil(totalItems / pageSize);
  
  const sortedTransactions = sortData(transactions, getSortValue);
  const displayedTransactions = useServerPagination 
    ? sortedTransactions 
    : sortedTransactions.slice((localCurrentPage - 1) * localPageSize, localCurrentPage * localPageSize);

  const handlePageChange = (page: number) => {
    if (useServerPagination) {
      serverPagination.onPageChange(page);
    } else {
      setLocalCurrentPage(page);
    }
  };

  const handlePageSizeChange = (size: number) => {
    if (useServerPagination) {
      serverPagination.onPageSizeChange(size);
    } else {
      setLocalPageSize(size);
      setLocalCurrentPage(1);
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'income' ? (
      <Badge className="bg-success/10 text-success hover:bg-success/20">{t('transactions.income')}</Badge>
    ) : (
      <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">{t('transactions.expense')}</Badge>
    );
  };

  const isColumnVisible = (columnId: string) => visibleColumns.some(c => c.id === columnId);


  // ========== Mobile Card View ==========
  if (isMobile) {
    return (
      <>
        <div className="space-y-2">
          {displayedTransactions.map((tx) => {
            const isExpanded = expandedId === tx.id;
            const synced = isSyncedRecord(tx);
            return (
              <Card 
                key={tx.id} 
                className="p-3"
                onClick={() => setExpandedId(isExpanded ? null : tx.id)}
              >
                {/* Row 1: date + type badge + amount */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{tx.transaction_date}</span>
                    {getTypeBadge(tx.type)}
                  </div>
                  <div className={`font-medium text-sm whitespace-nowrap ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                  </div>
                </div>
                {/* Row 2: summary */}
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-sm truncate flex-1">{tx.summary}</p>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
                {/* Base currency equivalent if different */}
                {active && tx.currency !== baseCurrency && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ≈ {formatAmountWithBase(tx.amount, tx.currency).split('≈ ')[1]?.replace(')', '') || formatAmountWithBase(tx.amount, tx.currency)}
                  </p>
                )}
                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t space-y-2 text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('table.ledger')}</span>
                      {getLedgerBadge(tx.ledger_type)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('table.category')}</span>
                      <span>{tx.category_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('table.account')}</span>
                      <Badge variant="outline">
                        {tx.account_type === 'cash' ? t('account.cash') : t('account.bank')}
                      </Badge>
                    </div>
                    {tx.project_code && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('table.source')}</span>
                        <span className="text-right text-xs">{tx.project_code} {tx.project_name}</span>
                      </div>
                    )}
                    {tx.remark_2 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('table.remark')}</span>
                        <span className="text-right max-w-[60%] break-words">{tx.remark_2}</span>
                      </div>
                    )}
                    {(tx.receipt_url_1 || tx.receipt_url_2) && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{t('table.receipt')}</span>
                        <div className="flex gap-1">
                          {tx.receipt_url_1 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewImage(tx.receipt_url_1!)}>
                              <Image className="w-4 h-4 text-primary" />
                            </Button>
                          )}
                          {tx.receipt_url_2 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewImage(tx.receipt_url_2!)}>
                              <Image className="w-4 h-4 text-primary" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Actions */}
                    {canEdit && !synced && (
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(tx)}>
                          <Edit className="w-3.5 h-3.5 mr-1" />
                          {t('common.edit')}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 text-destructive border-destructive" onClick={() => setDeleteId(tx.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          {t('common.delete')}
                        </Button>
                      </div>
                    )}
                    {synced && (
                      <p className="text-xs text-muted-foreground text-center pt-1">{t('common.syncRecord')}</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />

        <ImagePreviewDialog
          open={!!previewImage}
          onOpenChange={() => setPreviewImage(null)}
          imageUrl={previewImage}
          title={t('transactions.receiptPreview')}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                {deleting ? t('common.deleting') : t('common.confirmDelete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // ========== Tablet Compact Table View ==========
  if (isTablet) {
    return (
      <>
        <div className="rounded-lg border bg-card">
          <div className="flex justify-end p-2 border-b">
            <ColumnSettings columns={columns} onToggleColumn={toggleColumn} onReset={resetColumns} />
          </div>
          <div className="overflow-x-auto">
            <Table compact>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="date" sortConfig={sortConfig} onSort={requestSort} className="sticky left-0 z-10 bg-card">{t('table.date')}</SortableTableHead>
                  <SortableTableHead sortKey="type" sortConfig={sortConfig} onSort={requestSort}>{t('table.type')}</SortableTableHead>
                  <SortableTableHead sortKey="summary" sortConfig={sortConfig} onSort={requestSort}>{t('table.summary')}</SortableTableHead>
                  <SortableTableHead sortKey="amount" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('table.amount')}</SortableTableHead>
                  {isColumnVisible('category') && <SortableTableHead sortKey="category" sortConfig={sortConfig} onSort={requestSort}>{t('table.category')}</SortableTableHead>}
                  {isColumnVisible('account') && <TableHead>{t('table.account')}</TableHead>}
                  {isColumnVisible('actions') && <TableHead className="text-right">{t('table.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedTransactions.map((tx) => {
                  const synced = isSyncedRecord(tx);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="sticky left-0 z-10 bg-card whitespace-nowrap">{tx.transaction_date}</TableCell>
                      <TableCell>{getTypeBadge(tx.type)}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{tx.summary}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <span className={tx.type === 'income' ? 'text-success' : 'text-destructive'}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </TableCell>
                      {isColumnVisible('category') && <TableCell className="whitespace-nowrap">{tx.category_name}</TableCell>}
                      {isColumnVisible('account') && (
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {tx.account_type === 'cash' ? t('account.cash') : t('account.bank')}
                          </Badge>
                        </TableCell>
                      )}
                      {isColumnVisible('actions') && (
                        <TableCell className="text-right">
                          {!canEdit || synced ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tx)}>
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(tx.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalItems={totalItems} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
        </div>

        <ImagePreviewDialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)} imageUrl={previewImage} title={t('transactions.receiptPreview')} />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                {deleting ? t('common.deleting') : t('common.confirmDelete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // ========== Desktop Table View ==========
  return (
    <>
      {canEdit && (
        <BulkActionsToolbar
          selectedCount={bulk.selectedCount}
          onDelete={() => setShowBulkDeleteConfirm(true)}
          onExport={handleBulkExport}
          onClear={bulk.clearSelection}
          deleting={bulkDeleting}
        />
      )}
      <div className="rounded-lg border bg-card">
        <div className="flex justify-end p-2 border-b">
          <ColumnSettings 
            columns={columns}
            onToggleColumn={toggleColumn}
            onReset={resetColumns}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {canEdit && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={bulk.isAllSelected}
                    ref={(el) => {
                      if (el) (el as any).indeterminate = bulk.isSomeSelected;
                    }}
                    onCheckedChange={bulk.toggleAll}
                  />
                </TableHead>
              )}
              {isColumnVisible('sequence_no') && <SortableTableHead sortKey="sequence_no" sortConfig={sortConfig} onSort={requestSort} className="w-[80px]">{t('table.sequence')}</SortableTableHead>}
              {isColumnVisible('date') && <SortableTableHead sortKey="date" sortConfig={sortConfig} onSort={requestSort}>{t('table.date')}</SortableTableHead>}
              {isColumnVisible('type') && <SortableTableHead sortKey="type" sortConfig={sortConfig} onSort={requestSort}>{t('table.type')}</SortableTableHead>}
              {isColumnVisible('ledger') && <SortableTableHead sortKey="ledger" sortConfig={sortConfig} onSort={requestSort}>{t('table.ledger')}</SortableTableHead>}
              {isColumnVisible('category') && <SortableTableHead sortKey="category" sortConfig={sortConfig} onSort={requestSort}>{t('table.category')}</SortableTableHead>}
              {isColumnVisible('summary') && <SortableTableHead sortKey="summary" sortConfig={sortConfig} onSort={requestSort}>{t('table.summary')}</SortableTableHead>}
              {isColumnVisible('amount') && <SortableTableHead sortKey="amount" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('table.amount')}</SortableTableHead>}
              {isColumnVisible('account') && <SortableTableHead sortKey="account" sortConfig={sortConfig} onSort={requestSort}>{t('table.account')}</SortableTableHead>}
              {isColumnVisible('receipt') && <TableHead>{t('table.receipt')}</TableHead>}
              {isColumnVisible('source') && <TableHead>{t('table.source')}</TableHead>}
              {isColumnVisible('remark') && <TableHead>{t('table.remark')}</TableHead>}
              {isColumnVisible('creator') && <SortableTableHead sortKey="creator" sortConfig={sortConfig} onSort={requestSort}>{t('transactions.creator')}</SortableTableHead>}
              {isColumnVisible('actions') && <TableHead className="text-right">{t('table.actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedTransactions.map((tx, index) => (
              <TableRow key={tx.id} data-state={bulk.selectedIds.has(tx.id) ? 'selected' : undefined}>
                {canEdit && (
                  <TableCell className="w-[40px]">
                    <Checkbox
                      checked={bulk.selectedIds.has(tx.id)}
                      onCheckedChange={() => bulk.toggleOne(tx.id)}
                    />
                  </TableCell>
                )}
                {isColumnVisible('sequence_no') && (
                  <TableCell className="font-mono text-muted-foreground">
                    {(currentPage - 1) * pageSize + index + 1}
                  </TableCell>
                )}
                {isColumnVisible('date') && <TableCell>{tx.transaction_date}</TableCell>}
                {isColumnVisible('type') && <TableCell>{getTypeBadge(tx.type)}</TableCell>}
                {isColumnVisible('ledger') && <TableCell>{getLedgerBadge(tx.ledger_type)}</TableCell>}
                {isColumnVisible('category') && <TableCell>{tx.category_name}</TableCell>}
                {isColumnVisible('summary') && (
                  <TableCell className="max-w-[200px] truncate">{tx.summary}</TableCell>
                )}
                {isColumnVisible('amount') && (
                  <TableCell className="text-right">
                    <div className={`flex items-center justify-end gap-1 font-medium ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {tx.type === 'income' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {formatCurrency(tx.amount, tx.currency)}
                    </div>
                    {active && tx.currency !== baseCurrency && (
                      <div className="text-xs text-muted-foreground">
                        ≈ {formatAmountWithBase(tx.amount, tx.currency).split('≈ ')[1]?.replace(')', '') || formatAmountWithBase(tx.amount, tx.currency)}
                      </div>
                    )}
                  </TableCell>
                )}
                {isColumnVisible('account') && (
                  <TableCell>
                    <Badge variant="outline">
                      {tx.account_type === 'cash' ? t('account.cash') : t('account.bank')}
                    </Badge>
                  </TableCell>
                )}
                {isColumnVisible('receipt') && (
                  <TableCell>
                    {tx.receipt_url_1 || tx.receipt_url_2 ? (
                      <div className="flex gap-1">
                        {tx.receipt_url_1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPreviewImage(tx.receipt_url_1!)}
                          >
                            <Image className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                        {tx.receipt_url_2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setPreviewImage(tx.receipt_url_2!)}
                          >
                            <Image className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                )}
                {isColumnVisible('source') && (
                  <TableCell>
                    {tx.project_code ? (
                      <div>
                        <Badge variant="secondary" className="text-xs">
                          {tx.remark_1 || t('transactions.projectRelated')}
                        </Badge>
                        <div className="text-xs font-medium mt-0.5">{tx.project_code}</div>
                        {tx.project_name && (
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={tx.project_name}>
                            {tx.project_name}
                          </div>
                        )}
                      </div>
                    ) : tx.remark_1 ? (
                      <Badge variant="secondary" className="text-xs">
                        {tx.remark_1}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">{t('common.manualEntry')}</span>
                    )}
                  </TableCell>
                )}
                {isColumnVisible('remark') && (
                  <TableCell className="max-w-[120px] truncate text-muted-foreground text-sm" title={tx.remark_2 || ''}>
                    {tx.remark_2 || '-'}
                  </TableCell>
                )}
                {isColumnVisible('creator') && (
                  <TableCell className="text-sm text-muted-foreground">
                    {tx.creator_name || '-'}
                  </TableCell>
                )}
                {isColumnVisible('actions') && (
                  <TableCell className="text-right">
                    {!canEdit || isSyncedRecord(tx) ? (
                      <span className="text-xs text-muted-foreground">{isSyncedRecord(tx) ? t('common.syncRecord') : '-'}</span>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(tx)}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeleteId(tx.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      <ImagePreviewDialog
        open={!!previewImage}
        onOpenChange={() => setPreviewImage(null)}
        imageUrl={previewImage}
        title={t('transactions.receiptPreview')}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? t('common.deleting') : t('common.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('bulk.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bulk.deleteWarning').replace('{count}', String(bulk.selectedCount))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-destructive hover:bg-destructive/90">
              {bulkDeleting ? t('common.deleting') : t('bulk.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
