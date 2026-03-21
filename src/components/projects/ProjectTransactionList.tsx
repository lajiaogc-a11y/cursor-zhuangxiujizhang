import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Image } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { TablePagination } from '@/components/ui/table-pagination';
import { ImagePreviewDialog } from '@/components/ui/image-preview-dialog';
import { useIsMobile } from '@/hooks/use-mobile';

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
}

interface ProjectTransactionListProps {
  transactions: Transaction[];
  onRefresh: () => void;
}

export function ProjectTransactionList({ transactions, onRefresh }: ProjectTransactionListProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { sortConfig, requestSort, sortData } = useSortableTable<Transaction>();

  const getSortValue = (tx: Transaction, key: string): any => {
    switch (key) {
      case 'sequence_no': return tx.sequence_no;
      case 'date': return tx.transaction_date;
      case 'type': return tx.type;
      case 'category': return tx.category_name;
      case 'summary': return tx.summary;
      case 'amount': return tx.amount_myr;
      case 'account': return tx.account_type;
      default: return null;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
    return `${symbols[currency] || ''}${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const sortedTransactions = sortData(transactions, getSortValue);
  const totalItems = sortedTransactions.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTransactions = sortedTransactions.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handlePageSizeChange = (size: number) => { setPageSize(size); setCurrentPage(1); };

  const getTypeBadge = (type: string) => {
    return type === 'income' ? (
      <Badge className="bg-success/10 text-success hover:bg-success/20">{t('transactions.income')}</Badge>
    ) : (
      <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">{t('transactions.expense')}</Badge>
    );
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('projectFinancials.noTransactions')}
      </div>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <div className="space-y-2">
          {paginatedTransactions.map((tx) => {
            const isExpanded = expandedId === tx.id;
            return (
              <Card
                key={tx.id}
                className="p-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : tx.id)}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">{tx.transaction_date}</span>
                      {getTypeBadge(tx.type)}
                    </div>
                    <div className="font-medium text-sm truncate">{tx.summary}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-semibold text-sm flex items-center gap-1 ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                      {tx.type === 'income' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {formatCurrency(tx.amount, tx.currency)}
                    </div>
                    {tx.currency !== 'MYR' && (
                      <div className="text-xs text-muted-foreground">≈ RM {tx.amount_myr.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t space-y-2 text-sm" onClick={e => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground">{t('table.category')}:</span> {tx.category_name}</div>
                      <div><span className="text-muted-foreground">{t('table.account')}:</span> {tx.account_type === 'cash' ? t('account.cash') : t('account.bank')}</div>
                    </div>
                    {tx.remark_1 && (
                      <div><span className="text-muted-foreground">{t('table.source')}:</span> <Badge variant="secondary" className="text-xs">{tx.remark_1}</Badge></div>
                    )}
                    {tx.remark_2 && (
                      <div><span className="text-muted-foreground">{t('table.remark')}:</span> {tx.remark_2}</div>
                    )}
                    {(tx.receipt_url_1 || tx.receipt_url_2) && (
                      <div className="flex gap-2">
                        {tx.receipt_url_1 && (
                          <Button variant="outline" size="sm" onClick={() => setPreviewImage(tx.receipt_url_1!)}>
                            <Image className="w-3 h-3 mr-1" />{t('common.receipt')} 1
                          </Button>
                        )}
                        {tx.receipt_url_2 && (
                          <Button variant="outline" size="sm" onClick={() => setPreviewImage(tx.receipt_url_2!)}>
                            <Image className="w-3 h-3 mr-1" />{t('common.receipt')} 2
                          </Button>
                        )}
                      </div>
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
          title={t('common.receipt')}
        />
      </>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="sequence_no" sortConfig={sortConfig} onSort={requestSort} className="w-[80px]">{t('table.sequence')}</SortableTableHead>
              <SortableTableHead sortKey="date" sortConfig={sortConfig} onSort={requestSort}>{t('table.date')}</SortableTableHead>
              <SortableTableHead sortKey="type" sortConfig={sortConfig} onSort={requestSort}>{t('table.type')}</SortableTableHead>
              <SortableTableHead sortKey="category" sortConfig={sortConfig} onSort={requestSort}>{t('table.category')}</SortableTableHead>
              <SortableTableHead sortKey="summary" sortConfig={sortConfig} onSort={requestSort}>{t('table.summary')}</SortableTableHead>
              <SortableTableHead sortKey="amount" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('table.amount')}</SortableTableHead>
              <SortableTableHead sortKey="account" sortConfig={sortConfig} onSort={requestSort}>{t('table.account')}</SortableTableHead>
              <TableHead>{t('table.receipt')}</TableHead>
              <TableHead>{t('table.source')}</TableHead>
              <TableHead>{t('table.remark')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.map((tx, index) => (
              <TableRow key={tx.id}>
                <TableCell className="font-mono text-muted-foreground">{startIndex + index + 1}</TableCell>
                <TableCell>{tx.transaction_date}</TableCell>
                <TableCell>{getTypeBadge(tx.type)}</TableCell>
                <TableCell>{tx.category_name}</TableCell>
                <TableCell className="max-w-[200px] truncate">{tx.summary}</TableCell>
                <TableCell className="text-right">
                  <div className={`flex items-center justify-end gap-1 font-medium ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                    {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {formatCurrency(tx.amount, tx.currency)}
                  </div>
                  {tx.currency !== 'MYR' && (
                    <div className="text-xs text-muted-foreground">≈ RM {tx.amount_myr.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{tx.account_type === 'cash' ? t('account.cash') : t('account.bank')}</Badge>
                </TableCell>
                <TableCell>
                  {tx.receipt_url_1 || tx.receipt_url_2 ? (
                    <div className="flex gap-1">
                      {tx.receipt_url_1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewImage(tx.receipt_url_1!)}>
                          <Image className="w-4 h-4 text-primary" />
                        </Button>
                      )}
                      {tx.receipt_url_2 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewImage(tx.receipt_url_2!)}>
                          <Image className="w-4 h-4 text-primary" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {tx.remark_1 ? (
                    <Badge variant="secondary" className="text-xs">{tx.remark_1}</Badge>
                  ) : (
                    <span className="text-muted-foreground">{t('common.manualEntry')}</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[120px] truncate text-muted-foreground text-sm" title={tx.remark_2 || ''}>
                  {tx.remark_2 || '-'}
                </TableCell>
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
        title={t('common.receipt')}
      />
    </>
  );
}
