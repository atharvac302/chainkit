import * as React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, ShieldCheck, Check } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Brand & Business Details */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2 text-slate-900 font-bold text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-semibold shadow-sm">
                CK
              </span>
              <span>ChainKit</span>
            </Link>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI-assisted Blockchain-as-a-Service for tamper-evident data notarization and cryptographic hash anchoring.
            </p>
            <div className="space-y-2 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <span>100 Montgomery St, Suite 1400, San Francisco, CA 94104</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <a
                  href="mailto:support@chainkit.dev"
                  className="text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded"
                >
                  support@chainkit.dev
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                <a
                  href="tel:+18005550199"
                  className="text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded"
                >
                  +1 (800) 555-0199
                </a>
              </div>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Platform
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-slate-900 transition-colors">
                  Console Overview
                </Link>
              </li>
              <li>
                <Link href="/projects" className="hover:text-slate-900 transition-colors">
                  Projects Management
                </Link>
              </li>
              <li>
                <Link href="/api-keys" className="hover:text-slate-900 transition-colors">
                  API Key Credentials
                </Link>
              </li>
              <li>
                <Link href="/records" className="hover:text-slate-900 transition-colors">
                  Record Explorer
                </Link>
              </li>
              <li>
                <Link href="/transactions" className="hover:text-slate-900 transition-colors">
                  Transaction Monitor
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Compliance & Legal
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/privacy" className="hover:text-slate-900 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-slate-900 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-slate-900 transition-colors">
                  Refund & Cancellation Policy
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-slate-900 transition-colors">
                  Cookie Policy & Consent
                </Link>
              </li>
              <li>
                <Link href="/data-deletion" className="hover:text-slate-900 transition-colors">
                  Data Deletion Request (GDPR)
                </Link>
              </li>
            </ul>
          </div>

          {/* Standards & Transparency */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Transparency & Security
            </h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Zero Hidden Fees</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>No Third-Party Ad Trackers</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>No Raw Documents Stored On-Chain</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                All marketing and notification emails strictly adhere to CAN-SPAM and include a 1-click unsubscribe link.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t border-slate-200 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} ChainKit Technologies Inc. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <span>Sepolia EVM Testnet</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              <span>TLS 1.3 Encrypted</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
