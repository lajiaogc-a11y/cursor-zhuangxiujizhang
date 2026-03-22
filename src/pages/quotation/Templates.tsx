import { useState } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTenant } from '@/lib/tenant';
import * as qService from '@/services/quotation.service';

interface Template {
  id: string;
  title: string;
  content: string;
  contentEn: string;
  isDefault: boolean;
  sortOrder: number;
}

export default function TemplatesPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Template> & { id?: string }>({});

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['q_quotation_notes_templates', tenantId],
    queryFn: () => qService.fetchNotesTemplates() as Promise<Template[]>,
    enabled: !!user && !!tenantId,
  });

  const save = useMutation({
    mutationFn: (tpl: Partial<Template> & { id?: string }) => qService.saveNotesTemplate(tpl, user?.id, tenant?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_quotation_notes_templates', tenantId] });
      toast({ title: t('tpl.saved') });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: t('mat.saveFailed'), description: e.message, variant: 'destructive' }),
  });

  const toggleDefault = useMutation({
    mutationFn: ({ id, isDefault }: { id: string; isDefault: boolean }) =>
      qService.toggleTemplateDefault(id, isDefault, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_quotation_notes_templates', tenantId] });
      toast({ title: t('common.success') });
    },
    onError: (e: any) => toast({ title: t('common.error'), description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => qService.deleteNotesTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_quotation_notes_templates', tenantId] });
      toast({ title: t('tpl.deleted') });
      setDeleteId(null);
    },
  });

  const renderMobileCards = () => (
    <div className="space-y-3">
      {templates.map(tpl => (
        <div key={tpl.id} className="border rounded-lg p-3 bg-card">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{tpl.title}</span>
                {tpl.isDefault && <Badge variant="default" className="text-[10px] shrink-0">{t('qt.default')}</Badge>}
              </div>
              {tpl.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.content}</p>}
            </div>
            <div className="flex gap-1 ml-2 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(tpl); setDialogOpen(true); }}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(tpl.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">{t('qt.default')}</span>
            <Switch
              checked={tpl.isDefault}
              onCheckedChange={(checked) => toggleDefault.mutate({ id: tpl.id, isDefault: checked })}
            />
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
            <TableHead>{t('tpl.titleLabel') || '标题'}</TableHead>
            <TableHead>{t('tpl.zhContent')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('tpl.enContent')}</TableHead>
            <TableHead className="w-16">{t('cat.sortOrder')}</TableHead>
            <TableHead className="w-20">{t('qt.default')}</TableHead>
            <TableHead className="w-24">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map(tpl => (
            <TableRow key={tpl.id}>
              <TableCell className="font-medium text-sm">{tpl.title}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{tpl.content}</TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">{tpl.contentEn || '-'}</TableCell>
              <TableCell className="text-sm">{tpl.sortOrder}</TableCell>
              <TableCell>
                <Switch
                  checked={tpl.isDefault}
                  onCheckedChange={(checked) => toggleDefault.mutate({ id: tpl.id, isDefault: checked })}
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(tpl); setDialogOpen(true); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(tpl.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <MobilePageShell title={t('tpl.title')} titleEn={t('tpl.titleEn')} icon={<BookOpen className="w-5 h-5" />} backTo="/quotation"
      headerActions={<Button size="sm" className="h-8 gap-1" onClick={() => { setEditing({}); setDialogOpen(true); }}><Plus className="w-4 h-4" /> {t('common.add')}</Button>}>
      <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4">
        {isLoading ? (
          <AppSectionLoading label={t('common.loading')} compact />
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('tpl.noTemplates')}</p>
          </div>
        ) : isMobile ? renderMobileCards() : renderTable()}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing.id ? t('tpl.editTemplate') : t('tpl.addTemplate')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('tpl.titleLabel') || '标题'}</Label><Input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><Label>{t('tpl.zhContent')}</Label><Textarea value={editing.content || ''} onChange={e => setEditing({ ...editing, content: e.target.value })} rows={4} /></div>
            <div><Label>{t('tpl.enContent')}</Label><Textarea value={editing.contentEn || ''} onChange={e => setEditing({ ...editing, contentEn: e.target.value })} rows={4} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('cat.sortOrder')}</Label><Input type="number" value={editing.sortOrder || 0} onChange={e => setEditing({ ...editing, sortOrder: parseInt(e.target.value) || 0 })} /></div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={editing.isDefault || false}
                  onCheckedChange={(checked) => setEditing({ ...editing, isDefault: checked })}
                />
                <Label>{t('qt.default')}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => save.mutate(editing)} disabled={!editing.title || save.isPending}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle><AlertDialogDescription>{t('tpl.deleteDesc')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && del.mutate(deleteId)}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageShell>
  );
}
