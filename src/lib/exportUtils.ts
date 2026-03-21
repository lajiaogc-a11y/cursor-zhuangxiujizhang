import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

// Expense category labels - will be replaced with dynamic labels based on language
export const EXPENSE_CATEGORY_LABELS: Record<string, Record<string, string>> = {
  zh: {
    material: '材料采购',
    project_management: '工程管理',
    outsourcing: '外包费用',
    transportation: '运输费用',
    labor: '人工开支',
    other: '其它开支',
  },
  en: {
    material: 'Materials',
    project_management: 'Project Management',
    outsourcing: 'Outsourcing',
    transportation: 'Transportation',
    labor: 'Labor',
    other: 'Other',
  },
};

// Get labels based on language
const getLabels = (lang: 'zh' | 'en' = 'zh') => ({
  // Project Report
  projectReport: lang === 'zh' ? '项目财务报表' : 'Project Financial Report',
  projectName: lang === 'zh' ? '项目名称' : 'Project Name',
  projectCode: lang === 'zh' ? '项目编号' : 'Project Code',
  customerName: lang === 'zh' ? '客户姓名' : 'Customer Name',
  contractAmount: lang === 'zh' ? '合同金额' : 'Contract Amount',
  financialOverview: lang === 'zh' ? '财务概览' : 'Financial Overview',
  item: lang === 'zh' ? '项目' : 'Item',
  amountMYR: lang === 'zh' ? '金额 (MYR)' : 'Amount (MYR)',
  totalIncome: lang === 'zh' ? '总收入' : 'Total Income',
  totalExpense: lang === 'zh' ? '总支出' : 'Total Expense',
  netProfit: lang === 'zh' ? '净利润' : 'Net Profit',
  paymentRecords: lang === 'zh' ? '收款记录' : 'Payment Records',
  date: lang === 'zh' ? '日期' : 'Date',
  stage: lang === 'zh' ? '阶段' : 'Stage',
  amount: lang === 'zh' ? '金额' : 'Amount',
  myrEquivalent: lang === 'zh' ? '折合MYR' : 'MYR Equivalent',
  expenseRecords: lang === 'zh' ? '支出记录' : 'Expense Records',
  category: lang === 'zh' ? '类别' : 'Category',
  description: lang === 'zh' ? '描述' : 'Description',
  generatedAt: lang === 'zh' ? '生成时间' : 'Generated At',
  page: lang === 'zh' ? '页' : 'Page',
  overview: lang === 'zh' ? '概览' : 'Overview',
  contractAmountMYR: lang === 'zh' ? '合同金额(MYR)' : 'Contract Amount (MYR)',
  profitMargin: lang === 'zh' ? '利润率(%)' : 'Profit Margin (%)',
  currency: lang === 'zh' ? '币种' : 'Currency',
  accountType: lang === 'zh' ? '账户类型' : 'Account Type',
  remark: lang === 'zh' ? '备注' : 'Remark',
  cash: lang === 'zh' ? '现金' : 'Cash',
  bank: lang === 'zh' ? '网银' : 'Bank',
  totalAddition: lang === 'zh' ? '增项金额' : 'Addition Amount',
  totalReceived: lang === 'zh' ? '已收款' : 'Received',
  pendingAmount: lang === 'zh' ? '待收款' : 'Pending',
  receivableTotal: lang === 'zh' ? '应收总额' : 'Total Receivable',
  
  // Company Report
  companyReport: lang === 'zh' ? '公司收支报表' : 'Company Transaction Report',
  reportPeriod: lang === 'zh' ? '报表周期' : 'Report Period',
  incomeByCategory: lang === 'zh' ? '收入分类' : 'Income by Category',
  expenseByCategory: lang === 'zh' ? '支出分类' : 'Expense by Category',
  transactionDetails: lang === 'zh' ? '交易明细' : 'Transaction Details',
  type: lang === 'zh' ? '类型' : 'Type',
  summary: lang === 'zh' ? '摘要' : 'Summary',
  account: lang === 'zh' ? '账户' : 'Account',
  income: lang === 'zh' ? '收入' : 'Income',
  expense: lang === 'zh' ? '支出' : 'Expense',
  ledger: lang === 'zh' ? '账本' : 'Ledger',
  companyDaily: lang === 'zh' ? '公司日常' : 'Company Daily',
  project: lang === 'zh' ? '工程项目' : 'Project',
  exchange: lang === 'zh' ? '货币兑换' : 'Exchange',
  sequenceNo: lang === 'zh' ? '序号' : 'No.',
  receipt: lang === 'zh' ? '票据' : 'Receipt',
  source: lang === 'zh' ? '来源' : 'Source',
  creator: lang === 'zh' ? '记账人' : 'Creator',
  
  // AP Report
  apReport: lang === 'zh' ? '应付账款报表' : 'Accounts Payable Report',
  supplier: lang === 'zh' ? '供应商' : 'Supplier',
  totalAmountLabel: lang === 'zh' ? '总金额' : 'Total Amount',
  paidAmount: lang === 'zh' ? '已付' : 'Paid',
  unpaidAmount: lang === 'zh' ? '未付' : 'Unpaid',
  statusLabel: lang === 'zh' ? '状态' : 'Status',
  dueDateLabel: lang === 'zh' ? '到期日' : 'Due Date',
  overdueCount: lang === 'zh' ? '逾期数量' : 'Overdue Count',
  pending: lang === 'zh' ? '待付' : 'Pending',
  partial: lang === 'zh' ? '部分付' : 'Partial',
  paidStatus: lang === 'zh' ? '已付清' : 'Paid',
  apSummary: lang === 'zh' ? '概览' : 'Summary',
  apDetails: lang === 'zh' ? '应付明细' : 'Payable Details',
  apPayments: lang === 'zh' ? '付款记录' : 'Payment Records',
  projectLabel: lang === 'zh' ? '关联项目' : 'Project',
});

