import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Building2, Plus, Search, Eye, TrendingUp, TrendingDown, Wallet, Clock,
  CheckCircle, PauseCircle, Receipt, X, MoreVertical, BarChart3, Table2,
  DollarSign, ArrowUpRight, ArrowDownRight, Scale
} from 'lucide-react';
import { formatCompact } from '@/lib/formatCurrency';
import { EmptyState } from '@/components/ui/empty-state';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { ProjectList } from '@/components/projects/ProjectList';
import { CurrencyStatsPanel, calculateCurrencyStats } from '@/components/ui/currency-stats-panel';
import { useI18n } from '@/lib/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { queryKeys } from '@/lib/queryKeys';
import { useTenant } from '@/lib/tenant';
import { useProjectsWithTransactions } from '@/hooks/useProjectService';
import { AppSectionLoading } from '@/components/layout/AppChromeLoading';

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  customer_name: string;
  project_manager?: string | null;
  contract_currency: string;
  contract_amount: number;
  contract_amount_myr: number;
  status: string;
  sign_date: string;
  delivery_date: string | null;
  total_income_myr: number | null;
  total_addition_myr?: number | null;
  total_material_myr?: number | null;
  total_labor_myr?: number | null;
  total_other_expense_myr?: number | null;
  total_expense_myr?: number | null;
  net_profit_myr?: number | null;
}

