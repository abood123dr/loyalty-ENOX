import db from '@/api/base44Client';

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import AuthLayout from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isPlatformAdmin } from '@/lib/roles';
import { Loader2, Lock, LogIn, Mail } from 'lucide-react';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 10 * 60 * 1000;
const LOGIN_ERROR_MESSAGE = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
const LOCKED_MESSAGE = 'تم إيقاف المحاولة مؤقتا. حاول مرة أخرى بعد 10 دقائق.';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  const isLocked = lockedUntil > Date.now();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (isLocked) {
      setError(LOCKED_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const result = await db.auth.login(email, password);
      setFailedAttempts(0);
      setLockedUntil(0);
      navigate(isPlatformAdmin(result?.user) ? '/super-admin' : '/', { replace: true });
    } catch (err) {
      console.error('Login failed', err);
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCK_DURATION_MS);
        setError(LOCKED_MESSAGE);
      } else {
        setError(LOGIN_ERROR_MESSAGE);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="تسجيل الدخول"
      subtitle="ادخل إلى لوحة إدارة بطاقات الولاء"
      footer="الحسابات الجديدة يتم إنشاؤها من مدير المنصة فقط."
    >
      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form method="post" onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              maxLength={255}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 pl-10"
              dir="ltr"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">كلمة المرور</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              نسيت كلمة المرور؟
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 pl-10"
              dir="ltr"
              required
            />
          </div>
        </div>

        <Button type="submit" className="h-12 w-full font-medium" disabled={loading || isLocked}>
          {loading ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري تسجيل الدخول...
            </>
          ) : (
            'دخول'
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