// 格式化货币
const formatCurrency = (amount: number, currency: string = 'MYR') => {
  const symbols: Record<string, string> = { MYR: 'RM', CNY: '¥', USD: '$' };
  return `${symbols[currency] || ''}${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
};

// Get expense category label based on language
export const getExpenseCategoryLabel = (category: string, lang: 'zh' | 'en' = 'zh') => {
  return EXPENSE_CATEGORY_LABELS[lang]?.[category] || category;
};

// Helper function to draw Chinese text using canvas
const drawChineseText = (doc: jsPDF, text: string, x: number, y: number, options: { align?: 'left' | 'center' | 'right', fontSize?: number } = {}) => {
  const { align = 'left', fontSize = 12 } = options;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const scale = 3;
  ctx.font = `${fontSize * scale}px "Microsoft YaHei", "SimHei", "Heiti SC", sans-serif`;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width / scale;
  
  canvas.width = Math.ceil(metrics.width) + 10;
  canvas.height = Math.ceil(fontSize * scale * 1.5);
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.font = `${fontSize * scale}px "Microsoft YaHei", "SimHei", "Heiti SC", sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, 0, fontSize * scale * 0.2);
  
  let finalX = x;
  if (align === 'center') {
    finalX = (pageWidth - textWidth) / 2;
  } else if (align === 'right') {
    finalX = pageWidth - x - textWidth;
  }
  
  try {
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', finalX, y - fontSize * 0.8, textWidth, fontSize * 1.2);
  } catch (e) {
    doc.text(text, x, y, { align });
  }
};

// Check if text contains Chinese characters
const containsChinese = (text: string): boolean => /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);

