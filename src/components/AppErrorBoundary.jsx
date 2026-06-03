import React from 'react';
import { Button } from '@/components/ui/button';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error, info) {
    console.error('App render failed', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-foreground">Unable to open this page</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The app hit an unexpected error while loading this route. Try signing in again or return to the dashboard.
          </p>
          <p className="mt-4 rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground" dir="ltr">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" onClick={() => window.location.assign('/login')}>Login</Button>
            <Button onClick={() => window.location.assign('/')}>Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }
}
