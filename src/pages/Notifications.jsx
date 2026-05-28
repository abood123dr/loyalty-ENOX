import db from '@/api/base44Client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useStore } from '@/lib/useStore';
import { motion } from 'framer-motion';
import { Bell, Plus, MapPin, Send, ToggleLeft, ToggleRight, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function Notifications() {
  const { currentStore, reloadStores } = useStore();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'manual' });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', currentStore?.id],
    queryFn: () => currentStore
      ? db.entities.Notification.filter({ store_id: currentStore.id }, '-created_date', 50)
      : db.entities.Notification.list('-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Notification.create({
      ...data,
      store_id: currentStore?.id || '',
      status: 'sent',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications', currentStore?.id]);
      setShowAdd(false);
      setForm({ title: '', message: '', type: 'manual' });
    },
  });

  const updateGeofenceMutation = useMutation({
    mutationFn: (data) => db.entities.Store.update(currentStore.id, data),
    onSuccess: reloadStores,
  });

  const geofenceEnabled = currentStore?.geofence_enabled || false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">الإشعارات</h2>
          <p className="text-sm text-muted-foreground mt-1">إشعارات يدوية وجغرافية</p>
        </div>
        {currentStore && (
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 ml-2" />إشعار جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>إرسال إشعار جديد</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div><Label>العنوان</Label><Input className="mt-1" placeholder="عنوان الإشعار" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>الرسالة</Label><Input className="mt-1" placeholder="نص الإشعار..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></div>
                <Button className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.title || !form.message || createMutation.isPending}>
                  <Send className="w-4 h-4 ml-2" />
                  {createMutation.isPending ? 'جاري الإرسال...' : 'إرسال الإشعار'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Geofencing Section */}
      {currentStore && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">إشعارات الموقع الجغرافي</p>
                <p className="text-xs text-muted-foreground">تُرسَل تلقائياً عند اقتراب العميل من المتجر</p>
              </div>
            </div>
            <Switch
              checked={geofenceEnabled}
              onCheckedChange={(v) => updateGeofenceMutation.mutate({ geofence_enabled: v })}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {geofenceEnabled && (
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">خط العرض (Latitude)</Label>
                  <Input className="mt-1 text-sm" dir="ltr" placeholder="24.7136"
                    defaultValue={currentStore.latitude}
                    onBlur={e => updateGeofenceMutation.mutate({ latitude: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">خط الطول (Longitude)</Label>
                  <Input className="mt-1 text-sm" dir="ltr" placeholder="46.6753"
                    defaultValue={currentStore.longitude}
                    onBlur={e => updateGeofenceMutation.mutate({ longitude: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">نطاق الإشعار (بالمتر)</Label>
                <Input className="mt-1 text-sm" dir="ltr" type="number" placeholder="200"
                  defaultValue={currentStore.geofence_radius || 200}
                  onBlur={e => updateGeofenceMutation.mutate({ geofence_radius: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label className="text-xs">رسالة الإشعار الجغرافي</Label>
                <Input className="mt-1 text-sm" placeholder='مثال: "أنت قريب من متجرنا ☕ — طابعان متبقيان!"'
                  defaultValue={currentStore.geofence_message}
                  onBlur={e => updateGeofenceMutation.mutate({ geofence_message: e.target.value })} />
              </div>
              <div className="p-3 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground">
                  📍 سيُرسَل الإشعار تلقائياً عبر Apple Wallet Pass عندما يقترب العميل من
                  <span className="font-medium text-foreground"> {currentStore.geofence_radius || 200}م </span>
                  من الموقع المحدد.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Notifications List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold">الإشعارات المرسلة</h3>
        </div>
        {notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">لا توجد إشعارات بعد</p>
          </div>
        ) : (
          notifications.map((n, i) => (
            <div key={n.id} className="px-5 py-4 border-b border-border last:border-0 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  {n.type === 'geofence' ? <MapPin className="w-4 h-4 text-primary" /> : <Bell className="w-4 h-4 text-primary" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                </div>
              </div>
              <Badge className={n.status === 'sent' ? 'bg-success/10 text-success shrink-0' : 'bg-muted text-muted-foreground shrink-0'}>
                {n.status === 'sent' ? 'مُرسَل' : 'مسودة'}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


