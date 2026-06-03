import db, { supabase } from '@/api/base44Client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useStore } from '@/lib/useStore';
import { motion } from 'framer-motion';
import {
  Shield, Building2, Plus, MoreHorizontal, CheckCircle, XCircle, Search,
  Edit, Trash2, Crown, Star, Globe, UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { normalizeEmail, SUPER_ADMIN_EMAIL } from '@/lib/roles';

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
  name: '',
  slug: '',
  email: '',
  phone: '',
  city: '',
  owner_name: '',
  owner_email: '',
  owner_password: '',
  subscription_plan: 'starter',
  subscription_status: 'trial',
  stamps_required: 10,
  reward_description: 'مشروبك العاشر مجانا!',
  card_bg_color: '#7C3AED',
  card_text_color: '#FFFFFF',
  card_logo_url: '',
  stamp_active_color: '#FFFFFF',
  stamp_inactive_color: '#FFFFFF33',
  stamp_icon: 'check',
  stamp_strip_url: '',
  lock_card_design: true,
  is_active: true,
};

const slugify = (value) => value
  .toLowerCase()
  .trim()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '');

const storePayload = (data, slugOverride) => ({
  name: data.name,
  slug: slugOverride || slugify(data.slug || data.name),
  email: normalizeEmail(data.email),
  phone: data.phone,
  city: data.city,
  owner_name: data.owner_name,
  owner_email: normalizeEmail(data.owner_email),
  subscription_plan: data.subscription_plan,
  subscription_status: data.subscription_status,
  stamps_required: Number(data.stamps_required) || 10,
  reward_description: data.reward_description,
  card_bg_color: data.card_bg_color || '#7C3AED',
  card_text_color: data.card_text_color || '#FFFFFF',
  card_logo_url: data.card_logo_url || null,
  stamp_active_color: data.stamp_active_color || '#FFFFFF',
  stamp_inactive_color: data.stamp_inactive_color || '#FFFFFF33',
  stamp_icon: data.stamp_icon || 'check',
  stamp_strip_url: data.stamp_strip_url || null,
  lock_card_design: Boolean(data.lock_card_design),
  is_active: Boolean(data.is_active),
});

function StoreForm({ form, setForm, submitLabel, isPending, onSubmit }) {
  return (
    <div className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>اسم المتجر</Label>
          <Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>الرابط (Slug)</Label>
          <Input
            className="mt-1"
            dir="ltr"
            value={form.slug}
            onChange={e => setForm({ ...form, slug: slugify(e.target.value) })}
            placeholder="my-store"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>بريد المتجر</Label>
          <Input className="mt-1" dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label>الجوال</Label>
          <Input className="mt-1" dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>اسم مالك المتجر</Label>
          <Input className="mt-1" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
        </div>
        <div>
          <Label>بريد مالك المتجر</Label>
          <Input className="mt-1" dir="ltr" value={form.owner_email} onChange={e => setForm({ ...form, owner_email: e.target.value })} />
        </div>
      </div>

      {'owner_password' in form && (
        <div>
          <Label>كلمة مرور مالك المتجر</Label>
          <Input
            type="password"
            className="mt-1"
            dir="ltr"
            value={form.owner_password}
            onChange={e => setForm({ ...form, owner_password: e.target.value })}
            placeholder="ضع كلمة مرور مؤقتة"
          />
        </div>
      )}

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
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">المحافظ الرقمية لهذا المتجر</p>
          <p className="text-xs text-muted-foreground">تعديل شكل البطاقة والطوابع يتم من صفحة الإعدادات فقط.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-success/10 text-success border-success/20" variant="outline">Web Card مفعل</Badge>
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20" variant="outline">Google Wallet متاح</Badge>
          <Badge className="bg-muted text-muted-foreground" variant="outline">Apple Wallet لاحقاً</Badge>
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20" variant="outline">Samsung Wallet متاح</Badge>
        </div>
      </div>

      <Button className="w-full bg-primary hover:bg-primary/90" onClick={onSubmit} disabled={!form.name || !form.slug || isPending}>
        {isPending ? 'جاري الحفظ...' : submitLabel}
      </Button>
    </div>
  );
}

