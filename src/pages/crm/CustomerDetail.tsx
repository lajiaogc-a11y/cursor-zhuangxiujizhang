import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import {
  fetchCustomerById, fetchContactActivities, fetchContactReminders,
  addContactActivity, addContactReminder, toggleContactReminder,
} from '@/services/crm.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowLeft, Phone, Mail, MapPin, MessageCircle, Building2,
  Plus, Clock, CheckCircle, Calendar, User, DollarSign,
} from 'lucide-react';

const activityTypes = ['call', 'meeting', 'email', 'note', 'visit'];

export default function CRMCustomerDetail() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({ activity_type: 'note', content: '', next_follow_up: '' });
  const [reminderForm, setReminderForm] = useState({ title: '', remind_at: '' });

  const { data: customer } = useQuery({
    queryKey: ['crm-customer', customerId],
    queryFn: () => fetchCustomerById(customerId!),
    enabled: !!customerId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['crm-activities', customerId],
    queryFn: () => fetchContactActivities(customerId!),
    enabled: !!customerId,
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['crm-reminders', customerId],
    queryFn: () => fetchContactReminders(customerId!),
    enabled: !!customerId,
  });

  const addActivityMutation = useMutation({
    mutationFn: (form: typeof activityForm) =>
      addContactActivity({
        contact_id: customerId!,
        activity_type: form.activity_type,
        content: form.content,
        next_follow_up: form.next_follow_up || null,
        created_by: user?.id,
        tenant_id: tenantId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities', customerId] });
      queryClient.invalidateQueries({ queryKey: ['crm-customer', customerId] });
      setActivityDialogOpen(false);
      setActivityForm({ activity_type: 'note', content: '', next_follow_up: '' });
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const addReminderMutation = useMutation({
    mutationFn: (form: typeof reminderForm) =>
      addContactReminder({
        contact_id: customerId!,
        title: form.title,
        remind_at: new Date(form.remind_at).toISOString(),
        created_by: user?.id,
        tenant_id: tenantId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-reminders', customerId] });
      setReminderDialogOpen(false);
      setReminderForm({ title: '', remind_at: '' });
      toast.success(t('common.success'));
    },
    onError: () => toast.error(t('common.error')),
  });

  const toggleReminderMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      toggleContactReminder(id, completed),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-reminders', customerId] }),
  });

  const activityTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
    call: { icon: Phone, label: t('crm.activityCall'), color: 'text-blue-500' },
    meeting: { icon: User, label: t('crm.activityMeeting'), color: 'text-purple-500' },
    email: { icon: Mail, label: t('crm.activityEmail'), color: 'text-cyan-500' },
    note: { icon: Calendar, label: t('crm.activityNote'), color: 'text-amber-500' },
    visit: { icon: MapPin, label: t('crm.activityVisit'), color: 'text-green-500' },
  };

  const getStatusBadge = (status: string | null) => {
    const config: Record<string, { class: string; label: string }> = {
      new: { class: 'bg-blue-500/10 text-blue-500', label: t('crm.statusNew') },
      contacted: { class: 'bg-cyan-500/10 text-cyan-500', label: t('crm.statusContacted') },
      negotiating: { class: 'bg-amber-500/10 text-amber-500', label: t('crm.statusNegotiating') },
      quoted: { class: 'bg-purple-500/10 text-purple-500', label: t('crm.statusQuoted') },
      signed: { class: 'bg-green-500/10 text-green-500', label: t('crm.statusSigned') },
      lost: { class: 'bg-red-500/10 text-red-500', label: t('crm.statusLost') },
    };
    const c = config[status || 'new'] || config.new;
    return <Badge className={c.class}>{c.label}</Badge>;
  };

  if (!customer) {
    return <MobilePageShell title={t('common.loading')} backTo="/crm/customers"><div className="flex items-center justify-center h-64 text-muted-foreground">{t('common.loading')}</div></MobilePageShell>;
  }

  return (
    <MobilePageShell title={customer.name} backTo="/crm/customers">
      <div className="animate-page-enter space-y-6">
        {/* Info */}
        <div className="flex items-center gap-3 mb-2">
          {getStatusBadge(customer.lead_status)}
          {customer.company_name && <span className="text-sm text-muted-foreground">{customer.company_name}</span>}
        </div>

        {/* Info Cards */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Customer Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">{t('crm.customerInfo')}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                  {customer.whatsapp_number && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(`https://wa.me/${customer.whatsapp_number?.replace(/\D/g, '')}`, '_blank')}>
                      <MessageCircle className="w-4 h-4 text-green-500" />
                    </Button>
                  )}
                </div>
              )}
              {customer.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><span>{customer.email}</span></div>}
              {customer.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /><span>{customer.address}</span></div>}
              {customer.property_address && <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" /><span>{customer.property_address}</span></div>}
              {customer.estimated_budget && (
                <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-muted-foreground" /><span>RM {customer.estimated_budget.toLocaleString()}</span></div>
              )}
              {customer.notes && <p className="text-muted-foreground pt-2 border-t">{customer.notes}</p>}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">{t('crm.activityTimeline')}</CardTitle>
              <Button size="sm" onClick={() => setActivityDialogOpen(true)}>
                <Plus className="w-3 h-3 mr-1" />{t('crm.addActivity')}
              </Button>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">{t('crm.noActivities')}</p>
              ) : (
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
                  {activities.map((a: any) => {
                    const config = activityTypeConfig[a.activity_type] || activityTypeConfig.note;
                    const Icon = config.icon;
                    return (
                      <div key={a.id} className="relative">
                        <div className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-background border-2 border-current ${config.color} flex items-center justify-center`}>
                          <Icon className="w-2.5 h-2.5" />
                        </div>
                        <div className="pb-2">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="outline" className="text-[10px]">{config.label}</Badge>
                            <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), 'yyyy-MM-dd HH:mm')}</span>
                          </div>
                          <p className="text-sm">{a.content}</p>
                          {a.next_follow_up && (
                            <p className="text-xs text-primary mt-1">
                              <Clock className="w-3 h-3 inline mr-1" />{t('crm.nextFollowUp')}: {a.next_follow_up}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reminders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{t('crm.reminders')}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setReminderDialogOpen(true)}>
              <Plus className="w-3 h-3 mr-1" />{t('crm.addReminder')}
            </Button>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">{t('crm.noReminders')}</p>
            ) : (
              <div className="space-y-2">
                {reminders.map((r: any) => (
                  <div key={r.id} className={`flex items-center gap-3 p-2 rounded-lg ${r.is_completed ? 'opacity-50' : ''}`}>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                      onClick={() => toggleReminderMutation.mutate({ id: r.id, completed: !r.is_completed })}
                    >
                      <CheckCircle className={`w-4 h-4 ${r.is_completed ? 'text-success' : 'text-muted-foreground'}`} />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${r.is_completed ? 'line-through' : ''}`}>{r.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(r.remind_at), 'yyyy-MM-dd HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Activity Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('crm.addActivity')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('crm.activityType')}</Label>
              <Select value={activityForm.activity_type} onValueChange={v => setActivityForm(f => ({ ...f, activity_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activityTypes.map(t2 => {
                    const c = activityTypeConfig[t2];
                    return <SelectItem key={t2} value={t2}>{c?.label || t2}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('crm.activityContent')} *</Label>
              <Textarea value={activityForm.content} onChange={e => setActivityForm(f => ({ ...f, content: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>{t('crm.nextFollowUp')}</Label>
              <Input type="date" value={activityForm.next_follow_up} onChange={e => setActivityForm(f => ({ ...f, next_follow_up: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => addActivityMutation.mutate(activityForm)} disabled={!activityForm.content.trim()}>{t('common.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('crm.addReminder')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('crm.reminderTitle')} *</Label>
              <Input value={reminderForm.title} onChange={e => setReminderForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>{t('crm.remindAt')} *</Label>
              <Input type="datetime-local" value={reminderForm.remind_at} onChange={e => setReminderForm(f => ({ ...f, remind_at: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => addReminderMutation.mutate(reminderForm)} disabled={!reminderForm.title.trim() || !reminderForm.remind_at}>{t('common.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MobilePageShell>
  );
}
