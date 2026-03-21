import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { QuotationItem, CompanySettings, QuotationSummary, ExportLanguage } from '@/types/quotation';
import { UNIT_LABELS } from '@/types/quotation';

// === Chinese text rendering via Canvas ===
const containsChinese = (text: string): boolean => /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
const PT_TO_MM = 0.353;

const renderChineseCanvas = (text: string, fontSize: number, bold: boolean, color: string) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const scale = 8;
  const fontPx = fontSize * scale;
  const fontStr = `${bold ? 'bold ' : ''}${fontPx}px "Microsoft YaHei", "SimHei", "Heiti SC", "PingFang SC", sans-serif`;
  ctx.font = fontStr;
  const metrics = ctx.measureText(text);
  const textWidthPx = metrics.width;
  canvas.width = Math.ceil(textWidthPx) + 20;
  canvas.height = Math.ceil(fontPx * 1.5);
  ctx.font = fontStr;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  ctx.fillText(text, 4, fontPx * 0.15);
  const imgData = canvas.toDataURL('image/png');
  const imgW = textWidthPx / scale * PT_TO_MM;
  const imgH = fontSize * PT_TO_MM * 1.4;
  return { imgData, imgW, imgH };
};

const drawText = (doc: jsPDF, text: string, x: number, y: number, options: { align?: 'left' | 'center' | 'right'; fontSize?: number; bold?: boolean; color?: string } = {}) => {
  const { align = 'left', fontSize = 10, bold = false, color = '#000000' } = options;
  if (!containsChinese(text)) {
    doc.setFontSize(fontSize);
    doc.setTextColor(color);
    if (bold) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');
    doc.text(text, x, y, { align });
    return;
  }
  const pageWidth = doc.internal.pageSize.getWidth();
  const result = renderChineseCanvas(text, fontSize, bold, color);
  if (!result) { doc.text(text, x, y, { align }); return; }
  const { imgData, imgW, imgH } = result;
  let finalX = x;
  if (align === 'center') finalX = (pageWidth - imgW) / 2;
  else if (align === 'right') finalX = x - imgW;
  try {
    doc.addImage(imgData, 'PNG', finalX, y - imgH * 0.65, imgW + 0.5, imgH);
  } catch { doc.text(text, x, y, { align }); }
};

const getDidDrawCellHook = (doc: jsPDF) => ({
  didDrawCell: (data: any) => {
    if (data.section === 'body' || data.section === 'head') {
      const cellText = String(data.cell.text?.join?.('') || data.cell.text || '');
      if (cellText && containsChinese(cellText)) {
        const { x, y, width, height } = data.cell;
        const fontSize = data.cell.styles?.fontSize || 10;
        const isHead = data.section === 'head';
        const fc = data.cell.styles?.fillColor;
        if (fc && Array.isArray(fc)) doc.setFillColor(fc[0], fc[1], fc[2]);
        else doc.setFillColor(255, 255, 255);
        doc.rect(x + 0.1, y + 0.1, width - 0.2, height - 0.2, 'F');
        const tc = data.cell.styles?.textColor;
        const textColor = tc && Array.isArray(tc) ? `rgb(${tc[0]},${tc[1]},${tc[2]})` : (isHead ? '#ffffff' : '#000000');
        const isBold = isHead || data.cell.styles?.fontStyle === 'bold';
        const result = renderChineseCanvas(cellText, fontSize, isBold, textColor);
        if (!result) return;
        try {
          const padding = data.cell.styles?.cellPadding || 3;
          const halign = data.cell.styles?.halign || 'left';
          let drawX = x + padding;
          if (halign === 'right') drawX = x + width - padding - result.imgW;
          else if (halign === 'center') drawX = x + (width - result.imgW) / 2;
          const drawY = y + (height - result.imgH) / 2;
          doc.addImage(result.imgData, 'PNG', drawX, drawY, result.imgW + 0.3, result.imgH);
        } catch {}
      }
    }
  },
});

