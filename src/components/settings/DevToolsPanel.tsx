import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useI18n, missingKeysStore } from '@/lib/i18n';
import { RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface MissingKeyEntry {
  key: string;
  language: string;
  timestamp: number;
  count: number;
}

export function DevToolsPanel() {
  const { t } = useI18n();
  const [missingKeys, setMissingKeys] = useState<MissingKeyEntry[]>([]);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const refreshKeys = () => {
    const keys = Array.from(missingKeysStore.values());
    setMissingKeys(keys.sort((a, b) => b.timestamp - a.timestamp));
    setLastRefresh(Date.now());
  };

  const clearKeys = () => {
    missingKeysStore.clear();
    setMissingKeys([]);
  };

  useEffect(() => {
    refreshKeys();
    const interval = setInterval(refreshKeys, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              {t('devTools.missingKeys')}
              {missingKeys.length > 0 && (
                <Badge variant="destructive" className="ml-2">{missingKeys.length}</Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshKeys}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('devTools.refresh')}
              </Button>
              <Button variant="destructive" size="sm" onClick={clearKeys}>
                <Trash2 className="w-4 h-4 mr-2" />
                {t('devTools.clear')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {missingKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('devTools.noMissingKeys')}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">{t('devTools.key')}</TableHead>
                    <TableHead>{t('devTools.language')}</TableHead>
                    <TableHead className="text-center">{t('devTools.count')}</TableHead>
                    <TableHead>{t('devTools.lastSeen')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingKeys.map((entry) => (
                    <TableRow key={entry.key}>
                      <TableCell className="font-mono text-sm break-all">
                        <code className="bg-muted px-2 py-1 rounded">{entry.key}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.language.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={entry.count > 5 ? 'destructive' : 'secondary'}>
                          {entry.count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(entry.timestamp), 'HH:mm:ss')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('devTools.currentLanguage')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">{t('devTools.currentLanguage')}:</span>
            <Badge variant="default" className="text-lg px-4 py-2">
              {t('devTools.activeLang')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {t('devTools.lastSeen')}: {format(new Date(lastRefresh), 'yyyy-MM-dd HH:mm:ss')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
