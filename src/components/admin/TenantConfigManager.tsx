import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTenantConfigs, fetchTenantMemberCounts, updateTenantConfig } from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Settings2, Save, Edit, CalendarDays, Users, Package } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  max_members: number;
  expires_at: string | null;
  created_at: string;
}

export function TenantConfigManager() {
  const { language, t } = useI18n();
  const zh = language === 'zh';
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TenantConfig | null>(null);
  const [form, setForm] = useState({ plan: '', max_members: 5, expires_at: '' });

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenant-config-list'],
    queryFn: async () => {
      const data = await fetchTenantConfigs();
      return data as TenantConfig[];
    },
  });

  // Get member counts
  const { data: memberCounts = new Map() } = useQuery({
    queryKey: ['tenant-config-member-counts'],
    queryFn: fetchTenantMemberCounts,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const expiresAt = form.expires_at ? new Date(form.expires_at).toISOString() : null;
      await updateTenantConfig(editing.id, {
        plan: form.plan as 'free' | 'basic' | 'professional' | 'enterprise',
        max_members: form.max_members,
        expires_at: expiresAt,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-config-list'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant-admins'] });
      setEditing(null);
      toast.success(zh ? '配置已更新' : 'Config updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (t: TenantConfig) => {
    setEditing(t);
    setForm({
      plan: t.plan,
      max_members: t.max_members,
      expires_at: t.expires_at ? format(new Date(t.expires_at), 'yyyy-MM-dd') : '',
    });
  };

  const planLabel = (plan: string) => {
    if (!zh) return plan;
    return { free: '免费版', basic: '基础版', professional: '专业版', enterprise: '企业版' }[plan] || plan;
  };

  const planColors: Record<string, string> = {
    free: 'bg-muted text-muted-foreground',
    basic: 'bg-info/10 text-info',
    professional: 'bg-primary/10 text-primary',
    enterprise: 'bg-warning/10 text-warning',
  };

  const isExpired = (t: TenantConfig) => t.expires_at && new Date(t.expires_at) < new Date();

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['free', 'basic', 'professional', 'enterprise'].map(plan => {
          const count = tenants.filter(t => t.plan === plan).length;
          return (
            <Card key={plan}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <p className="text-2xl font-bold">{count}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{planLabel(plan)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Config Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            {zh ? '租户配置管理' : 'Tenant Configuration'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AppSectionLoading label={t('common.loading')} compact />
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table compact>
                <TableHeader>
                  <TableRow>
                    <TableHead>{zh ? '租户' : 'Tenant'}</TableHead>
                    <TableHead>{zh ? '套餐' : 'Plan'}</TableHead>
                    <TableHead className="text-center">{zh ? '成员/上限' : 'Members/Max'}</TableHead>
                    <TableHead>{zh ? '到期时间' : 'Expires'}</TableHead>
                    <TableHead>{zh ? '状态' : 'Status'}</TableHead>
                    <TableHead className="text-right">{zh ? '操作' : 'Action'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map(tenantRow => {
                    const members = memberCounts.get(tenantRow.id) || 0;
                    const expired = isExpired(tenantRow);
                    return (
                      <TableRow key={tenantRow.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{tenantRow.name}</p>
                            <p className="text-[10px] text-muted-foreground">{tenantRow.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${planColors[tenantRow.plan] || ''}`}>
                            {planLabel(tenantRow.plan)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-mono text-sm ${members >= tenantRow.max_members ? 'text-destructive font-bold' : ''}`}>
                            {members}/{tenantRow.max_members}
                          </span>
                        </TableCell>
                        <TableCell>
                          {tenantRow.expires_at ? (
                            <span className={`text-sm ${expired ? 'text-destructive font-medium' : ''}`}>
                              {format(new Date(tenantRow.expires_at), 'yyyy-MM-dd')}
                              {expired && <Badge variant="destructive" className="text-[9px] ml-1">{zh ? '已过期' : 'Expired'}</Badge>}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">∞</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tenantRow.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                            {tenantRow.status === 'active' ? (zh ? '活跃' : 'Active') : (zh ? '停用' : 'Suspended')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => openEdit(tenantRow)}>
                            <Edit className="w-3 h-3" />
                            {zh ? '配置' : 'Edit'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              {zh ? '编辑租户配置' : 'Edit Tenant Config'} — {editing?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />{zh ? '套餐' : 'Plan'}</Label>
              <Select value={form.plan} onValueChange={v => setForm(p => ({ ...p, plan: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">{zh ? '免费版' : 'Free'}</SelectItem>
                  <SelectItem value="basic">{zh ? '基础版' : 'Basic'}</SelectItem>
                  <SelectItem value="professional">{zh ? '专业版' : 'Professional'}</SelectItem>
                  <SelectItem value="enterprise">{zh ? '企业版' : 'Enterprise'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{zh ? '最大成员数' : 'Max Members'}</Label>
              <Input type="number" value={form.max_members} onChange={e => setForm(p => ({ ...p, max_members: parseInt(e.target.value) || 1 }))} min={1} />
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{zh ? '到期时间（留空=永不过期）' : 'Expiry Date (empty = never)'}</Label>
              <Input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{zh ? '取消' : 'Cancel'}</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {zh ? '保存' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
