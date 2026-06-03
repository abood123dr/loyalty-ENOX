import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/useStore';

const Loader = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
  </div>
);

export default function SuperAdminRoute({ children }) {
  const { isLoadingStore, isSuperAdmin } = useStore();

  if (isLoadingStore) return <Loader />;

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access denied</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is available only for platform super admins. Sign in with a super admin account to continue.
        </p>
        <div className="mt-5 flex gap-2">
          <Button asChild variant="outline">
            <Link to="/">Dashboard</Link>
          </Button>
          <Button asChild>
            <Link to="/login">Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return children;
}
