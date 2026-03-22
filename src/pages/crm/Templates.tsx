import { useState } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { AppSectionLoading, ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { useI18n } from '@/lib/i18n';
import { useTenant } from '@/lib/tenant';
import { crmService } from '@/services';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, FileText, Copy, Tag } from 'lucide-react';

const DEFAULT_MERGE_FIELDS = [
  '{{customer_name}}', '{{customer_phone}}', '{{customer_email}}', '{{customer_address}}',
  '{{project_name}}', '{{project_address}}', '{{contract_number}}', '{{contract_date}}',
  '{{total_amount}}', '{{currency}}', '{{company_name}}', '{{company_address}}',
];

export default function CRMTemplates() {
  const { t } = useI18n();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', content: '', merge_fields: [] as string[] });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['contract_templates', tenantId],
    queryFn: () => crmService.fetchTemplates(tenantId!),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      await crmService.saveTemplate(tenantId!, values, editing?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_templates', tenantId] });
      setShowDialog(false);
      setEditing(null);
      toast.success(editing ? t('common.updateSuccess') : t('common.createSuccess'));
    },
    onError: () => toast.error(t('common.operationFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_templates', tenantId] });
      toast.success(t('common.deleteSuccess'));
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', description: '', content: '', merge_fields: [] });
    setShowDialog(true);
  };

  const openEdit = (tpl: any) => {
    setEditing(tpl);
    setForm({ name: tpl.name, description: tpl.description || '', content: tpl.content, merge_fields: tpl.merge_fields });
    setShowDialog(true);
  };

  const toggleField = (field: string) => {
    setForm(prev => ({
      ...prev,
      merge_fields: prev.merge_fields.includes(field)
        ? prev.merge_fields.filter(f => f !== field)
        : [...prev.merge_fields, field],
    }));
  };

  const insertField = (field: string) => {
    setForm(prev => ({ ...prev, content: prev.content + ' ' + field }));
    if (!form.merge_fields.includes(field)) toggleField(field);
  };

  const usedFields = (content: string) => {
    const matches = content.match(/\{\{[^}]+\}\}/g);
    return matches ? [...new Set(matches)] : [];
  };

  return (
    <MobilePageShell title={t('crm.contractTemplates')} backTo="/crm">
      <div className="animate-page-enter space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">{t('crm.contractTemplates')}</h1>
          <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />{t('crm.newTemplate')}</Button>
        </div>

        {isLoading ? (
          <AppSectionLoading label={t('common.loading')} compact />
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">{t('crm.noTemplates')}</p>
              <p className="text-sm mb-4">{t('crm.noTemplatesDesc')}</p>
              <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />{t('crm.newTemplate')}</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(tpl => (
              <Card key={tpl.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                    <Badge variant={tpl.is_active ? 'default' : 'secondary'}>
                      {tpl.is_active ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </div>
                  {tpl.description && <p className="text-sm text-muted-foreground mt-1">{tpl.description}</p>}
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {usedFields(tpl.content).map(f => (
                      <Badge key={f} variant="outline" className="text-xs"><Tag className="w-3 h-3 mr-1" />{f}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{tpl.content.substring(0, 200)}...</p>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(tpl)}><Edit className="w-3 h-3 mr-1" />{t('common.edit')}</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => {
                      if (confirm(t('common.confirmDelete'))) deleteMutation.mutate(tpl.id);
                    }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? t('crm.editTemplate') : t('crm.newTemplate')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>{t('crm.templateName')}</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label>{t('common.description')}</Label>
                  <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">{t('crm.mergeFields')}</Label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {DEFAULT_MERGE_FIELDS.map(field => (
                    <Badge
                      key={field}
                      variant={form.merge_fields.includes(field) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => insertField(field)}
                    >
                      <Copy className="w-3 h-3 mr-1" />{field}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>{t('crm.templateContent')}</Label>
                <Textarea
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  rows={12}
                  placeholder={t('crm.templateContentPlaceholder')}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
                <Button
                  onClick={() => saveMutation.mutate(form)}
                  disabled={!form.name || !form.content || saveMutation.isPending}
                >
                  {saveMutation.isPending && <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />}
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MobilePageShell>
  );
}
