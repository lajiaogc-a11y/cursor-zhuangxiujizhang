import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllAnnouncements, createAnnouncement, toggleAnnouncement, deleteAnnouncement } from '@/services/admin.service';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Megaphone, Plus, Trash2, Info, AlertTriangle, Wrench, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { toast } from 'sonner';

const typeConfig = {
  info: { icon: Info, color: 'text-primary', bg: 'bg-primary/5 border-primary/20', label: { zh: '通知', en: 'Info' } },
  warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/5 border-warning/20', label: { zh: '警告', en: 'Warning' } },
  maintenance: { icon: Wrench, color: 'text-muted-foreground', bg: 'bg-muted/50 border-muted', label: { zh: '维护', en: 'Maintenance' } },
  update: { icon: Sparkles, color: 'text-success', bg: 'bg-success/5 border-success/20', label: { zh: '更新', en: 'Update' } },
};

export function SystemAnnouncements() {
  const { language } = useI18n();
  const { user } = useAuth();
  const zh = language === 'zh';
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', announcement_type: 'info', ends_at: '' });

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['system-announcements-admin'],
    queryFn: fetchAllAnnouncements,
  });

  const createMutation = useMutation({
    mutationFn: () => createAnnouncement({
      title: form.title,
      content: form.content,
      announcement_type: form.announcement_type,
      ends_at: form.ends_at || null,
      created_by: user?.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-announcements-admin'] });
      setShowCreate(false);
      setForm({ title: '', content: '', announcement_type: 'info', ends_at: '' });
      toast.success(zh ? '公告已发布' : 'Announcement published');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => toggleAnnouncement(id, is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-announcements-admin'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-announcements-admin'] });
      toast.success(zh ? '已删除' : 'Deleted');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">{zh ? '系统公告管理' : 'System Announcements'}</span>
          <Badge variant="secondary" className="text-[10px]">{announcements.length}</Badge>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          {zh ? '发布公告' : 'New'}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">{zh ? '加载中...' : 'Loading...'}</p>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Megaphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{zh ? '暂无公告' : 'No announcements'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a: any) => {
            const cfg = typeConfig[a.announcement_type as keyof typeof typeConfig] || typeConfig.info;
            const Icon = cfg.icon;
            return (
              <Card key={a.id} className={`border ${cfg.bg}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.color}`} />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{a.title}</p>
                          <Badge variant="outline" className="text-[10px]">{zh ? cfg.label.zh : cfg.label.en}</Badge>
                          {!a.is_active && <Badge variant="secondary" className="text-[10px]">{zh ? '已下架' : 'Hidden'}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(a.created_at), 'yyyy-MM-dd HH:mm')}
                          {a.ends_at && ` → ${format(new Date(a.ends_at), 'yyyy-MM-dd HH:mm')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={a.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: a.id, is_active: checked })} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(a.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{zh ? '发布系统公告' : 'Create Announcement'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{zh ? '标题' : 'Title'}</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{zh ? '内容' : 'Content'}</Label>
              <Textarea rows={4} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{zh ? '类型' : 'Type'}</Label>
              <Select value={form.announcement_type} onValueChange={v => setForm(f => ({ ...f, announcement_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">{zh ? '通知' : 'Info'}</SelectItem>
                  <SelectItem value="warning">{zh ? '警告' : 'Warning'}</SelectItem>
                  <SelectItem value="maintenance">{zh ? '维护' : 'Maintenance'}</SelectItem>
                  <SelectItem value="update">{zh ? '更新' : 'Update'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{zh ? '结束时间（可选）' : 'End Date (optional)'}</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{zh ? '取消' : 'Cancel'}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!form.title || !form.content || createMutation.isPending}>
              {zh ? '发布' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