// didDrawCell hook for rendering Chinese text in autoTable cells via Canvas
const getDidDrawCellHook = (doc: jsPDF) => ({
  didDrawCell: (data: any) => {
    if (data.section === 'body' || data.section === 'head') {
      const cellText = String(data.cell.text?.join?.('') || data.cell.text || '');
      if (cellText && containsChinese(cellText)) {
        const { x, y, width, height } = data.cell;
        const fontSize = data.cell.styles?.fontSize || 10;
        
        doc.setFillColor(
          data.section === 'head' 
            ? (data.cell.styles?.fillColor?.[0] ?? 59)
            : data.row.index % 2 === 1 
              ? 245 : 255,
          data.section === 'head'
            ? (data.cell.styles?.fillColor?.[1] ?? 130)
            : data.row.index % 2 === 1 
              ? 247 : 255,
          data.section === 'head'
            ? (data.cell.styles?.fillColor?.[2] ?? 246)
            : data.row.index % 2 === 1 
              ? 250 : 255
        );
        doc.rect(x, y, width, height, 'F');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const scale = 3;
        const fontPx = fontSize * scale;
        ctx.font = `${data.section === 'head' ? 'bold ' : ''}${fontPx}px "Microsoft YaHei", "SimHei", "Heiti SC", "PingFang SC", sans-serif`;
        const metrics = ctx.measureText(cellText);
        const textW = metrics.width;
        
        canvas.width = Math.ceil(textW) + 10;
        canvas.height = Math.ceil(fontPx * 1.6);
        
        ctx.font = `${data.section === 'head' ? 'bold ' : ''}${fontPx}px "Microsoft YaHei", "SimHei", "Heiti SC", "PingFang SC", sans-serif`;
        ctx.fillStyle = data.section === 'head' ? '#ffffff' : '#000000';
        ctx.textBaseline = 'top';
        ctx.fillText(cellText, 2, fontPx * 0.25);
        
        try {
          const imgData = canvas.toDataURL('image/png');
          const imgW = textW / scale;
          const imgH = fontSize * 1.3;
          const padding = data.cell.styles?.cellPadding || 3;
          doc.addImage(imgData, 'PNG', x + padding, y + (height - imgH) / 2, imgW, imgH);
        } catch (e) {
          // Fallback: do nothing
        }
      }
    }
  }
});

// Configure autoTable for Chinese support
const getAutoTableStyles = (doc?: jsPDF) => ({
  styles: {
    font: 'helvetica',
    fontSize: 10,
    cellPadding: 3,
  },
  headStyles: {
    fillColor: [59, 130, 246] as [number, number, number],
    textColor: 255,
    fontStyle: 'bold' as const,
  },
  alternateRowStyles: {
    fillColor: [245, 247, 250] as [number, number, number],
  },
  ...(doc ? getDidDrawCellHook(doc) : {}),
});

// 项目财务报表导出
export interface ProjectFinancialData {
  projectName: string;
  projectCode: string;
  customerName: string;
  contractAmount: number;
  contractCurrency: string;
  contractAmountMYR: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  totalAddition?: number;
  totalReceived?: number;
  pendingAmount?: number;
  expenses: {
    date: string;
    category: string;
    description: string;
    amount: number;
    currency: string;
    amountMYR: number;
    accountType?: string;
    remark?: string;
  }[];
  payments: {
    date: string;
    stage: string;
    amount: number;
    currency: string;
    amountMYR: number;
    accountType?: string;
    remark?: string;
  }[];
  language?: 'zh' | 'en';
}

