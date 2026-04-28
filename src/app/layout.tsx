import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { MQTTProvider } from '@/providers/MQTTProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { RobotProvider } from '@/providers/RobotProvider';
import { AppModeProvider } from '@/providers/AppModeProvider';
import { I18nProvider } from '@/lib/i18n';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'K-Patrol Control',
  description: 'K-Patrol Robot Control Dashboard - Real-time monitoring and control',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'K-Patrol',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0f1a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <head>
        <link rel="preconnect" href="https://a.tile.openstreetmap.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://b.tile.openstreetmap.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://c.tile.openstreetmap.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://tile.openstreetmap.org" />
      </head>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-kpatrol-500 focus:text-white focus:px-3 focus:py-2 focus:rounded"
        >
          Chuyển đến nội dung chính
        </a>
        <I18nProvider>
          <AppModeProvider>
            <AuthProvider>
              <RobotProvider>
                <MQTTProvider>
                  <ToastProvider>
                    <main id="main-content">{children}</main>
                  </ToastProvider>
                </MQTTProvider>
              </RobotProvider>
            </AuthProvider>
          </AppModeProvider>
        </I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
