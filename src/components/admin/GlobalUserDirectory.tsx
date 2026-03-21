import { useQuery } from '@tanstack/react-query';
import { fetchGlobalUserDirectory, type TenantGroup, type TenantMember } from '@/services/admin.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, Crown, Shield, User, ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function GlobalUserDirectory() {
  const { language } = useI18n();
  const zh = language === 'zh';
  const [search, setSearch] = useState('');
  const [openTenants, setOpenTenants] = useState<Set<string>>(new Set());

  const { data: tenantGroups = [], isLoading } = useQuery({
    queryKey: ['global-user-directory-hierarchical'],
    queryFn: fetchGlobalUserDirectory,
    refetchInterval: 60000,
  });

  const filtered = useMemo(() => {
    if (!search) return tenantGroups;
    const q = search.toLowerCase();
    return tenantGroups.filter(g =>
      g.tenant_name.toLowerCase().includes(q) ||
      g.owner?.email?.toLowerCase().includes(q) ||
      g.owner?.display_name?.toLowerCase().includes(q) ||
      g.owner?.username.toLowerCase().includes(q) ||
      g.members.some(m =>
        m.email?.toLowerCase().includes(q) ||
        m.display_name?.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q)
      )
    );
  }, [tenantGroups, search]);

  const stats = useMemo(() => {
    const totalTenants = tenantGroups.length;
    const totalUsers = tenantGroups.reduce((sum, g) => sum + (g.owner ? 1 : 0) + g.members.length, 0);
    return { totalTenants, totalUsers };
  }, [tenantGroups]);

  const toggleTenant = (tenantId: string) => {
    setOpenTenants(prev => {
      const next = new Set(prev);
      if (next.has(tenantId)) next.delete(tenantId);
      else next.add(tenantId);
      return next;
    });
  };

  const roleBadge = (role: string) => {
    const variant = role === 'owner' ? 'default' : role === 'admin' ? 'secondary' : 'outline';
    const label = role === 'owner' ? (zh ? '拥有者' : 'Owner')
      : role === 'admin' ? (zh ? '管理员' : 'Admin')
      : role === 'member' ? (zh ? '成员' : 'Member')
      : role;
    return <Badge variant={variant} className="text-[10px]">{label}</Badge>;
  };

  const systemRoleBadge = (role: string) => {
    const variant = role === 'admin' ? 'default' : role === 'accountant' ? 'secondary' : 'outline';
    return <Badge variant={variant} className="text-[10px]">{role}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-2xl font-bold">{stats.totalTenants}</p>
          <p className="text-xs text-muted-foreground">{zh ? '业务租户' : 'Business Tenants'}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-2xl font-bold text-primary">{stats.totalUsers}</p>
          <p className="text-xs text-muted-foreground">{zh ? '总用户数' : 'Total Users'}</p>
        </CardContent></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={zh ? '搜索租户、用户、邮箱...' : 'Search tenants, users, emails...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Tenant-grouped directory */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            {zh ? '全局用户目录' : 'Global User Directory'}
            <Badge variant="secondary" className="text-[10px] ml-2">
              {filtered.length} {zh ? '个租户' : 'tenants'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">{zh ? '加载中...' : 'Loading...'}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{zh ? '暂无数据' : 'No data'}</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(group => {
                const isOpen = openTenants.has(group.tenant_id);
                const hasMembers = group.members.length > 0;

                return (
                  <Collapsible key={group.tenant_id} open={isOpen} onOpenChange={() => toggleTenant(group.tenant_id)}>
                    <div className="rounded-lg border bg-card">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {hasMembers ? (
                              isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                            ) : (
                              <div className="w-4" />
                            )}
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{group.tenant_name}</span>
                              {hasMembers && (
                                <Badge variant="outline" className="text-[10px]">
                                  {group.members.length + (group.owner ? 1 : 0)} {zh ? '人' : 'users'}
                                </Badge>
                              )}
                            </div>
                            {group.owner && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="text-xs text-muted-foreground truncate">
                                  {group.owner.display_name || group.owner.username}
                                </span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground truncate">{group.owner.email}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {group.owner && systemRoleBadge(group.owner.system_role)}
                            {group.owner && (
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(group.owner.created_at), 'yyyy-MM-dd')}
                              </span>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        {group.members.length > 0 && (
                          <div className="border-t">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/30">
                                  <TableHead className="text-xs">{zh ? '成员' : 'Member'}</TableHead>
                                  <TableHead className="text-xs">{zh ? '邮箱' : 'Email'}</TableHead>
                                  <TableHead className="text-xs">{zh ? '租户角色' : 'Tenant Role'}</TableHead>
                                  <TableHead className="text-xs">{zh ? '系统角色' : 'System Role'}</TableHead>
                                  <TableHead className="text-xs">{zh ? '注册时间' : 'Registered'}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.members.map(m => (
                                  <TableRow key={m.user_id}>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <User className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-sm">{m.display_name || m.username}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-sm">{m.email || '-'}</TableCell>
                                    <TableCell>{roleBadge(m.tenant_role)}</TableCell>
                                    <TableCell>{systemRoleBadge(m.system_role)}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {format(new Date(m.created_at), 'yyyy-MM-dd')}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                        {group.members.length === 0 && (
                          <div className="border-t px-4 py-3">
                            <p className="text-xs text-muted-foreground text-center">
                              {zh ? '该租户暂无其他成员' : 'No other members in this tenant'}
                            </p>
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
