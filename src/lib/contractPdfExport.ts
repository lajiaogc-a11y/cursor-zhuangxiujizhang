import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ContractPdfData {
  contractNumber: string;
  title: string;
  customerName: string;
  content: string;
  totalAmount: number;
  currency: string;
  effectiveDate: string | null;
  expiryDate: string | null;
  companyName?: string;
  signatures?: { signerName: string; signerRole: string; signatureData: string | null; signedAt: string }[];
}

// Simple canvas text renderer for Chinese support
function drawTextToImage(text: string, fontSize: number, maxWidth: number): HTMLCanvasElement {
  const scale = 4;
  const canvas = document.createElement('canvas');
  canvas.width = maxWidth * scale;
  canvas.height = (fontSize + 4) * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#000';
  ctx.font = `${fontSize}px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, 0, 2, maxWidth);
  return canvas;
}

function addText(doc: jsPDF, text: string, x: number, y: number, fontSize: number, maxWidth: number) {
  const canvas = drawTextToImage(text, fontSize, maxWidth);
  const imgData = canvas.toDataURL('image/png');
  const PT_TO_MM = 0.353;
  const imgW = maxWidth * PT_TO_MM;
  const imgH = (fontSize + 4) * PT_TO_MM;
  doc.addImage(imgData, 'PNG', x, y, imgW, imgH);
  return imgH;
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  for (const para of paragraphs) {
    if (para.length <= maxCharsPerLine) {
      lines.push(para);
    } else {
      for (let i = 0; i < para.length; i += maxCharsPerLine) {
        lines.push(para.substring(i, i + maxCharsPerLine));
      }
    }
  }
  return lines;
}

export function generateContractPdf(data: ContractPdfData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  // Title
  y += addText(doc, data.title, margin, y, 18, contentW) + 4;

  // Contract info
  const infoLines = [
    `合同编号: ${data.contractNumber}`,
    `客户: ${data.customerName}`,
    `金额: ${data.currency} ${data.totalAmount.toLocaleString()}`,
  ];
  if (data.effectiveDate) infoLines.push(`生效日期: ${data.effectiveDate}`);
  if (data.expiryDate) infoLines.push(`到期日期: ${data.expiryDate}`);

  for (const line of infoLines) {
    y += addText(doc, line, margin, y, 10, contentW) + 1;
  }

  y += 6;

  // Separator
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // Content body
  const wrappedLines = wrapText(data.content, 45);
  for (const line of wrappedLines) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    y += addText(doc, line, margin, y, 10, contentW) + 1.5;
  }

  // Signatures
  if (data.signatures && data.signatures.length > 0) {
    y += 10;
    if (y > 220) { doc.addPage(); y = 20; }
    
    y += addText(doc, '签署记录', margin, y, 14, contentW) + 4;
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    for (const sig of data.signatures) {
      if (y > 240) { doc.addPage(); y = 20; }
      
      const roleLabel = sig.signerRole === 'customer' ? '客户' : '公司代表';
      y += addText(doc, `${roleLabel}: ${sig.signerName}  签署时间: ${sig.signedAt}`, margin, y, 9, contentW) + 2;

      if (sig.signatureData) {
        try {
          doc.addImage(sig.signatureData, 'PNG', margin, y, 50, 20);
          y += 22;
        } catch {
          y += addText(doc, '[签名图像]', margin, y, 9, contentW) + 2;
        }
      }
      y += 4;
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${i} / ${pageCount}`, pageW / 2, 290, { align: 'center' });
  }

  doc.save(`${data.contractNumber}.pdf`);
}
