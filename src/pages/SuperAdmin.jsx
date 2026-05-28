import db from '@/api/base44Client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useStore } from '@/lib/useStore';
import { motion } from 'framer-motion';
import {
  Shield, Building2, Plus, MoreHorizontal, CheckCircle, XCircle,
  Users, Lock, Unlock, Search, Edit, Trash2, TrendingUp, Crown, Star, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const planColors = {
  starter: 'bg-muted text-muted-foreground',
  pro: 'bg-primary/10 text-primary',
  enterprise: 'bg-warning/10 text-warning',
};
const planLabels = { starter: 'مبتدئ', pro: 'احترافي', enterprise: 'مؤسسي' };
const statusColors = {
  trial: 'bg-blue-500/10 text-blue-500',
  active: 'bg-success/10 text-success',
  expired: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};
const statusLabels = { trial: 'تجريبي', active: 'نشط', expired: 'منتهي', cancelled: 'ملغي' };

const emptyForm = {
  name: '', slug: '', email: '', phone: '', city: '',
  subscription_plan: 'starter', subscription_status: 'trial',
  stamps_required: 10, reward_description: 'مشروبك العاشر مجاناً!',
  card_bg_color: '#7C3AED', lock_card_design: true, is_active: true,
};

export default function SuperAdmin() {
  const { allStores, reloadStores } = useStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Store.create(data),
    onSuccess: () => { reloadStores(); setShowAdd(false); setForm(emptyForm); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Store.update(id, data),
    onSuccess: () => { reloadStores(); setEditingStore(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Store.delete(id),
    onSuccess: reloadStores,
  });

  const filtered = allStores.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.includes(search);
    const matchStatus = statusFilter === 'all' || s.subscription_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: 'إجمالي المتاجر', value: allStores.length, icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'متاجر نشطة', value: allStores.filter(s => s.subscription_status === 'active').length, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    { label: 'تجريبي', value: allStores.filter(s => s.subscription_status === 'trial').length, icon: Star, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'تصميم مقيّد', value: allStores.filter(s => s.lock_card_design).length, icon: Lock, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              لوحة إدارة المنصة
              <Badge className="bg-primary/10 text-primary text-xs gap-1"><Crown className="w-3 h-3" />Super Admin</Badge>
            </h2>
            <p className="text-muted-foreground text-sm">تحكم كامل بجميع المتاجر</p>
          </div>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 ml-2" />إضافة متجر</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>إضافة متجر جديد</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>اسم المتجر</Label><Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div>
                  <Label>الرابط (Slug)</Label>
                  <Input className="mt-1" dir="ltr" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} placeholder="my-store" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>البريد</Label><Input className="mt-1" dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>الجوال</Label><Input className="mt-1" dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>خطة الاشتراك</Label>
                  <Select value={form.subscription_plan} onValueChange={v => setForm({ ...form, subscription_plan: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">مبتدئ</SelectItem>
                      <SelectItem value="pro">احترافي</SelectItem>
                      <SelectItem value="enterprise">مؤسسي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>حالة الاشتراك</Label>
                  <Select value={form.subscription_status} onValueChange={v => setForm({ ...form, subscription_status: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">تجريبي</SelectItem>
                      <SelectItem value="active">نشط</SelectItem>
                      <SelectItem value="expired">منتهي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>عدد الطوابع</Label><Input type="number" className="mt-1" dir="ltr" value={form.stamps_required} onChange={e => setForm({ ...form, stamps_required: parseInt(e.target.value) })} /></div>
                <div>
                  <Label>لون البطاقة</Label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" className="w-10 h-9 rounded-md border border-input cursor-pointer" value={form.card_bg_color} onChange={e => setForm({ ...form, card_bg_color: e.target.value })} />
                    <Input dir="ltr" value={form.card_bg_color} onChange={e => setForm({ ...form, card_bg_color: e.target.value })} />
                  </div>
                </div>
              </div>
              <div><Label>وصف المكافأة</Label><Input className="mt-1" value={form.reward_description} onChange={e => setForm({ ...form, reward_description: e.target.value })} /></div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                <div>
                  <p className="text-sm font-medium">قفل تصميم البطاقة</p>
                  <p className="text-xs text-muted-foreground">صاحب المتجر لا يقدر يعدّل التصميم</p>
                </div>
                <Switch checked={form.lock_card_design} onCheckedChange={v => setForm({ ...form, lock_card_design: v })} className="data-[state=checked]:bg-destructive" />
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90"
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name || !form.slug || createMutation.isPending}>
                {createMutation.isPending ? 'جاري الإضافة...' : 'إضافة المتجر'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-card border border-border rounded-2xl p-5">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.bg)}>
              <s.icon className={cn('w-4 h-4', s.color)} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو البريد..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="trial">تجريبي</SelectItem>
            <SelectItem value="expired">منتهي</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="py-1.5 px-3">{filtered.length} متجر</Badge>
      </div>

      {/* Stores Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 border-b border-border bg-muted/30">
          <span>المتجر</span>
          <span className="px-4 text-center">الخطة</span>
          <span className="px-4 text-center">الحالة</span>
          <span className="px-4 text-center">التصميم</span>
          <span></span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">لا توجد متاجر</p>
          </div>
        ) : (
          filtered.map((store, i) => (
            <motion.div key={store.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-5 py-4 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: store.card_bg_color + '22', color: store.card_bg_color }}>
                  {store.name?.[0] || '؟'}
                </div>
                <div>
                  <p className="text-sm font-semibold">{store.name}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">/store/{store.slug}</p>
                </div>
              </div>
              <div className="px-4">
                <Badge variant="outline" className={cn('text-xs', planColors[store.subscription_plan])}>
                  {planLabels[store.subscription_plan]}
                </Badge>
              </div>
              <div className="px-4">
                <Badge className={cn('text-xs', statusColors[store.subscription_status])}>
                  {statusLabels[store.subscription_status]}
                </Badge>
              </div>
              <div className="px-4 flex items-center gap-2">
                <Switch
                  checked={store.lock_card_design}
                  onCheckedChange={(v) => updateMutation.mutate({ id: store.id, data: { lock_card_design: v } })}
                  className="data-[state=checked]:bg-destructive scale-75"
                />
                <span className="text-xs text-muted-foreground">{store.lock_card_design ? 'مقيّد' : 'مسموح'}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => { setEditingStore(store); }}>
                    <Edit className="w-4 h-4 ml-2" />تعديل
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateMutation.mutate({ id: store.id, data: { is_active: !store.is_active } })}>
                    {store.is_active ? <><XCircle className="w-4 h-4 ml-2 text-destructive" />تعطيل</> : <><CheckCircle className="w-4 h-4 ml-2 text-success" />تفعيل</>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(`/store/${store.slug}`, '_blank')}>
                    <Globe className="w-4 h-4 ml-2" />صفحة التسجيل
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(store.id)}>
                    <Trash2 className="w-4 h-4 ml-2" />حذف
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      {editingStore && (
        <Dialog open={!!editingStore} onOpenChange={() => setEditingStore(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>تعديل: {editingStore.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>خطة الاشتراك</Label>
                <Select value={editingStore.subscription_plan} onValueChange={v => setEditingStore({ ...editingStore, subscription_plan: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">مبتدئ</SelectItem>
                    <SelectItem value="pro">احترافي</SelectItem>
                    <SelectItem value="enterprise">مؤسسي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>حالة الاشتراك</Label>
                <Select value={editingStore.subscription_status} onValueChange={v => setEditingStore({ ...editingStore, subscription_status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">تجريبي</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="expired">منتهي</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>لون البطاقة</Label>
                <div className="flex gap-2 mt-1">
                  <input type="color" className="w-10 h-9 rounded-md border border-input" value={editingStore.card_bg_color || '#7C3AED'} onChange={e => setEditingStore({ ...editingStore, card_bg_color: e.target.value })} />
                  <Input dir="ltr" value={editingStore.card_bg_color || ''} onChange={e => setEditingStore({ ...editingStore, card_bg_color: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-destructive/5 rounded-xl border border-destructive/20">
                <div>
                  <p className="text-sm font-medium">قفل التصميم</p>
                  <p className="text-xs text-muted-foreground">صاحب المتجر لا يعدّل</p>
                </div>
                <Switch checked={editingStore.lock_card_design} onCheckedChange={v => setEditingStore({ ...editingStore, lock_card_design: v })} className="data-[state=checked]:bg-destructive" />
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90"
                onClick={() => updateMutation.mutate({ id: editingStore.id, data: editingStore })}
                disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


