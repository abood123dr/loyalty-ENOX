import db from '@/api/base44Client';

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Stamp, Wallet, QrCode,
  Bell, Settings, ChevronLeft, ChevronRight,
  LogOut, Crown, Shield, BarChart3, Gift, Megaphone, MapPin, UserCog, Plug, Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useStore } from '@/lib/useStore';
import StoreSwitcher from './StoreSwitcher';

const storeMenuItems = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/' },
  { icon: BarChart3, label: 'التحليلات', path: '/analytics' },
  { icon: Users, label: 'العملاء', path: '/customers' },
  { icon: Stamp, label: 'بطاقات الطوابع', path: '/stamp-cards' },
  { icon: Gift, label: 'المكافآت', path: '/rewards' },
  { icon: Megaphone, label: 'الحملات', path: '/campaigns' },
  { icon: MapPin, label: 'الفروع', path: '/branches' },
  { icon: UserCog, label: 'الموظفون', path: '/staff' },
  { icon: Wallet, label: 'البطاقات الرقمية', path: '/wallet-passes' },
  { icon: QrCode, label: 'QR Scanner', path: '/qr-scanner' },
  { icon: QrCode, label: 'QR / NFC', path: '/qr-nfc' },
  { icon: Bell, label: 'الإشعارات', path: '/notifications' },
  { icon: Plug, label: 'التكاملات', path: '/integrations' },
  { icon: Bot, label: 'المساعد الذكي', path: '/ai-assistant' },
  { icon: Settings, label: 'الإعدادات', path: '/settings' },
];

const superAdminItems = [
  { icon: Shield, label: 'إدارة المنصة', path: '/super-admin' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isSuperAdmin } = useStore();

  const handleLogout = () => db.auth.logout('/login');

  const NavItem = ({ item, highlight = false }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link to={item.path}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer',
            isActive
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : highlight
                ? 'bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
          )}
        >
          <item.icon className={cn('w-4.5 h-4.5 w-5 h-5 shrink-0',
            isActive ? '' : highlight ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground'
          )} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className={cn('text-sm overflow-hidden whitespace-nowrap', highlight ? 'font-semibold' : 'font-medium')}
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
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed right-0 top-0 h-screen bg-sidebar border-l border-sidebar-border z-40 flex flex-col overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/30">
          <Crown className="w-5 h-5 text-primary-foreground" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="font-bold text-base text-sidebar-foreground leading-tight">ولاء</h1>
              <p className="text-[10px] text-muted-foreground">Loyalty SaaS Platform</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Store Switcher (Super Admin only) */}
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin space-y-0.5">
        {/* Store Section */}
        {!collapsed && (
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 pb-1.5">المتجر</p>
        )}
        {storeMenuItems.map(item => <NavItem key={item.path} item={item} />)}

        {/* Super Admin Section */}
        {isSuperAdmin && (
          <>
            <div className="mx-2 my-3 border-t border-sidebar-border" />
            {!collapsed && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 pb-1.5">إدارة المنصة</p>
            )}
            {superAdminItems.map((item, i) => (
              <NavItem key={item.path} item={item} highlight={i === 0} />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 shrink-0 space-y-1">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="w-5 h-5 shrink-0" />
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
          className="flex items-center justify-center w-full py-2 rounded-xl text-muted-foreground hover:bg-sidebar-accent transition-all"
        >
          {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}


