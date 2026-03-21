import { useState } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Users, Plus, Pencil, Trash2, Search, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQCustomers } from '@/hooks/useQCustomers';
import { useI18n } from '@/lib/i18n';
import { useResponsive } from '@/hooks/useResponsive';
import type { Customer } from '@/types/quotation';

const emptyCustomer = (): Omit<Customer, 'id'> => ({
  nameZh: '', nameEn: '', contactPerson: '', phone: '', email: '', address: '', notes: '',
});

export default function CustomersPage() {
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer } = useQCustomers();
  const { t } = useI18n();
  const { isMobile } = useResponsive();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<(Omit<Customer, 'id'> & { id?: string }) | null>(null);

  // Combine nameZh and nameEn for display
  const getDisplayName = (c: Customer) => {
    return [c.nameZh, c.nameEn].filter(Boolean).join(' / ');
  };

  const filtered = customers.filter(c =>
    c.nameZh.includes(search) || (c.nameEn || '').toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search)
  );

  const openAdd = () => { setEditing(emptyCustomer()); setDialogOpen(true); };
  const openEdit = (c: Customer) => { setEditing({ ...c }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing) return;
    const { id, ...data } = editing as any;
    if (id) await updateCustomer.mutateAsync({ id, ...data });
    else await addCustomer.mutateAsync(data);
    setDialogOpen(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (deleteId) await deleteCustomer.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const setField = (key: string, value: any) =>
    setEditing(prev => prev ? { ...prev, [key]: value } : prev);

  const renderMobileCards = () => (
    <div className="space-y-3">
      {filtered.map(c => (
        <div key={c.id} className="border rounded-lg p-3 bg-card">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{getDisplayName(c)}</p>
            </div>
            <div className="flex gap-1 ml-2 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            {c.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>}
            {c.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</p>}
            {c.address && <p className="truncate">{c.address}</p>}
          </div>
        </div>
      ))}
    </div>
  );

  const renderTable = () => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('qc.name') || '姓名'}</TableHead>
            <TableHead>{t('qc.phone')}</TableHead>
            <TableHead>{t('qc.email')}</TableHead>
            <TableHead className="hidden lg:table-cell">{t('qc.address') || '地址'}</TableHead>
            <TableHead className="hidden lg:table-cell">{t('common.remark')}</TableHead>
            <TableHead className="w-24">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(c => (
            <TableRow key={c.id}>
              <TableCell className="font-medium text-sm">{getDisplayName(c)}</TableCell>
              <TableCell className="text-sm">{c.phone || '-'}</TableCell>
              <TableCell className="text-sm">{c.email || '-'}</TableCell>
              <TableCell className="hidden lg:table-cell text-sm max-w-[200px] truncate">{c.address || '-'}</TableCell>
              <TableCell className="hidden lg:table-cell text-sm max-w-[150px] truncate text-muted-foreground">{c.notes || '-'}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <MobilePageShell title={t('quotation.customers')} icon={<Users className="w-5 h-5" />} backTo="/quotation"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={openAdd}><Plus className="w-4 h-4" /> {t('common.add')}</Button>}>
      <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={t('qc.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{search ? t('qc.noMatch') : t('qc.noCustomers')}</p>
          </div>
        ) : isMobile ? renderMobileCards() : renderTable()}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing && 'id' in editing && editing.id ? t('qc.editCustomer') : t('qc.addCustomer')}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t('qc.nameZh')} *</Label><Input value={editing.nameZh} onChange={e => setField('nameZh', e.target.value)} /></div>
                <div><Label>{t('qc.nameEn')}</Label><Input value={editing.nameEn || ''} onChange={e => setField('nameEn', e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t('qc.phone')}</Label><Input value={editing.phone || ''} onChange={e => setField('phone', e.target.value)} /></div>
                <div><Label>{t('qc.email')}</Label><Input value={editing.email || ''} onChange={e => setField('email', e.target.value)} /></div>
              </div>
              <div><Label>{t('qc.address') || '地址'}</Label><Input value={editing.address || ''} onChange={e => setField('address', e.target.value)} /></div>
              <div><Label>{t('common.remark')}</Label><Textarea value={editing.notes || ''} onChange={e => setField('notes', e.target.value)} rows={3} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!editing?.nameZh || addCustomer.isPending || updateCustomer.isPending}>
              {addCustomer.isPending || updateCustomer.isPending ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}