export default function SuperAdmin() {
  const { allStores, reloadStores } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [userStore, setUserStore] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '' });
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const createUniqueSlug = async (data, currentStoreId = null) => {
    const base = slugify(data.slug || data.name) || `store-${Date.now()}`;
    const existingSlugs = new Set(
      allStores
        .filter(store => store.id !== currentStoreId)
        .map(store => store.slug)
        .filter(Boolean)
    );

    const { data: remoteStores } = await supabase
      .from('stores')
      .select('id,slug')
      .like('slug', `${base}%`);

    (remoteStores || [])
      .filter(store => store.id !== currentStoreId)
      .forEach(store => existingSlugs.add(store.slug));

    if (!existingSlugs.has(base)) return base;

    let index = 2;
    while (existingSlugs.has(`${base}-${index}`)) {
      index += 1;
    }
    return `${base}-${index}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      setError('');
      const uniqueSlug = await createUniqueSlug(data);
      const store = await db.entities.Store.create(storePayload(data, uniqueSlug));

      if (data.owner_email && data.owner_password) {
        const userResult = await db.auth.createStoreUser({
          email: data.owner_email,
          password: data.owner_password,
          name: data.owner_name,
          role: 'store_owner',
          storeId: store.id,
        });

        await db.entities.Store.update(store.id, {
          owner_user_id: userResult?.user?.id,
          owner_email: normalizeEmail(data.owner_email),
          owner_name: data.owner_name,
        });
      }

      return store;
    },
    onSuccess: () => {
      reloadStores();
      setShowAdd(false);
      setForm(emptyForm);
    },
    onError: (err) => setError(err.message || 'تعذر إنشاء المتجر أو المستخدم.'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const uniqueSlug = await createUniqueSlug(data, id);
      return db.entities.Store.update(id, storePayload(data, uniqueSlug));
    },
    onSuccess: () => {
      reloadStores();
      setEditingStore(null);
    },
    onError: (err) => setError(err.message || 'تعذر حفظ التعديلات.'),
  });

  const quickUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Store.update(id, data),
    onSuccess: reloadStores,
    onError: (err) => setError(err.message || 'تعذر تحديث المتجر.'),
  });

  const createUserMutation = useMutation({
    mutationFn: async ({ store, user }) => {
      setError('');
      const userResult = await db.auth.createStoreUser({
        email: user.email,
        password: user.password,
        name: user.name,
        role: 'store_owner',
        storeId: store.id,
      });

      await db.entities.Store.update(store.id, {
        owner_user_id: userResult?.user?.id,
        owner_email: normalizeEmail(user.email),
        owner_name: user.name,
      });
    },
    onSuccess: () => {
      reloadStores();
      setUserStore(null);
      setUserForm({ name: '', email: '', password: '' });
    },
    onError: (err) => setError(err.message || 'تعذر إنشاء مستخدم المتجر.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Store.delete(id),
    onSuccess: reloadStores,
    onError: (err) => setError(err.message || 'تعذر حذف المتجر.'),
  });

  const filtered = allStores.filter(s => {
    const term = search.toLowerCase();
    const matchSearch = !term
      || s.name?.toLowerCase().includes(term)
      || s.email?.toLowerCase().includes(term)
      || s.owner_email?.toLowerCase().includes(term);
    const matchStatus = statusFilter === 'all' || s.subscription_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: 'إجمالي المتاجر', value: allStores.length, icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'متاجر نشطة', value: allStores.filter(s => s.subscription_status === 'active').length, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    { label: 'تجريبي', value: allStores.filter(s => s.subscription_status === 'trial').length, icon: Star, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <div className="space-y-6">
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
            <p className="text-muted-foreground text-sm" dir="ltr">{SUPER_ADMIN_EMAIL}</p>
          </div>
        </div>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 ml-2" />إضافة متجر ومستخدم</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>إضافة متجر جديد</DialogTitle></DialogHeader>
            <StoreForm
              form={form}
              setForm={setForm}
              submitLabel="إنشاء المتجر"
              isPending={createMutation.isPending}
              onSubmit={() => createMutation.mutate(form)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-card border border-border rounded-2xl p-5">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.bg)}>
              <s.icon className={cn('w-4 h-4', s.color)} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالمتجر أو بريد المالك..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="trial">تجريبي</SelectItem>
            <SelectItem value="expired">منتهي</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="py-1.5 px-3">{filtered.length} متجر</Badge>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] text-xs font-semibold text-muted-foreground px-5 py-3 border-b border-border bg-muted/30">
          <span>المتجر</span>
          <span className="px-4 text-center">الخطة</span>
          <span className="px-4 text-center">الحالة</span>
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
              className="grid grid-cols-[1fr_auto_auto_auto] items-center px-5 py-4 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: `${store.card_bg_color || '#7C3AED'}22`, color: store.card_bg_color || '#7C3AED' }}>
                  {store.name?.[0] || 'م'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{store.name}</p>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">{store.owner_email || store.email || `/store/${store.slug}`}</p>
                </div>
              </div>
              <div className="px-4">
                <Badge variant="outline" className={cn('text-xs', planColors[store.subscription_plan])}>
                  {planLabels[store.subscription_plan] || store.subscription_plan}
                </Badge>
              </div>
              <div className="px-4">
                <Badge className={cn('text-xs', statusColors[store.subscription_status])}>
                  {statusLabels[store.subscription_status] || store.subscription_status}
                </Badge>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setEditingStore({ ...emptyForm, ...store, owner_password: undefined })}>
                    <Edit className="w-4 h-4 ml-2" />تعديل المتجر
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => quickUpdateMutation.mutate({ id: store.id, data: { is_active: !store.is_active } })}>
                    {store.is_active ? <><XCircle className="w-4 h-4 ml-2 text-destructive" />تعطيل</> : <><CheckCircle className="w-4 h-4 ml-2 text-success" />تفعيل</>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(`/store/${store.slug}`, '_blank')}>
                    <Globe className="w-4 h-4 ml-2" />صفحة التسجيل
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setUserStore(store);
                    setUserForm({
                      name: store.owner_name || '',
                      email: store.owner_email || '',
                      password: '',
                    });
                  }}>
                    <UserPlus className="w-4 h-4 ml-2" />إنشاء مستخدم متجر
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

      {editingStore && (
        <Dialog open={!!editingStore} onOpenChange={() => setEditingStore(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>تعديل: {editingStore.name}</DialogTitle></DialogHeader>
            <StoreForm
              form={editingStore}
              setForm={setEditingStore}
              submitLabel="حفظ التعديلات"
              isPending={updateMutation.isPending}
              onSubmit={() => updateMutation.mutate({ id: editingStore.id, data: editingStore })}
            />
          </DialogContent>
        </Dialog>
      )}

      {userStore && (
        <Dialog open={!!userStore} onOpenChange={() => setUserStore(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>مستخدم متجر: {userStore.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>اسم المستخدم</Label>
                <Input className="mt-1" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input className="mt-1" type="email" dir="ltr" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
              </div>
              <div>
                <Label>كلمة مرور مؤقتة</Label>
                <Input className="mt-1" type="password" dir="ltr" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!userForm.email || !userForm.password || createUserMutation.isPending}
                onClick={() => createUserMutation.mutate({ store: userStore, user: userForm })}
              >
                {createUserMutation.isPending ? 'جاري إنشاء المستخدم...' : 'إنشاء وربط المستخدم'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
