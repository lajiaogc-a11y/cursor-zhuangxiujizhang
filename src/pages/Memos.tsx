import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Bell, Trash2, Edit2, Clock, CheckCircle2, 
  Calendar, AlertCircle, StickyNote, Search
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidationMap, invalidateQueriesWithTenant } from '@/lib/queryKeys';
import { AppSectionLoading, ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { useTenant } from '@/lib/tenant';
import * as memosService from '@/services/memos.service';

type Memo = memosService.Memo;

export default function Memos() {
  const { t } = useI18n();
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission('feature.edit');
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [reminderTime, setReminderTime] = useState('');

  const { data: memos = [], isLoading } = useQuery({
    queryKey: [...queryKeys.memos, tenantId],
    queryFn: () => memosService.fetchMemos(tenantId!),
    enabled: !!tenantId,
  });

  const invalidateMemos = () => {
    invalidateQueriesWithTenant(queryClient, tenantId, invalidationMap.memoMutation);
  };

  const saveMut = useMutation({
    mutationFn: (vars: { title: string; content: string; reminderTime: string; editId?: string }) =>
      memosService.saveMemo(
        {
          title: vars.title.trim(),
          content: vars.content.trim() || null,
          reminder_time: vars.reminderTime ? new Date(vars.reminderTime).toISOString() : null,
        },
        user?.id,
        vars.editId,
      ),
    onSuccess: (_, vars) => {
      setFormOpen(false);
      invalidateMemos();
      toast.success(vars.editId ? t('common.updateSuccess') : t('common.addSuccess'));
    },
    onError: (e: any) => toast.error(e.message || t('common.error')),
  });

  const handleOpenForm = (memo?: Memo) => {
    if (memo) {
      setEditingMemo(memo);
      setTitle(memo.title);
      setContent(memo.content || '');
      setReminderTime(memo.reminder_time ? format(new Date(memo.reminder_time), "yyyy-MM-dd'T'HH:mm") : '');
    } else {
      setEditingMemo(null);
      setTitle('');
      setContent('');
      setReminderTime('');
    }
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!title.trim()) { toast.error(t('memos.titleRequired')); return; }
    saveMut.mutate({ title, content, reminderTime, editId: editingMemo?.id });
  };

  const handleToggleComplete = async (memo: Memo) => {
    try {
      await memosService.toggleMemoComplete(memo.id, memo.is_completed);
      invalidateMemos();
    } catch { toast.error(t('common.error')); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.deleteWarning'))) return;
    try {
      await memosService.deleteMemo(id);
      toast.success(t('common.deleteSuccess'));
      invalidateMemos();
    } catch { toast.error(t('common.deleteFailed')); }
  };

  const getReminderStatus = (reminderTime: string | null, isCompleted: boolean) => {
    if (!reminderTime || isCompleted) return null;
    const date = new Date(reminderTime);
    if (isPast(date)) return { label: t('memos.overdue'), variant: 'destructive' as const };
    if (isToday(date)) return { label: t('memos.today'), variant: 'default' as const };
    if (isTomorrow(date)) return { label: t('memos.tomorrow'), variant: 'secondary' as const };
    return null;
  };

  const filteredMemos = useMemo(() => {
    if (!searchTerm) return memos;
    const kw = searchTerm.toLowerCase();
    return memos.filter(memo =>
      memo.title.toLowerCase().includes(kw) ||
      (memo.content || '').toLowerCase().includes(kw)
    );
  }, [memos, searchTerm]);

  const pendingReminders = memos.filter(m => !m.is_completed && m.reminder_time && isPast(new Date(m.reminder_time))).length;
  const todayReminders = memos.filter(m => !m.is_completed && m.reminder_time && isToday(new Date(m.reminder_time))).length;
  const activeRemindersCount = pendingReminders + todayReminders;

  return (
    <MainLayout>
      <div className="animate-fade-in space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {activeRemindersCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {activeRemindersCount} {t('memos.pendingReminders')}
              </Badge>
            )}
          </div>
          {canEdit && (
            <Button onClick={() => handleOpenForm()}>
              <Plus className="w-4 h-4 mr-2" />
              {t('memos.newMemo')}
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t('memos.searchPlaceholder')} className="pl-9" />
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <Card><CardContent className="p-3 md:pt-4">
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-1"><StickyNote className="w-3.5 h-3.5 md:w-4 md:h-4" />{t('memos.totalMemos')}</div>
            <div className="text-lg md:text-2xl font-bold">{memos.length}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 md:pt-4">
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-1"><Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-warning" />{t('memos.pending')}</div>
            <div className="text-lg md:text-2xl font-bold text-warning">{memos.filter(m => !m.is_completed).length}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 md:pt-4">
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-1"><CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-success" />{t('memos.completed')}</div>
            <div className="text-lg md:text-2xl font-bold text-success">{memos.filter(m => m.is_completed).length}</div>
          </CardContent></Card>
        </div>

        {isLoading ? (
          <AppSectionLoading label={t('common.loading')} className="min-h-[min(40dvh,20rem)]" />
        ) : filteredMemos.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <StickyNote className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">{t('memos.noMemos')}</p>
            <p>{t('memos.noMemosHint')}</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMemos.map((memo) => {
              const status = getReminderStatus(memo.reminder_time, memo.is_completed);
              return (
                <Card key={memo.id} className={`transition-all ${memo.is_completed ? 'opacity-60' : ''} ${status?.variant === 'destructive' ? 'border-destructive/50' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Checkbox checked={memo.is_completed} onCheckedChange={() => handleToggleComplete(memo)} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className={`text-base ${memo.is_completed ? 'line-through text-muted-foreground' : ''}`}>{memo.title}</CardTitle>
                          {status && (<Badge variant={status.variant} className="mt-1 text-xs"><AlertCircle className="w-3 h-3 mr-1" />{status.label}</Badge>)}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenForm(memo)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(memo.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {memo.content && <p className="text-sm text-muted-foreground mb-2 line-clamp-3">{memo.content}</p>}
                    {memo.reminder_time && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Bell className="w-3 h-3" />{format(new Date(memo.reminder_time), 'yyyy-MM-dd HH:mm')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingMemo ? t('memos.editMemo') : t('memos.newMemo')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{t('memos.memoTitle')}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('memos.titlePlaceholder')} /></div>
              <div><Label>{t('memos.memoContent')}</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={t('memos.contentPlaceholder')} rows={4} /></div>
              <div>
                <Label className="flex items-center gap-2"><Bell className="w-4 h-4" />{t('memos.reminderTime')}</Label>
                <Input type="datetime-local" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">{t('memos.reminderNote')}</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleSave} disabled={saveMut.isPending}>
                  {saveMut.isPending && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
