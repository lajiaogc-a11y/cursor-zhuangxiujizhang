import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Search, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQCustomers } from '@/hooks/useQCustomers';
import type { Customer } from '@/types/quotation';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCustomer?: (id: string) => void;
}

const emptyCustomer = (): Omit<Customer, 'id'> => ({
  nameZh: '', nameEn: '', contactPerson: '', phone: '', email: '', address: '', notes: '',
});

export function CustomerManagementDialog({ open, onOpenChange, onSelectCustomer }: Props) {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useQCustomers();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Omit<Customer, 'id'>>(emptyCustomer());

  const filtered = customers.filter(c =>
    c.nameZh.toLowerCase().includes(search.toLowerCase()) ||
    (c.nameEn || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  const startEdit = (c: Customer) => {
    setEditingId(c.id); setIsAdding(false);
    setForm({ nameZh: c.nameZh, nameEn: c.nameEn, contactPerson: c.contactPerson, phone: c.phone, email: c.email, address: c.address, notes: c.notes });
  };

  const startAdd = () => { setIsAdding(true); setEditingId(null); setForm(emptyCustomer()); };
  const cancel = () => { setIsAdding(false); setEditingId(null); };

  const handleSave = async () => {
    if (!form.nameZh.trim()) return;
    if (editingId) { await updateCustomer.mutateAsync({ id: editingId, ...form }); }
    else { await addCustomer.mutateAsync(form); }
    cancel();
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定删除此客户?')) await deleteCustomer.mutateAsync(id);
  };

  const updateField = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const renderForm = () => (
    <div className="space-y-3 p-3 bg-secondary/30 rounded-lg border border-border">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">中文名称 *</Label><Input value={form.nameZh} onChange={e => updateField('nameZh', e.target.value)} className="h-8 text-sm mt-1" placeholder="客户名称" /></div>
        <div><Label className="text-xs">英文名称</Label><Input value={form.nameEn || ''} onChange={e => updateField('nameEn', e.target.value)} className="h-8 text-sm mt-1" placeholder="Customer Name" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">联系人</Label><Input value={form.contactPerson || ''} onChange={e => updateField('contactPerson', e.target.value)} className="h-8 text-sm mt-1" /></div>
        <div><Label className="text-xs">电话</Label><Input value={form.phone || ''} onChange={e => updateField('phone', e.target.value)} className="h-8 text-sm mt-1" /></div>
      </div>
      <div><Label className="text-xs">邮箱</Label><Input type="email" value={form.email || ''} onChange={e => updateField('email', e.target.value)} className="h-8 text-sm mt-1" /></div>
      <div><Label className="text-xs">地址</Label><Input value={form.address || ''} onChange={e => updateField('address', e.target.value)} className="h-8 text-sm mt-1" /></div>
      <div><Label className="text-xs">备注</Label><Textarea value={form.notes || ''} onChange={e => updateField('notes', e.target.value)} className="text-sm mt-1 min-h-[40px]" /></div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={cancel} className="h-7 text-xs"><X className="w-3 h-3 mr-1" />取消</Button>
        <Button size="sm" onClick={handleSave} disabled={!form.nameZh.trim()} className="h-7 text-xs"><Check className="w-3 h-3 mr-1" />{editingId ? '更新' : '添加'}</Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>客户管理</span>
            <Button size="sm" onClick={startAdd} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1" />新增客户</Button>
          </DialogTitle>
        </DialogHeader>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索客户..." className="pl-9 h-8 text-sm" />
        </div>
        {isAdding && renderForm()}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-1">
            {filtered.map(c => (
              <div key={c.id}>
                {editingId === c.id ? renderForm() : (
                  <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/30 group cursor-pointer" onClick={() => onSelectCustomer?.(c.id)}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.nameZh} {c.nameEn && <span className="text-muted-foreground font-normal">{c.nameEn}</span>}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {c.contactPerson && <span>{c.contactPerson}</span>}
                          {c.phone && <span>{c.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">暂无客户</p>}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
