import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface InvoicePdfData {
  invoice_number: string;
  invoice_type: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  terms: string | null;
  contact?: { name: string; company_name?: string | null; address?: string | null; phone?: string | null; email?: string | null } | null;
  project?: { project_code: string; project_name: string } | null;
  items: { description: string; quantity: number; unit_price: number; tax_amount: number; amount: number; tax_rate_name?: string }[];
  language?: 'zh' | 'en';
}

const drawChineseText = (doc: jsPDF, text: string, x: number, y: number, opts: { align?: 'left' | 'center' | 'right'; fontSize?: number; color?: number[] } = {}) => {
  const { align = 'left', fontSize = 12, color = [0, 0, 0] } = opts;
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
  ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
  ctx.font = `${fontSize * scale}px "Microsoft YaHei", "SimHei", "Heiti SC", sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, 0, fontSize * scale * 0.2);
  let finalX = x;
  if (align === 'center') finalX = (pageWidth - textWidth) / 2;
  else if (align === 'right') finalX = pageWidth - x - textWidth;
  try {
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', finalX, y - fontSize * 0.8, textWidth, fontSize * 1.2);
  } catch { doc.text(text, x, y, { align }); }
};

const containsChinese = (text: string): boolean => /[\u4e00-\u9fff]/.test(text);

const getDidDrawCellHook = (doc: jsPDF) => ({
  didDrawCell: (data: any) => {
    if (data.section === 'body' || data.section === 'head') {
      const cellText = String(data.cell.text?.join?.('') || data.cell.text || '');
      if (cellText && containsChinese(cellText)) {
        const { x, y, width, height } = data.cell;
        const fontSize = data.cell.styles?.fontSize || 10;
        doc.setFillColor(
          data.section === 'head' ? 59 : data.row.index % 2 === 1 ? 245 : 255,
          data.section === 'head' ? 130 : data.row.index % 2 === 1 ? 247 : 255,
          data.section === 'head' ? 246 : data.row.index % 2 === 1 ? 250 : 255
        );
        doc.rect(x, y, width, height, 'F');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const scale = 3;
        const fontPx = fontSize * scale;
        ctx.font = `${data.section === 'head' ? 'bold ' : ''}${fontPx}px "Microsoft YaHei", "SimHei", sans-serif`;
        const metrics = ctx.measureText(cellText);
        canvas.width = Math.ceil(metrics.width) + 10;
        canvas.height = Math.ceil(fontPx * 1.6);
        ctx.font = `${data.section === 'head' ? 'bold ' : ''}${fontPx}px "Microsoft YaHei", "SimHei", sans-serif`;
        ctx.fillStyle = data.section === 'head' ? '#ffffff' : '#000000';
        ctx.textBaseline = 'top';
        ctx.fillText(cellText, 2, fontPx * 0.25);
        try {
          const imgData = canvas.toDataURL('image/png');
          const imgW = metrics.width / scale;
          const imgH = fontSize * 1.3;
          const padding = data.cell.styles?.cellPadding || 3;
          doc.addImage(imgData, 'PNG', x + padding, y + (height - imgH) / 2, imgW, imgH);
        } catch {}
      }
    }
  }
});

const labels = (lang: 'zh' | 'en') => lang === 'zh' ? {
  invoice: '发票', quotation: '报价单', receipt: '收据',
  number: '单号', date: '日期', dueDate: '到期日期',
  contact: '客户/供应商', company: '公司', address: '地址', phone: '电话', email: '邮箱',
  project: '关联项目', status: '状态',
  description: '描述', quantity: '数量', unitPrice: '单价', tax: '税额', amount: '金额',
  subtotal: '小计', taxAmount: '税额合计', total: '总计',
  notes: '备注', terms: '条款', page: '页', generatedAt: '生成时间',
  draft: '草稿', sent: '已发送', paid: '已付款', cancelled: '已取消',
} : {
  invoice: 'Invoice', quotation: 'Quotation', receipt: 'Receipt',
  number: 'Number', date: 'Date', dueDate: 'Due Date',
  contact: 'Contact', company: 'Company', address: 'Address', phone: 'Phone', email: 'Email',
  project: 'Project', status: 'Status',
  description: 'Description', quantity: 'Qty', unitPrice: 'Unit Price', tax: 'Tax', amount: 'Amount',
  subtotal: 'Subtotal', taxAmount: 'Total Tax', total: 'Total',
  notes: 'Notes', terms: 'Terms', page: 'Page', generatedAt: 'Generated At',
  draft: 'Draft', sent: 'Sent', paid: 'Paid', cancelled: 'Cancelled',
};

const typeTitle = (type: string, l: ReturnType<typeof labels>) => {
  switch (type) { case 'quotation': return l.quotation; case 'receipt': return l.receipt; default: return l.invoice; }
};

const statusText = (s: string, l: ReturnType<typeof labels>) => {
  switch (s) { case 'draft': return l.draft; case 'sent': return l.sent; case 'paid': return l.paid; case 'cancelled': return l.cancelled; default: return s; }
};

export const exportInvoiceToPDF = (data: InvoicePdfData) => {
  const lang = data.language || 'zh';
  const l = labels(lang);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const hook = getDidDrawCellHook(doc);
  const isChinese = lang === 'zh';

  // Title
  const title = typeTitle(data.invoice_type, l);
  doc.setFontSize(22);
  if (isChinese) drawChineseText(doc, title, pageWidth / 2, 22, { align: 'center', fontSize: 22 });
  else doc.text(title, pageWidth / 2, 22, { align: 'center' });

  // Invoice number & status
  doc.setFontSize(11);
  const numText = `${l.number}: ${data.invoice_number}`;
  const statusT = `${l.status}: ${statusText(data.status, l)}`;
  if (isChinese) {
    drawChineseText(doc, numText, 14, 35, { fontSize: 11 });
    drawChineseText(doc, statusT, pageWidth - 14, 35, { align: 'right', fontSize: 11 });
  } else {
    doc.text(numText, 14, 35);
    doc.text(statusT, pageWidth - 14, 35, { align: 'right' });
  }

  // Info table
  const infoBody: string[][] = [
    [l.date, data.issue_date],
  ];
  if (data.due_date) infoBody.push([l.dueDate, data.due_date]);
  if (data.contact) {
    infoBody.push([l.contact, data.contact.name]);
    if (data.contact.company_name) infoBody.push([l.company, data.contact.company_name]);
    if (data.contact.address) infoBody.push([l.address, data.contact.address]);
    if (data.contact.phone) infoBody.push([l.phone, data.contact.phone]);
    if (data.contact.email) infoBody.push([l.email, data.contact.email]);
  }
  if (data.project) infoBody.push([l.project, `[${data.project.project_code}] ${data.project.project_name}`]);

  autoTable(doc, {
    startY: 40,
    body: infoBody,
    theme: 'plain',
    ...hook,
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } },
  });

  // Line items
  const afterInfo = (doc as any).lastAutoTable.finalY + 8;
  const hasTax = data.items.some(i => i.tax_amount > 0);
  const head = [l.description, l.quantity, l.unitPrice];
  if (hasTax) head.push(l.tax);
  head.push(l.amount);

  autoTable(doc, {
    startY: afterInfo,
    head: [head],
    body: data.items.map(item => {
      const row = [item.description, String(item.quantity), `${data.currency} ${item.unit_price.toFixed(2)}`];
      if (hasTax) row.push(item.tax_amount > 0 ? `${data.currency} ${item.tax_amount.toFixed(2)}` : '-');
      row.push(`${data.currency} ${item.amount.toFixed(2)}`);
      return row;
    }),
    theme: 'striped',
    ...hook,
    headStyles: { fillColor: [59, 130, 246] as [number, number, number], textColor: 255, fontStyle: 'bold' as const },
    styles: { fontSize: 10, cellPadding: 4 },
    alternateRowStyles: { fillColor: [245, 247, 250] as [number, number, number] },
  });

  // Totals
  const afterItems = (doc as any).lastAutoTable.finalY + 4;
  const totalsBody: string[][] = [[l.subtotal, `${data.currency} ${data.subtotal.toFixed(2)}`]];
  if (data.tax_amount > 0) totalsBody.push([l.taxAmount, `${data.currency} ${data.tax_amount.toFixed(2)}`]);
  totalsBody.push([l.total, `${data.currency} ${data.total_amount.toFixed(2)}`]);

  autoTable(doc, {
    startY: afterItems,
    body: totalsBody,
    theme: 'plain',
    ...hook,
    styles: { fontSize: 11, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', halign: 'right', cellWidth: pageWidth - 80 }, 1: { halign: 'right', cellWidth: 60 } },
  });

  // Notes & Terms
  let afterTotals = (doc as any).lastAutoTable.finalY + 8;
  if (data.notes) {
    if (isChinese) drawChineseText(doc, `${l.notes}: ${data.notes}`, 14, afterTotals, { fontSize: 9 });
    else { doc.setFontSize(9); doc.text(`${l.notes}: ${data.notes}`, 14, afterTotals); }
    afterTotals += 8;
  }
  if (data.terms) {
    if (isChinese) drawChineseText(doc, `${l.terms}: ${data.terms}`, 14, afterTotals, { fontSize: 9 });
    else { doc.setFontSize(9); doc.text(`${l.terms}: ${data.terms}`, 14, afterTotals); }
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${l.generatedAt}: ${format(new Date(), 'yyyy-MM-dd HH:mm')} | ${l.page} ${i}/${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    doc.setTextColor(0);
  }

  doc.save(`${title}_${data.invoice_number}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
