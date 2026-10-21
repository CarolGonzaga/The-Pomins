import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Pwa } from '@/components/pwa';
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
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <a href="#main" className="skip-link">
          Pular para o conteúdo
        </a>
        {children}
        <Pwa />
      </body>
    </html>
  );
}
