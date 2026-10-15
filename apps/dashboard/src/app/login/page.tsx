'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Lock,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/components/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const { sendOtp, loginWithOtp, isAuthenticated } = useAuth();

  const [step, setStep] = React.useState<'email' | 'otp'>('email');
  const [email, setEmail] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [debugOtp, setDebugOtp] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [isSuccess, setIsSuccess] = React.useState(false);

  // If already logged in, redirect to dashboard home
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  // Timer countdown for resending OTP
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid developer email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendOtp(cleanEmail);
      if (res.debugCode) {
        setDebugOtp(res.debugCode);
      }
      setStep('otp');
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanOtp = otp.trim().replace(/\s+/g, '');
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithOtp(email.trim().toLowerCase(), cleanOtp);
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await sendOtp(email.trim().toLowerCase());
      if (res.debugCode) {
        setDebugOtp(res.debugCode);
      }
      setResendCooldown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/20">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {step === 'email' ? 'Sign in to ChainKit' : 'Verify Your Email'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
            {step === 'email'
              ? 'Enter your work or developer email to receive a secure one-time verification code.'
              : `We sent a 6-digit code to ${email}.`}
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Passwordless Authentication
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="h-3 w-3" />
                Zero Passwords
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Message Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1">{errorMessage}</div>
              </div>
            )}

            {/* Success Animation */}
            {isSuccess && (
              <div className="flex flex-col items-center justify-center py-4 space-y-2 text-center text-emerald-700">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-bounce" />
                <p className="text-sm font-semibold text-slate-900">Verification Successful!</p>
                <p className="text-xs text-slate-500">Redirecting to developer console...</p>
              </div>
            )}

            {!isSuccess && step === 'email' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-900">
                    Developer Email Address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="auth-email"
                      type="email"
                      required
                      placeholder="developer@acme.corp"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="pl-9 text-sm"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    New accounts are automatically provisioned with a free Sandbox workspace.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending One-Time Code...
                    </>
                  ) : (
                    <>
                      <span>Continue with Email OTP</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {!isSuccess && step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {/* Debug Code Helper Banner (Local Dev / Demo Sandbox) */}
                {debugOtp && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-900 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-950">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span>Developer Demo Code Generated:</span>
                    </div>
                    <p className="text-[11px] text-blue-800">
                      For rapid local evaluation, your OTP is displayed below:
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-base font-bold tracking-widest text-primary">
                        {debugOtp}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs bg-white text-blue-900 border-blue-200"
                        onClick={() => setOtp(debugOtp)}
                      >
                        Auto-fill Code
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="auth-otp" className="block text-xs font-semibold text-slate-900">
                      6-Digit Verification Code
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('email');
                        setOtp('');
                        setErrorMessage(null);
                      }}
                      className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Change email
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="auth-otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtp(val);
                      }}
                      disabled={isLoading}
                      className="pl-9 font-mono text-base tracking-widest"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                      Verifying Code...
                    </>
                  ) : (
                    <>
                      <span>Verify & Enter Console</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Resend Action */}
                <div className="text-center pt-2">
                  {resendCooldown > 0 ? (
                    <span className="text-xs text-slate-400">
                      Resend code in {resendCooldown} seconds
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isLoading}
                      className="text-xs font-medium text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded"
                    >
                      Didn&apos;t receive code? Resend
                    </button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Security & Compliance Footer */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>
            By signing in, you agree to our{' '}
            <Link href="/terms" className="font-medium text-slate-700 underline hover:text-slate-900">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-medium text-slate-700 underline hover:text-slate-900">
              Privacy Policy
            </Link>
            .
          </p>
          <p>Enterprise HMAC-SHA256 encrypted authentication.</p>
        </div>
      </div>
    </div>
  );
}
