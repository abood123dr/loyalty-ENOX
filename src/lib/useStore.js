/**
 * Multi-Tenant Store Context
 * كل صفحة تستخدم هذا الـ hook للحصول على store_id الحالي
 * السوبر أدمن: يرى كل المتاجر
 * صاحب المتجر: يرى متجره فقط
 */
import { useContext } from 'react';
import { StoreContext } from './StoreContext';

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};