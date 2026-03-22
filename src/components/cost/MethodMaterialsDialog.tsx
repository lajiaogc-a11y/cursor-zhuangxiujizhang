import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costService } from '@/services';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/lib/tenant';

interface Props {
  methodId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MethodMaterialsDialog({ methodId, open, onOpenChange }: Props) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newMaterialId, setNewMaterialId] = useState('');
  const [quantityPerUnit, setQuantityPerUnit] = useState(1);
  const [pricingUnit, setPricingUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [isAdjustable, setIsAdjustable] = useState(false);
  const [adjustableDesc, setAdjustableDesc] = useState('');
  const [roundingRule, setRoundingRule] = useState('');

  const { data: method } = useQuery({
    queryKey: ['q_method_info', tenantId, methodId],
    queryFn: () => costService.fetchMethodInfo(methodId),
    enabled: !!methodId && open && !!tenantId,
  });

  const { data: methodMaterials = [], isLoading } = useQuery({
    queryKey: ['q_method_materials', tenantId, methodId],
    queryFn: () => costService.fetchMethodMaterials(methodId),
    enabled: !!methodId && open && !!tenantId,
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['q_materials_mm_select', tenantId],
    queryFn: () => costService.fetchMaterialsSelect(),
    enabled: addOpen && !!tenantId,
  });

  const addMaterial = useMutation({
    mutationFn: () => costService.addMethodMaterial(methodId, {
      materialId: newMaterialId, quantityPerUnit, pricingUnit, notes, isAdjustable, adjustableDesc, roundingRule,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_method_materials', tenantId, methodId] });
      queryClient.invalidateQueries({ queryKey: ['q_methods_with_materials_count', tenantId] });
      toast({ title: t('mmd.materialAdded') });
      resetForm();
    },
    onError: (e: any) => toast({ title: t('common.addFailed'), description: e.message, variant: 'destructive' }),
  });

  const deleteMaterial = useMutation({
    mutationFn: (id: string) => costService.deleteMethodMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['q_method_materials', tenantId, methodId] });
      queryClient.invalidateQueries({ queryKey: ['q_methods_with_materials_count', tenantId] });
      toast({ title: t('mmd.deleted') });
    },
  });

  function resetForm() {
    setAddOpen(false);
    setNewMaterialId('');
    setQuantityPerUnit(1);
    setPricingUnit('');
    setNotes('');
    setIsAdjustable(false);
    setAdjustableDesc('');
    setRoundingRule('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {method?.code || ''} - {method?.name || t('mmd.method')} - {t('mmd.materialConfig')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="h-8 gap-1" onClick={() => setAddOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> {t('mmd.addMaterial')}
            </Button>
          </div>

          {isLoading ? (
            <AppSectionLoading label={t('common.loading')} compact />
          ) : methodMaterials.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">{t('mmd.noMaterials')}</p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table compact>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>{t('mmd.methodCode')}</TableHead>
                    <TableHead>{t('mmd.materialCodeCol')}</TableHead>
                    <TableHead>{t('mmd.materialNameCol')}</TableHead>
                    <TableHead>{t('mmd.unitCol')}</TableHead>
                    <TableHead>{t('mmd.pricingUnitCol')}</TableHead>
                    <TableHead className="text-right">{t('mmd.usageCoeff')}</TableHead>
                    <TableHead>{t('mmd.notesCol')}</TableHead>
                    <TableHead>{t('mmd.adjustableCol')}</TableHead>
                    <TableHead>{t('mmd.adjustableDescCol')}</TableHead>
                    <TableHead>{t('mmd.roundingCol')}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {methodMaterials.map((mm: any, idx: number) => (
                    <TableRow key={mm.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{method?.code || '-'}</Badge>
                      </TableCell>
                      <TableCell>{mm.materialCode || '-'}</TableCell>
                      <TableCell className="font-medium">{mm.materialName}</TableCell>
                      <TableCell>{mm.materialUnit || '-'}</TableCell>
                      <TableCell>{mm.pricingUnit || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{mm.quantityPerUnit}</TableCell>
                      <TableCell>
                        {mm.notes ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs max-w-[120px] truncate block">{mm.notes}</span>
                              </TooltipTrigger>
                              <TooltipContent><p className="max-w-xs">{mm.notes}</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mm.isAdjustable ? 'default' : 'secondary'} className="text-[10px]">
                          {mm.isAdjustable ? t('common.yes') : t('common.no')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs max-w-[100px] truncate block">{mm.adjustableDescription || '-'}</span>
                      </TableCell>
                      <TableCell>{mm.roundingRule || '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMaterial.mutate(mm.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {addOpen && (
            <div className="border border-primary/50 rounded-lg p-4 space-y-3 bg-muted/30">
              <h4 className="text-sm font-semibold">{t('mmd.addMaterial')}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t('mat.name')}</Label>
                  <Select value={newMaterialId} onValueChange={setNewMaterialId}>
                    <SelectTrigger className="h-8"><SelectValue placeholder={t('mmd.selectMaterial')} /></SelectTrigger>
                    <SelectContent>{materials.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{t('mmd.pricingUnitCol')}</Label>
                  <Input value={pricingUnit} onChange={e => setPricingUnit(e.target.value)} placeholder={t('mmd.pricingUnitHint')} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">{t('mmd.usageCoeff')}</Label>
                  <Input type="number" min={0} step={0.01} value={quantityPerUnit} onChange={e => setQuantityPerUnit(Number(e.target.value))} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">{t('mmd.notesCol')}</Label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('mmd.notesHint')} className="h-8" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isAdjustable} onCheckedChange={setIsAdjustable} />
                  <Label className="text-xs">{t('mmd.adjustableCol')}</Label>
                </div>
                {isAdjustable && (
                  <div>
                    <Label className="text-xs">{t('mmd.adjustableDescCol')}</Label>
                    <Input value={adjustableDesc} onChange={e => setAdjustableDesc(e.target.value)} className="h-8" />
                  </div>
                )}
                <div>
                  <Label className="text-xs">{t('mmd.roundingCol')}</Label>
                  <Input value={roundingRule} onChange={e => setRoundingRule(e.target.value)} placeholder={t('mmd.roundingHint')} className="h-8" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={resetForm}>{t('common.cancel')}</Button>
                <Button size="sm" className="h-7 text-xs" onClick={() => addMaterial.mutate()} disabled={!newMaterialId || addMaterial.isPending}>{t('common.confirm')}</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
