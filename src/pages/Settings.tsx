import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tags, FolderKanban, Image, Briefcase, Database, CalendarCheck } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CategoryManagement } from '@/components/settings/CategoryManagement';
import { ProjectCategoryManagement } from '@/components/settings/ProjectCategoryManagement';
import { PositionManagement } from '@/components/settings/PositionManagement';
import { ReceiptManagement } from '@/components/settings/ReceiptManagement';
import { DataConsistencyCheck } from '@/components/settings/DataConsistencyCheck';
import { AccountingPeriodManagement } from '@/components/settings/AccountingPeriodManagement';
import { useAuth } from '@/lib/auth';
import { checkIsAdmin } from '@/services/settings.service';
import { useI18n } from '@/lib/i18n';

export default function Settings() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkIsAdmin(user.id).then(setIsAdmin);
  }, [user]);

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-4">

        <Tabs defaultValue={tabFromUrl || "categories"} className="w-full">
          <TabsList className="overflow-x-auto whitespace-nowrap flex w-full h-auto gap-1">
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild>
                <TabsTrigger value="categories" className="flex items-center gap-2">
                  <Tags className="w-4 h-4" />
                  {!isMobile && t('settings.categories')}
                </TabsTrigger>
              </TooltipTrigger>{isMobile && <TooltipContent>{t('settings.categories')}</TooltipContent>}</Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <TabsTrigger value="project-categories" className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  {!isMobile && t('settings.projectCategories')}
                </TabsTrigger>
              </TooltipTrigger>{isMobile && <TooltipContent>{t('settings.projectCategories')}</TooltipContent>}</Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <TabsTrigger value="positions" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  {!isMobile && t('settings.positions')}
                </TabsTrigger>
              </TooltipTrigger>{isMobile && <TooltipContent>{t('settings.positions')}</TooltipContent>}</Tooltip>
              {isAdmin && (
                <Tooltip><TooltipTrigger asChild>
                  <TabsTrigger value="receipts" className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    {!isMobile && t('receipt.management')}
                  </TabsTrigger>
                </TooltipTrigger>{isMobile && <TooltipContent>{t('receipt.management')}</TooltipContent>}</Tooltip>
              )}
              {isAdmin && (
                <Tooltip><TooltipTrigger asChild>
                  <TabsTrigger value="data-check" className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    {!isMobile && t('settings.dataCheck')}
                  </TabsTrigger>
                </TooltipTrigger>{isMobile && <TooltipContent>{t('settings.dataCheck')}</TooltipContent>}</Tooltip>
              )}
              {isAdmin && (
                <Tooltip><TooltipTrigger asChild>
                  <TabsTrigger value="accounting-periods" className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4" />
                    {!isMobile && t('accounting.periodManagement')}
                  </TabsTrigger>
                </TooltipTrigger>{isMobile && <TooltipContent>{t('accounting.periodManagement')}</TooltipContent>}</Tooltip>
              )}
            </TooltipProvider>
          </TabsList>

          <TabsContent value="categories" className="mt-6">
            <CategoryManagement />
          </TabsContent>

          <TabsContent value="project-categories" className="mt-6">
            <ProjectCategoryManagement />
          </TabsContent>

          <TabsContent value="positions" className="mt-6">
            <PositionManagement />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="receipts" className="mt-6">
              <ReceiptManagement />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="data-check" className="mt-6">
              <DataConsistencyCheck />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="accounting-periods" className="mt-6">
              <AccountingPeriodManagement />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}