import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  width?: number;
  height?: number;
}

export function SignaturePad({ onSave, onCancel, width = 500, height = 200 }: SignaturePadProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Set up high-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    // White background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    // Signature line
    ctx.strokeStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(40, height - 40);
    ctx.lineTo(width - 40, height - 40);
    ctx.stroke();
    ctx.strokeStyle = '#000';
  }, [width, height]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.strokeStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(40, (canvas.height / dpr) - 40);
    ctx.lineTo((canvas.width / dpr) - 40, (canvas.height / dpr) - 40);
    ctx.stroke();
    ctx.strokeStyle = '#000';
    setHasDrawn(false);
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  }, [onSave]);

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">{t('crm.signatureHint')}</p>
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clear}><Eraser className="w-4 h-4 mr-1" />{t('crm.clearSignature')}</Button>
          <Button variant="outline" size="sm" onClick={onCancel}>{t('common.cancel')}</Button>
        </div>
        <Button size="sm" onClick={handleSave} disabled={!hasDrawn}>
          <Check className="w-4 h-4 mr-1" />{t('crm.confirmSignature')}
        </Button>
      </div>
    </div>
  );
}
