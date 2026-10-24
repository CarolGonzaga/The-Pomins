import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Pwa } from '@/components/pwa';
import {getAccount} from '@/features/preferences/server';
import {defaultPreferences} from '@/features/preferences/model';
import {PreferencesProvider} from '@/features/preferences/provider';
export const metadata: Metadata = {
  title: 'Pomins — Seu foco. As histórias deles.',
  description: 'Crie uma vida. Encontre seu foco. Descubra as histórias de The Pomins.',
  applicationName: 'Pomins',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Pomins' },
  icons: { icon: '/icons/icon.svg', apple: '/icons/apple-touch-icon.png' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f8f5f0',
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const account=await getAccount().catch(()=>null);
  const preferences=account?.preferences??defaultPreferences;
  return (
    <html lang="pt-BR" data-theme={preferences.theme} data-reduce-motion={String(preferences.reduce_motion)} suppressHydrationWarning>
      <body>
        <a href="#main" className="skip-link">
          Pular para o conteúdo
        </a>
        <Pwa />
        <PreferencesProvider key={account?.id??'guest'} userId={account?.id??null} initial={preferences}>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
