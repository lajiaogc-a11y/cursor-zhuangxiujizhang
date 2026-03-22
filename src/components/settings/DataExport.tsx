import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Database, 
  FileJson,
  Package
} from 'lucide-react';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { settingsService } from '@/services';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { format } from 'date-fns';

interface TableConfig {
  id: string;
  nameKey: string;
  table: string;
  descKey: string;
}

export function DataExport() {
  const { t } = useI18n();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  const tables: TableConfig[] = [
    { id: 'projects', nameKey: 'dataExport.tables.projects', table: 'projects', descKey: 'dataExport.desc.projects' },
    { id: 'project_payments', nameKey: 'dataExport.tables.projectPayments', table: 'project_payments', descKey: 'dataExport.desc.projectPayments' },
    { id: 'project_expenses', nameKey: 'dataExport.tables.projectExpenses', table: 'project_expenses', descKey: 'dataExport.desc.projectExpenses' },
    { id: 'project_additions', nameKey: 'dataExport.tables.projectAdditions', table: 'project_additions', descKey: 'dataExport.desc.projectAdditions' },
    { id: 'transactions', nameKey: 'dataExport.tables.transactions', table: 'transactions', descKey: 'dataExport.desc.transactions' },
    { id: 'exchange_transactions', nameKey: 'dataExport.tables.exchangeTransactions', table: 'exchange_transactions', descKey: 'dataExport.desc.exchangeTransactions' },
    { id: 'exchange_rates', nameKey: 'dataExport.tables.exchangeRates', table: 'exchange_rates', descKey: 'dataExport.desc.exchangeRates' },
    { id: 'company_accounts', nameKey: 'dataExport.tables.companyAccounts', table: 'company_accounts', descKey: 'dataExport.desc.companyAccounts' },
    { id: 'payables', nameKey: 'dataExport.tables.payables', table: 'payables', descKey: 'dataExport.desc.payables' },
    { id: 'payable_payments', nameKey: 'dataExport.tables.payablePayments', table: 'payable_payments', descKey: 'dataExport.desc.payablePayments' },
    { id: 'employees', nameKey: 'dataExport.tables.employees', table: 'employees', descKey: 'dataExport.desc.employees' },
    { id: 'salary_payments', nameKey: 'dataExport.tables.salaryPayments', table: 'salary_payments', descKey: 'dataExport.desc.salaryPayments' },
    { id: 'salary_advances', nameKey: 'dataExport.tables.salaryAdvances', table: 'salary_advances', descKey: 'dataExport.desc.salaryAdvances' },
    { id: 'insurance_payments', nameKey: 'dataExport.tables.insurancePayments', table: 'insurance_payments', descKey: 'dataExport.desc.insurancePayments' },
    { id: 'bank_statements', nameKey: 'dataExport.tables.bankStatements', table: 'bank_statements', descKey: 'dataExport.desc.bankStatements' },
    { id: 'bank_import_batches', nameKey: 'dataExport.tables.bankImportBatches', table: 'bank_import_batches', descKey: 'dataExport.desc.bankImportBatches' },
    { id: 'transaction_categories', nameKey: 'dataExport.tables.transactionCategories', table: 'transaction_categories', descKey: 'dataExport.desc.transactionCategories' },
    { id: 'project_categories', nameKey: 'dataExport.tables.projectCategories', table: 'project_categories', descKey: 'dataExport.desc.projectCategories' },
    { id: 'employee_positions', nameKey: 'dataExport.tables.employeePositions', table: 'employee_positions', descKey: 'dataExport.desc.employeePositions' },
    { id: 'payroll_settings', nameKey: 'dataExport.tables.payrollSettings', table: 'payroll_settings', descKey: 'dataExport.desc.payrollSettings' },
    { id: 'project_alerts', nameKey: 'dataExport.tables.projectAlerts', table: 'project_alerts', descKey: 'dataExport.desc.projectAlerts' },
    { id: 'alert_rules', nameKey: 'dataExport.tables.alertRules', table: 'alert_rules', descKey: 'dataExport.desc.alertRules' },
    { id: 'memos', nameKey: 'dataExport.tables.memos', table: 'memos', descKey: 'dataExport.desc.memos' },
    { id: 'profiles', nameKey: 'dataExport.tables.profiles', table: 'profiles', descKey: 'dataExport.desc.profiles' },
    { id: 'user_roles', nameKey: 'dataExport.tables.userRoles', table: 'user_roles', descKey: 'dataExport.desc.userRoles' },
    { id: 'user_permissions', nameKey: 'dataExport.tables.userPermissions', table: 'user_permissions', descKey: 'dataExport.desc.userPermissions' },
    { id: 'audit_logs', nameKey: 'dataExport.tables.auditLogs', table: 'audit_logs', descKey: 'dataExport.desc.auditLogs' },
    { id: 'import_history', nameKey: 'dataExport.tables.importHistory', table: 'import_history', descKey: 'dataExport.desc.importHistory' },
    // Quotation System
    { id: 'q_quotations', nameKey: 'dataExport.tables.qQuotations', table: 'q_quotations', descKey: 'dataExport.desc.qQuotations' },
    { id: 'q_products', nameKey: 'dataExport.tables.qProducts', table: 'q_products', descKey: 'dataExport.desc.qProducts' },
    { id: 'q_customers', nameKey: 'dataExport.tables.qCustomers', table: 'q_customers', descKey: 'dataExport.desc.qCustomers' },
    { id: 'q_product_categories', nameKey: 'dataExport.tables.qProductCategories', table: 'q_product_categories', descKey: 'dataExport.desc.qProductCategories' },
    { id: 'q_quotation_settings', nameKey: 'dataExport.tables.qQuotationSettings', table: 'q_quotation_settings', descKey: 'dataExport.desc.qQuotationSettings' },
    // Cost Control System
    { id: 'q_methods', nameKey: 'dataExport.tables.qMethods', table: 'q_methods', descKey: 'dataExport.desc.qMethods' },
    { id: 'q_worker_types', nameKey: 'dataExport.tables.qWorkerTypes', table: 'q_worker_types', descKey: 'dataExport.desc.qWorkerTypes' },
    { id: 'q_labor_rates', nameKey: 'dataExport.tables.qLaborRates', table: 'q_labor_rates', descKey: 'dataExport.desc.qLaborRates' },
    { id: 'q_category_method_mapping', nameKey: 'dataExport.tables.qCategoryMethodMapping', table: 'q_category_method_mapping', descKey: 'dataExport.desc.qCategoryMethodMapping' },
    { id: 'q_method_materials', nameKey: 'dataExport.tables.qMethodMaterials', table: 'q_method_materials', descKey: 'dataExport.desc.qMethodMaterials' },
    { id: 'q_project_breakdowns', nameKey: 'dataExport.tables.qProjectBreakdowns', table: 'q_project_breakdowns', descKey: 'dataExport.desc.qProjectBreakdowns' },
    { id: 'q_breakdown_items', nameKey: 'dataExport.tables.qBreakdownItems', table: 'q_breakdown_items', descKey: 'dataExport.desc.qBreakdownItems' },
    // Purchasing System
    { id: 'q_suppliers', nameKey: 'dataExport.tables.qSuppliers', table: 'q_suppliers', descKey: 'dataExport.desc.qSuppliers' },
    { id: 'q_materials', nameKey: 'dataExport.tables.qMaterials', table: 'q_materials', descKey: 'dataExport.desc.qMaterials' },
    { id: 'q_purchase_orders', nameKey: 'dataExport.tables.qPurchaseOrders', table: 'q_purchase_orders', descKey: 'dataExport.desc.qPurchaseOrders' },
    { id: 'q_purchase_order_items', nameKey: 'dataExport.tables.qPurchaseOrderItems', table: 'q_purchase_order_items', descKey: 'dataExport.desc.qPurchaseOrderItems' },
    { id: 'q_inventory', nameKey: 'dataExport.tables.qInventory', table: 'q_inventory', descKey: 'dataExport.desc.qInventory' },
    { id: 'q_inventory_transactions', nameKey: 'dataExport.tables.qInventoryTransactions', table: 'q_inventory_transactions', descKey: 'dataExport.desc.qInventoryTransactions' },
  ];

  const toggleTable = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const selectAll = () => {
    if (selectedTables.length === tables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(tables.map(t => t.id));
    }
  };

  const fetchAllData = async (tableName: string): Promise<any[]> => {
    return settingsService.fetchTableDataPaginated(tableName);
  };

  const handleExport = async () => {
    const tablesToExport = selectedTables.length > 0 
      ? tables.filter(t => selectedTables.includes(t.id))
      : tables;

    if (tablesToExport.length === 0) {
      toast.error(t('dataExport.selectOneTable'));
      return;
    }

    setExporting(true);
    setProgress(0);

    try {
      const exportData: Record<string, any[]> = {};
      const exportMeta = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        tables: [] as { name: string; count: number }[],
      };

      for (let i = 0; i < tablesToExport.length; i++) {
        const tableConfig = tablesToExport[i];
        setCurrentTable(t(tableConfig.nameKey));
        setProgress(Math.round(((i + 1) / tablesToExport.length) * 100));

        try {
          const data = await fetchAllData(tableConfig.table);
          exportData[tableConfig.table] = data;
          exportMeta.tables.push({ name: tableConfig.table, count: data.length });
        } catch (error) {
          console.error(`Failed to export ${tableConfig.table}:`, error);
          exportData[tableConfig.table] = [];
          exportMeta.tables.push({ name: tableConfig.table, count: 0 });
        }
      }

      // Create JSON file
      const fullExport = {
        _meta: exportMeta,
        ...exportData,
      };

      const jsonStr = JSON.stringify(fullExport, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const totalRecords = exportMeta.tables.reduce((sum, t) => sum + t.count, 0);
      toast.success(
        t('dataExport.exportComplete')
          .replace('{tables}', tablesToExport.length.toString())
          .replace('{records}', totalRecords.toString())
      );
    } catch (error: any) {
      toast.error(t('dataExport.exportFailed'), {
        description: error.message,
      });
    } finally {
      setExporting(false);
      setProgress(0);
      setCurrentTable('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              {t('dataExport.title')}
            </CardTitle>
            <CardDescription>
              {t('dataExport.description')}
            </CardDescription>
          </div>
          <Badge variant="outline">
            <Database className="w-3 h-3 mr-1" />
            JSON
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Table Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              {t('dataExport.selectTables')}
            </h4>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedTables.length === tables.length 
                ? t('dataExport.deselectAll')
                : t('dataExport.selectAll')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tables.map(table => (
              <div
                key={table.id}
                className={`
                  flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                  ${selectedTables.includes(table.id) 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-muted-foreground/30 hover:bg-muted/30'}
                `}
                onClick={() => toggleTable(table.id)}
              >
                <Checkbox
                  checked={selectedTables.includes(table.id)}
                  onCheckedChange={() => toggleTable(table.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{t(table.nameKey)}</p>
                  <p className="text-xs text-muted-foreground truncate">{t(table.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export Progress */}
        {exporting && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <ChromeLoadingSpinner variant="muted" className="h-4 w-4" />
                {t('dataExport.exporting')}: {currentTable}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Export Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedTables.length > 0 
              ? t('dataExport.selected').replace('{count}', selectedTables.length.toString())
              : t('dataExport.noSelectionHint')}
          </div>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />
                {t('dataExport.exportingProgress')}
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                {t('dataExport.exportData')}
              </>
            )}
          </Button>
        </div>

        {/* Import Instructions */}
        <div className="p-4 bg-muted/50 rounded-lg border">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <FileJson className="w-4 h-4" />
            {t('dataExport.importInstructions')}
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• {t('dataExport.instruction1')}</li>
            <li>• {t('dataExport.instruction2')}</li>
            <li>• {t('dataExport.instruction3')}</li>
            <li>• {t('dataExport.instruction4')}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
