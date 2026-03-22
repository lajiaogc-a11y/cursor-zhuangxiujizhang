import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Package, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatMoney } from '@/lib/formatCurrency';
import { format } from 'date-fns';
import {
  type FixedAsset,
  type FixedAssetFormData,
  fetchFixedAssets,
  saveFixedAsset,
  deleteFixedAsset,
  recalculateAllDepreciation,
  calcDepreciation,
  calcAssetStats,
} from '@/services/fixedAssets.service';

const emptyForm: FixedAssetFormData = {
  asset_code: '', asset_name: '', category: 'other', purchase_date: new Date().toISOString().split('T')[0],
  purchase_amount: 0, currency: 'MYR', exchange_rate: 1, useful_life_months: 60, salvage_value: 0,
  depreciation_method: 'straight_line', status: 'active', location: '', notes: '',
};

export default function FixedAssets() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FixedAsset | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['fixed_assets', tenantId],
    queryFn: () => fetchFixedAssets(tenantId!),
    enabled: !!tenantId,
  });

  // calcDepreciation is now imported from the service

  const saveMutation = useMutation({
    mutationFn: async (data: FixedAssetFormData & { id?: string }) => {
      await saveFixedAsset(data, user?.id, tenantId);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fixed_assets'] }); setDialogOpen(false); toast({ title: t('common.success') }); },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFixedAsset(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fixed_assets'] }); toast({ title: t('common.deleteSuccess') }); },
  });

  const filtered = useMemo(() => {
    if (!search) return assets;
    const kw = search.toLowerCase();
    return assets.filter(a => a.asset_code.toLowerCase().includes(kw) || a.asset_name.toLowerCase().includes(kw));
  }, [assets, search]);

  const stats = useMemo(() => calcAssetStats(assets), [assets]);

  const categoryLabel = (c: string | null) => {
    const m: Record<string, string> = { equipment: t('assets.equipment'), vehicle: t('assets.vehicle'), furniture: t('assets.furniture'), electronics: t('assets.electronics'), other: t('common.other') };
    return m[c || 'other'] || c;
  };

  const statusLabel = (s: string | null) => {
    const m: Record<string, string> = { active: t('assets.active'), disposed: t('assets.disposed'), written_off: t('assets.writtenOff') };
    return m[s || 'active'] || s;
  };

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-5">
        <div className="flex items-center justify-end">
          <div className="flex gap-2">
            <Button variant="outline" onClick={async () => {
              const count = await recalculateAllDepreciation(assets);
              queryClient.invalidateQueries({ queryKey: ['fixed_assets'] });
              toast({ title: t('common.success'), description: `${count} ${t('assets.title')}` });
            }}><RefreshCw className="w-4 h-4 mr-2" />{t('assets.recalculate')}</Button>
            <Button onClick={() => { setEditing(null); setForm(emptyForm); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />{t('assets.newAsset')}</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-4">
            <Package className="w-8 h-8 text-primary" />
            <div><p className="text-sm text-muted-foreground">{t('assets.totalValue')}</p><p className="text-xl font-bold font-mono">MYR {formatMoney(stats.totalValue, 'MYR')}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-4">
            <TrendingDown className="w-8 h-8 text-orange-500" />
            <div><p className="text-sm text-muted-foreground">{t('assets.totalDepreciation')}</p><p className="text-xl font-bold font-mono">MYR {formatMoney(stats.totalDep, 'MYR')}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-4">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div><p className="text-sm text-muted-foreground">{t('assets.netValue')}</p><p className="text-xl font-bold font-mono">MYR {formatMoney(stats.netValue, 'MYR')}</p></div>
          </CardContent></Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('assets.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10 max-w-md" />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t('assets.assetCode')}</TableHead>
                <TableHead>{t('assets.assetName')}</TableHead>
                <TableHead>{t('assets.category')}</TableHead>
                <TableHead>{t('assets.purchaseDate')}</TableHead>
                <TableHead>{t('assets.purchaseAmount')}</TableHead>
                <TableHead>{t('assets.currentValue')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="p-0"><AppSectionLoading label={t('common.loading')} compact /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">{t('assets.noAssets')}</TableCell></TableRow>
                ) : filtered.map(a => {
                  const dep = calcDepreciation(a);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono">{a.asset_code}</TableCell>
                      <TableCell className="font-medium">{a.asset_name}</TableCell>
                      <TableCell><Badge variant="outline">{categoryLabel(a.category)}</Badge></TableCell>
                      <TableCell>{format(new Date(a.purchase_date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="font-mono">{a.currency} {formatMoney(a.purchase_amount, a.currency)}</TableCell>
                      <TableCell className="font-mono">MYR {formatMoney(dep.current, 'MYR')}</TableCell>
                      <TableCell><Badge variant={a.status === 'active' ? 'default' : 'secondary'}>{statusLabel(a.status)}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditing(a); setForm({
                              asset_code: a.asset_code, asset_name: a.asset_name, category: a.category || 'other',
                              purchase_date: a.purchase_date, purchase_amount: a.purchase_amount,
                              currency: a.currency, exchange_rate: a.exchange_rate,
                              useful_life_months: a.useful_life_months || 60, salvage_value: a.salvage_value || 0,
                              depreciation_method: a.depreciation_method || 'straight_line',
                              status: a.status || 'active', location: a.location || '', notes: a.notes || '',
                            }); setDialogOpen(true);
                          }}><Edit className="w-4 h-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(a.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? t('assets.editAsset') : t('assets.newAsset')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('assets.assetCode')} *</Label><Input value={form.asset_code} onChange={e => setForm(f => ({ ...f, asset_code: e.target.value }))} placeholder="FA-001" /></div>
              <div><Label>{t('assets.assetName')} *</Label><Input value={form.asset_name} onChange={e => setForm(f => ({ ...f, asset_name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('assets.category')}</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment">{t('assets.equipment')}</SelectItem>
                    <SelectItem value="vehicle">{t('assets.vehicle')}</SelectItem>
                    <SelectItem value="furniture">{t('assets.furniture')}</SelectItem>
                    <SelectItem value="electronics">{t('assets.electronics')}</SelectItem>
                    <SelectItem value="other">{t('common.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t('assets.purchaseDate')}</Label><Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>{t('assets.purchaseAmount')}</Label><Input type="number" value={form.purchase_amount} onChange={e => setForm(f => ({ ...f, purchase_amount: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>{t('transactions.currency')}</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="MYR">MYR</SelectItem><SelectItem value="CNY">CNY</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>{t('transactions.exchangeRate')}</Label><Input type="number" value={form.exchange_rate} onChange={e => setForm(f => ({ ...f, exchange_rate: parseFloat(e.target.value) || 1 }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>{t('assets.usefulLife')}</Label><Input type="number" value={form.useful_life_months} onChange={e => setForm(f => ({ ...f, useful_life_months: parseInt(e.target.value) || 60 }))} /></div>
              <div><Label>{t('assets.salvageValue')}</Label><Input type="number" value={form.salvage_value} onChange={e => setForm(f => ({ ...f, salvage_value: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>{t('assets.depreciationMethod')}</Label>
                <Select value={form.depreciation_method} onValueChange={v => setForm(f => ({ ...f, depreciation_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight_line">{t('assets.straightLine')}</SelectItem>
                    <SelectItem value="declining_balance">{t('assets.decliningBalance')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('assets.location')}</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
              <div><Label>{t('common.status')}</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('assets.active')}</SelectItem>
                    <SelectItem value="disposed">{t('assets.disposed')}</SelectItem>
                    <SelectItem value="written_off">{t('assets.writtenOff')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>{t('contacts.notes')}</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => saveMutation.mutate({ ...form, id: editing?.id })} disabled={!form.asset_code.trim() || !form.asset_name.trim()}>{t('common.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
