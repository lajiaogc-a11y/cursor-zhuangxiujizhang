import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  Database, 
  FileJson,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  History,
  Clock
} from 'lucide-react';
import { ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';
import { settingsService } from '@/services';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { batchInsert, batchDelete } from '@/lib/batchOperations';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/lib/auth';

interface ImportHistoryRecord {
  id: string;
  file_name: string;
  file_size: number | null;
  imported_at: string;
  imported_by: string | null;
  status: string;
  total_tables: number;
  total_records: number;
  success_tables: number;
  success_records: number;
  failed_tables: number;
  error_message: string | null;
  details: any;
}

interface ImportMeta {
  exportDate: string;
  version: string;
  tables: { name: string; count: number }[];
}

interface ImportData {
  _meta: ImportMeta;
  [key: string]: any;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ConflictInfo {
  table: string;
  existingCount: number;
  importCount: number;
}

interface ImportedRecord {
  table: string;
  ids: string[];
}

type ConflictStrategy = 'skip' | 'append';
type ImportStep = 'upload' | 'preview' | 'import';

// 导入顺序（按外键依赖）
const IMPORT_ORDER = [
  'transaction_categories',
  'project_categories',
  'alert_rules',
  'company_accounts',
  'exchange_rates',
  'profiles',
  'user_roles',
  'projects',
  'project_payments',
  'project_expenses',
  'project_additions',
  'project_alerts',
  'transactions',
  'exchange_transactions',
  'memos',
  'audit_logs',
  // Quotation
  'q_product_categories',
  'q_customers',
  'q_products',
  'q_quotation_settings',
  'q_quotations',
  // Cost Control
  'q_worker_types',
  'q_methods',
  'q_labor_rates',
  'q_category_method_mapping',
  'q_method_materials',
  'q_project_breakdowns',
  'q_breakdown_items',
  // Purchasing
  'q_suppliers',
  'q_materials',
  'q_purchase_orders',
  'q_purchase_order_items',
  'q_inventory',
  'q_inventory_transactions',
];

// 必需字段定义
const REQUIRED_FIELDS: Record<string, string[]> = {
  projects: ['id', 'project_code', 'project_name', 'customer_name', 'contract_amount', 'contract_amount_myr', 'sign_date'],
  transactions: ['id', 'transaction_date', 'type', 'category_name', 'summary', 'amount', 'currency', 'account_type', 'amount_myr'],
  project_payments: ['id', 'project_id', 'payment_date', 'payment_stage', 'amount', 'currency', 'account_type', 'amount_myr'],
  project_expenses: ['id', 'project_id', 'expense_date', 'category', 'description', 'amount', 'currency', 'amount_myr'],
  project_additions: ['id', 'project_id', 'addition_date', 'description', 'amount', 'currency', 'amount_myr'],
  exchange_transactions: ['id', 'transaction_date', 'out_currency', 'out_amount', 'in_currency', 'in_amount', 'exchange_rate'],
  exchange_rates: ['id', 'from_currency', 'to_currency', 'rate', 'rate_date'],
  company_accounts: ['id', 'account_type', 'currency', 'balance'],
  transaction_categories: ['id', 'name', 'type'],
  project_categories: ['id', 'name', 'type'],
  alert_rules: ['id', 'rule_name', 'rule_type'],
  memos: ['id', 'title'],
};

// 需要跳过某些字段的表
const SKIP_FIELDS: Record<string, string[]> = {
  profiles: ['id'],
  user_roles: ['id'],
  audit_logs: ['id'],
};

// 需要特殊处理的表（跳过导入，仅提示用户）
const SKIP_TABLES = ['profiles', 'user_roles'];

// 预览显示的字段（每个表显示的关键字段）
const PREVIEW_FIELDS: Record<string, string[]> = {
  projects: ['project_code', 'project_name', 'customer_name', 'contract_amount_myr'],
  transactions: ['transaction_date', 'type', 'category_name', 'summary', 'amount_myr'],
  project_payments: ['payment_date', 'payment_stage', 'amount_myr'],
  project_expenses: ['expense_date', 'category', 'description', 'amount_myr'],
  project_additions: ['addition_date', 'description', 'amount_myr'],
  exchange_transactions: ['transaction_date', 'out_currency', 'out_amount', 'in_currency', 'in_amount'],
  exchange_rates: ['from_currency', 'to_currency', 'rate', 'rate_date'],
  company_accounts: ['account_type', 'currency', 'balance'],
  transaction_categories: ['name', 'type'],
  project_categories: ['name', 'type'],
  alert_rules: ['rule_name', 'rule_type'],
  memos: ['title', 'content'],
};

// 表名翻译键映射
const TABLE_NAME_KEYS: Record<string, string> = {
  projects: 'dataExport.tables.projects',
  project_payments: 'dataExport.tables.projectPayments',
  project_expenses: 'dataExport.tables.projectExpenses',
  project_additions: 'dataExport.tables.projectAdditions',
  transactions: 'dataExport.tables.transactions',
  exchange_transactions: 'dataExport.tables.exchangeTransactions',
  exchange_rates: 'dataExport.tables.exchangeRates',
  company_accounts: 'dataExport.tables.companyAccounts',
  transaction_categories: 'dataExport.tables.transactionCategories',
  project_categories: 'dataExport.tables.projectCategories',
  project_alerts: 'dataExport.tables.projectAlerts',
  alert_rules: 'dataExport.tables.alertRules',
  memos: 'dataExport.tables.memos',
  profiles: 'dataExport.tables.profiles',
  user_roles: 'dataExport.tables.userRoles',
  audit_logs: 'dataExport.tables.auditLogs',
  // Quotation
  q_quotations: 'dataExport.tables.qQuotations',
  q_products: 'dataExport.tables.qProducts',
  q_customers: 'dataExport.tables.qCustomers',
  q_product_categories: 'dataExport.tables.qProductCategories',
  q_quotation_settings: 'dataExport.tables.qQuotationSettings',
  // Cost Control
  q_methods: 'dataExport.tables.qMethods',
  q_worker_types: 'dataExport.tables.qWorkerTypes',
  q_labor_rates: 'dataExport.tables.qLaborRates',
  q_category_method_mapping: 'dataExport.tables.qCategoryMethodMapping',
  q_method_materials: 'dataExport.tables.qMethodMaterials',
  q_project_breakdowns: 'dataExport.tables.qProjectBreakdowns',
  q_breakdown_items: 'dataExport.tables.qBreakdownItems',
  // Purchasing
  q_suppliers: 'dataExport.tables.qSuppliers',
  q_materials: 'dataExport.tables.qMaterials',
  q_purchase_orders: 'dataExport.tables.qPurchaseOrders',
  q_purchase_order_items: 'dataExport.tables.qPurchaseOrderItems',
  q_inventory: 'dataExport.tables.qInventory',
  q_inventory_transactions: 'dataExport.tables.qInventoryTransactions',
};

const PREVIEW_SAMPLE_COUNT = 3;

export function DataImport() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [step, setStep] = useState<ImportStep>('upload');
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState('');
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip');
  const [results, setResults] = useState<Map<string, { success: boolean; count: number; errors: string[] }>>(new Map());
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [importedRecords, setImportedRecords] = useState<ImportedRecord[]>([]);
  const [rollbackStatus, setRollbackStatus] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFileSize, setCurrentFileSize] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载导入历史记录
  const loadImportHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await settingsService.fetchImportHistory(20);
      setImportHistory(data);
    } catch (error) {
      console.error('Failed to load import history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      loadImportHistory();
    }
  }, [showHistory]);

  const getTableDisplayName = (tableName: string): string => {
    const key = TABLE_NAME_KEYS[tableName];
    return key ? t(key) : tableName;
  };

  const toggleTableExpand = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  // 验证数据完整性
  const validateData = (data: ImportData): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查元数据
    if (!data._meta) {
      errors.push(t('dataImport.missingMeta'));
      return { valid: false, errors, warnings };
    }

    if (!data._meta.exportDate) {
      errors.push(t('dataImport.missingExportDate'));
    }

    if (!data._meta.tables || !Array.isArray(data._meta.tables)) {
      errors.push(t('dataImport.missingTableInfo'));
    }

    // 检查每个表的数据
    for (const tableInfo of data._meta.tables || []) {
      const tableName = tableInfo.name;
      const tableData = data[tableName];
      const displayName = getTableDisplayName(tableName);

      // 检查表数据是否存在
      if (!tableData) {
        warnings.push(t('dataImport.tableMissing').replace('{table}', displayName));
        continue;
      }

      // 检查是否为数组
      if (!Array.isArray(tableData)) {
        errors.push(t('dataImport.tableFormatError').replace('{table}', displayName));
        continue;
      }

      // 检查记录数是否匹配
      if (tableData.length !== tableInfo.count) {
        warnings.push(
          t('dataImport.recordCountMismatch')
            .replace('{table}', displayName)
            .replace('{meta}', tableInfo.count.toString())
            .replace('{actual}', tableData.length.toString())
        );
      }

      // 检查必需字段
      const requiredFields = REQUIRED_FIELDS[tableName];
      if (requiredFields && tableData.length > 0) {
        const sampleRecord = tableData[0];
        const missingFields = requiredFields.filter(field => !(field in sampleRecord));
        
        if (missingFields.length > 0) {
          errors.push(
            t('dataImport.missingRequiredFields')
              .replace('{table}', displayName)
              .replace('{fields}', missingFields.join(', '))
          );
        }
      }

      // 检查数据类型
      if (tableData.length > 0) {
        for (let i = 0; i < Math.min(5, tableData.length); i++) {
          const record = tableData[i];
          if (record.id && typeof record.id !== 'string') {
            warnings.push(
              t('dataImport.invalidIdType')
                .replace('{table}', displayName)
                .replace('{index}', (i + 1).toString())
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  };

  // 检查冲突
  const checkConflicts = async (data: ImportData): Promise<ConflictInfo[]> => {
    const conflictList: ConflictInfo[] = [];

    for (const tableInfo of data._meta.tables || []) {
      const tableName = tableInfo.name;
      
      if (SKIP_TABLES.includes(tableName)) continue;
      if (!data[tableName] || data[tableName].length === 0) continue;

      try {
        const count = await settingsService.getTableRowCount(tableName);

        if (count > 0) {
          conflictList.push({
            table: tableName,
            existingCount: count,
            importCount: data[tableName].length,
          });
        }
      } catch (e) {
        console.error(`Error checking conflicts for ${tableName}:`, e);
      }
    }

    return conflictList;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 保存文件信息用于历史记录
    setCurrentFileName(file.name);
    setCurrentFileSize(file.size);

    setValidating(true);
    setValidation(null);
    setConflicts([]);
    setResults(new Map());
    setStep('upload');
    setImportedRecords([]);

    try {
      const text = await file.text();
      let data: ImportData;
      
      try {
        data = JSON.parse(text) as ImportData;
      } catch (parseError) {
        toast.error(t('dataImport.jsonParseError'));
        setValidating(false);
        return;
      }

      // 验证数据
      const validationResult = validateData(data);
      setValidation(validationResult);

      if (!validationResult.valid) {
        toast.error(t('dataImport.validationFailed'));
        setValidating(false);
        return;
      }

      setImportData(data);

      // 检查冲突
      setCheckingConflicts(true);
      const conflictList = await checkConflicts(data);
      setConflicts(conflictList);
      setCheckingConflicts(false);

      toast.success(t('dataImport.fileLoaded').replace('{count}', data._meta.tables.length.toString()));
    } catch (error) {
      toast.error(t('dataImport.processFileFailed'));
    } finally {
      setValidating(false);
    }
  };

  const processTableData = (tableName: string, data: any[]): any[] => {
    const skipFields = SKIP_FIELDS[tableName] || [];
    
    return data.map(record => {
      const processed = { ...record };
      skipFields.forEach(field => delete processed[field]);
      return processed;
    });
  };

  // 回滚已导入的数据
  const rollbackImportedData = async (): Promise<number> => {
    setRollingBack(true);
    let totalDeleted = 0;

    // 按相反顺序回滚（先删除子表，再删除父表）
    const reversedRecords = [...importedRecords].reverse();

    for (const record of reversedRecords) {
      if (record.ids.length === 0) continue;

      setRollbackStatus(t('dataImport.rollbackTable').replace('{table}', getTableDisplayName(record.table)));

      try {
        await settingsService.deleteByIds(record.table, record.ids);
        totalDeleted += record.ids.length;
      } catch (e) {
        console.error(`Rollback failed for ${record.table}:`, e);
      }
    }

    setRollingBack(false);
    setRollbackStatus('');
    return totalDeleted;
  };

  // 保存导入历史记录
  const saveImportHistory = async (
    status: 'success' | 'partial' | 'failed' | 'rolled_back',
    totalTables: number,
    totalRecords: number,
    successTables: number,
    successRecords: number,
    failedTables: number,
    errorMessage: string | null,
    details: any
  ) => {
    try {
      await settingsService.saveImportHistory({
        file_name: currentFileName,
        file_size: currentFileSize,
        imported_by: user?.id || null,
        status,
        total_tables: totalTables,
        total_records: totalRecords,
        success_tables: successTables,
        success_records: successRecords,
        failed_tables: failedTables,
        error_message: errorMessage,
        details,
      });
    } catch (error) {
      console.error('Failed to save import history:', error);
    }
  };

  const handleImport = async () => {
    if (!importData) return;

    setImporting(true);
    setProgress(0);
    setResults(new Map());
    setImportedRecords([]);
    setStep('import');

    const newResults = new Map<string, { success: boolean; count: number; errors: string[] }>();
    const tablesToImport = IMPORT_ORDER.filter(t => 
      importData[t] && 
      Array.isArray(importData[t]) && 
      importData[t].length > 0 &&
      !SKIP_TABLES.includes(t)
    );

    const newImportedRecords: ImportedRecord[] = [];
    let hasError = false;
    let errorMessage = '';

    for (let i = 0; i < tablesToImport.length; i++) {
      const tableName = tablesToImport[i];
      setCurrentTable(tableName);
      setProgress(Math.round(((i + 1) / tablesToImport.length) * 100));

      try {
        // 检查该表是否有冲突
        const hasConflict = conflicts.some(c => c.table === tableName);

        if (hasConflict) {
          if (conflictStrategy === 'skip') {
            // 跳过该表
            newResults.set(tableName, { 
              success: true, 
              count: 0, 
              errors: [t('dataImport.skippedTable')] 
            });
            continue;
          }
          // Production Mode: overwrite strategy removed, only skip or append
        }

        const data = processTableData(tableName, importData[tableName]);
        
        if (data.length === 0) {
          newResults.set(tableName, { success: true, count: 0, errors: [] });
          continue;
        }

        // 使用批量插入并获取插入的ID
        const insertedIds = await settingsService.insertAndReturnIds(tableName, data);
        
        // 记录已导入的数据用于可能的回滚
        if (insertedIds.length > 0) {
          newImportedRecords.push({ table: tableName, ids: insertedIds });
          setImportedRecords([...newImportedRecords]);
        }

        newResults.set(tableName, {
          success: true,
          count: insertedIds.length,
          errors: [],
        });

      } catch (error: any) {
        hasError = true;
        errorMessage = error.message || 'Unknown error';
        newResults.set(tableName, {
          success: false,
          count: 0,
          errors: [errorMessage],
        });

        console.error(`Import error for ${tableName}:`, error);

        // 发生错误时，回滚已导入的数据
        if (newImportedRecords.length > 0) {
          setImportedRecords(newImportedRecords);
          const deletedCount = await rollbackImportedData();
          
          // 保存回滚历史
          const successCount = Array.from(newResults.values()).filter(r => r.success).length;
          const successRecords = Array.from(newResults.values()).reduce((sum, r) => sum + r.count, 0);
          await saveImportHistory(
            'rolled_back',
            tablesToImport.length,
            importData._meta.tables.reduce((sum, t) => sum + t.count, 0),
            successCount,
            successRecords,
            1,
            errorMessage,
            { results: Object.fromEntries(newResults), rolledBack: deletedCount }
          );
          
          toast.error(
            t('dataImport.importAborted') + ' ' + 
            t('dataImport.rollbackComplete').replace('{count}', deletedCount.toString())
          );
        } else {
          // 没有需要回滚的数据
          await saveImportHistory(
            'failed',
            tablesToImport.length,
            importData._meta.tables.reduce((sum, t) => sum + t.count, 0),
            0,
            0,
            1,
            errorMessage,
            { results: Object.fromEntries(newResults) }
          );
        }

        // 停止导入
        break;
      }
    }

    setResults(newResults);
    setImporting(false);
    setProgress(100);

    if (!hasError) {
      const successCount = Array.from(newResults.values()).filter(r => r.success).length;
      const totalRecords = Array.from(newResults.values()).reduce((sum, r) => sum + r.count, 0);

      // 保存成功历史
      await saveImportHistory(
        successCount === tablesToImport.length ? 'success' : 'partial',
        tablesToImport.length,
        importData._meta.tables.reduce((sum, t) => sum + t.count, 0),
        successCount,
        totalRecords,
        tablesToImport.length - successCount,
        null,
        { results: Object.fromEntries(newResults) }
      );

      if (successCount === tablesToImport.length) {
        toast.success(
          t('dataImport.importComplete')
            .replace('{tables}', tablesToImport.length.toString())
            .replace('{records}', totalRecords.toString())
        );
      } else {
        toast.warning(
          t('dataImport.importPartial')
            .replace('{success}', successCount.toString())
            .replace('{total}', tablesToImport.length.toString())
        );
      }
    }
  };

  const getPreviewFields = (tableName: string): string[] => {
    return PREVIEW_FIELDS[tableName] || ['id'];
  };

  const formatPreviewValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
  };

  const renderPreviewTable = (tableName: string, data: any[]) => {
    const fields = getPreviewFields(tableName);
    const sampleData = data.slice(0, PREVIEW_SAMPLE_COUNT);

    return (
      <div className="border rounded-lg overflow-hidden">
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                {fields.map(field => (
                  <TableHead key={field} className="text-xs whitespace-nowrap">
                    {field}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleData.map((record, idx) => (
                <TableRow key={idx}>
                  {fields.map(field => (
                    <TableCell key={field} className="text-xs whitespace-nowrap">
                      {formatPreviewValue(record[field])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  };

  const handleGoToPreview = () => {
    setStep('preview');
  };

  const handleBackToUpload = () => {
    setStep('upload');
  };

  const resetImport = () => {
    setImportData(null);
    setValidation(null);
    setConflicts([]);
    setResults(new Map());
    setStep('upload');
    setImportedRecords([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {t('dataImport.title')}
            </CardTitle>
            <CardDescription>
              {t('dataImport.description')}
            </CardDescription>
          </div>
          <Badge variant="outline">
            <Database className="w-3 h-3 mr-1" />
            JSON
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step: Upload */}
        {step === 'upload' && (
          <>
            {/* File Upload */}
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={importing || validating}
                className="w-full h-20 border-dashed"
              >
                <div className="flex flex-col items-center gap-2">
                  {validating ? (
                    <>
                      <ChromeLoadingSpinner variant="muted" className="h-6 w-6" />
                      <span>{t('dataImport.validating')}</span>
                    </>
                  ) : (
                    <>
                      <FileJson className="w-6 h-6" />
                      <span>{t('dataImport.selectFile')}</span>
                    </>
                  )}
                </div>
              </Button>
            </div>

            {/* Validation Results */}
            {validation && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {validation.valid ? (
                    <>
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      <span className="font-medium text-primary">
                        {t('dataImport.validationPassed')}
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-5 h-5 text-destructive" />
                      <span className="font-medium text-destructive">
                        {t('dataImport.validationFailed')}
                      </span>
                    </>
                  )}
                </div>

                {validation.errors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="w-4 h-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {validation.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {validation.warnings.length > 0 && (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {validation.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Import Data Preview Summary */}
            {importData && validation?.valid && (
              <div className="space-y-4">
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    {t('dataImport.exportDate')}: {new Date(importData._meta.exportDate).toLocaleString()}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {importData._meta.tables.map(table => (
                    <div
                      key={table.name}
                      className={`
                        p-2 rounded-lg border text-sm
                        ${SKIP_TABLES.includes(table.name) ? 'bg-muted/50 text-muted-foreground' : 'bg-muted/30'}
                      `}
                    >
                      <div className="font-medium">{getTableDisplayName(table.name)}</div>
                      <div className="text-xs text-muted-foreground">
                        {table.count} {t('dataImport.records')}
                        {SKIP_TABLES.includes(table.name) && (
                          <span className="ml-1 text-muted-foreground">
                            ({t('dataImport.skip')})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preview Button */}
                <Button 
                  variant="outline" 
                  onClick={handleGoToPreview}
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {t('dataImport.showPreview')}
                </Button>

                {/* Warning about user data */}
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    {t('dataImport.userDataWarning')}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Conflict Detection */}
            {checkingConflicts && (
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <ChromeLoadingSpinner variant="muted" className="h-4 w-4" />
                <span>{t('dataImport.checkingConflicts')}</span>
              </div>
            )}

            {conflicts.length > 0 && !checkingConflicts && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">
                    {t('dataImport.conflictsDetected').replace('{count}', conflicts.length.toString())}
                  </span>
                </div>

                <div className="space-y-2">
                  {conflicts.map(conflict => (
                    <div key={conflict.table} className="text-sm flex justify-between items-center p-2 bg-background rounded">
                      <span>{getTableDisplayName(conflict.table)}</span>
                      <span className="text-muted-foreground">
                        {t('dataImport.existingRecords')
                          .replace('{existing}', conflict.existingCount.toString())
                          .replace('{import}', conflict.importCount.toString())}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <Label className="font-medium">
                    {t('dataImport.selectStrategy')}
                  </Label>
                  <RadioGroup value={conflictStrategy} onValueChange={(v) => setConflictStrategy(v as ConflictStrategy)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="skip" id="skip" />
                      <Label htmlFor="skip" className="font-normal cursor-pointer">
                        {t('dataImport.strategySkip')}
                      </Label>
                    </div>
                    {/* Overwrite strategy removed - Production Mode */}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="append" id="append" />
                      <Label htmlFor="append" className="font-normal cursor-pointer">
                        {t('dataImport.strategyAppend')}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Import Button */}
            {importData && validation?.valid && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {t('dataImport.recordsToImport').replace('{count}', importData._meta.tables.reduce((sum, t) => sum + t.count, 0).toString())}
                </div>
                <Button onClick={handleImport} disabled={importing || checkingConflicts}>
                  {importing ? (
                    <>
                      <ChromeLoadingSpinner variant="muted" className="mr-2 h-4 w-4" />
                      {t('dataImport.importingProgress')}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {t('dataImport.startImport')}
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Step: Preview */}
        {step === 'preview' && importData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  {t('dataImport.previewTitle')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('dataImport.previewDescription')}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleBackToUpload}>
                {t('dataImport.backToUpload')}
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {importData._meta.tables
                  .filter(table => !SKIP_TABLES.includes(table.name) && table.count > 0)
                  .map(table => (
                    <Collapsible
                      key={table.name}
                      open={expandedTables.has(table.name)}
                      onOpenChange={() => toggleTableExpand(table.name)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-3 h-auto hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{getTableDisplayName(table.name)}</span>
                            <Badge variant="secondary" className="text-xs">
                              {t('dataImport.totalRecordsInTable').replace('{count}', table.count.toString())}
                            </Badge>
                          </div>
                          {expandedTables.has(table.name) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-3 pb-3">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {t('dataImport.sampleData').replace('{count}', Math.min(PREVIEW_SAMPLE_COUNT, importData[table.name]?.length || 0).toString())}
                          </p>
                          {importData[table.name] && importData[table.name].length > 0 ? (
                            renderPreviewTable(table.name, importData[table.name])
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              {t('dataImport.noDataToPreview')}
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleBackToUpload} className="flex-1">
                {t('dataImport.backToUpload')}
              </Button>
              <Button onClick={() => { setStep('upload'); }} className="flex-1">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t('dataImport.confirmPreview')}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Import Progress and Results */}
        {step === 'import' && (
          <>
            {/* Rolling Back */}
            {rollingBack && (
              <div className="space-y-2 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive">
                  <ChromeLoadingSpinner variant="muted" className="h-4 w-4" />
                  <span className="font-medium">{t('dataImport.rollbackInProgress')}</span>
                </div>
                {rollbackStatus && (
                  <p className="text-sm text-muted-foreground">{rollbackStatus}</p>
                )}
              </div>
            )}

            {/* Import Progress */}
            {importing && !rollingBack && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <ChromeLoadingSpinner variant="muted" className="h-4 w-4" />
                    {t('dataImport.importing')}: {getTableDisplayName(currentTable)}
                  </span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Import Results */}
            {results.size > 0 && !importing && !rollingBack && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  {t('dataImport.importResults')}
                </h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {Array.from(results.entries()).map(([table, result]) => (
                    <div
                      key={table}
                      className={`
                        flex items-center justify-between p-2 rounded text-sm
                        ${result.success ? 'bg-primary/10' : 'bg-destructive/10'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                        <span>{getTableDisplayName(table)}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {result.count} {t('dataImport.records')}
                        {result.errors.length > 0 && (
                          <span className="text-destructive ml-2">
                            ({result.errors[0]})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                <Button variant="outline" onClick={resetImport} className="w-full mt-4">
                  {t('dataImport.backToUpload')}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Import Instructions */}
        {step === 'upload' && (
          <div className="p-4 bg-muted/50 rounded-lg border">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              {t('dataImport.importInstructions')}
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {t('dataImport.instruction1')}</li>
              <li>• {t('dataImport.instruction2')}</li>
              <li>• {t('dataImport.instruction3')}</li>
              <li>• {t('dataImport.instruction4')}</li>
            </ul>
          </div>
        )}

        {/* Import History Section */}
        {step === 'upload' && (
          <div className="border-t pt-4">
            <Collapsible open={showHistory} onOpenChange={setShowHistory}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    <span>{t('dataImport.historyTitle')}</span>
                  </div>
                  {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-4">
                    <ChromeLoadingSpinner variant="muted" className="h-5 w-5" />
                  </div>
                ) : importHistory.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{t('dataImport.noHistory')}</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <ScrollArea className="w-full max-h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">{t('dataImport.fileName')}</TableHead>
                            <TableHead className="text-xs">{t('dataImport.importTime')}</TableHead>
                            <TableHead className="text-xs">{t('dataImport.importStatus')}</TableHead>
                            <TableHead className="text-xs text-right">{t('dataImport.successRecords')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importHistory.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="text-sm font-medium max-w-[150px] truncate">
                                {record.file_name}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(record.imported_at).toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    record.status === 'success' ? 'default' :
                                    record.status === 'partial' ? 'secondary' :
                                    record.status === 'rolled_back' ? 'outline' :
                                    'destructive'
                                  }
                                  className="text-xs"
                                >
                                  {record.status === 'success' && t('dataImport.statusSuccess')}
                                  {record.status === 'partial' && t('dataImport.statusPartial')}
                                  {record.status === 'failed' && t('dataImport.statusFailed')}
                                  {record.status === 'rolled_back' && t('dataImport.statusRolledBack')}
                                  {record.status === 'pending' && t('dataImport.statusPending')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-right">
                                {record.success_records} / {record.total_records}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
