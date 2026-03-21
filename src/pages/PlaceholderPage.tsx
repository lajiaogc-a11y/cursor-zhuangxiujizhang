import { MobilePageShell } from '@/components/layout/MobilePageShell';
import { useI18n } from '@/lib/i18n';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  titleKey: string;
  titleEn: string;
  backTo?: string;
}

export default function PlaceholderPage({ titleKey, titleEn, backTo }: PlaceholderPageProps) {
  const { t } = useI18n();
  
  return (
    <MobilePageShell title={t(titleKey)} titleEn={titleEn} backTo={backTo}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Construction className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t(titleKey)}</h2>
        <p className="text-muted-foreground">功能开发中，敬请期待...</p>
        <p className="text-muted-foreground text-sm mt-1">This feature is under development</p>
      </div>
    </MobilePageShell>
  );
}
