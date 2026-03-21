import { useState, useMemo } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Users, Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { useQuery } from '@tanstack/react-query';
import { costService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import * as XLSX from 'xlsx';

interface LaborSummary {
  breakdownId: string;
  breakdownName: string;
  status: string;
  methods: {
    methodId: string;
    methodName: string;
    workerType: string;
    totalHours: number;
    totalCost: number;
  }[];
  totalHours: number;
  totalCost: number;
}

export default function LaborPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  const { data: breakdowns = [], isLoading: loadingBreakdowns } = useQuery({
    queryKey: ['q_project_breakdowns_labor'],
    queryFn: () => costService.fetchBreakdownsForLabor(),
    enabled: !!user,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['q_breakdown_items_all_labor'],
    queryFn: () => costService.fetchAllBreakdownItemsForLabor(),
    enabled: !!user,
  });

  const { data: laborRates = [] } = useQuery({
    queryKey: ['q_labor_rates_all'],
    queryFn: () => costService.fetchAllLaborRates(),
    enabled: !!user,
  });

  const summaries = useMemo<LaborSummary[]>(() => {
    return breakdowns.map((b: any) => {
      const bItems = allItems.filter((i: any) => i.project_breakdown_id === b.id);
      const methodMap = new Map<string, { methodName: string; workerType: string; totalHours: number; totalCost: number }>();
      bItems.forEach((item: any) => {
        const rates = laborRates.filter((lr: any) => lr.method_id === item.method_id);
        rates.forEach((lr: any) => {
          const key = `${item.method_id}_${lr.worker_type}`;
          const existing = methodMap.get(key);
          const hours = Number(lr.hours_per_unit) * Number(item.quantity);
          const cost = hours * Number(lr.hourly_rate);
          if (existing) { existing.totalHours += hours; existing.totalCost += cost; }
          else { methodMap.set(key, { methodName: item.q_methods?.name_zh || t('cost.unknown'), workerType: lr.worker_type, totalHours: hours, totalCost: cost }); }
        });
      });
      const methods = Array.from(methodMap.entries()).map(([, v]) => ({ methodId: '', ...v }));
      const totalHours = methods.reduce((s, m) => s + m.totalHours, 0);
      const totalCost = methods.reduce((s, m) => s + m.totalCost, 0);
      return { breakdownId: b.id, breakdownName: b.name, status: b.status, methods, totalHours, totalCost };
    }).filter(s => s.totalCost > 0 || s.methods.length > 0);
  }, [breakdowns, allItems, laborRates]);

  const filtered = useMemo(() => summaries.filter(s => s.breakdownName.toLowerCase().includes(search.toLowerCase())), [summaries, search]);
  const grandTotalHours = filtered.reduce((s, f) => s + f.totalHours, 0);
  const grandTotalCost = filtered.reduce((s, f) => s + f.totalCost, 0);

  function exportExcel() {
    const rows: any[][] = [[t('cost.excelProject'), t('cost.excelMethod') || t('bd.excelMethod'), t('cost.excelWorkerType'), t('cost.excelTotalHours'), t('cost.excelTotalLabor')]];
    filtered.forEach(s => { s.methods.forEach(m => { rows.push([s.breakdownName, m.methodName, m.workerType, m.totalHours.toFixed(1), m.totalCost.toFixed(2)]); }); });
    rows.push([], ['', '', t('cost.excelSummary'), grandTotalHours.toFixed(1), grandTotalCost.toFixed(2)]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('cost.excelLaborSheet'));
    XLSX.writeFile(wb, `${t('cost.excelLaborSheet')}.xlsx`);
  }

  return (
    <MobilePageShell title={t('cost.laborSummary')} icon={<Users className="w-5 h-5" />} backTo="/cost">
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t('cost.searchProject')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Button variant="outline" size="sm" className="gap-1 h-9" onClick={exportExcel}><Download className="w-4 h-4" /> {t('common.export')}</Button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="stat-card-v2"><div className="flex items-center gap-3"><Users className="w-8 h-8 text-primary/20" /><div><p className="text-lg font-bold">{filtered.length}</p><p className="text-[10px] text-muted-foreground">{t('cost.projectCount')}</p></div></div></div>
          <div className="stat-card-v2"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center"><span className="text-[10px] font-bold text-blue-600">h</span></div><div><p className="text-lg font-bold">{grandTotalHours.toFixed(0)}h</p><p className="text-[10px] text-muted-foreground">{t('cost.totalHours')}</p></div></div></div>
          <div className="stat-card-v2"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-[10px] font-bold text-primary">RM</span></div><div><p className="text-lg font-bold">{(grandTotalCost / 1000).toFixed(1)}K</p><p className="text-[10px] text-muted-foreground">{t('cost.totalLabor')}</p></div></div></div>
        </div>

        {loadingBreakdowns ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">{t('cost.noLaborData')}</p>
        ) : (
          <ResponsiveTable
            mobileView={
              <div className="space-y-3">{filtered.map(s => (
                <Card key={s.breakdownId}><CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-semibold">{s.breakdownName}</p>
                    <Badge variant="secondary" className="text-[10px]">{s.status}</Badge>
                  </div>
                  <div className="space-y-1">{s.methods.map((m, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{m.methodName} · {m.workerType}</span>
                      <span>{m.totalHours.toFixed(1)}h = RM {m.totalCost.toFixed(2)}</span>
                    </div>
                  ))}</div>
                  <div className="flex justify-between text-xs font-semibold mt-2 pt-2 border-t">
                    <span>{t('cost.excelSummary')}: {s.totalHours.toFixed(1)}h</span>
                    <span>RM {s.totalCost.toLocaleString()}</span>
                  </div>
                </CardContent></Card>
              ))}</div>
            }
            desktopView={
              <div className="border rounded-lg overflow-hidden">
                <Table compact>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>{t('cost.excelProject')}</TableHead>
                      <TableHead>{t('cost.excelMethod') || t('bd.excelMethod')}</TableHead>
                      <TableHead>{t('cost.excelWorkerType')}</TableHead>
                      <TableHead className="text-right">{t('cost.excelTotalHours')}</TableHead>
                      <TableHead className="text-right">{t('cost.excelTotalLabor')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.flatMap((s, sIdx) => s.methods.map((m, mIdx) => (
                      <TableRow key={`${s.breakdownId}_${mIdx}`}>
                        <TableCell className="text-muted-foreground">{mIdx === 0 ? sIdx + 1 : ''}</TableCell>
                        <TableCell className={mIdx === 0 ? 'font-medium' : ''}>{mIdx === 0 ? s.breakdownName : ''}</TableCell>
                        <TableCell>{m.methodName}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{m.workerType}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{m.totalHours.toFixed(1)}h</TableCell>
                        <TableCell className="text-right font-mono">{m.totalCost.toFixed(2)}</TableCell>
                        <TableCell>{mIdx === 0 ? <Badge variant="outline" className="text-[10px]">{s.status}</Badge> : null}</TableCell>
                      </TableRow>
                    )))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={4} className="text-right">{t('cost.excelSummary')}</TableCell>
                      <TableCell className="text-right font-mono">{grandTotalHours.toFixed(1)}h</TableCell>
                      <TableCell className="text-right font-mono">RM {grandTotalCost.toFixed(2)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            }
          />
        )}
      </div>
    </MobilePageShell>
  );
}
