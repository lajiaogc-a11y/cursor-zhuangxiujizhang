import { format } from 'date-fns';
import { Pencil, Trash2, ArrowRight } from 'lucide-react';
import { exchangesService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Tables } from '@/integrations/supabase/types';

type ExchangeRate = Tables<'exchange_rates'>;

interface ExchangeRateListProps {
  rates: ExchangeRate[];
  onEdit: (rate: ExchangeRate) => void;
  onRefresh: () => void;
  canEdit?: boolean;
}

const currencyLabels: Record<string, string> = {
  MYR: 'MYR',
  CNY: 'CNY',
  USD: 'USD',
};

export function ExchangeRateList({ rates, onEdit, onRefresh, canEdit = true }: ExchangeRateListProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const isMobile = useIsMobile();

  const handleDelete = async (id: string) => {
    try {
      await exchangesService.deleteExchangeRate(id);
      toast({ title: t('exchangeRates.deleted') });
      onRefresh();
    } catch (error: any) {
      toast({
        title: t('toast.deleteFailed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Group by currency pair
  const groupedRates = rates.reduce((acc, rate) => {
    const key = `${rate.from_currency}-${rate.to_currency}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(rate);
    return acc;
  }, {} as Record<string, ExchangeRate[]>);

  if (rates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t('exchangeRates.noRecords')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedRates).map(([pair, pairRates]) => {
        const [from, to] = pair.split('-');
        const latestRate = pairRates[0];

        return (
          <div key={pair} className="rounded-lg border">
            <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{currencyLabels[from]}</Badge>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <Badge variant="outline">{currencyLabels[to]}</Badge>
              </div>
              <div className="text-lg font-semibold">
                {t('exchangeRates.currentRate')}: {latestRate.rate.toFixed(4)}
              </div>
            </div>
            {isMobile ? (
              <div className="space-y-2 p-3">
                {pairRates.map((rate, index) => (
                  <Card key={rate.id} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{rate.rate.toFixed(4)}</span>
                        {index === 0 && <Badge className="bg-green-100 text-green-800 text-[10px]">{t('exchangeRates.latest')}</Badge>}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{rate.source || t('exchangeRates.manual')}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(rate.rate_date), 'yyyy-MM-dd')}</span>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(rate)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(rate.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  {t('common.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('exchangeRates.effectiveDate')}</TableHead>
                    <TableHead>{t('exchangeRates.rate')}</TableHead>
                    <TableHead>{t('exchangeRates.source')}</TableHead>
                    <TableHead>{t('exchangeRates.createdAt')}</TableHead>
                    <TableHead className="w-[100px]">{t('exchangeRates.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pairRates.map((rate, index) => (
                    <TableRow key={rate.id}>
                      <TableCell>
                        {format(new Date(rate.rate_date), 'yyyy-MM-dd')}
                        {index === 0 && (
                          <Badge className="ml-2 bg-green-100 text-green-800">{t('exchangeRates.latest')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {rate.rate.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{rate.source || t('exchangeRates.manual')}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(rate.created_at), 'yyyy-MM-dd HH:mm')}
                      </TableCell>
                      <TableCell>
                        {canEdit ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => onEdit(rate)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                                  <AlertDialogDescription>{t('common.deleteWarning')}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(rate.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {t('common.delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        );
      })}
    </div>
  );
}
