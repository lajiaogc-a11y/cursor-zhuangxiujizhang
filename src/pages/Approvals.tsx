import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import {
  fetchApprovalRules, fetchApprovalRequests, fetchProfiles,
  saveApprovalRule, deleteApprovalRule, reviewApprovalRequest,
  type ApprovalRule, type ApprovalRequest,
} from '@/services/approvals.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatMoney } from '@/lib/formatCurrency';
import { format } from 'date-fns';

// Types imported from service

export default function Approvals() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [ruleForm, setRuleForm] = useState({ rule_name: '', rule_type: 'expense', threshold_amount: 0, threshold_currency: 'MYR', approver_role: 'admin', is_active: true });
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: rules = [] } = useQuery({
    queryKey: ['approval_rules', tenantId],
    queryFn: () => fetchApprovalRules(tenantId!),
    enabled: !!tenantId,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['approval_requests', tenantId],
    queryFn: () => fetchApprovalRequests(tenantId!),
    enabled: !!tenantId,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
  });

  const saveRuleMutation = useMutation({
    mutationFn: (data: typeof ruleForm & { id?: string }) => saveApprovalRule(data, tenantId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['approval_rules'] }); setRuleDialogOpen(false); toast({ title: t('common.success') }); },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => deleteApprovalRule(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['approval_rules'] }); toast({ title: t('common.deleteSuccess') }); },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      reviewApprovalRequest(id, status, user?.id, reviewNotes[id] || null),
    onSuccess: (_, { id }) => { queryClient.invalidateQueries({ queryKey: ['approval_requests'] }); setReviewNotes(prev => { const next = { ...prev }; delete next[id]; return next; }); toast({ title: t('common.success') }); },
  });

  const roleLabel = (role: string) => {
    const m: Record<string, string> = { admin: t('users.roleAdmin'), accountant: t('users.roleAccountant'), project_manager: t('users.roleProjectManager') };
    return m[role] || role;
  };

  const typeLabel = (type: string) => {
    const m: Record<string, string> = { expense: t('approvals.expense'), payment: t('approvals.payment'), payable: t('approvals.payable') };
    return m[type] || type;
  };

  const statusBadge = (s: string) => {
    switch (s) { case 'approved': return 'default'; case 'rejected': return 'destructive'; default: return 'secondary'; }
  };

  const statusLabel = (s: string) => {
    const m: Record<string, string> = { pending: t('approvals.pending'), approved: t('approvals.approved'), rejected: t('approvals.rejected') };
    return m[s] || s;
  };

  const getProfileName = (userId: string) => {
    const p = profiles.find(p => p.user_id === userId);
    return p?.display_name || p?.username || userId.slice(0, 8);
  };

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-5">
        
        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">{t('approvals.requests')} {requests.filter(r => r.status === 'pending').length > 0 && <Badge variant="destructive" className="ml-2">{requests.filter(r => r.status === 'pending').length}</Badge>}</TabsTrigger>
            <TabsTrigger value="rules">{t('approvals.rules')}</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('approvals.requestType')}</TableHead>
                    <TableHead>{t('approvals.requestAmount')}</TableHead>
                    <TableHead>{t('approvals.requestedBy')}</TableHead>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">{t('approvals.noRequests')}</TableCell></TableRow>
                    ) : requests.map(req => (
                      <TableRow key={req.id}>
                        <TableCell><Badge variant="outline">{typeLabel(req.request_type)}</Badge></TableCell>
                        <TableCell className="font-mono">{req.currency} {formatMoney(req.amount, req.currency)}</TableCell>
                        <TableCell>{getProfileName(req.requested_by)}</TableCell>
                        <TableCell>{format(new Date(req.created_at), 'yyyy-MM-dd')}</TableCell>
                        <TableCell><Badge variant={statusBadge(req.status) as any}>{statusLabel(req.status)}</Badge></TableCell>
                        <TableCell>
                        {req.status === 'pending' && (
                            <div className="flex items-center gap-1">
                              <Input
                                placeholder={t('approvals.reviewNote')}
                                value={reviewNotes[req.id] || ''}
                                onChange={e => setReviewNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                                className="h-8 text-xs w-32"
                              />
                              <Button variant="ghost" size="icon" className="text-green-600" onClick={() => reviewMutation.mutate({ id: req.id, status: 'approved' })}><Check className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => reviewMutation.mutate({ id: req.id, status: 'rejected' })}><X className="w-4 h-4" /></Button>
                            </div>
                          )}
                          {req.review_note && <span className="text-xs text-muted-foreground">{req.review_note}</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="mt-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => { setEditingRule(null); setRuleForm({ rule_name: '', rule_type: 'expense', threshold_amount: 0, threshold_currency: 'MYR', approver_role: 'admin', is_active: true }); setRuleDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />{t('approvals.newRule')}
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>{t('approvals.ruleName')}</TableHead>
                    <TableHead>{t('approvals.ruleType')}</TableHead>
                    <TableHead>{t('approvals.thresholdAmount')}</TableHead>
                    <TableHead>{t('approvals.approverRole')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {rules.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">{t('approvals.noRules')}</TableCell></TableRow>
                    ) : rules.map(rule => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.rule_name}</TableCell>
                        <TableCell><Badge variant="outline">{typeLabel(rule.rule_type)}</Badge></TableCell>
                        <TableCell className="font-mono">{rule.threshold_currency} {formatMoney(rule.threshold_amount, rule.threshold_currency)}</TableCell>
                        <TableCell>{roleLabel(rule.approver_role)}</TableCell>
                        <TableCell><Badge variant={rule.is_active ? 'default' : 'secondary'}>{rule.is_active ? t('contacts.active') : t('contacts.inactive')}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingRule(rule); setRuleForm(rule); setRuleDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => deleteRuleMutation.mutate(rule.id)}>{t('common.delete')}</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRule ? t('approvals.editRule') : t('approvals.newRule')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('approvals.ruleName')} *</Label><Input value={ruleForm.rule_name} onChange={e => setRuleForm(f => ({ ...f, rule_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('approvals.ruleType')}</Label>
                <Select value={ruleForm.rule_type} onValueChange={v => setRuleForm(f => ({ ...f, rule_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">{t('approvals.expense')}</SelectItem>
                    <SelectItem value="payment">{t('approvals.payment')}</SelectItem>
                    <SelectItem value="payable">{t('approvals.payable')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t('approvals.approverRole')}</Label>
                <Select value={ruleForm.approver_role} onValueChange={v => setRuleForm(f => ({ ...f, approver_role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('users.roleAdmin')}</SelectItem>
                    <SelectItem value="accountant">{t('users.roleAccountant')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('approvals.thresholdAmount')}</Label><Input type="number" value={ruleForm.threshold_amount} onChange={e => setRuleForm(f => ({ ...f, threshold_amount: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>{t('transactions.currency')}</Label>
                <Select value={ruleForm.threshold_currency} onValueChange={v => setRuleForm(f => ({ ...f, threshold_currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="MYR">MYR</SelectItem><SelectItem value="CNY">CNY</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={ruleForm.is_active} onCheckedChange={v => setRuleForm(f => ({ ...f, is_active: v }))} /><Label>{t('contacts.active')}</Label></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => saveRuleMutation.mutate({ ...ruleForm, id: editingRule?.id })} disabled={!ruleForm.rule_name.trim()}>{t('common.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