export const exportProjectToPDF = (data: ProjectFinancialData) => {
  const lang = data.language || 'zh';
  const labels = getLabels(lang);
  // Use landscape for more columns
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const baseStyles = getAutoTableStyles(doc);
  
  // 标题
  doc.setFontSize(18);
  if (lang === 'zh') {
    drawChineseText(doc, labels.projectReport, pageWidth / 2, 20, { align: 'center', fontSize: 18 });
  } else {
    doc.text(labels.projectReport, pageWidth / 2, 20, { align: 'center' });
  }
  
  // 项目基本信息 - 使用 autoTable 避免重叠
  const projectInfoBody = [
    [labels.projectName, data.projectName],
    [labels.projectCode, data.projectCode],
    [labels.customerName, data.customerName],
    [labels.contractAmount, `${formatCurrency(data.contractAmount, data.contractCurrency)} (${formatCurrency(data.contractAmountMYR)})`],
  ];
  if (data.totalAddition !== undefined) {
    projectInfoBody.push([labels.totalAddition, formatCurrency(data.totalAddition)]);
  }
  if (data.totalReceived !== undefined) {
    projectInfoBody.push([labels.receivableTotal, formatCurrency(data.totalIncome)]);
    projectInfoBody.push([labels.totalReceived, formatCurrency(data.totalReceived)]);
  }
  if (data.pendingAmount !== undefined) {
    projectInfoBody.push([labels.pendingAmount, formatCurrency(data.pendingAmount)]);
  }

  autoTable(doc, {
    startY: 28,
    body: projectInfoBody,
    theme: 'plain',
    ...getDidDrawCellHook(doc),
    styles: { fontSize: 11, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 'auto' },
    },
  });
  
  // 财务概览
  const afterInfo = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(14);
  if (lang === 'zh') {
    drawChineseText(doc, labels.financialOverview, 14, afterInfo, { fontSize: 14 });
  } else {
    doc.text(labels.financialOverview, 14, afterInfo);
  }

  const overviewBody: string[][] = [];
  if (data.totalReceived !== undefined) {
    overviewBody.push([labels.totalReceived, formatCurrency(data.totalReceived)]);
  } else {
    overviewBody.push([labels.totalIncome, formatCurrency(data.totalIncome)]);
  }
  overviewBody.push([labels.totalExpense, formatCurrency(data.totalExpense)]);
  overviewBody.push([labels.netProfit, formatCurrency(data.netProfit)]);
  const profitBase = data.totalReceived !== undefined ? data.totalReceived : data.totalIncome;
  if (profitBase > 0) {
    overviewBody.push([labels.profitMargin, ((data.netProfit / profitBase) * 100).toFixed(2) + '%']);
  }
  
  autoTable(doc, {
    startY: afterInfo + 3,
    head: [[labels.item, labels.amountMYR]],
    body: overviewBody,
    theme: 'grid',
    ...baseStyles,
    headStyles: { ...baseStyles.headStyles, fillColor: [59, 130, 246] },
    tableWidth: 120,
  });
  
  // 收款记录
  const afterOverview = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  if (lang === 'zh') {
    drawChineseText(doc, labels.paymentRecords, 14, afterOverview, { fontSize: 14 });
  } else {
    doc.text(labels.paymentRecords, 14, afterOverview);
  }
  
  if (data.payments.length > 0) {
    autoTable(doc, {
      startY: afterOverview + 3,
      head: [[labels.date, labels.stage, labels.amount, labels.myrEquivalent, labels.accountType, labels.remark]],
      body: data.payments.map(p => [
        p.date,
        p.stage,
        formatCurrency(p.amount, p.currency),
        formatCurrency(p.amountMYR),
        p.accountType === 'cash' ? labels.cash : labels.bank,
        p.remark || '',
      ]),
      theme: 'striped',
      ...baseStyles,
      headStyles: { ...baseStyles.headStyles, fillColor: [34, 197, 94] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 20 },
        5: { cellWidth: 40 },
      },
    });
  }
  
  // 支出记录
  const afterPayments = (doc as any).lastAutoTable?.finalY + 10 || afterOverview + 15;
  
  // Check if we need a new page
  let expenseStartY = afterPayments;
  if (afterPayments > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    expenseStartY = 20;
  }
  
  doc.setFontSize(14);
  if (lang === 'zh') {
    drawChineseText(doc, labels.expenseRecords, 14, expenseStartY, { fontSize: 14 });
  } else {
    doc.text(labels.expenseRecords, 14, expenseStartY);
  }
  
  if (data.expenses.length > 0) {
    autoTable(doc, {
      startY: expenseStartY + 3,
      head: [[labels.date, labels.category, labels.description, labels.amount, labels.myrEquivalent, labels.accountType, labels.remark]],
      body: data.expenses.map(e => [
        e.date,
        getExpenseCategoryLabel(e.category, lang),
        e.description,
        formatCurrency(e.amount, e.currency),
        formatCurrency(e.amountMYR),
        e.accountType === 'cash' ? labels.cash : labels.bank,
        e.remark || '',
      ]),
      theme: 'striped',
      ...baseStyles,
      headStyles: { ...baseStyles.headStyles, fillColor: [239, 68, 68] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 20 },
        6: { cellWidth: 40 },
      },
    });
  }
  
  // 页脚
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    const footerText = `${labels.generatedAt}: ${format(new Date(), 'yyyy-MM-dd HH:mm')} | ${labels.page} ${i} / ${pageCount}`;
    doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }
  
  const filePrefix = 'Project_Report';
  doc.save(`${filePrefix}_${data.projectCode}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const exportProjectToExcel = (data: ProjectFinancialData) => {
  const lang = data.language || 'zh';
  const labels = getLabels(lang);
  const wb = XLSX.utils.book_new();
  
  // 概览表 - enhanced with addition/received/pending
  const profitBase = data.totalReceived !== undefined ? data.totalReceived : data.totalIncome;
  const overviewData: any[][] = [
    [labels.projectReport],
    [''],
    [labels.projectName, data.projectName],
    [labels.projectCode, data.projectCode],
    [labels.customerName, data.customerName],
    [labels.contractAmount, data.contractAmount, data.contractCurrency],
    [labels.contractAmountMYR, data.contractAmountMYR],
  ];
  if (data.totalAddition !== undefined) {
    overviewData.push([labels.totalAddition, data.totalAddition]);
    overviewData.push([labels.receivableTotal, data.totalIncome]);
  }
  if (data.totalReceived !== undefined) {
    overviewData.push([labels.totalReceived, data.totalReceived]);
  }
  if (data.pendingAmount !== undefined) {
    overviewData.push([labels.pendingAmount, data.pendingAmount]);
  }
  overviewData.push(['']);
  overviewData.push([labels.financialOverview]);
  if (data.totalReceived !== undefined) {
    overviewData.push([`${labels.totalReceived}(MYR)`, data.totalReceived]);
  } else {
    overviewData.push([`${labels.totalIncome}(MYR)`, data.totalIncome]);
  }
  overviewData.push([`${labels.totalExpense}(MYR)`, data.totalExpense]);
  overviewData.push([`${labels.netProfit}(MYR)`, data.netProfit]);
  overviewData.push([labels.profitMargin, profitBase > 0 ? ((data.netProfit / profitBase) * 100).toFixed(2) : '0']);

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  wsOverview['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, labels.overview);
  
  // 收款表 - with accountType and remark
  const paymentsData = [
    [labels.paymentRecords],
    [labels.date, labels.stage, labels.amount, labels.currency, labels.myrEquivalent, labels.accountType, labels.remark],
    ...data.payments.map(p => [
      p.date, 
      p.stage, 
      p.amount, 
      p.currency, 
      p.amountMYR,
      p.accountType === 'cash' ? labels.cash : labels.bank,
      p.remark || ''
    ]),
  ];
  const wsPayments = XLSX.utils.aoa_to_sheet(paymentsData);
  wsPayments['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsPayments, labels.paymentRecords);
  
  // 支出表 - with accountType and remark
  const expensesData = [
    [labels.expenseRecords],
    [labels.date, labels.category, labels.description, labels.amount, labels.currency, labels.myrEquivalent, labels.accountType, labels.remark],
    ...data.expenses.map(e => [
      e.date, 
      getExpenseCategoryLabel(e.category, lang), 
      e.description, 
      e.amount, 
      e.currency, 
      e.amountMYR,
      e.accountType === 'cash' ? labels.cash : labels.bank,
      e.remark || ''
    ]),
  ];
  const wsExpenses = XLSX.utils.aoa_to_sheet(expensesData);
  wsExpenses['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsExpenses, labels.expenseRecords);
  
  const filePrefix = lang === 'zh' ? '项目报表' : 'Project_Report';
  XLSX.writeFile(wb, `${filePrefix}_${data.projectCode}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
};

