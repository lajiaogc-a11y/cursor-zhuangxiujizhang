import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface TourStep {
  /** CSS selector for the target element */
  target: string;
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Tooltip placement relative to target */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  steps: TourStep[];
  storageKey: string;
  onComplete?: () => void;
}

function getRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function getTooltipStyle(
  rect: DOMRect,
  placement: 'top' | 'bottom' | 'left' | 'right',
  tooltipRef: React.RefObject<HTMLDivElement | null>
) {
  const gap = 12;
  const style: React.CSSProperties = { position: 'fixed', zIndex: 10002 };
  const tw = tooltipRef.current?.offsetWidth || 320;
  const th = tooltipRef.current?.offsetHeight || 160;

  switch (placement) {
    case 'bottom':
      style.top = rect.bottom + gap;
      style.left = Math.max(8, rect.left + rect.width / 2 - tw / 2);
      break;
    case 'top':
      style.top = rect.top - gap - th;
      style.left = Math.max(8, rect.left + rect.width / 2 - tw / 2);
      break;
    case 'right':
      style.top = rect.top + rect.height / 2 - th / 2;
      style.left = rect.right + gap;
      break;
    case 'left':
      style.top = rect.top + rect.height / 2 - th / 2;
      style.left = rect.left - gap - tw;
      break;
  }

  // Keep within viewport
  if ((style.left as number) + tw > window.innerWidth - 8) {
    style.left = window.innerWidth - tw - 8;
  }
  if ((style.left as number) < 8) style.left = 8;
  if ((style.top as number) < 8) style.top = 8;
  if ((style.top as number) + th > window.innerHeight - 8) {
    style.top = window.innerHeight - th - 8;
  }

  return style;
}

export function OnboardingTour({ steps, storageKey, onComplete }: OnboardingTourProps) {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { language } = useI18n();

  // Check if tour was completed
  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Delay to let page render
      const timer = setTimeout(() => setActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  // Update target rect on step change
  useEffect(() => {
    if (!active) return;
    const step = steps[currentStep];
    if (!step) return;

    const updateRect = () => {
      const rect = getRect(step.target);
      setTargetRect(rect);
    };

    updateRect();
    // Re-measure on scroll/resize
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [active, currentStep, steps]);

  const complete = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setActive(false);
    onComplete?.();
  }, [storageKey, onComplete]);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(c => c + 1);
    } else {
      complete();
    }
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  const skip = () => complete();

  if (!active) return null;

  const step = steps[currentStep];
  const placement = step.placement || 'bottom';
  const pad = 6;

  return createPortal(
    <>
      {/* Overlay with spotlight cutout */}
      <div
        className="fixed inset-0 z-[10000] transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={skip}
      />

      {/* Spotlight highlight */}
      {targetRect && (
        <div
          className="fixed z-[10001] rounded-lg pointer-events-none"
          style={{
            top: targetRect.top - pad,
            left: targetRect.left - pad,
            width: targetRect.width + pad * 2,
            height: targetRect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            border: '2px solid hsl(var(--primary))',
          }}
        />
      )}

      {/* Tooltip */}
      {targetRect && (
        <div
          ref={tooltipRef}
          className="fixed z-[10002] w-80 bg-popover border border-border rounded-xl shadow-2xl p-4 animate-in fade-in-0 zoom-in-95 duration-200"
          style={getTooltipStyle(targetRect, placement, tooltipRef)}
        >
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                {currentStep + 1} / {steps.length}
              </span>
            </div>
            <button onClick={skip} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="text-sm font-semibold text-foreground mb-1">{step.title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">{step.description}</p>

          {/* Progress dots */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    i === currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {currentStep > 0 && (
                <Button variant="ghost" size="sm" onClick={prev} className="h-7 text-xs px-2">
                  <ChevronLeft className="w-3 h-3 mr-0.5" />
                  {language === 'zh' ? '上一步' : 'Back'}
                </Button>
              )}
              <Button size="sm" onClick={next} className="h-7 text-xs px-3">
                {currentStep === steps.length - 1
                  ? (language === 'zh' ? '完成' : 'Done')
                  : (language === 'zh' ? '下一步' : 'Next')}
                {currentStep < steps.length - 1 && <ChevronRight className="w-3 h-3 ml-0.5" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback: no target found */}
      {!targetRect && (
        <div className="fixed z-[10002] inset-0 flex items-center justify-center">
          <div className="bg-popover border border-border rounded-xl shadow-2xl p-6 w-80 text-center">
            <h4 className="text-sm font-semibold mb-2">{step.title}</h4>
            <p className="text-xs text-muted-foreground mb-4">{step.description}</p>
            <Button size="sm" onClick={next}>
              {currentStep === steps.length - 1 ? (language === 'zh' ? '完成' : 'Done') : (language === 'zh' ? '下一步' : 'Next')}
            </Button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

/** Reset a tour so it shows again */
export function resetTour(storageKey: string) {
  localStorage.removeItem(storageKey);
}
