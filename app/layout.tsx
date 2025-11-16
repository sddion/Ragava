import type React from 'react';
import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Suspense } from 'react';
import './globals.css';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import ReduxProvider from '@/components/ReduxProvider';

export const metadata: Metadata = {
  title: 'Ragava Music Player',
  description:
    'A modern, responsive music player with cloud storage and real-time sync',
  keywords: ['music player', 'streaming', 'cloud storage', 'playlist', 'audio'],
  authors: [{ name: 'Ragava Music Team' }],
  creator: 'Ragava Music',
  publisher: 'Ragava Music',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || 'https://ragava.vercel.app'
  ),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Ragava Music Player - Modern Music Streaming',
    description:
      'A modern, responsive music player with cloud storage and real-time sync. Stream your favorite music with beautiful UI and seamless experience.',
    url: '/',
    siteName: 'Ragava Music',
    images: [
      {
        url: '/ragavaLogo.png',
        width: 1200,
        height: 630,
        alt: 'Ragava Music Player Logo',
        type: 'image/png',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ragava Music Player - Modern Music Streaming',
    description:
      'A modern, responsive music player with cloud storage and real-time sync.',
    images: ['/ragavaLogo.png'],
    creator: '@ragavamusic',
    site: '@ragavamusic',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/Icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/Icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      {
        url: '/Icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    other: [
      { url: '/Icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/Icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { url: '/Icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  category: 'music',
  classification: 'Music Streaming Application',
  referrer: 'origin-when-cross-origin',
  verification: {
    google: 'c80rYl0x2hvNtXniGOKlNU24XJDla5COJOfxo8zPGeo',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  colorScheme: 'dark light',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <ReduxProvider>
          <ErrorBoundary>
            <Suspense fallback={null}>
              <Layout>{children}</Layout>
            </Suspense>
          </ErrorBoundary>
        </ReduxProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
        {process.env.NODE_ENV === 'production' && <SpeedInsights />}
      </body>
    </html>
  );
}
