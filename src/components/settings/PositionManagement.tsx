import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Check, X, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useDataRefresh } from '@/hooks/useDataRefresh';
import {
  fetchPositions,
  addPosition,
  updatePosition,
  togglePositionActive,
  deletePosition,
  type Position,
} from '@/services/settings.service';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function PositionManagement() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { refreshAll } = useDataRefresh();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPosition, setNewPosition] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const load = async () => {
    try {
      setPositions(await fetchPositions());
    } catch (e: any) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newPosition.trim()) {
      toast({ title: t('settings.enterPositionName'), variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      await addPosition(newPosition.trim());
      toast({ title: t('common.addSuccess') });
      setNewPosition('');
      load();
      refreshAll();
    } catch (e: any) {
      if (e.code === '23505') {
        toast({ title: t('common.error'), description: t('settings.positionExists'), variant: 'destructive' });
      } else {
        toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
      }
    }
    setAdding(false);
  };

  const handleEdit = async (id: string) => {
    if (!editingName.trim()) {
      toast({ title: t('settings.enterPositionName'), variant: 'destructive' });
      return;
    }
    try {
      await updatePosition(id, editingName.trim());
      toast({ title: t('common.updateSuccess') });
      setEditingId(null);
      load();
      refreshAll();
    } catch (e: any) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await togglePositionActive(id, currentStatus);
      toast({ title: t('common.updateSuccess') });
      load();
      refreshAll();
    } catch (e: any) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePosition(id);
      toast({ title: t('common.deleteSuccess') });
      load();
      refreshAll();
    } catch (e: any) {
      toast({ title: t('common.deleteFailed'), description: e.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.positionManagement')}</CardTitle>
        <CardDescription>{t('settings.positionManagementDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input 
            value={newPosition} 
            onChange={(e) => setNewPosition(e.target.value)}
            placeholder={t('settings.enterPositionName')}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="max-w-xs"
          />
          <Button onClick={handleAdd} disabled={adding}>
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            {t('common.add')}
          </Button>
        </div>
        
        {positions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t('common.noData')}</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.positionName')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map(pos => (
                  <TableRow key={pos.id}>
                    <TableCell>
                      {editingId === pos.id ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            value={editingName} 
                            onChange={(e) => setEditingName(e.target.value)}
                            className="max-w-[200px]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEdit(pos.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(pos.id)}>
                            <Check className="w-4 h-4 text-success" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <span className="font-medium">{pos.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={pos.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleActive(pos.id, pos.is_active)}
                      >
                        {pos.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" size="icon" 
                          onClick={() => { setEditingId(pos.id); setEditingName(pos.name); }}
                          disabled={editingId !== null}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(pos.id)}>{t('common.delete')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
