import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Zap, Trash2, Link2, MoreHorizontal } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Skeleton } from '@/components/ui/skeleton';
import { bankReconciliationService } from '@/services';

const formatCurrency = (amount: number, currency: string = 'MYR') => {
  const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
  return `${symbols[currency] || ''}${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function BankReconciliation() {
  const { t } = useI18n();
  const { user, hasPermission } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const canEdit = hasPermission('feature.edit');
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [importOpen, setImportOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<any>(null);
  const [possibleMatches, setPossibleMatches] = useState<any[]>([]);
  const [filterBatch, setFilterBatch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [importCurrency, setImportCurrency] = useState('MYR');
  const [importAccountType, setImportAccountType] = useState('bank');
  const [columnMap, setColumnMap] = useState({ date: 0, desc: 1, debit: 2, credit: 3, balance: 4 });
  const [skipRows, setSkipRows] = useState(1);
  const [importing, setImporting] = useState(false);

  const { data: statements = [], isLoading } = useQuery({
    queryKey: [...queryKeys.bankStatements, tenantId],
    queryFn: () => bankReconciliationService.fetchStatements(tenantId!),
    enabled: !!tenantId,
  });

  const { data: batches = [] } = useQuery({
    queryKey: [...queryKeys.bankBatches, tenantId],
    queryFn: () => bankReconciliationService.fetchBatches(tenantId!),
    enabled: !!tenantId,
  });

  const invalidateBank = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bankStatements });
    queryClient.invalidateQueries({ queryKey: queryKeys.bankBatches });
  };

  const filtered = statements.filter(s => {
    if (filterBatch !== 'all' && s.import_batch_id !== filterBatch) return false;
    if (filterStatus !== 'all' && s.match_status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: statements.length,
    matched: statements.filter(s => s.match_status === 'auto_matched' || s.match_status === 'manual_matched').length,
    unmatched: statements.filter(s => s.match_status === 'unmatched').length,
    ignored: statements.filter(s => s.match_status === 'ignored').length,
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map(line =>
        line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
      ).filter(line => line.some(cell => cell.length > 0));
      setCsvData(lines);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (csvData.length <= skipRows || !tenantId) return;
    setImporting(true);
    try {
      const rows = csvData.slice(skipRows).map(row => ({
        statement_date: row[columnMap.date] || format(new Date(), 'yyyy-MM-dd'),
        description: row[columnMap.desc] || '',
        debit_amount: parseFloat(row[columnMap.debit]?.replace(/[^0-9.-]/g, '') || '0') || 0,
        credit_amount: parseFloat(row[columnMap.credit]?.replace(/[^0-9.-]/g, '') || '0') || 0,
        balance: parseFloat(row[columnMap.balance]?.replace(/[^0-9.-]/g, '') || '0') || 0,
      }));
      await bankReconciliationService.importBatch({
        fileName: 'import.csv',
        currency: importCurrency,
        accountType: importAccountType,
        totalRecords: csvData.length - skipRows,
        userId: user?.id,
        tenantId,
        rows,
      });
      toast.success(t('bank.importSuccess'));
      setImportOpen(false);
      setCsvData([]);
      invalidateBank();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleAutoMatch = async () => {
    if (!tenantId) return;
    const unmatchedStmts = statements.filter(s => s.match_status === 'unmatched');
    if (unmatchedStmts.length === 0) return;

    const { transactions: txData, rules } = await bankReconciliationService.fetchMatchCandidates(tenantId);
    if (!txData.length) return;

    let matchCount = 0;
    for (const stmt of unmatchedStmts) {
      const amount = stmt.debit_amount > 0 ? stmt.debit_amount : stmt.credit_amount;
      const txType = stmt.debit_amount > 0 ? 'expense' : 'income';
      const alreadyMatched = (txId: string) => statements.some(s => s.matched_transaction_id === txId && s.id !== stmt.id);

      let match = txData.find(tx => tx.type === txType && Math.abs(Number(tx.amount) - amount) < 0.01 && tx.transaction_date === stmt.statement_date && tx.currency === stmt.account_currency && tx.account_type === stmt.account_type && !alreadyMatched(tx.id));

      if (!match && rules.length > 0) {
        for (const rule of rules) {
          const candidates = txData.filter(tx => {
            if (tx.type !== txType || alreadyMatched(tx.id)) return false;
            if (rule.match_amount && Math.abs(Number(tx.amount) - amount) > (Number(rule.amount_tolerance || 0))) return false;
            if (rule.match_date) { const daysDiff = Math.abs((new Date(tx.transaction_date).getTime() - new Date(stmt.statement_date).getTime()) / 86400000); if (daysDiff > (rule.date_tolerance_days || 3)) return false; }
            if (rule.match_description && rule.description_pattern) { try { const pattern = new RegExp(rule.description_pattern, 'i'); if (!pattern.test(stmt.description) && !pattern.test(tx.summary || '') && !pattern.test(tx.category_name || '')) return false; } catch { return false; } }
            return tx.currency === stmt.account_currency;
          });
          if (candidates.length === 1) { match = candidates[0]; break; }
          if (candidates.length > 1) { match = candidates.sort((a, b) => Math.abs(Number(a.amount) - amount) - Math.abs(Number(b.amount) - amount))[0]; break; }
        }
      }

      if (!match) {
        match = txData.find(tx => {
          if (tx.type !== txType || alreadyMatched(tx.id)) return false;
          if (Math.abs(Number(tx.amount) - amount) > 0.01) return false;
          const daysDiff = Math.abs((new Date(tx.transaction_date).getTime() - new Date(stmt.statement_date).getTime()) / 86400000);
          return daysDiff <= 1 && tx.currency === stmt.account_currency;
        });
      }

      if (match) {
        await bankReconciliationService.updateStatementMatch(stmt.id, 'auto_matched', match.id);
        matchCount++;
      }
    }
    toast.success(t('bank.autoMatchResult').replace('{count}', String(matchCount)));
    invalidateBank();
  };

  const openMatchPanel = async (stmt: any) => {
    if (!tenantId) return;
    setSelectedStatement(stmt);
    const sorted = await bankReconciliationService.fetchPossibleMatches(tenantId, stmt);
    setPossibleMatches(sorted);
    setMatchOpen(true);
  };

  const confirmMatch = async (txId: string) => {
    if (!selectedStatement) return;
    await bankReconciliationService.updateStatementMatch(selectedStatement.id, 'manual_matched', txId);
    setMatchOpen(false);
    invalidateBank();
  };

  const handleIgnore = async (stmtId: string) => {
    await bankReconciliationService.updateStatementMatch(stmtId, 'ignored', null);
    invalidateBank();
  };

  const handleUnmatch = async (stmtId: string) => {
    await bankReconciliationService.updateStatementMatch(stmtId, 'unmatched', null);
    invalidateBank();
  };

  const handleDeleteBatch = async (batchId: string) => {
    await bankReconciliationService.deleteBatch(batchId);
    invalidateBank();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'auto_matched': return <Badge className="bg-success/10 text-success">Auto</Badge>;
      case 'manual_matched': return <Badge className="bg-primary/10 text-primary">Manual</Badge>;
      case 'ignored': return <Badge variant="secondary">{t('bank.ignored')}</Badge>;
      default: return <Badge variant="destructive">{t('bank.unmatched')}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-5">
        <div className="flex items-center justify-end">
          {canEdit && (<>
            <div className="hidden md:flex gap-2">
              <Button variant="outline" onClick={handleAutoMatch}><Zap className="w-4 h-4 mr-2" />{t('bank.autoMatch')}</Button>
              <Button onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />{t('bank.import')}</Button>
            </div>
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleAutoMatch}><Zap className="w-4 h-4 mr-2" />{t('bank.autoMatch')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />{t('bank.import')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><FileText className="w-5 h-5 mx-auto mb-1 text-primary" /><p className="text-xs text-muted-foreground">{t('bank.totalRecords')}</p><p className="text-xl font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><CheckCircle className="w-5 h-5 mx-auto mb-1 text-success" /><p className="text-xs text-muted-foreground">{t('bank.matched')}</p><p className="text-xl font-bold text-success">{stats.matched}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><XCircle className="w-5 h-5 mx-auto mb-1 text-destructive" /><p className="text-xs text-muted-foreground">{t('bank.unmatched')}</p><p className="text-xl font-bold text-destructive">{stats.unmatched}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><AlertTriangle className="w-5 h-5 mx-auto mb-1 text-warning" /><p className="text-xs text-muted-foreground">{t('bank.ignored')}</p><p className="text-xl font-bold">{stats.ignored}</p></CardContent></Card>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder={t('bank.batchInfo')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {batches.map((b: any) => (<SelectItem key={b.id} value={b.id}>{b.file_name} ({b.total_records})</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="unmatched">{t('bank.unmatched')}</SelectItem>
              <SelectItem value="auto_matched">{t('bank.matched')} (Auto)</SelectItem>
              <SelectItem value="manual_matched">{t('bank.matched')} (Manual)</SelectItem>
              <SelectItem value="ignored">{t('bank.ignored')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {batches.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">{t('bank.batchInfo')}</CardTitle></CardHeader>
            <CardContent className="p-0">
              {isMobile ? (
                <div className="divide-y">
                  {batches.map((b: any) => (
                    <div key={b.id} className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate flex-1">{b.file_name}</span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('bank.deleteBatchConfirm')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteBatch(b.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <div className="text-xs text-muted-foreground">{b.account_currency} / {b.account_type} | {t('bank.totalRecords')}: {b.total_records}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>{t('bank.fileName')}</TableHead><TableHead>{t('bank.currency')}/{t('bank.accountType')}</TableHead><TableHead>{t('bank.totalRecords')}</TableHead><TableHead>{t('bank.importDate')}</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {batches.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.file_name}</TableCell>
                        <TableCell>{b.account_currency} / {b.account_type}</TableCell>
                        <TableCell>{b.total_records}</TableCell>
                        <TableCell>{format(new Date(b.imported_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('bank.deleteBatchConfirm')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteBatch(b.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-sm">{t('bank.statementList')}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('bank.description')}</TableHead>
                  <TableHead className="text-right">{t('bank.debit')}</TableHead>
                  <TableHead className="text-right">{t('bank.credit')}</TableHead>
                  <TableHead className="text-right">{t('bank.balance')}</TableHead>
                  <TableHead>{t('bank.status')}</TableHead>
                  <TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('bank.noRecords')}</TableCell></TableRow>
                  ) : filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{s.statement_date}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{s.description}</TableCell>
                      <TableCell className="text-right text-sm text-destructive">{s.debit_amount > 0 ? formatCurrency(s.debit_amount, s.account_currency) : '-'}</TableCell>
                      <TableCell className="text-right text-sm text-success">{s.credit_amount > 0 ? formatCurrency(s.credit_amount, s.account_currency) : '-'}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(s.balance, s.account_currency)}</TableCell>
                      <TableCell>{getStatusBadge(s.match_status)}</TableCell>
                      <TableCell>
                        {canEdit && s.match_status === 'unmatched' && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openMatchPanel(s)}><Link2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleIgnore(s.id)}><XCircle className="w-4 h-4" /></Button>
                          </div>
                        )}
                        {canEdit && (s.match_status === 'auto_matched' || s.match_status === 'manual_matched') && (
                          <Button variant="ghost" size="sm" onClick={() => handleUnmatch(s.id)}><XCircle className="w-4 h-4" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Import Dialog */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t('bank.importCSV')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{t('bank.selectFile')}</Label><Input type="file" accept=".csv" onChange={handleFileSelect} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{t('bank.currency')}</Label><Select value={importCurrency} onValueChange={setImportCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MYR">MYR</SelectItem><SelectItem value="CNY">CNY</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select></div>
                <div><Label>{t('bank.accountType')}</Label><Select value={importAccountType} onValueChange={setImportAccountType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bank">{t('account.bank')}</SelectItem><SelectItem value="cash">{t('account.cash')}</SelectItem></SelectContent></Select></div>
              </div>
              <div><Label>{t('bank.skipRows')}</Label><Input type="number" value={skipRows} onChange={e => setSkipRows(parseInt(e.target.value) || 0)} /></div>
              {csvData.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('bank.preview')} ({csvData.length} {t('bank.rows')})</p>
                  <div className="overflow-x-auto max-h-40 border rounded">
                    <Table><TableBody>{csvData.slice(0, 5).map((row, i) => (<TableRow key={i}>{row.map((cell, j) => (<TableCell key={j} className="text-xs py-1">{cell}</TableCell>))}</TableRow>))}</TableBody></Table>
                  </div>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {['date', 'desc', 'debit', 'credit', 'balance'].map((field) => (
                      <div key={field}><Label className="text-xs">{t(`bank.col_${field}`)}</Label><Input type="number" className="h-8 text-xs" value={columnMap[field as keyof typeof columnMap]} onChange={e => setColumnMap(prev => ({ ...prev, [field]: parseInt(e.target.value) || 0 }))} /></div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setImportOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleImport} disabled={importing || csvData.length === 0}>{importing ? t('bank.importing') : t('bank.importNow')}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Match Dialog */}
        <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t('bank.manualMatch')}</DialogTitle></DialogHeader>
            {selectedStatement && (
              <div className="space-y-4">
                <Card><CardContent className="p-3">
                  <p className="text-sm font-medium">{selectedStatement.description}</p>
                  <p className="text-sm text-muted-foreground">{selectedStatement.statement_date} | {selectedStatement.debit_amount > 0 ? `${t('bank.debit')}: ${formatCurrency(selectedStatement.debit_amount, selectedStatement.account_currency)}` : `${t('bank.credit')}: ${formatCurrency(selectedStatement.credit_amount, selectedStatement.account_currency)}`}</p>
                </CardContent></Card>
                <Table>
                  <TableHeader><TableRow><TableHead>{t('common.date')}</TableHead><TableHead>{t('transactions.summary')}</TableHead><TableHead className="text-right">{t('common.amount')}</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {possibleMatches.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">{t('bank.noMatches')}</TableCell></TableRow>
                    ) : possibleMatches.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{tx.transaction_date}</TableCell>
                        <TableCell className="text-sm">{tx.summary || tx.category_name}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(Number(tx.amount), tx.currency)}</TableCell>
                        <TableCell><Button size="sm" onClick={() => confirmMatch(tx.id)}>{t('bank.match')}</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
