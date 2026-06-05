import db from '@/api/base44Client';

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Crown,
  LayoutDashboard,
  LogOut,
  QrCode,
  Settings,
  Shield,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useStore } from '@/lib/useStore';
import StoreSwitcher from './StoreSwitcher';

const storeMenuItems = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/' },
  { icon: Users, label: 'العملاء', path: '/customers' },
  { icon: QrCode, label: 'مسح QR', path: '/qr-scanner' },
  { icon: Wallet, label: 'المحافظ', path: '/wallet-passes' },
  { icon: Bell, label: 'الإشعارات', path: '/notifications' },
  { icon: Settings, label: 'الإعدادات', path: '/settings' },
];

const superAdminItems = [
  { icon: Shield, label: 'إدارة المنصة', path: '/super-admin' },
];

export default function Sidebar({ mobileOpen = false, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isSuperAdmin } = useStore();

  const handleLogout = () => db.auth.logout('/login');

  const NavItem = ({ item, highlight = false }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link to={item.path} onClick={onMobileClose}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 group cursor-pointer',
            isActive
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : highlight
                ? 'border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'
                : 'text-sidebar-foreground hover:bg-sidebar-accent',
          )}
        >
          <item.icon className={cn(
            'h-5 w-5 shrink-0',
            isActive ? '' : highlight ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground',
          )} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className={cn('overflow-hidden whitespace-nowrap text-sm', highlight ? 'font-semibold' : 'font-medium')}
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>
    );
  };

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'fixed right-0 top-0 z-50 flex h-screen flex-col overflow-hidden border-l border-sidebar-border bg-sidebar shadow-2xl transition-transform duration-300 lg:z-40 lg:translate-x-0 lg:shadow-none',
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/30">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="text-base font-bold leading-tight text-sidebar-foreground">ولاء</h1>
                <p className="text-[10px] text-muted-foreground">Loyalty SaaS Platform</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={onMobileClose}
            className="mr-auto flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-sidebar-accent lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence>
          {!collapsed && isSuperAdmin && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-2 pt-3"
            >
              <StoreSwitcher />
            </motion.div>
          )}
        </AnimatePresence>

        <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">المتجر</p>
          )}
          {storeMenuItems.map((item) => <NavItem key={item.path} item={item} />)}

          {isSuperAdmin && (
            <>
              <div className="mx-2 my-3 border-t border-sidebar-border" />
              {!collapsed && (
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">إدارة المنصة</p>
              )}
              {superAdminItems.map((item) => <NavItem key={item.path} item={item} highlight />)}
            </>
          )}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-sidebar-border p-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sidebar-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium">
                  تسجيل الخروج
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden w-full items-center justify-center rounded-xl py-2 text-muted-foreground transition-all hover:bg-sidebar-accent lg:flex"
          >
            {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