// === Labels (matching preview exactly) ===
const LABELS: Record<ExportLanguage, Record<string, string>> = {
  zh: {
    title: '报 价 单', projectNo: '报价编号', date: '报价日期', validity: '有效期', days: '天',
    customer: '客户信息', customerLabel: '客户', phone: '联系电话', email: '联系邮箱', address: '地址',
    no: '序号', description: '项目描述', unit: '单位', qty: '数量', unitPrice: '单价', amount: '金额',
    materials: '材料及施工说明', subtotal: '小计', discount: '折扣', total: '总计',
    payment: '付款条款', deposit: '定金', progress: '进度款', final: '尾款',
    bank: '银行账户', notes: '备注', dateLabel: '日期', catSubtotal: '小计',
    customerSig: '客户签名', companySig: '公司代表',
  },
  en: {
    title: 'QUOTATION', projectNo: 'Project No.', date: 'Date', validity: 'Validity', days: 'days',
    customer: 'CUSTOMER INFORMATION', customerLabel: 'Customer', phone: 'Phone', email: 'Email', address: 'Address',
    no: 'No.', description: 'Description', unit: 'Unit', qty: 'Qty', unitPrice: 'Unit Price', amount: 'Amount',
    materials: 'Materials & Spec', subtotal: 'Subtotal', discount: 'Discount', total: 'GRAND TOTAL',
    payment: 'Payment Terms', deposit: 'Deposit', progress: 'Progress', final: 'Final',
    bank: 'Bank Account', notes: 'Remarks', dateLabel: 'Date', catSubtotal: 'Sub Total',
    customerSig: 'Customer Signature', companySig: 'Company Representative',
  },
  'zh-en': {
    title: '报价单 QUOTATION', projectNo: '报价编号 Project No.', date: '报价日期 Date', validity: '有效期 Validity', days: '天 days',
    customer: '客户信息 CUSTOMER INFORMATION', customerLabel: '客户 Customer', phone: '联系电话 Phone', email: '联系邮箱 Email', address: '地址 Address',
    no: 'No.', description: '项目描述 Description', unit: '单位 Unit', qty: '数量 Qty', unitPrice: '单价 Unit Price', amount: '金额 Amount',
    materials: '材料说明 Materials & Spec', subtotal: '小计 Subtotal', discount: '折扣 Discount', total: '总计 TOTAL',
    payment: '付款条款 Payment Terms', deposit: '定金 Deposit', progress: '进度款 Progress', final: '尾款 Final',
    bank: '银行账户 Bank Account', notes: '备注 Notes', dateLabel: '日期 Date', catSubtotal: '小计 Sub Total',
    customerSig: '客户签名 Customer Signature', companySig: '公司代表 Company Representative',
  },
};

// === Colors matching preview ===
const C = {
  navy: [30, 58, 95] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  bg: [248, 250, 252] as [number, number, number],
  blueBg: [232, 238, 248] as [number, number, number],
  borderLight: [229, 231, 235] as [number, number, number],
  border: [209, 213, 219] as [number, number, number],
  text: '#1a1a1a',
  textLight: '#6b7280',
  textMuted: '#9ca3af',
  yellowBg: [255, 251, 235] as [number, number, number],
  yellowBorder: [253, 230, 138] as [number, number, number],
  red: '#dc2626',
};

interface VisibilityOptions {
  showLogo?: boolean;
  header?: boolean;
  customer?: boolean;
  payment?: boolean;
  notes?: boolean;
  price?: boolean;
}

interface QuotationExportData {
  projectNo: string;
  quotationDate: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: QuotationItem[];
  summary: QuotationSummary;
  settings: CompanySettings;
  quotationNotes?: string;
  quotationNotesEn?: string;
  language?: ExportLanguage;
  categoryLabels?: Record<string, { zh: string; en: string; code: string }>;
  visibility?: VisibilityOptions;
}