// 公司收支报表导出
export interface CompanyTransactionData {
  period: string;
  transactions: {
    sequenceNo?: number;
    date: string;
    type: string;
    category: string;
    summary: string;
    amount: number;
    currency: string;
    amountMYR: number;
    accountType: string;
    ledgerType?: string;
    receipt?: string;
    source?: string;
    remark?: string;
    creator?: string;
  }[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    incomeByCategory: { name: string; value: number }[];
    expenseByCategory: { name: string; value: number }[];
  };
  language?: 'zh' | 'en';
}

const getLedgerLabel = (ledgerType: string, labels: ReturnType<typeof getLabels>) => {
  switch (ledgerType) {
    case 'company_daily': return labels.companyDaily;
    case 'project': return labels.project;
    case 'exchange': return labels.exchange;
    default: return ledgerType || '';
  }
};

export const exportTransactionsToPDF = (data: CompanyTransactionData) => {
  const lang = data.language || 'zh';
  const labels = getLabels(lang);
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const baseStyles = getAutoTableStyles(doc);
  
  // 标题
  doc.setFontSize(18);
  if (lang === 'zh') {
    drawChineseText(doc, labels.companyReport, pageWidth / 2, 20, { align: 'center', fontSize: 18 });
  } else {
    doc.text(labels.companyReport, pageWidth / 2, 20, { align: 'center' });
  }
  
  doc.setFontSize(12);
  if (lang === 'zh') {
    drawChineseText(doc, `${labels.reportPeriod}: ${data.period}`, pageWidth / 2, 30, { align: 'center', fontSize: 12 });
  } else {
    doc.text(`${labels.reportPeriod}: ${data.period}`, pageWidth / 2, 30, { align: 'center' });
  }
  
  // 概览
  let y = 40;
  autoTable(doc, {
    startY: y,
    head: [[labels.item, labels.amountMYR]],
    body: [
      [labels.totalIncome, formatCurrency(data.summary.totalIncome)],
      [labels.totalExpense, formatCurrency(data.summary.totalExpense)],
      [labels.netProfit, formatCurrency(data.summary.netProfit)],
    ],
    theme: 'grid',
    ...baseStyles,
    headStyles: { ...baseStyles.headStyles, fillColor: [59, 130, 246] },
    tableWidth: 120,
  });
  
  // 收入分类
  const afterSummary = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  if (lang === 'zh') {
    drawChineseText(doc, labels.incomeByCategory, 14, afterSummary, { fontSize: 14 });
  } else {
    doc.text(labels.incomeByCategory, 14, afterSummary);
  }
  
  if (data.summary.incomeByCategory.length > 0) {
    autoTable(doc, {
      startY: afterSummary + 3,
      head: [[labels.category, labels.amountMYR]],
      body: data.summary.incomeByCategory.map(c => [c.name, formatCurrency(c.value)]),
      theme: 'striped',
      ...baseStyles,
      headStyles: { ...baseStyles.headStyles, fillColor: [34, 197, 94] },
      tableWidth: 120,
    });
  }
  
  // 支出分类
  const afterIncome = (doc as any).lastAutoTable?.finalY + 10 || afterSummary + 15;
  doc.setFontSize(14);
  if (lang === 'zh') {
    drawChineseText(doc, labels.expenseByCategory, 14, afterIncome, { fontSize: 14 });
  } else {
    doc.text(labels.expenseByCategory, 14, afterIncome);
  }
  
  if (data.summary.expenseByCategory.length > 0) {
    autoTable(doc, {
      startY: afterIncome + 3,
      head: [[labels.category, labels.amountMYR]],
      body: data.summary.expenseByCategory.map(c => [c.name, formatCurrency(c.value)]),
      theme: 'striped',
      ...baseStyles,
      headStyles: { ...baseStyles.headStyles, fillColor: [239, 68, 68] },
      tableWidth: 120,
    });
  }
  
  // 明细 (新页)
  doc.addPage();
  doc.setFontSize(14);
  if (lang === 'zh') {
    drawChineseText(doc, labels.transactionDetails, 14, 20, { fontSize: 14 });
  } else {
    doc.text(labels.transactionDetails, 14, 20);
  }

  const hasLedger = data.transactions.some(t => t.ledgerType);
  const hasRemark = data.transactions.some(t => t.remark);

  const detailHead = [labels.sequenceNo, labels.date, labels.type];
  if (hasLedger) detailHead.push(labels.ledger);
  detailHead.push(labels.category, labels.summary, labels.amount, labels.account, labels.source);
  if (hasRemark) detailHead.push(labels.remark);
  detailHead.push(labels.creator);
  
  autoTable(doc, {
    startY: 25,
    head: [detailHead],
    body: data.transactions.map((t, idx) => {
      const row = [
        String(t.sequenceNo ?? (idx + 1)),
        t.date,
        t.type === 'income' ? labels.income : labels.expense,
      ];
      if (hasLedger) row.push(getLedgerLabel(t.ledgerType || '', labels));
      row.push(
        t.category,
        t.summary.length > 30 ? t.summary.substring(0, 30) + '...' : t.summary,
        formatCurrency(t.amountMYR),
        t.accountType === 'cash' ? labels.cash : labels.bank,
        t.source || '',
      );
      if (hasRemark) row.push(t.remark || '');
      row.push(t.creator || '');
      return row;
    }),
    theme: 'striped',
    ...baseStyles,
    styles: { ...baseStyles.styles, fontSize: 9 },
  });
  
  // 页脚
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    const footerText = `${labels.generatedAt}: ${format(new Date(), 'yyyy-MM-dd HH:mm')} | ${labels.page} ${i} / ${pageCount}`;
    doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }
  
  const filePrefix = 'Company_Report';
  doc.save(`${filePrefix}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const exportTransactionsToExcel = (data: CompanyTransactionData) => {
  const lang = data.language || 'zh';
  const labels = getLabels(lang);
  const wb = XLSX.utils.book_new();
  
  // 概览表
  const overviewData = [
    [labels.companyReport],
    [labels.reportPeriod, data.period],
    [''],
    [labels.financialOverview],
    [`${labels.totalIncome}(MYR)`, data.summary.totalIncome],
    [`${labels.totalExpense}(MYR)`, data.summary.totalExpense],
    [`${labels.netProfit}(MYR)`, data.summary.netProfit],
    [''],
    [labels.incomeByCategory],
    ...data.summary.incomeByCategory.map(c => [c.name, c.value]),
    [''],
    [labels.expenseByCategory],
    ...data.summary.expenseByCategory.map(c => [c.name, c.value]),
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, labels.overview);
  
  // 明细表 - match UI columns: 序号, 日期, 收支, 账本, 分类, 摘要, 金额, 币种, 折合MYR, 账户, 票据, 来源, 备注, 记账人
  const hasLedger = data.transactions.some(t => t.ledgerType);

  const detailHeader = [labels.sequenceNo, labels.date, labels.type];
  if (hasLedger) detailHeader.push(labels.ledger);
  detailHeader.push(labels.category, labels.summary, labels.amount, labels.currency, labels.myrEquivalent, labels.account, labels.receipt, labels.source, labels.remark, labels.creator);

  const detailData = [
    [labels.transactionDetails],
    detailHeader,
    ...data.transactions.map((t, idx) => {
      const row: any[] = [
        t.sequenceNo ?? (idx + 1),
        t.date,
        t.type === 'income' ? labels.income : labels.expense,
      ];
      if (hasLedger) row.push(getLedgerLabel(t.ledgerType || '', labels));
      row.push(
        t.category,
        t.summary,
        t.amount,
        t.currency,
        t.amountMYR,
        t.accountType === 'cash' ? labels.cash : labels.bank,
        t.receipt || '',
        t.source || '',
        t.remark || '',
        t.creator || '',
      );
      return row;
    }),
  ];
  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  XLSX.utils.book_append_sheet(wb, wsDetail, labels.transactionDetails);
  
  const filePrefix = lang === 'zh' ? '公司收支报表' : 'Company_Report';
  XLSX.writeFile(wb, `${filePrefix}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
};

