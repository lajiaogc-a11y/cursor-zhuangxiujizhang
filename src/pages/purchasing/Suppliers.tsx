import { useState } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Building2, Plus, Pencil, Trash2, Search, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useQSuppliers, type QSupplier } from '@/hooks/useQSuppliers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { purchasingService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { useResponsive } from '@/hooks/useResponsive';

export default function SuppliersPage() {
  const { suppliers, loading } = useQSuppliers();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { isMobile } = useResponsive();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<any>({});
  const { sortConfig, requestSort, sortData } = useSortableTable<QSupplier>();

  const filtered = suppliers.filter(s =>
    s.name.includes(search) || (s.contactPerson || '').includes(search) || (s.phone || '').includes(search) || (s.supplierCode || '').includes(search)
  );

  const sorted = sortData(filtered, (item, key) => {
    switch (key) {
      case 'supplierCode': return item.supplierCode;
      case 'name': return item.name;
      case 'contactPerson': return item.contactPerson;
      case 'phone': return item.phone;
      case 'email': return item.email;
      case 'isActive': return item.isActive ? 1 : 0;
      default: return (item as any)[key];
    }
  });

  const save = useMutation({
    mutationFn: (s: any) => purchasingService.saveSupplier(s, user?.id, suppliers),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['q_suppliers_list', tenantId] }); toast({ title: t('purchasing.supplierSaved') }); setDialogOpen(false); },
    onError: (e: any) => toast({ title: t('purchasing.saveFailed'), description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => purchasingService.deactivateSupplier(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['q_suppliers_list', tenantId] }); toast({ title: t('purchasing.supplierDeleted') }); setDeleteId(null); },
  });

  const openAdd = () => { setEditing({ name: '', contactPerson: '', phone: '', email: '', address: '', paymentTerms: '', notes: '' }); setDialogOpen(true); };

  const renderMobileCards = () => (
    <div className="space-y-2">{sorted.map((s, i) => (
      <Card key={s.id}>
        <CardContent className="p-3 flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{i + 1}.</span>
              {s.supplierCode && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{s.supplierCode}</Badge>}
              <p className="font-medium text-sm truncate">{s.name}</p>
              <Badge variant={s.isActive ? 'default' : 'secondary'} className="text-[10px]">{s.isActive ? t('purchasing.active') : t('purchasing.inactive')}</Badge>
            </div>
            {s.contactPerson && <p className="text-xs text-muted-foreground mt-0.5">{s.contactPerson}</p>}
            <div className="mt-1 space-y-0.5">
              {s.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</p>}
              {s.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</p>}
            </div>
          </div>
          <div className="flex gap-1 shrink-0 ml-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(s); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </CardContent>
      </Card>
    ))}</div>
  );

  const renderTable = () => (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <SortableTableHead sortKey="supplierCode" sortConfig={sortConfig} onSort={requestSort}>{t('purchasing.supplierCode')}</SortableTableHead>
            <SortableTableHead sortKey="name" sortConfig={sortConfig} onSort={requestSort}>{t('purchasing.supplierName')}</SortableTableHead>
            <SortableTableHead sortKey="contactPerson" sortConfig={sortConfig} onSort={requestSort}>{t('purchasing.contactPerson')}</SortableTableHead>
            <SortableTableHead sortKey="phone" sortConfig={sortConfig} onSort={requestSort}>{t('purchasing.phone')}</SortableTableHead>
            <SortableTableHead sortKey="email" sortConfig={sortConfig} onSort={requestSort}>{t('purchasing.email')}</SortableTableHead>
            <SortableTableHead sortKey="isActive" sortConfig={sortConfig} onSort={requestSort}>{t('common.status')}</SortableTableHead>
            <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((s, i) => (
            <TableRow key={s.id}>
              <TableCell className="text-muted-foreground">{i + 1}</TableCell>
              <TableCell>
                {s.supplierCode ? (
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-mono">{s.supplierCode}</Badge>
                ) : '-'}
              </TableCell>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>{s.contactPerson || '-'}</TableCell>
              <TableCell>{s.phone || '-'}</TableCell>
              <TableCell>{s.email || '-'}</TableCell>
              <TableCell>
                <Badge variant={s.isActive ? 'default' : 'secondary'} className="text-[10px]">
                  {s.isActive ? t('purchasing.active') : t('purchasing.inactive')}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(s); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <MobilePageShell title={t('purchasing.suppliers')} icon={<Building2 className="w-5 h-5" />} backTo="/purchasing"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={openAdd}><Plus className="w-4 h-4" /> {t('common.new')}</Button>}>
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('purchasing.searchSupplier')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {loading ? <AppSectionLoading label={t('common.loading')} compact />
        : filtered.length === 0 ? <div className="text-center py-12 text-muted-foreground"><Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>{t('purchasing.noSuppliers')}</p></div>
        : isMobile ? renderMobileCards() : renderTable()}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing?.id ? t('purchasing.editSupplier') : t('purchasing.newSupplier')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('purchasing.supplierName')} *</Label><Input value={editing?.name || ''} onChange={e => setEditing({...editing, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('purchasing.contactPerson')}</Label><Input value={editing?.contactPerson || ''} onChange={e => setEditing({...editing, contactPerson: e.target.value})} /></div>
              <div><Label>{t('purchasing.phone')}</Label><Input value={editing?.phone || ''} onChange={e => setEditing({...editing, phone: e.target.value})} /></div>
            </div>
            <div><Label>{t('purchasing.email')}</Label><Input value={editing?.email || ''} onChange={e => setEditing({...editing, email: e.target.value})} /></div>
            <div><Label>{t('purchasing.address')}</Label><Input value={editing?.address || ''} onChange={e => setEditing({...editing, address: e.target.value})} /></div>
            <div><Label>{t('purchasing.paymentTerms')}</Label><Input value={editing?.paymentTerms || ''} onChange={e => setEditing({...editing, paymentTerms: e.target.value})} /></div>
            <div><Label>{t('purchasing.notes')}</Label><Textarea value={editing?.notes || ''} onChange={e => setEditing({...editing, notes: e.target.value})} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => save.mutate(editing)} disabled={!editing?.name || save.isPending}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('cost.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('purchasing.deleteSupplierDesc')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && del.mutate(deleteId)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}