const fmtCurrency = (amount: number) =>
  `RM ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getUnitLabel = (unit: string, lang: ExportLanguage) => {
  const u = UNIT_LABELS[unit];
  if (!u) return unit;
  return lang === 'en' ? u.en : lang === 'zh-en' ? `${u.zh}/${u.en}` : u.zh;
};

const getItemName = (item: QuotationItem, lang: ExportLanguage) => {
  if (lang === 'en') return item.nameEn || item.nameZh;
  if (lang === 'zh-en') return item.nameEn ? `${item.nameZh}\n${item.nameEn}` : item.nameZh;
  return item.nameZh;
};

const getItemDescription = (item: QuotationItem, lang: ExportLanguage) => {
  if (lang === 'en') return item.descriptionEn || item.description || '';
  if (lang === 'zh-en') return item.description || '';
  return item.description || '';
};

const getCatLabel = (cat: string, labels: Record<string, { zh: string; en: string; code: string }> | undefined, lang: ExportLanguage) => {
  const cl = labels?.[cat];
  if (!cl) return cat;
  if (lang === 'en') return cl.en;
  if (lang === 'zh') return cl.zh;
  return `${cl.zh} / ${cl.en}`;
};

// === Build PDF to match preview exactly ===
function buildPDFDocument(data: QuotationExportData): jsPDF {
  const lang = data.language || 'zh';
  const L = LABELS[lang];
  const vis: VisibilityOptions = { showLogo: true, header: true, customer: true, payment: true, notes: true, price: true, ...data.visibility };
  const doc = new jsPDF({ orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const hookStyles = getDidDrawCellHook(doc);
  const mx = 14; // margin x
  const contentWidth = pageWidth - mx * 2;

  let y = 14;

  // ===== 1. Company Header (centered) =====
  if (vis.header !== false) {
    // Company name centered
    drawText(doc, 'FLASH CAST SDN. BHD.', pageWidth / 2, y + 4, { align: 'center', fontSize: 13, bold: true, color: '#1e3a5f' });
    y += 10;
    if (data.settings.ssmNo) {
      drawText(doc, `SSM: ${data.settings.ssmNo}`, pageWidth / 2, y, { align: 'center', fontSize: 7, color: '#9ca3af' });
      y += 4;
    }
    if (data.settings.companyAddress) {
      const addrLines = doc.splitTextToSize(data.settings.companyAddress, 160);
      addrLines.forEach((line: string) => {
        drawText(doc, line, pageWidth / 2, y, { align: 'center', fontSize: 7, color: '#6b7280' });
        y += 3.5;
      });
    }
    y += 4;
  }

  // ===== 2. Title Bar (solid navy rect with white text) =====
  doc.setFillColor(...C.navy);
  doc.rect(mx, y, contentWidth, 10, 'F');
  drawText(doc, L.title, pageWidth / 2, y + 7, { align: 'center', fontSize: 12, bold: true, color: '#ffffff' });
  y += 16;

  // ===== 3. Meta Info Row (3-column horizontal box) =====
  const metaH = 16;
  doc.setFillColor(248, 249, 251);
  doc.setDrawColor(...C.borderLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(mx, y, contentWidth, metaH, 1, 1, 'FD');

  const col3W = contentWidth / 3;
  const metaItems = [
    { label: L.projectNo, value: data.projectNo, align: 'left' as const },
    { label: L.date, value: data.quotationDate, align: 'center' as const },
    { label: L.validity, value: `${data.settings.validityPeriod} ${L.days}`, align: 'right' as const },
  ];
  metaItems.forEach((item, i) => {
    const cx = mx + 8 + i * col3W;
    const textAlign = item.align;
    let tx = cx;
    if (textAlign === 'center') tx = mx + contentWidth / 2;
    else if (textAlign === 'right') tx = mx + contentWidth - 8;

    doc.setFontSize(6.5); doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'bold');
    drawText(doc, item.label.toUpperCase(), tx, y + 5, { fontSize: 6.5, bold: true, color: '#6b7280', align: textAlign });
    drawText(doc, item.value, tx, y + 11, { fontSize: 10, bold: true, color: '#1e3a5f', align: textAlign });
  });
  y += metaH + 6;

  // ===== 4. Customer Info (4-column grid with navy header) =====
  if (vis.customer !== false && data.customerName) {
    // Navy header bar
    doc.setFillColor(...C.navy);
    doc.rect(mx, y, contentWidth, 7, 'F');
    drawText(doc, L.customer, mx + 4, y + 5, { fontSize: 7, bold: true, color: '#ffffff' });
    y += 7;

    // 4-column grid
    const cw = contentWidth / 4;
    doc.setDrawColor(...C.borderLight); doc.setLineWidth(0.2);
    doc.setFillColor(255, 255, 255);
    doc.rect(mx, y, contentWidth, 12, 'FD');
    // Vertical dividers
    for (let i = 1; i < 4; i++) {
      doc.line(mx + cw * i, y, mx + cw * i, y + 12);
    }

    const custFields = [
      { label: L.customerLabel, value: data.customerName || '-' },
      { label: L.phone, value: data.customerPhone || '-' },
      { label: L.address, value: data.customerAddress || '-' },
      { label: L.email, value: data.customerEmail || '-' },
    ];
    custFields.forEach((f, i) => {
      const fx = mx + cw * i + 4;
      drawText(doc, f.label, fx, y + 4, { fontSize: 6, color: '#9ca3af' });
      drawText(doc, f.value, fx, y + 9, { fontSize: 8, bold: true, color: '#1a1a1a' });
    });
    y += 18;
  }

  // ===== 5. Items Table by Category =====
  const showPrice = vis.price !== false;
  const catOrder: string[] = [];
  const catItems: Record<string, QuotationItem[]> = {};
  data.items.forEach(item => {
    const cat = item.category || 'others';
    if (!catItems[cat]) { catItems[cat] = []; catOrder.push(cat); }
    catItems[cat].push(item);
  });
  catOrder.sort((a, b) => {
    const codeA = data.categoryLabels?.[a]?.code || a;
    const codeB = data.categoryLabels?.[b]?.code || b;
    return codeA.localeCompare(codeB);
  });

  // Build table head
  const tableHead: string[] = [L.no, L.description, L.unit, L.qty];
  if (showPrice) { tableHead.push(L.unitPrice, L.amount); }
  tableHead.push(L.materials);

  // Build table body
  const tableBody: any[][] = [];
  let counter = 0;
  const totalCols = showPrice ? 7 : 5;

  catOrder.forEach(cat => {
    const code = data.categoryLabels?.[cat]?.code || cat.charAt(0).toUpperCase();
    const catLabel = `${code}. ${getCatLabel(cat, data.categoryLabels, lang)}`;
    const catTotal = catItems[cat].reduce((s, i) => s + i.lineTotal, 0);

    // Category header row
    tableBody.push([{
      content: catLabel,
      colSpan: totalCols,
      styles: { fontStyle: 'bold', fillColor: [...C.blueBg], textColor: C.navy, fontSize: 8, cellPadding: 3 },
    }]);

    // Items
    catItems[cat].forEach((item, idx) => {
      counter++;
      const name = getItemName(item, lang);
      const desc = getItemDescription(item, lang);
      const row: any[] = [
        { content: String(counter), styles: { halign: 'center', textColor: [107, 114, 128], fontSize: 8 } },
        { content: name, styles: { fontStyle: 'normal', fontSize: 8 } },
        { content: getUnitLabel(item.unit, lang), styles: { halign: 'center', textColor: [107, 114, 128], fontSize: 8 } },
        { content: String(item.quantity), styles: { halign: 'center', fontStyle: 'bold', fontSize: 9, textColor: C.navy } },
      ];
      if (showPrice) {
        row.push({ content: `RM ${item.unitPrice.toFixed(2)}`, styles: { halign: 'right', fontSize: 8 } });
        row.push({ content: `RM ${item.lineTotal.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: C.navy, fontSize: 8 } });
      }
      row.push({ content: desc, styles: { fontSize: 7, textColor: [107, 114, 128] } });
      // Alternate row bg
      if (idx % 2 === 1) {
        row.forEach((cell: any) => { if (typeof cell === 'object') cell.styles = { ...cell.styles, fillColor: [250, 250, 250] }; });
      }
      tableBody.push(row);
    });

    // Category subtotal row
    if (showPrice) {
      const subLabel = `${code}. ${getCatLabel(cat, data.categoryLabels, lang)} (${L.catSubtotal})`;
      const subRow: any[] = [];
      subRow.push({ content: subLabel, colSpan: 5, styles: { halign: 'right', fontStyle: 'normal', fillColor: [...C.blueBg], textColor: [107, 114, 128], fontSize: 7 } });
      subRow.push({ content: fmtCurrency(catTotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [...C.blueBg], textColor: C.navy, fontSize: 8 } });
      subRow.push({ content: '', styles: { fillColor: [...C.blueBg] } });
      tableBody.push(subRow);
    }
  });

  // Column styles
  const columnStyles: any = showPrice ? {
    0: { cellWidth: 10, halign: 'center' },
    1: { cellWidth: 'auto' },
    2: { cellWidth: 16, halign: 'center' },
    3: { cellWidth: 14, halign: 'center' },
    4: { cellWidth: 26, halign: 'right' },
    5: { cellWidth: 28, halign: 'right' },
    6: { cellWidth: 42 },
  } : {
    0: { cellWidth: 10, halign: 'center' },
    1: { cellWidth: 'auto' },
    2: { cellWidth: 18, halign: 'center' },
    3: { cellWidth: 16, halign: 'center' },
    4: { cellWidth: 50 },
  };

  autoTable(doc, {
    startY: y,
    head: [tableHead],
    body: tableBody,
    theme: 'grid',
    ...hookStyles,
    styles: { fontSize: 8, cellPadding: 2.5, lineColor: C.borderLight, lineWidth: 0.2 },
    headStyles: { fillColor: C.navy, textColor: 255, fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
    columnStyles,
    margin: { left: mx, right: mx },
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // ===== 6. Summary Box (right-aligned) =====
  if (showPrice) {
    const boxW = 85;
    const boxX = mx + contentWidth - boxW;
    const rowH = 8;

    // Subtotal row
    doc.setFillColor(...C.bg);
    doc.setDrawColor(...C.borderLight); doc.setLineWidth(0.2);
    doc.rect(boxX, y, boxW, rowH, 'FD');
    drawText(doc, `✦ ${L.subtotal}`, boxX + 4, y + 5.5, { fontSize: 8, color: '#6b7280' });
    drawText(doc, fmtCurrency(data.summary.subtotal), boxX + boxW - 4, y + 5.5, { fontSize: 8, bold: true, color: '#1e3a5f', align: 'right' });
    y += rowH;

    // Discount row (optional)
    if (data.settings.taxSettings.enableDiscount && data.summary.discount > 0) {
      doc.setDrawColor(...C.borderLight);
      doc.rect(boxX, y, boxW, rowH, 'D');
      drawText(doc, `✦ ${L.discount}`, boxX + 4, y + 5.5, { fontSize: 8, color: '#dc2626' });
      drawText(doc, `-${fmtCurrency(data.summary.discount)}`, boxX + boxW - 4, y + 5.5, { fontSize: 8, bold: true, color: '#dc2626', align: 'right' });
      y += rowH;
    }

    // Grand total row (navy bg)
    const totalH = 10;
    doc.setFillColor(...C.navy);
    doc.rect(boxX, y, boxW, totalH, 'F');
    drawText(doc, L.total, boxX + 4, y + 7, { fontSize: 10, bold: true, color: '#ffffff' });
    drawText(doc, fmtCurrency(data.summary.grandTotal), boxX + boxW - 4, y + 7, { fontSize: 10, bold: true, color: '#ffffff', align: 'right' });
    y += totalH + 8;
  }

  // ===== 7. Payment Terms =====
  if (vis.payment !== false) {
    // Ensure enough space
    if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 20; }

    // Header
    doc.setFillColor(...C.bg);
    doc.setDrawColor(...C.border); doc.setLineWidth(0.2);
    doc.rect(mx, y, contentWidth, 8, 'FD');
    drawText(doc, L.payment, mx + 5, y + 5.5, { fontSize: 8, bold: true, color: '#1e3a5f' });
    y += 8;

    const ptItems = [
      { label: L.deposit, pct: data.settings.paymentTerms.deposit, amount: data.summary.depositAmount },
      { label: L.progress, pct: data.settings.paymentTerms.progress, amount: data.summary.progressAmount },
      { label: L.final, pct: data.settings.paymentTerms.final, amount: data.summary.finalAmount },
    ];
    ptItems.forEach((pt, i) => {
      const rH = 8;
      doc.setDrawColor(...C.borderLight); doc.setLineWidth(0.2);
      if (i < ptItems.length - 1) {
        doc.rect(mx, y, contentWidth, rH, 'D');
      } else {
        doc.rect(mx, y, contentWidth, rH, 'D');
      }
      drawText(doc, `✦ ${pt.label} (${pt.pct}%)`, mx + 5, y + 5.5, { fontSize: 8, color: '#6b7280' });
      drawText(doc, fmtCurrency(pt.amount), mx + contentWidth - 5, y + 5.5, { fontSize: 8, bold: true, color: '#1e3a5f', align: 'right' });
      y += rH;
    });
    y += 6;
  }

  // ===== 8. Bank Info =====
  if (vis.payment !== false && data.settings.bankInfo) {
    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }
    doc.setFillColor(...C.bg);
    doc.setDrawColor(...C.border); doc.setLineWidth(0.2);
    const bankLines = data.settings.bankInfo.split('\n');
    const bankH = 10 + bankLines.length * 4;
    doc.roundedRect(mx, y, contentWidth, bankH, 1, 1, 'FD');
    drawText(doc, L.bank, mx + 5, y + 5, { fontSize: 7, bold: true, color: '#1e3a5f' });
    bankLines.forEach((line, idx) => {
      drawText(doc, line, mx + 5, y + 10 + idx * 4, { fontSize: 8, color: '#1a1a1a' });
    });
    y += bankH + 6;
  }

  // ===== 9. Notes =====
  if (vis.notes !== false) {
    const notesZh = lang !== 'en' ? data.quotationNotes : null;
    const notesEn = lang !== 'zh' ? (data.quotationNotesEn || (lang === 'en' ? data.quotationNotes : null)) : null;
    const hasNotes = notesZh || notesEn;
    if (hasNotes) {
      if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }
      const allNoteLines: string[] = [];
      if (notesZh) allNoteLines.push(...notesZh.split('\n'));
      if (notesEn) allNoteLines.push(...notesEn.split('\n'));
      const notesH = 12 + allNoteLines.length * 4;

      doc.setFillColor(...C.yellowBg);
      doc.setDrawColor(...C.yellowBorder); doc.setLineWidth(0.2);
      doc.roundedRect(mx, y, contentWidth, notesH, 1, 1, 'FD');
      drawText(doc, `✦ ${L.notes}`, mx + 5, y + 5, { fontSize: 7, bold: true, color: '#1e3a5f' });
      let ny = y + 11;
      if (notesZh) {
        notesZh.split('\n').forEach(line => {
          drawText(doc, line, mx + 5, ny, { fontSize: 8, color: '#1a1a1a' });
          ny += 4;
        });
      }
      if (notesEn) {
        notesEn.split('\n').forEach(line => {
          drawText(doc, line, mx + 5, ny, { fontSize: 8, color: '#6b7280' });
          ny += 4;
        });
      }
      y += notesH + 6;
    }
  }

  // ===== 10. Footer: Date + Signatures =====
  if (y > doc.internal.pageSize.getHeight() - 45) { doc.addPage(); y = 20; }
  y += 6;
  // Date line
  drawText(doc, `${L.dateLabel}: `, mx, y, { fontSize: 8, color: '#6b7280' });
  drawText(doc, data.quotationDate, mx + 15, y, { fontSize: 8, bold: true, color: '#1e3a5f' });
  y += 10;

  // Two signature columns
  const sigW = (contentWidth - 20) / 2;
  const sigLeftX = mx;
  const sigRightX = mx + sigW + 20;

  // Signature lines
  doc.setDrawColor(...C.navy); doc.setLineWidth(0.5);
  doc.line(sigLeftX, y + 18, sigLeftX + sigW, y + 18);
  doc.line(sigRightX, y + 18, sigRightX + sigW, y + 18);

  // Labels
  drawText(doc, L.customerSig, sigLeftX, y + 24, { fontSize: 7, color: '#6b7280' });
  drawText(doc, L.companySig, sigRightX, y + 24, { fontSize: 7, color: '#6b7280' });

  return doc;
}

