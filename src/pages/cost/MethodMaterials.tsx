import { useState } from 'react';
import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { Link2, Search, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';
import { useQuery } from '@tanstack/react-query';
import { costService } from '@/services';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { MethodMaterialsDialog } from '@/components/cost/MethodMaterialsDialog';
import { useI18n } from '@/lib/i18n';

export default function MethodMaterialsPage() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['q_methods_with_materials_count', tenantId],
    queryFn: () => costService.fetchMethodsWithMaterialCounts(),
    enabled: !!user && !!tenantId,
  });

  const filtered = methods.filter((m: any) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <MobilePageShell title={t('cost.methodMaterials')} icon={<Link2 className="w-5 h-5" />} backTo="/cost">
      <div className="container mx-auto px-4 py-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="搜索工法..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>

        <p className="text-xs text-muted-foreground mb-3">为每种工法配置所需的材料清单和用量系数，点击工法查看详情。</p>

        {isLoading ? (
          <AppSectionLoading label={t('common.loading')} compact />
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">暂无工法数据</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((m: any) => (
              <Card key={m.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedMethodId(m.id)}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{m.name}</p>
                      {!m.isActive && <Badge variant="outline" className="text-[10px]">停用</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{m.materialCount} 种材料</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedMethodId && (
        <MethodMaterialsDialog
          methodId={selectedMethodId}
          open={!!selectedMethodId}
          onOpenChange={open => { if (!open) setSelectedMethodId(null); }}
        />
      )}
    </MobilePageShell>
  );
}
