import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { CookieBanner } from '@/components/cookie-banner';
import { NetworkStatus } from '@/components/network-status';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: 'ChainKit | Blockchain-as-a-Service Developer Platform',
    template: '%s | ChainKit',
  },
  description:
    'Developer-first Blockchain-as-a-Service (BaaS) for tamper-evident data notarization, cryptographic hash anchoring, and instant verification without Web3 complexity.',
  keywords: [
    'blockchain as a service',
    'baas',
    'data notarization',
    'hash anchoring',
    'evm developer platform',
    'tamper evident records',
  ],
  authors: [{ name: 'ChainKit Technologies Inc.' }],
  icons: {
    icon: '/icon.svg',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-white text-slate-900">
      <body className={`${inter.className} min-h-screen bg-slate-50/40 text-slate-900`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
        >
          Skip to main content
        </a>
        <Providers>
          {/* Offline / Slow Network Alert */}
          <NetworkStatus />

          <div className="flex min-h-screen flex-col md:flex-row">
            {/* Desktop Left Sidebar */}
            <Sidebar />

            {/* Main Application Column */}
            <div className="flex flex-1 flex-col overflow-x-hidden">
              {/* Responsive Header / Mobile Nav */}
              <Navbar />

              {/* Main Page Area */}
              <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
                {children}
              </main>

              {/* Comprehensive Footer */}
              <Footer />
            </div>
          </div>

          {/* GDPR / ePrivacy Compliant Cookie Consent */}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
