import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Globe } from 'lucide-react';
import { useI18n, Language } from '@/lib/i18n';

export function LanguageSettings() {
  const { language, setLanguage, t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          {t('settings.language')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={language}
          onValueChange={(value) => setLanguage(value as Language)}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="zh" id="lang-zh" />
            <Label htmlFor="lang-zh" className="cursor-pointer">
              {t('settings.chinese')} (简体中文)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="en" id="lang-en" />
            <Label htmlFor="lang-en" className="cursor-pointer">
              {t('settings.english')} (English)
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
