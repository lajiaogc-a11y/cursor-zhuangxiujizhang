import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Tags, Plus, Edit2, Trash2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import { useDataRefresh } from '@/hooks/useDataRefresh';
import {
  fetchTransactionCategories,
  saveTransactionCategory,
  toggleTransactionCategory,
  deleteTransactionCategory,
  type TransactionCategory,
} from '@/services/settings.service';
import type { Database } from '@/integrations/supabase/types';

type TransactionType = Database['public']['Enums']['transaction_type'];

export function CategoryManagement() {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const { refreshAll } = useDataRefresh();
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setCategories(await fetchTransactionCategories(tenant?.id));
    } catch (e: any) {
      toast({ title: t('category.fetchFailed'), description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { if (tenant?.id) load(); }, [tenant?.id]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get('name') as string,
      type: formData.get('type') as TransactionType,
      description: formData.get('description') as string || null,
      is_active: formData.get('is_active') === 'on',
      tenant_id: tenant?.id,
    };
    try {
      await saveTransactionCategory(payload, editingCategory?.id);
      toast({ title: editingCategory ? t('category.updated') : t('category.created') });
      setDialogOpen(false);
      setEditingCategory(null);
      load();
      refreshAll();
    } catch (e: any) {
      toast({ title: editingCategory ? t('category.updateFailed') : t('category.createFailed'), description: e.message, variant: 'destructive' });
    }
  };

  const handleToggle = async (cat: TransactionCategory) => {
    try {
      await toggleTransactionCategory(cat.id, cat.is_active || false);
      load();
      refreshAll();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('category.deleteConfirm'))) return;
    try {
      await deleteTransactionCategory(id);
      toast({ title: t('category.deleted') });
      load();
      refreshAll();
    } catch (e: any) {
      toast({ title: t('category.deleteFailed'), description: e.message, variant: 'destructive' });
    }
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const renderList = (items: TransactionCategory[]) =>
    items.map(cat => (
      <div key={cat.id} className={`flex items-center justify-between p-3 border rounded-lg ${cat.is_active ? '' : 'opacity-50'}`}>
        <div className="flex items-center gap-3">
          <Switch checked={cat.is_active || false} onCheckedChange={() => handleToggle(cat)} />
          <div>
            <span className="font-medium">{cat.name}</span>
            {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => { setEditingCategory(cat); setDialogOpen(true); }}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(cat.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    ));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Tags className="w-5 h-5" />
          {t('category.title')}
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditingCategory(null)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('category.add')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? t('category.edit') : t('category.add')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('category.name')}</Label>
                <Input name="name" defaultValue={editingCategory?.name || ''} required />
              </div>
              <div className="space-y-2">
                <Label>{t('category.type')}</Label>
                <Select name="type" defaultValue={editingCategory?.type || 'expense'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{t('category.income')}</SelectItem>
                    <SelectItem value="expense">{t('category.expense')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('category.description')}</Label>
                <Input name="description" defaultValue={editingCategory?.description || ''} />
              </div>
              <div className="flex items-center gap-2">
                <Switch name="is_active" defaultChecked={editingCategory?.is_active !== false} />
                <Label>{t('category.enabled')}</Label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button type="submit">{t('common.save')}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="flex items-center gap-2 font-medium mb-3">
              <ArrowUpRight className="w-4 h-4 text-success" />
              {t('category.incomeCategories')} ({incomeCategories.length})
            </h3>
            <div className="space-y-2">
              {incomeCategories.length === 0
                ? <p className="text-sm text-muted-foreground py-4 text-center">{t('category.noIncome')}</p>
                : renderList(incomeCategories)}
            </div>
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-medium mb-3">
              <ArrowDownRight className="w-4 h-4 text-destructive" />
              {t('category.expenseCategories')} ({expenseCategories.length})
            </h3>
            <div className="space-y-2">
              {expenseCategories.length === 0
                ? <p className="text-sm text-muted-foreground py-4 text-center">{t('category.noExpense')}</p>
                : renderList(expenseCategories)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
