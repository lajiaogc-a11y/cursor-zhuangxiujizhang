import { useState } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getSessionToken } from '@/services/settings.service';
import { useI18n } from '@/lib/i18n';
import { AppSectionLoading, ChromeLoadingSpinner } from '@/components/layout/AppChromeLoading';

interface ReportData {
  totalIncome: number;
  totalExpense: number;
  incomeByCategory: { name: string; value: number }[];
  expenseByCategory: { name: string; value: number }[];
  projectStats: { status: string; count: number; amount: number }[];
  comparison?: { income: number; expense: number; profit: number };
}

interface AIReportSummaryProps {
  reportData: ReportData;
  period: string;
}

export function AIReportSummary({ reportData, period }: AIReportSummaryProps) {
  const { t } = useI18n();
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const generateSummary = async () => {
    setIsLoading(true);
    try {
      // Get current session token for authentication
      const accessToken = await getSessionToken();
      if (!accessToken) {
        throw new Error(t('ai.pleaseLogin'));
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-report-summary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ reportData, period }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('ai.generateError'));
      }

      setSummary(data.summary);
      setIsExpanded(true);
    } catch (error: any) {
      console.error('Summary error:', error);
      toast.error(error.message || t('ai.generateFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isExpanded) {
    return (
      <Button
        onClick={generateSummary}
        disabled={isLoading}
        variant="outline"
        className="gap-2"
      >
        {isLoading ? (
          <ChromeLoadingSpinner variant="muted" className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {t('ai.analyze')}
      </Button>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('ai.reportTitle')}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={generateSummary}
              disabled={isLoading}
            >
              {isLoading ? (
                <ChromeLoadingSpinner variant="muted" className="h-4 w-4" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {summary ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {summary}
            </div>
          </div>
        ) : (
          <AppSectionLoading label={t('common.loading')} compact />
        )}
      </CardContent>
    </Card>
  );
}
