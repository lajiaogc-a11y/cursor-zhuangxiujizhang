import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Wallet, Search, ArrowUpRight, ArrowDownRight,
  Banknote, DollarSign, CircleDollarSign, RefreshCw, FileSpreadsheet, MoreVertical
} from 'lucide-react';
import { AccountManagement } from '@/components/settings/AccountManagement';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { TablePagination } from '@/components/ui/table-pagination';
import { useI18n } from '@/lib/i18n';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useIsMobile } from '@/hooks/use-mobile';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import {
  useCalculatedBalances, useLedgerTransactions, useRefreshLedger,
  type CalculatedBalances,
} from '@/hooks/useBalanceLedgerService';

export default function BalanceLedger() {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { hasPermission } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const canEdit = hasPermission('feature.edit');
  const canExport = hasPermission('feature.export');
  const { toast } = useToast();

  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(new Date()),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const currencyLabels: Record<string, string> = {
    MYR: t('currency.myr'), CNY: t('currency.cny'), USD: t('currency.usd'),
  };
  const accountTypeLabels: Record<string, string> = {
    cash: t('account.cash'), bank: t('account.bank'),
  };

  // ─── Data hooks ─────────────────────────────────────
  const { data: calculatedBalances = { MYR: { cash: 0, bank: 0, total: 0 }, CNY: { cash: 0, bank: 0, total: 0 }, USD: { cash: 0, bank: 0, total: 0 } } } =
    useCalculatedBalances(tenantId);

  const { data: transactionsData, isLoading: loading } = useLedgerTransactions(
    tenantId,
    { currency: currencyFilter, accountType: accountFilter, dateFrom: dateRange?.from, dateTo: dateRange?.to, search: searchTerm },
    { page: currentPage, pageSize }
  );

  const transactions = transactionsData?.transactions || [];
  const totalCount = transactionsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const showRunningBalance = currencyFilter !== 'all' && accountFilter !== 'all';
  const refreshLedger = useRefreshLedger();

  useEffect(() => { setCurrentPage(1); }, [currencyFilter, accountFilter, dateRange, searchTerm]);

  const formatCurrency = (amount: number, currency: string = 'MYR') => {
    const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
    return `${symbols[currency] || ''}${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportToExcel = () => {
    if (transactions.length === 0) {
      toast({ title: t('balanceLedger.noRecords'), variant: 'destructive' });
      return;
    }
    const wb = XLSX.utils.book_new();
    const headers = [t('table.sequence'), t('common.date'), t('balanceLedger.transactionType'), t('transactions.category'), t('transactions.summary'), t('common.amount'), t('table.account')];
    if (showRunningBalance) { headers.push(t('balanceLedger.balanceBefore'), t('balanceLedger.balanceAfter')); }
    headers.push(t('balanceLedger.remarkSource'));

    const data = transactions.map((tx, index) => {
      const row: (string | number)[] = [
        (currentPage - 1) * pageSize + index + 1, tx.transaction_date,
        tx.type === 'income' ? t('transactions.income') : t('transactions.expense'),
        tx.category_name, tx.summary, tx.type === 'income' ? tx.amount : -tx.amount,
        `${currencyLabels[tx.currency] || tx.currency} / ${accountTypeLabels[tx.account_type] || tx.account_type}`,
      ];
      if (showRunningBalance) { row.push(tx.balance_before || 0, tx.balance_after || 0); }
      row.push(tx.remark_1 || '-');
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];
    if (showRunningBalance) { ws['!cols'].push({ wch: 15 }, { wch: 15 }); }
    ws['!cols'].push({ wch: 20 });
    XLSX.utils.book_append_sheet(wb, ws, t('balanceLedger.title'));

    const currencyName = currencyFilter !== 'all' ? currencyLabels[currencyFilter] : t('balanceLedger.allCurrencies');
    const accountName = accountFilter !== 'all' ? accountTypeLabels[accountFilter] : t('balanceLedger.allAccountTypes');
    XLSX.writeFile(wb, `${t('balanceLedger.filePrefix')}_${currencyName}_${accountName}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    toast({ title: t('balanceLedger.exportSuccess') });
  };

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-4">
        <div className="flex items-center justify-end flex-wrap gap-2">
          {isMobile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && <DropdownMenuItem asChild><div><AccountManagement onBalanceChange={refreshLedger} /></div></DropdownMenuItem>}
                {canExport && <DropdownMenuItem onClick={exportToExcel}><FileSpreadsheet className="w-4 h-4 mr-2" />{t('balanceLedger.exportExcel')}</DropdownMenuItem>}
                <DropdownMenuItem onClick={refreshLedger}><RefreshCw className="w-4 h-4 mr-2" />{t('common.refresh')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              {canEdit && <AccountManagement onBalanceChange={refreshLedger} />}
              {canExport && <Button variant="outline" size="sm" onClick={exportToExcel}><FileSpreadsheet className="w-4 h-4 mr-1" />{t('balanceLedger.exportExcel')}</Button>}
              <Button variant="outline" size="sm" onClick={refreshLedger}><RefreshCw className="w-4 h-4 mr-1" />{t('common.refresh')}</Button>
            </div>
          )}
        </div>

        {/* Balance cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(currencyLabels).map(([currency, label]) => (
            <Card key={currency} className="stat-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {currency === 'MYR' && <Banknote className="w-4 h-4" />}
                  {currency === 'CNY' && <CircleDollarSign className="w-4 h-4" />}
                  {currency === 'USD' && <DollarSign className="w-4 h-4" />}
                  {label} {t('balanceLedger.currentBalance')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold break-all">
                  {formatCurrency(calculatedBalances[currency as keyof CalculatedBalances]?.total || 0, currency)}
                </div>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <div><span>{t('account.cash')}: </span><span className="font-medium">{formatCurrency(calculatedBalances[currency as keyof CalculatedBalances]?.cash || 0, currency)}</span></div>
                  <div><span>{t('account.bank')}: </span><span className="font-medium">{formatCurrency(calculatedBalances[currency as keyof CalculatedBalances]?.bank || 0, currency)}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={t('balanceLedger.searchSummary')} className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} showPresets className="w-full md:w-[280px]" placeholder={t('common.selectDate')} />
              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger className="w-full md:w-[120px]"><SelectValue placeholder={t('balanceLedger.allCurrencies')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('balanceLedger.allCurrencies')}</SelectItem>
                  <SelectItem value="MYR">{t('currency.myr')}</SelectItem>
                  <SelectItem value="CNY">{t('currency.cny')}</SelectItem>
                  <SelectItem value="USD">{t('currency.usd')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-full md:w-[120px]"><SelectValue placeholder={t('balanceLedger.allAccountTypes')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('balanceLedger.allAccountTypes')}</SelectItem>
                  <SelectItem value="cash">{t('account.cash')}</SelectItem>
                  <SelectItem value="bank">{t('account.bank')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!showRunningBalance && currencyFilter === 'all' && (
              <p className="text-xs text-muted-foreground mt-2">{t('balanceLedger.filterHint')}</p>
            )}
          </CardContent>
        </Card>

        {/* Transaction table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />{t('balanceLedger.title')}
              {showRunningBalance && <Badge variant="secondary" className="ml-2">{currencyLabels[currencyFilter]} - {accountTypeLabels[accountFilter]}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <AppSectionLoading label={t('common.loading')} compact />
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t('balanceLedger.noRecords')}</p>
              </div>
            ) : (
              <>
                {isMobile ? (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <Card key={tx.id} className="p-3 cursor-pointer" onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{tx.transaction_date}</span>
                              <Badge className={`text-xs ${tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                {tx.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                              </Badge>
                            </div>
                            <div className="font-medium text-sm mt-1 truncate">{tx.summary}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`font-semibold text-sm flex items-center gap-1 ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                              {tx.type === 'income' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                            </div>
                          </div>
                        </div>
                        {expandedTxId === tx.id && (
                          <div className="mt-3 pt-3 border-t space-y-1 text-sm" onClick={e => e.stopPropagation()}>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              <div><span className="text-muted-foreground">{t('transactions.category')}:</span> {tx.category_name}</div>
                              <div><span className="text-muted-foreground">{t('table.account')}:</span> {currencyLabels[tx.currency]} / {accountTypeLabels[tx.account_type]}</div>
                            </div>
                            {showRunningBalance && (
                              <div className="grid grid-cols-2 gap-x-4">
                                <div><span className="text-muted-foreground">{t('balanceLedger.balanceBefore')}:</span> <span className={`font-medium ${(tx.balance_before || 0) >= 0 ? '' : 'text-destructive'}`}>{formatCurrency(tx.balance_before || 0, currencyFilter)}</span></div>
                                <div><span className="text-muted-foreground">{t('balanceLedger.balanceAfter')}:</span> <span className={`font-medium ${(tx.balance_after || 0) >= 0 ? '' : 'text-destructive'}`}>{formatCurrency(tx.balance_after || 0, currencyFilter)}</span></div>
                              </div>
                            )}
                            {tx.remark_1 && <div className="text-xs text-muted-foreground">{tx.remark_1}</div>}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">{t('table.sequence')}</TableHead>
                          <TableHead>{t('common.date')}</TableHead>
                          <TableHead>{t('balanceLedger.transactionType')}</TableHead>
                          <TableHead>{t('transactions.category')}</TableHead>
                          <TableHead>{t('transactions.summary')}</TableHead>
                          <TableHead className="text-right">{t('common.amount')}</TableHead>
                          <TableHead>{t('table.account')}</TableHead>
                          {showRunningBalance && (
                            <>
                              <TableHead className="text-right">{t('balanceLedger.balanceBefore')}</TableHead>
                              <TableHead className="text-right">{t('balanceLedger.balanceAfter')}</TableHead>
                            </>
                          )}
                          <TableHead>{t('balanceLedger.remarkSource')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx, index) => (
                          <TableRow key={tx.id}>
                            <TableCell className="font-mono text-muted-foreground">{(currentPage - 1) * pageSize + index + 1}</TableCell>
                            <TableCell>{tx.transaction_date}</TableCell>
                            <TableCell>
                              <Badge className={tx.type === 'income' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                                {tx.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                              </Badge>
                            </TableCell>
                            <TableCell>{tx.category_name}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{tx.summary}</TableCell>
                            <TableCell className="text-right">
                              <div className={`flex items-center justify-end gap-1 font-medium ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                                {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                              </div>
                              {tx.currency !== 'MYR' && <div className="text-xs text-muted-foreground">{t('balanceLedger.approxMyr')} {formatCurrency(tx.amount_myr)}</div>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{currencyLabels[tx.currency] || tx.currency} / {accountTypeLabels[tx.account_type] || tx.account_type}</Badge>
                            </TableCell>
                            {showRunningBalance && (
                              <>
                                <TableCell className="text-right">
                                  <div className={`font-medium ${(tx.balance_before || 0) >= 0 ? 'text-foreground' : 'text-destructive'}`}>{formatCurrency(tx.balance_before || 0, currencyFilter)}</div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className={`font-medium ${(tx.balance_after || 0) >= 0 ? 'text-foreground' : 'text-destructive'}`}>{formatCurrency(tx.balance_after || 0, currencyFilter)}</div>
                                </TableCell>
                              </>
                            )}
                            <TableCell><span className="text-xs text-muted-foreground">{tx.remark_1 || t('balanceLedger.noRemark')}</span></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <TablePagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalItems={totalCount} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
