import db from '@/api/base44Client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useStore } from '@/lib/useStore';
import { motion } from 'framer-motion';
import { Users, Search, Plus, Stamp, Gift, Phone, MoreHorizontal, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function Customers() {
  const { currentStore, isSuperAdmin } = useStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '' });

  const storeFilter = currentStore?.id ? { store_id: currentStore.id } : undefined;

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['store-customers', currentStore?.id],
    queryFn: () => storeFilter
      ? db.entities.StoreCustomer.filter(storeFilter, '-created_date', 500)
      : db.entities.StoreCustomer.list('-created_date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.StoreCustomer.create({
      ...data,
      store_id: currentStore?.id || '',
      current_stamps: 0,
      total_stamps_earned: 0,
      total_rewards_redeemed: 0,
      is_active: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['store-customers', currentStore?.id]);
      setShowAdd(false);
      setForm({ full_name: '', phone: '' });
    },
  });

  const filtered = customers.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const stampsRequired = currentStore?.stamps_required || 10;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">العملاء</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentStore ? `متجر: ${currentStore.name}` : 'جميع المتاجر'}
          </p>
        </div>

        {currentStore && (
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 ml-2" />إضافة عميل
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>الاسم الكامل</Label>
                  <Input className="mt-1" placeholder="أحمد محمد" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <Label>رقم الجوال</Label>
                  <Input className="mt-1" placeholder="05XXXXXXXX" dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.full_name || !form.phone || createMutation.isPending}>
                  {createMutation.isPending ? 'جاري الإضافة...' : 'إضافة العميل'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث بالاسم أو الجوال..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 border-b border-border bg-muted/30">
          <span>العميل</span>
          <span className="text-center px-4">الطوابع</span>
          <span className="text-center px-4">الحالة</span>
          <span></span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">لا يوجد عملاء</p>
          </div>
        ) : (
          filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-0 items-center px-5 py-3.5 border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {c.full_name?.[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr">
                    <Phone className="w-3 h-3" />{c.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: stampsRequired }).map((_, si) => (
                    <div key={si} className={cn(
                      'w-2.5 h-2.5 rounded-full border',
                      si < (c.current_stamps || 0) ? 'bg-primary border-primary' : 'border-border bg-muted'
                    )} />
                  ))}
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {c.current_stamps || 0}/{stampsRequired}
                </span>
              </div>

              <div className="px-4">
                <Badge className={c.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                  {c.is_active ? 'نشط' : 'غير نشط'}
                </Badge>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem><UserCheck className="w-4 h-4 ml-2" />عرض البطاقة</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} عميل</p>
    </div>
  );
}