export function exportQuotationToPDF(data: QuotationExportData) {
  const doc = buildPDFDocument(data);
  doc.save(`Quotation_${data.projectNo}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

export function exportQuotationToPDFBlob(data: QuotationExportData): Blob {
  const doc = buildPDFDocument(data);
  return doc.output('blob');
}

// === Excel export (unchanged) ===
function buildExcelWorkbook(data: QuotationExportData) {
  const lang = data.language || 'zh';
  const getLabel = (zh: string, en: string) => lang === 'en' ? en : lang === 'zh-en' ? `${zh} ${en}` : zh;
  const wb = XLSX.utils.book_new();

  const header = [
    getLabel('序号', 'No.'), getLabel('类别', 'Category'),
    getLabel('项目名称(中)', 'Name (ZH)'), getLabel('项目名称(英)', 'Name (EN)'),
    getLabel('材料说明', 'Description'), getLabel('单位', 'Unit'),
    getLabel('数量', 'Qty'), getLabel('单价', 'Unit Price'),
    getLabel('小计', 'Amount'), getLabel('小计(USD)', 'Amount(USD)'),
    getLabel('小计(CNY)', 'Amount(CNY)'),
  ];

  const rows: any[][] = [header];
  data.items.forEach((item, idx) => {
    rows.push([
      idx + 1, item.category || '', item.nameZh, item.nameEn || '',
      item.description || '', UNIT_LABELS[item.unit]?.zh || item.unit,
      item.quantity, item.unitPrice, item.lineTotal, item.lineTotalUSD, item.lineTotalCNY,
    ]);
  });

  rows.push([]);
  rows.push(['', '', '', '', '', '', '', getLabel('小计', 'Subtotal'), data.summary.subtotal, data.summary.subtotalUSD, data.summary.subtotalCNY]);
  if (data.summary.discount > 0) rows.push(['', '', '', '', '', '', '', getLabel('折扣', 'Discount'), -data.summary.discount]);
  rows.push(['', '', '', '', '', '', '', getLabel('总计', 'TOTAL'), data.summary.grandTotal, data.summary.grandTotalUSD, data.summary.grandTotalCNY]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 5 }, { wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, lang === 'en' ? 'Quotation' : '报价明细');

  const infoRows = [
    [getLabel('工程编号', 'Project No.'), data.projectNo],
    [getLabel('日期', 'Date'), data.quotationDate],
    [getLabel('客户', 'Customer'), data.customerName || ''],
    [getLabel('公司', 'Company'), data.settings.companyName],
    ['', ''],
    [getLabel('付款条款', 'Payment Terms')],
    [getLabel('定金', 'Deposit'), `${data.settings.paymentTerms.deposit}%`, data.summary.depositAmount],
    [getLabel('进度款', 'Progress'), `${data.settings.paymentTerms.progress}%`, data.summary.progressAmount],
    [getLabel('尾款', 'Final'), `${data.settings.paymentTerms.final}%`, data.summary.finalAmount],
  ];
  if (data.quotationNotes) {
    infoRows.push(['', '']);
    infoRows.push([getLabel('备注', 'Notes'), data.quotationNotes]);
  }
  const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
  wsInfo['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, lang === 'en' ? 'Info' : '基本信息');

  return wb;
}

export function exportQuotationToExcel(data: QuotationExportData) {
  const wb = buildExcelWorkbook(data);
  XLSX.writeFile(wb, `Quotation_${data.projectNo}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
}

export function exportQuotationToExcelBlob(data: QuotationExportData): Blob {
  const wb = buildExcelWorkbook(data);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
