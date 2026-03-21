import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { useSortableTable } from '@/hooks/useSortableTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { projectsService } from '@/services';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ProjectFinancials } from './ProjectFinancials';
import { TablePagination } from '@/components/ui/table-pagination';
import { useI18n } from '@/lib/i18n';
import { useResponsive } from '@/hooks/useResponsive';

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  customer_name: string;
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
  project_manager?: string | null;
  created_by?: string | null;
  creator_name?: string | null;
}

interface ProjectListProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onViewPayments: (project: Project) => void;
  onRefresh: () => void;
  onViewFinancials?: (project: Project) => void;
  canEdit?: boolean;
}

export function ProjectList({ projects, onEdit, onViewPayments, onRefresh, onViewFinancials, canEdit = true }: ProjectListProps) {
  const { t } = useI18n();
  const { isMobile, isTablet } = useResponsive();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [financialProject, setFinancialProject] = useState<Project | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [projectsWithCreator, setProjectsWithCreator] = useState<Project[]>([]);
  const [projectTransactionTotals, setProjectTransactionTotals] = useState<Map<string, { income: number; expense: number }>>(new Map());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { sortConfig, requestSort, sortData } = useSortableTable<Project>();

  useEffect(() => {
    const fetchData = async () => {
      const { profileMap, totalsMap } = await projectsService.fetchProjectListHelpers(projects);
      setProjectTransactionTotals(totalsMap);
      setProjectsWithCreator(projects.map(p => ({
        ...p,
        creator_name: p.created_by ? (profileMap.get(p.created_by) || null) : null,
      })));
    };
    fetchData();
  }, [projects]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/20">{t('projects.inProgress')}</Badge>;
      case 'completed':
        return <Badge className="bg-success/10 text-success hover:bg-success/20">{t('projects.completed')}</Badge>;
      case 'paused':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">{t('projects.paused')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
    return `${symbols[currency] || ''}${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await projectsService.deleteProject(deleteId);
      toast.success(t('projects.deleteSuccess'));
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || t('common.deleteFailed'));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const getProjectSortValue = (project: Project, key: string): any => {
    switch (key) {
      case 'project_code': return project.project_code;
      case 'project_name': return project.project_name;
      case 'customer': return project.customer_name;
      case 'contract_amount': return project.contract_amount_myr;
      case 'addition_amount': return project.total_addition_myr || 0;
      case 'received': return getProjectReceived(project);
      case 'pending': {
        const total = project.contract_amount_myr + (project.total_addition_myr || 0);
        return Math.max(0, total - getProjectReceived(project));
      }
      case 'expense': return getProjectExpenses(project);
      case 'profit': return getProjectProfit(project);
      case 'profit_margin': return getProfitMargin(project);
      case 'status': return project.status;
      default: return null;
    }
  };

  const sortedProjects = sortData(projectsWithCreator, getProjectSortValue);
  const totalItems = sortedProjects.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProjects = sortedProjects.slice(startIndex, startIndex + pageSize);

  const getProjectTransactionTotalsById = (projectId: string) => {
    return projectTransactionTotals.get(projectId) || { income: 0, expense: 0 };
  };

  const getProjectReceived = (project: Project) => getProjectTransactionTotalsById(project.id).income;
  const getProjectExpenses = (project: Project) => getProjectTransactionTotalsById(project.id).expense;
  const getProjectProfit = (project: Project) => getProjectReceived(project) - getProjectExpenses(project);

  const getProfitMargin = (project: Project) => {
    const profit = getProjectProfit(project);
    const totalBase = project.contract_amount_myr + (project.total_addition_myr || 0);
    if (totalBase <= 0) return 0;
    return (profit / totalBase) * 100;
  };

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <div className="space-y-3">
          {paginatedProjects.map((project) => {
            const contractAmount = project.contract_amount_myr || 0;
            const additionAmount = project.total_addition_myr || 0;
            const totalContract = contractAmount + additionAmount;
            const received = getProjectReceived(project);
            const pendingAmount = (contractAmount === 0 && additionAmount === 0) ? 0 : Math.max(0, totalContract - received);
            const totalExpense = getProjectExpenses(project);
            const profit = getProjectProfit(project);
            const profitMargin = getProfitMargin(project);
            const isExpanded = expandedId === project.id;

            return (
              <Card
                key={project.id}
                className="p-3 cursor-pointer active:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : project.id)}
              >
                {/* Header: code + status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-sm text-primary">{project.project_code}</span>
                    {getStatusBadge(project.status)}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </div>

                {/* Project name & customer */}
                <div className="mb-2">
                  <div className="font-medium text-sm truncate">{project.project_name}</div>
                  <div className="text-xs text-muted-foreground">{project.customer_name}</div>
                </div>

                {/* Key financials */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-muted-foreground">{t('table.contractAmount')}</div>
                    <div className="text-xs font-semibold">{formatCurrency(contractAmount, 'MYR')}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">{t('table.received')}</div>
                    <div className="text-xs font-semibold text-success">{formatCurrency(received, 'MYR')}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">{t('table.profit')}</div>
                    <div className={`text-xs font-semibold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(profit, 'MYR')}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2" onClick={e => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('table.additionAmount')}:</span>
                        <span className="font-medium text-primary">{formatCurrency(additionAmount, 'MYR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('table.pending')}:</span>
                        <span className="font-medium text-warning">{formatCurrency(pendingAmount, 'MYR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('table.expense')}:</span>
                        <span className="font-medium text-destructive">{formatCurrency(totalExpense, 'MYR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('table.profitMargin')}:</span>
                        <span className={`font-medium ${profitMargin >= 10 ? 'text-success' : profitMargin >= 0 ? 'text-warning' : 'text-destructive'}`}>
                          {profitMargin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {project.creator_name && (
                      <div className="text-xs text-muted-foreground">{t('table.creator')}: {project.creator_name}</div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => onViewFinancials ? onViewFinancials(project) : setFinancialProject(project)}
                      >
                        <Calculator className="w-3 h-3 mr-1" />
                        {t('projects.financials')}
                      </Button>
                      {canEdit && (
                        <>
                          <Button variant="outline" size="sm" className="text-xs" onClick={() => onEdit(project)}>
                            <Edit className="w-3 h-3 mr-1" />{t('common.edit')}
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs text-destructive" onClick={() => setDeleteId(project.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />

        {/* Dialogs */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>{t('projects.deleteConfirm')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                {deleting ? t('common.deleting') : t('common.confirmDelete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {!onViewFinancials && (
          <ProjectFinancials
            open={!!financialProject}
            onOpenChange={(open) => !open && setFinancialProject(null)}
            project={financialProject}
            onRefresh={onRefresh}
          />
        )}
      </>
    );
  }

  // Tablet compact table view
  if (isTablet) {
    return (
      <>
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <Table compact>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="project_code" sortConfig={sortConfig} onSort={requestSort} className="sticky left-0 z-10 bg-card">{t('table.projectCode')}</SortableTableHead>
                  <SortableTableHead sortKey="project_name" sortConfig={sortConfig} onSort={requestSort}>{t('table.projectName')}</SortableTableHead>
                  <SortableTableHead sortKey="contract_amount" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('table.contractAmount')}</SortableTableHead>
                  <SortableTableHead sortKey="received" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('table.received')}</SortableTableHead>
                  <SortableTableHead sortKey="profit" sortConfig={sortConfig} onSort={requestSort} className="text-right">{t('table.profit')}</SortableTableHead>
                  <SortableTableHead sortKey="status" sortConfig={sortConfig} onSort={requestSort}>{t('table.status')}</SortableTableHead>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProjects.map((project) => {
                  const received = getProjectReceived(project);
                  const profit = getProjectProfit(project);
                  return (
                    <TableRow key={project.id}>
                      <TableCell className="sticky left-0 z-10 bg-card font-mono font-medium whitespace-nowrap">{project.project_code}</TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate">{project.project_name}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatCurrency(project.contract_amount_myr, 'MYR')}</TableCell>
                      <TableCell className="text-right whitespace-nowrap text-success">{formatCurrency(received, 'MYR')}</TableCell>
                      <TableCell className={`text-right whitespace-nowrap font-medium ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(profit, 'MYR')}</TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => onViewFinancials ? onViewFinancials(project) : setFinancialProject(project)}>
                            <Calculator className="w-3.5 h-3.5" />
                          </Button>
                          {canEdit && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(project)}><Edit className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(project.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} pageSize={pageSize} totalItems={totalItems} onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }} />
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>{t('projects.deleteConfirm')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                {deleting ? t('common.deleting') : t('common.confirmDelete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {!onViewFinancials && (
          <ProjectFinancials open={!!financialProject} onOpenChange={(open) => !open && setFinancialProject(null)} project={financialProject} onRefresh={onRefresh} />
        )}
      </>
    );
  }

  // Desktop table view
  return (
    <>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="project_code" sortConfig={sortConfig} onSort={requestSort} className="whitespace-nowrap">{t('table.projectCode')}</SortableTableHead>
              <SortableTableHead sortKey="project_name" sortConfig={sortConfig} onSort={requestSort} className="whitespace-nowrap">{t('table.projectName')}</SortableTableHead>
              <SortableTableHead sortKey="customer" sortConfig={sortConfig} onSort={requestSort} className="whitespace-nowrap">{t('table.customer')}</SortableTableHead>
              <SortableTableHead sortKey="contract_amount" sortConfig={sortConfig} onSort={requestSort} className="text-right whitespace-nowrap">{t('table.contractAmount')}</SortableTableHead>
              <SortableTableHead sortKey="addition_amount" sortConfig={sortConfig} onSort={requestSort} className="text-right whitespace-nowrap">{t('table.additionAmount')}</SortableTableHead>
              <SortableTableHead sortKey="received" sortConfig={sortConfig} onSort={requestSort} className="text-right whitespace-nowrap">{t('table.received')}</SortableTableHead>
              <SortableTableHead sortKey="pending" sortConfig={sortConfig} onSort={requestSort} className="text-right whitespace-nowrap">{t('table.pending')}</SortableTableHead>
              <SortableTableHead sortKey="expense" sortConfig={sortConfig} onSort={requestSort} className="text-right whitespace-nowrap">{t('table.expense')}</SortableTableHead>
              <SortableTableHead sortKey="profit" sortConfig={sortConfig} onSort={requestSort} className="text-right whitespace-nowrap">{t('table.profit')}</SortableTableHead>
              <SortableTableHead sortKey="profit_margin" sortConfig={sortConfig} onSort={requestSort} className="text-right whitespace-nowrap">{t('table.profitMargin')}</SortableTableHead>
              <SortableTableHead sortKey="status" sortConfig={sortConfig} onSort={requestSort} className="whitespace-nowrap">{t('table.status')}</SortableTableHead>
              <TableHead className="whitespace-nowrap">{t('table.projectManager')}</TableHead>
              <TableHead className="whitespace-nowrap">{t('table.creator')}</TableHead>
              <TableHead className="text-right whitespace-nowrap">{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProjects.map((project) => {
              const contractAmount = project.contract_amount_myr || 0;
              const additionAmount = project.total_addition_myr || 0;
              const totalContract = contractAmount + additionAmount;
              const received = getProjectReceived(project);
              const pendingAmount = (contractAmount === 0 && additionAmount === 0) ? 0 : Math.max(0, totalContract - received);
              const totalExpense = getProjectExpenses(project);
              const profit = getProjectProfit(project);
              const profitMargin = getProfitMargin(project);
              const receivedPercentage = totalContract > 0 ? (received / totalContract) * 100 : 0;
              
              return (
                <TableRow key={project.id}>
                  <TableCell className="font-mono font-medium whitespace-nowrap">{project.project_code}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{project.project_name}</TableCell>
                  <TableCell className="whitespace-nowrap">{project.customer_name}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div>{formatCurrency(project.contract_amount, project.contract_currency)}</div>
                    {project.contract_currency !== 'MYR' && (
                      <div className="text-xs text-muted-foreground">
                        ≈ RM {project.contract_amount_myr.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {additionAmount > 0 ? (
                      <div className="text-primary font-medium">
                        RM {additionAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="text-success font-medium">
                      RM {received.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-muted-foreground">{receivedPercentage.toFixed(0)}%</div>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="text-warning font-medium">
                      RM {pendingAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="text-destructive font-medium">
                      RM {totalExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className={`font-medium ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      RM {profit.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className={`font-medium ${profitMargin >= 10 ? 'text-success' : profitMargin >= 0 ? 'text-warning' : 'text-destructive'}`}>
                      {profitMargin.toFixed(1)}%
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{getStatusBadge(project.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{project.project_manager || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{project.creator_name || '-'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" size="sm" className="text-primary"
                        onClick={() => onViewFinancials ? onViewFinancials(project) : setFinancialProject(project)}
                      >
                        <Calculator className="w-4 h-4 mr-1" />{t('projects.financials')}
                      </Button>
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background">
                            <DropdownMenuItem onClick={() => onEdit(project)}>
                              <Edit className="w-4 h-4 mr-2" />{t('projects.editProject')}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(project.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />{t('projects.deleteProject')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('projects.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? t('common.deleting') : t('common.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!onViewFinancials && (
        <ProjectFinancials
          open={!!financialProject}
          onOpenChange={(open) => !open && setFinancialProject(null)}
          project={financialProject}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
}
