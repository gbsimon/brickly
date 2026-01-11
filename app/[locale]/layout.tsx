import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import '../globals.scss';
import { routing } from '@/i18n/routing';
import ServiceWorkerRegistration from '../sw-register';
import Providers from '../providers';
import Footer from '@/components/Footer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import DebugPanel from '@/components/DebugPanel';
import SyncStatus from '@/components/SyncStatus';
import Diagnostics from '@/components/Diagnostics';

export const metadata: Metadata = {
  title: "BrickByBrick - LEGO Set Tracker",
  description: "Track your LEGO sets and inventory",
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BrickByBrick",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  themeColor: "#3b82f6",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BrickByBrick" />
      </head>
      <body className="antialiased" style={{ background: 'var(--bg)', color: 'var(--text)' }} suppressHydrationWarning>
        <ErrorBoundary>
          <NextIntlClientProvider messages={messages}>
            <Providers>
              <ServiceWorkerRegistration />
              {children}
              <Footer />
              <SyncStatus />
              <DebugPanel />
              <Diagnostics />
            </Providers>
          </NextIntlClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