// ============ AP Export Functions ============

export interface PayableExportData {
  payables: {
    date: string;
    supplier: string;
    description: string;
    totalAmount: number;
    currency: string;
    paidAmount: number;
    unpaidAmount: number;
    status: string;
    project: string;
    dueDate: string;
    remark: string;
  }[];
  summary: {
    totalPayable: number;
    totalPaid: number;
    totalUnpaid: number;
    overdueCount: number;
  };
  language?: 'zh' | 'en';
}

const getStatusLabel = (status: string, labels: ReturnType<typeof getLabels>) => {
  switch (status) {
    case 'pending': return labels.pending;
    case 'partial': return labels.partial;
    case 'paid': return labels.paidStatus;
    default: return status;
  }
};

export const exportPayablesToPDF = (data: PayableExportData) => {
  const lang = data.language || 'zh';
  const labels = getLabels(lang);
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const baseStyles = getAutoTableStyles(doc);

  doc.setFontSize(18);
  if (lang === 'zh') {
    drawChineseText(doc, labels.apReport, pageWidth / 2, 20, { align: 'center', fontSize: 18 });
  } else {
    doc.text(labels.apReport, pageWidth / 2, 20, { align: 'center' });
  }

  // Summary
  autoTable(doc, {
    startY: 30,
    head: [[labels.item, labels.amountMYR]],
    body: [
      [labels.totalAmountLabel, formatCurrency(data.summary.totalPayable)],
      [labels.paidAmount, formatCurrency(data.summary.totalPaid)],
      [labels.unpaidAmount, formatCurrency(data.summary.totalUnpaid)],
      [labels.overdueCount, String(data.summary.overdueCount)],
    ],
    theme: 'grid',
    ...baseStyles,
    tableWidth: 140,
  });

  // Details
  const afterSummary = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  if (lang === 'zh') {
    drawChineseText(doc, labels.apDetails, 14, afterSummary, { fontSize: 14 });
  } else {
    doc.text(labels.apDetails, 14, afterSummary);
  }

  if (data.payables.length > 0) {
    autoTable(doc, {
      startY: afterSummary + 3,
      head: [[labels.date, labels.supplier, labels.description, labels.totalAmountLabel, labels.paidAmount, labels.unpaidAmount, labels.statusLabel, labels.dueDateLabel, labels.projectLabel]],
      body: data.payables.map(p => [
        p.date,
        p.supplier,
        p.description.length > 20 ? p.description.substring(0, 20) + '...' : p.description,
        formatCurrency(p.totalAmount, p.currency),
        formatCurrency(p.paidAmount, p.currency),
        formatCurrency(p.unpaidAmount, p.currency),
        getStatusLabel(p.status, labels),
        p.dueDate || '-',
        p.project || '-',
      ]),
      theme: 'striped',
      ...baseStyles,
      styles: { ...baseStyles.styles, fontSize: 9 },
    });
  }

  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    const footerText = `${labels.generatedAt}: ${format(new Date(), 'yyyy-MM-dd HH:mm')} | ${labels.page} ${i} / ${pageCount}`;
    doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`AP_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const exportPayablesToExcel = (data: PayableExportData) => {
  const lang = data.language || 'zh';
  const labels = getLabels(lang);
  const wb = XLSX.utils.book_new();

  const overviewData = [
    [labels.apReport],
    [''],
    [labels.totalAmountLabel + ' (MYR)', data.summary.totalPayable],
    [labels.paidAmount + ' (MYR)', data.summary.totalPaid],
    [labels.unpaidAmount + ' (MYR)', data.summary.totalUnpaid],
    [labels.overdueCount, data.summary.overdueCount],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  wsOverview['!cols'] = [{ wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, labels.apSummary);

  const detailData = [
    [labels.apDetails],
    [labels.date, labels.supplier, labels.description, labels.totalAmountLabel, labels.currency, labels.paidAmount, labels.unpaidAmount, labels.statusLabel, labels.dueDateLabel, labels.projectLabel, labels.remark],
    ...data.payables.map(p => [
      p.date, p.supplier, p.description, p.totalAmount, p.currency,
      p.paidAmount, p.unpaidAmount, getStatusLabel(p.status, labels),
      p.dueDate || '', p.project || '', p.remark || '',
    ]),
  ];
  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  wsDetail['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, labels.apDetails);

  const filePrefix = lang === 'zh' ? '应付账款报表' : 'AP_Report';
  XLSX.writeFile(wb, `${filePrefix}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
};
