import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Page Not Found',
  description: 'The requested ChainKit console page could not be found.',
};

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 ring-1 ring-primary/20">
        <Compass className="h-8 w-8" aria-hidden="true" />
      </div>

      <span className="text-xs font-semibold tracking-wider text-primary uppercase">
        Error 404
      </span>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Page Not Found
      </h1>

      <p className="mt-3 max-w-md text-sm text-slate-600 leading-relaxed">
        The dashboard view or resource you are looking for does not exist or may have been moved.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild className="shadow-sm">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Link>
        </Button>

        <Button asChild variant="outline">
          <a
            href="http://localhost:3001/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center"
          >
            <BookOpen className="mr-2 h-4 w-4 text-slate-500" />
            Browse API Documentation
          </a>
        </Button>
      </div>
    </div>
  );
}