export default function Projects() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('feature.edit');
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('overview');

  const [managerFilter, setManagerFilter] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  const { tenant } = useTenant();
  const tenantId = tenant?.id;

  const { data: projectsQueryData, isLoading: loading } = useProjectsWithTransactions(tenantId, statusFilter);

  const projects = projectsQueryData?.projects || [];
  const projectTransactionTotals = projectsQueryData?.totalsMap || new Map<string, { income: number; expense: number }>();
  const allProjectTransactions = projectsQueryData?.allTx || [];

  useEffect(() => {
    if (selectedProjectId) {
      navigate(`/projects/${selectedProjectId}/financials`);
      setSelectedProjectId('');
    }
  }, [selectedProjectId, navigate]);

  const filteredProjects = projects.filter(p => {
    const matchesSearch =
      p.project_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customer_name.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesDateRange = true;
    if (dateRange?.from || dateRange?.to) {
      const signDate = new Date(p.sign_date);
      if (dateRange?.from && signDate < dateRange.from) matchesDateRange = false;
      if (dateRange?.to) {
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        if (signDate > endDate) matchesDateRange = false;
      }
    }

    const matchesManager = !managerFilter ||
      (p.project_manager && p.project_manager.toLowerCase().includes(managerFilter.toLowerCase()));
    const matchesCustomer = !customerFilter ||
      p.customer_name.toLowerCase().includes(customerFilter.toLowerCase());

    let matchesAmount = true;
    const contractAmount = p.contract_amount_myr || 0;
    if (minAmount && contractAmount < parseFloat(minAmount)) matchesAmount = false;
    if (maxAmount && contractAmount > parseFloat(maxAmount)) matchesAmount = false;

    return matchesSearch && matchesDateRange && matchesManager && matchesCustomer && matchesAmount;
  });

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleViewPayments = (project: Project) => navigate(`/projects/${project.id}/financials`);
  const handleViewFinancials = (project: Project) => navigate(`/projects/${project.id}/financials`);

  const calculateTotalReceived = () => {
    let total = 0;
    projects.forEach(project => {
      const txTotals = projectTransactionTotals.get(project.id) || { income: 0, expense: 0 };
      total += txTotals.income;
    });
    return total;
  };

  const calculateTotalExpense = () => {
    let total = 0;
    projects.forEach(project => {
      const txTotals = projectTransactionTotals.get(project.id) || { income: 0, expense: 0 };
      total += txTotals.expense;
    });
    return total;
  };

  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    paused: projects.filter(p => p.status === 'paused').length,
    totalContract: projects.reduce((sum, p) => sum + (p.contract_amount_myr || 0), 0),
    totalAddition: projects.reduce((sum, p) => sum + (p.total_addition_myr || 0), 0),
    totalReceived: calculateTotalReceived(),
    totalExpense: calculateTotalExpense(),
    totalPending: projects.reduce((sum, p) => {
      const contractAmount = p.contract_amount_myr || 0;
      const additionAmount = p.total_addition_myr || 0;
      const total = contractAmount + additionAmount;
      const txTotals = projectTransactionTotals.get(p.id) || { income: 0, expense: 0 };
      const received = txTotals.income;
      const pending = (contractAmount === 0 && additionAmount === 0) ? 0 : Math.max(0, total - received);
      return sum + pending;
    }, 0),
    totalProfit: 0,
  };
  stats.totalProfit = stats.totalReceived - stats.totalExpense;

  const projectCurrencyStats = useMemo(() => {
    return calculateCurrencyStats(allProjectTransactions);
  }, [allProjectTransactions]);

  const formatMoney = (amount: number) =>
    `RM ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Status count cards data
  const statusCards = [
    { key: 'all', label: t('projects.totalProjects'), value: stats.total, icon: Building2, color: 'text-primary', bgColor: 'bg-primary/10', borderColor: 'border-primary/20' },
    { key: 'in_progress', label: t('projects.inProgress'), value: stats.inProgress, icon: Clock, color: 'text-info', bgColor: 'bg-info/10', borderColor: 'border-info/20' },
    { key: 'completed', label: t('projects.completed'), value: stats.completed, icon: CheckCircle, color: 'text-success', bgColor: 'bg-success/10', borderColor: 'border-success/20' },
    { key: 'paused', label: t('projects.paused'), value: stats.paused, icon: PauseCircle, color: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-warning/20' },
  ];

  // Financial summary cards
  const financeCards = [
    {
      label: t('projects.contractAmount'),
      value: formatMoney(stats.totalContract),
      desc: t('projects.allContracts'),
      icon: Wallet,
      color: 'text-primary',
      bgGradient: 'from-primary/10 to-primary/5',
    },
    {
      label: t('projects.additionAmount'),
      value: formatMoney(stats.totalAddition),
      desc: t('projects.allAdditions'),
      icon: ArrowUpRight,
      color: 'text-accent',
      bgGradient: 'from-accent/10 to-accent/5',
    },
    {
      label: t('projects.totalReceived'),
      value: formatMoney(stats.totalReceived),
      desc: t('projects.allReceived'),
      icon: TrendingUp,
      color: 'text-success',
      bgGradient: 'from-success/10 to-success/5',
    },
    {
      label: t('projects.totalPending'),
      value: formatMoney(stats.totalPending),
      desc: t('projects.totalMinusReceived'),
      icon: ArrowDownRight,
      color: 'text-warning',
      bgGradient: 'from-warning/10 to-warning/5',
    },
    {
      label: t('projects.totalExpense'),
      value: formatMoney(stats.totalExpense),
      desc: t('projects.allExpenses'),
      icon: Receipt,
      color: 'text-destructive',
      bgGradient: 'from-destructive/10 to-destructive/5',
    },
    {
      label: t('projects.totalProfit'),
      value: formatMoney(stats.totalProfit),
      desc: t('projects.receivedMinusExpense'),
      icon: Scale,
      color: stats.totalProfit >= 0 ? 'text-success' : 'text-destructive',
      bgGradient: stats.totalProfit >= 0 ? 'from-success/10 to-success/5' : 'from-destructive/10 to-destructive/5',
    },
  ];

  return (
    <MainLayout>
      <div className="animate-page-enter space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex h-11 p-1 bg-muted/60 backdrop-blur-sm">
              <TabsTrigger
                value="overview"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
              >
                <BarChart3 className="w-4 h-4" />
                {t('projects.overview') || '项目预览'}
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
              >
                <Table2 className="w-4 h-4" />
                {t('projects.details') || '项目详细'}
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2 shrink-0">
              {isMobile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm"><MoreVertical className="w-4 h-4 mr-1" />{t('common.actions')}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {}}>
                      <Eye className="w-4 h-4 mr-2" />{t('projects.selectProject')}
                    </DropdownMenuItem>
                    {canEdit && (
                      <DropdownMenuItem onClick={() => { setEditingProject(null); setFormOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2" />{t('projects.newProject')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="w-[220px]">
                      <Eye className="w-4 h-4 mr-2" />
                      <SelectValue placeholder={t('projects.selectProject')} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.project_code} - {p.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {canEdit && (
                    <Button onClick={() => { setEditingProject(null); setFormOpen(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      {t('projects.newProject')}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ===== Tab: 项目预览 ===== */}
          <TabsContent value="overview" className="mt-4 space-y-4 animate-fade-in">
            {/* Currency Stats Panel */}
            <CurrencyStatsPanel
              stats={projectCurrencyStats}
              title={t('projects.currencyStats')}
              showBalance={true}
              defaultOpen={false}
            />

            {/* Status Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statusCards.map(card => (
                <Card
                  key={card.key}
                  className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border ${
                    statusFilter === card.key ? `${card.borderColor} border-2 shadow-md` : 'border-border'
                  }`}
                  onClick={() => setStatusFilter(card.key === 'all' ? 'all' : card.key)}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                        <p className={`text-3xl font-bold ${card.color} tracking-tight`}>{card.value}</p>
                      </div>
                      <div className={`p-2.5 rounded-xl ${card.bgColor} transition-transform group-hover:scale-110`}>
                        <card.icon className={`w-5 h-5 ${card.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {financeCards.map((card, i) => (
                <Card
                  key={card.label}
                  className="group overflow-hidden transition-all duration-200 hover:shadow-lg border border-border"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardContent className="p-0">
                    <div className={`bg-gradient-to-br ${card.bgGradient} p-4 sm:p-5`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg bg-card/80 shadow-sm`}>
                          <card.icon className={`w-4 h-4 ${card.color}`} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                        <p className={`text-xl sm:text-2xl font-bold ${card.color} tracking-tight leading-none`}>
                          {card.value}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 pt-1">{card.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ===== Tab: 项目详细 ===== */}
          <TabsContent value="details" className="mt-4 space-y-4 animate-fade-in">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t('projects.searchPlaceholder')}
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    showPresets={true}
                    className="w-full md:w-[280px]"
                    placeholder={t('projects.filterBySignDate')}
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[150px]">
                      <SelectValue placeholder={t('projects.filterStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('projects.allStatus')}</SelectItem>
                      <SelectItem value="in_progress">{t('projects.inProgress')}</SelectItem>
                      <SelectItem value="completed">{t('projects.completed')}</SelectItem>
                      <SelectItem value="paused">{t('projects.paused')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <Input
                    placeholder={t('projects.projectManager')}
                    className="md:w-[180px]"
                    value={managerFilter}
                    onChange={(e) => setManagerFilter(e.target.value)}
                  />
                  <Input
                    placeholder={t('projects.customerName')}
                    className="md:w-[180px]"
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder={t('projects.minAmount')}
                      className="w-[120px]"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder={t('projects.maxAmount')}
                      className="w-[120px]"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                    />
                  </div>
                  {(dateRange?.from || dateRange?.to || managerFilter || customerFilter || minAmount || maxAmount) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDateRange(undefined);
                        setManagerFilter('');
                        setCustomerFilter('');
                        setMinAmount('');
                        setMaxAmount('');
                      }}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t('common.clearFilters')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Project List */}
            {loading ? (
              <Card>
                <CardContent className="p-0">
                  <AppSectionLoading label={t('common.loading')} compact className="py-16 min-h-[200px]" />
                </CardContent>
              </Card>
            ) : filteredProjects.length === 0 ? (
              <Card>
                <CardContent className="p-0">
                  <EmptyState
                    icon={Building2}
                    title={t('projects.noProjects')}
                    description={t('projects.noProjectsHint')}
                    action={canEdit ? { label: t('projects.addProject'), onClick: () => setFormOpen(true) } : undefined}
                  />
                </CardContent>
              </Card>
            ) : (
              <ProjectList
                projects={filteredProjects}
                onEdit={handleEdit}
                onViewPayments={handleViewPayments}
                onRefresh={() => tenantId && queryClient.invalidateQueries({ queryKey: [...queryKeys.projects, tenantId] })}
                onViewFinancials={handleViewFinancials}
                canEdit={canEdit}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editingProject}
        onSuccess={() => {
          if (!tenantId) return;
          queryClient.invalidateQueries({ queryKey: [...queryKeys.projects, tenantId] });
          queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboard, tenantId] });
        }}
      />
    </MainLayout>
  );
}
