const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useStore } from '@/lib/useStore';
import { motion } from 'framer-motion';
import { Stamp, Lock, Unlock, Palette, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

function StampCardPreview({ store, stampsRequired }) {
  const stamps = stampsRequired || 10;
  const bgColor = store?.card_bg_color || '#7C3AED';
  const textColor = store?.card_text_color || '#FFFFFF';

  return (
    <div
      className="relative rounded-3xl p-6 overflow-hidden shadow-2xl"
      style={{ background: `linear-gradient(135deg, ${bgColor}, ${bgColor}cc)`, color: textColor, maxWidth: 380 }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-10" style={{ background: textColor }} />
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10" style={{ background: textColor }} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          {store?.logo_url ? (
            <img src={store.logo_url} className="w-10 h-10 rounded-xl object-cover" alt="logo" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold">
              {store?.name?.[0] || '☕'}
            </div>
          )}
          <div className="text-left">
            <p className="font-bold text-sm">{store?.name || 'اسم المتجر'}</p>
            <p className="text-xs opacity-70">بطاقة الطوابع</p>
          </div>
        </div>

        {/* Customer Name placeholder */}
        <p className="text-sm opacity-80 mb-1">اسم العميل</p>
        <p className="font-bold text-lg mb-5">أحمد محمد</p>

        {/* Stamps Grid */}
        <div className="flex flex-wrap gap-2 mb-5">
          {Array.from({ length: stamps }).map((_, i) => (
            <div key={i} className={cn(
              'w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs transition-all',
              i < 6
                ? 'bg-white/90 border-white text-black font-bold shadow-sm'
                : 'border-white/40 bg-white/10'
            )}>
              {i < 6 ? '✓' : ''}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-70 mb-0.5">المكافأة</p>
            <p className="text-sm font-semibold">{store?.reward_description || 'مشروبك العاشر مجاناً!'}</p>
          </div>
          <div className="text-left">
            <p className="text-2xl font-black">6/{stamps}</p>
            <p className="text-xs opacity-70">طابع</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StampCards() {
  const { currentStore, isSuperAdmin, reloadStores } = useStore();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({});

  const store = currentStore;
  const locked = store?.lock_card_design && !isSuperAdmin;

  const updateMutation = useMutation({
    mutationFn: (data) => db.entities.Store.update(store.id, data),
    onSuccess: () => {
      reloadStores();
      setShowEdit(false);
    },
  });

  const handleEdit = () => {
    setEditData({
      card_bg_color: store?.card_bg_color || '#7C3AED',
      card_text_color: store?.card_text_color || '#FFFFFF',
      stamps_required: store?.stamps_required || 10,
      reward_description: store?.reward_description || '',
    });
    setShowEdit(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">بطاقات الطوابع</h2>
          <p className="text-sm text-muted-foreground mt-1">تصميم وإعداد بطاقة الطوابع للمتجر</p>
        </div>
        {!locked ? (
          <Button className="bg-primary hover:bg-primary/90" onClick={handleEdit}>
            <Palette className="w-4 h-4 ml-2" />تعديل التصميم
          </Button>
        ) : (
          <div className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-2">
            <Lock className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">التصميم مقيّد من مدير المنصة</span>
          </div>
        )}
      </div>

      {/* Locked Notice */}
      {locked && (
        <div className="flex items-center gap-3 bg-muted/50 border border-border rounded-2xl p-4">
          <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">تم قفل تصميم البطاقة من قِبَل مدير المنصة. تواصل معه لأي تعديلات.</p>
        </div>
      )}

      {/* Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-4">معاينة البطاقة</p>
          <StampCardPreview store={store} stampsRequired={store?.stamps_required} />
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold">إعدادات البطاقة</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">عدد الطوابع المطلوبة</span>
              <span className="font-semibold">{store?.stamps_required || 10} طابع</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">المكافأة</span>
              <span className="font-semibold">{store?.reward_description || '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">لون البطاقة</span>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full border border-border" style={{ background: store?.card_bg_color || '#7C3AED' }} />
                <span className="font-mono text-xs">{store?.card_bg_color || '#7C3AED'}</span>
              </div>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">قفل التصميم</span>
              <span className={store?.lock_card_design ? 'text-destructive font-medium' : 'text-success font-medium'}>
                {store?.lock_card_design ? 'مقيّد' : 'مسموح للمتجر'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>تعديل تصميم البطاقة</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>لون الخلفية</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" className="w-10 h-9 rounded-md border border-input cursor-pointer" value={editData.card_bg_color || '#7C3AED'} onChange={e => setEditData({ ...editData, card_bg_color: e.target.value })} />
                <Input value={editData.card_bg_color || ''} onChange={e => setEditData({ ...editData, card_bg_color: e.target.value })} placeholder="#7C3AED" dir="ltr" />
              </div>
            </div>
            <div>
              <Label>لون النص</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" className="w-10 h-9 rounded-md border border-input cursor-pointer" value={editData.card_text_color || '#FFFFFF'} onChange={e => setEditData({ ...editData, card_text_color: e.target.value })} />
                <Input value={editData.card_text_color || ''} onChange={e => setEditData({ ...editData, card_text_color: e.target.value })} dir="ltr" />
              </div>
            </div>
            <div>
              <Label>عدد الطوابع للمكافأة</Label>
              <Input type="number" className="mt-1" min={3} max={30} value={editData.stamps_required || 10} onChange={e => setEditData({ ...editData, stamps_required: parseInt(e.target.value) })} dir="ltr" />
            </div>
            <div>
              <Label>وصف المكافأة</Label>
              <Input className="mt-1" placeholder="مثال: مشروبك العاشر مجاناً!" value={editData.reward_description || ''} onChange={e => setEditData({ ...editData, reward_description: e.target.value })} />
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90"
              onClick={() => updateMutation.mutate(editData)}
              disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}