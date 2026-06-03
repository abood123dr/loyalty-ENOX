import db from '@/api/base44Client';

import React, { useState } from 'react';
import { Menu, Moon, Sun, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/useStore';

export default function TopBar({ onMenuClick }) {
  const { user } = useAuth();
  const { currentStore, isSuperAdmin } = useStore();
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)
    : 'م';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/80 px-3 backdrop-blur-xl sm:px-5 lg:px-6">
      {/* Store indicator */}
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        {isSuperAdmin && (
          <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20 gap-1 text-xs">
            <Shield className="w-3 h-3" />Super Admin
          </Badge>
        )}
        {currentStore && (
          <p className="truncate text-sm text-muted-foreground">
            {currentStore.name}
          </p>
        )}
        {isSuperAdmin && !currentStore && (
          <p className="truncate text-sm text-muted-foreground">كل المتاجر</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pr-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:inline">
                {user?.full_name || 'المستخدم'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => db.auth.logout('/login')} className="text-destructive">
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}


