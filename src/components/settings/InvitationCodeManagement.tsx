import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Key, Copy, Trash2, Plus, Loader2, AlertTriangle, Clock, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchInvitationCodesAndTenants, createInvitationCode, toggleInvitationCode, deleteInvitationCode, type InvitationCode } from '@/services/admin.service';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Tenant { id: string; name: string; }

function generateRandomCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function InvitationCodeManagement() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const zh = language === 'zh';
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [maxUses, setMaxUses] = useState(1);
  const [expiryDays, setExpiryDays] = useState('0');
  const [note, setNote] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const fetchData = async () => {
    const result = await fetchInvitationCodesAndTenants();
    setCodes(result.codes);
    setTenants(result.tenants);
    if (result.tenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(result.tenants[0].id);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getTenantName = (tenantId: string) => {
    return tenants.find(t => t.id === tenantId)?.name || tenantId.slice(0, 8);
  };

  const handleGenerate = async () => {
    if (!user || !selectedTenantId) return;
    setGenerating(true);
    try {
      const code = generateRandomCode();
      const expiresAt = expiryDays !== '0'
        ? new Date(Date.now() + parseInt(expiryDays) * 86400000).toISOString()
        : null;
      await createInvitationCode({
        code,
        created_by: user.id,
        max_uses: maxUses,
        expires_at: expiresAt,
        note: note.trim() || null,
        tenant_id: selectedTenantId,
      });
      toast({ title: t('invite.generated') });
      setNote('');
      setMaxUses(1);
      setExpiryDays('0');
      fetchData();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await toggleInvitationCode(id, currentActive);
      toast({ title: t('invite.statusUpdated') });
      fetchData();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInvitationCode(id);
      toast({ title: t('invite.deleted') });
      fetchData();
    } catch {}
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: t('invite.copySuccess') });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          {t('invite.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generate Form */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end border rounded-lg p-4 bg-muted/30">
          <div className="space-y-1">
            <Label className="text-xs">{zh ? '所属公司' : 'Company'}</Label>
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger>
                <SelectValue placeholder={zh ? '选择公司' : 'Select company'} />
              </SelectTrigger>
              <SelectContent>
                {tenants.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                      {t.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('invite.maxUses')}</Label>
            <Input type="number" min={1} max={100} value={maxUses} onChange={e => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('invite.expiryDays')}</Label>
            <Select value={expiryDays} onValueChange={setExpiryDays}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('invite.noExpiryOption')}</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="7">7</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="90">90</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('invite.note')}</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder={t('invite.note')} maxLength={100} />
          </div>
          <Button onClick={handleGenerate} disabled={generating || !selectedTenantId} className="h-10">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {t('invite.generate')}
          </Button>
        </div>

        {/* Expiration Warning Banner */}
        {(() => {
          const now = new Date();
          const soonThreshold = new Date(now.getTime() + 3 * 86400000);
          const expiringSoon = codes.filter(c => c.is_active && c.expires_at && new Date(c.expires_at) > now && new Date(c.expires_at) <= soonThreshold && c.used_count < c.max_uses);
          if (expiringSoon.length === 0) return null;
          return (
            <Alert variant="destructive" className="border-orange-300 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300">
              <AlertTriangle className="h-4 w-4 !text-orange-600" />
              <AlertDescription className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 inline" />
                <span>{expiringSoon.length} {t('invite.expiringSoonMsg')}: {expiringSoon.map(c => c.code).join(', ')}</span>
              </AlertDescription>
            </Alert>
          );
        })()}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : codes.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">{t('invite.noData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invite.code')}</TableHead>
                  <TableHead>{zh ? '所属公司' : 'Company'}</TableHead>
                  <TableHead>{t('invite.note')}</TableHead>
                  <TableHead className="text-center">{t('invite.maxUses')}</TableHead>
                  <TableHead className="text-center">{t('invite.usedCount')}</TableHead>
                  <TableHead>{t('invite.expiry')}</TableHead>
                  <TableHead className="text-center">{t('invite.status')}</TableHead>
                  <TableHead>{t('invite.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map(c => {
                  const now = new Date();
                  const isExpired = c.expires_at && new Date(c.expires_at) < now;
                  const isUsedUp = c.used_count >= c.max_uses;
                  const isExpiringSoon = c.is_active && c.expires_at && !isExpired && new Date(c.expires_at).getTime() - now.getTime() < 3 * 86400000;
                  const hoursLeft = c.expires_at && !isExpired ? Math.max(0, Math.round((new Date(c.expires_at).getTime() - now.getTime()) / 3600000)) : null;
                  return (
                    <TableRow key={c.id} className={(!c.is_active || isExpired || isUsedUp) ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{c.code}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(c.code)}><Copy className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] gap-1"><Building2 className="w-2.5 h-2.5" />{getTenantName(c.tenant_id)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">{c.note || '-'}</TableCell>
                      <TableCell className="text-center">{c.max_uses}</TableCell>
                      <TableCell className="text-center">{c.used_count}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          {c.expires_at ? (
                            <>
                              <span className={isExpiringSoon ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>{format(new Date(c.expires_at), 'yyyy-MM-dd HH:mm')}</span>
                              {isExpiringSoon && hoursLeft !== null && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-orange-400 text-orange-600 dark:text-orange-400">
                                  {hoursLeft < 24 ? `${hoursLeft}h` : `${Math.ceil(hoursLeft / 24)}d`}
                                </Badge>
                              )}
                              {isExpired && <Badge variant="destructive" className="text-[10px] px-1 py-0">{t('invite.expired')}</Badge>}
                            </>
                          ) : t('invite.noExpiry')}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={c.is_active && !isExpired && !isUsedUp ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => handleToggle(c.id, c.is_active)}>
                          {c.is_active && !isExpired && !isUsedUp ? t('invite.active') : t('invite.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('invite.delete')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('invite.confirmDelete')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(c.id)}>{t('common.confirm')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
  );
}
