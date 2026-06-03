import db from '@/api/base44Client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, Building2, LocateFixed, MapPin, Navigation, Plus, Send, Wallet } from 'lucide-react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useStore } from '@/lib/useStore';

const DEFAULT_CENTER = { latitude: 24.7136, longitude: 46.6753 };

function MapRecenter({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.latitude, center.longitude], map.getZoom(), { animate: true });
  }, [center.latitude, center.longitude, map]);

  return null;
}

function ClickableMap({ onPick }) {
  useMapEvents({
    click(event) {
      onPick({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

function GeofenceMapPicker({ store, onUpdate, isPending }) {
  const [draft, setDraft] = useState({
    latitude: Number(store?.latitude) || DEFAULT_CENTER.latitude,
    longitude: Number(store?.longitude) || DEFAULT_CENTER.longitude,
  });

  useEffect(() => {
    setDraft({
      latitude: Number(store?.latitude) || DEFAULT_CENTER.latitude,
      longitude: Number(store?.longitude) || DEFAULT_CENTER.longitude,
    });
  }, [store?.id, store?.latitude, store?.longitude]);

  const center = useMemo(() => ({
    latitude: Number.isFinite(draft.latitude) ? draft.latitude : DEFAULT_CENTER.latitude,
    longitude: Number.isFinite(draft.longitude) ? draft.longitude : DEFAULT_CENTER.longitude,
  }), [draft.latitude, draft.longitude]);

  const saveLocation = (nextLocation) => {
    setDraft(nextLocation);
    onUpdate(nextLocation);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      saveLocation({
        latitude: Number(position.coords.latitude.toFixed(6)),
        longitude: Number(position.coords.longitude.toFixed(6)),
      });
    });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border">
        <MapContainer
          center={[center.latitude, center.longitude]}
          zoom={15}
          scrollWheelZoom
          className="z-0 h-72 w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={center} />
          <ClickableMap onPick={saveLocation} />
          <CircleMarker
            center={[center.latitude, center.longitude]}
            radius={9}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#2563eb',
              fillOpacity: 0.75,
              weight: 3,
            }}
          />
        </MapContainer>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
        <span dir="ltr">{center.latitude}, {center.longitude}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={useCurrentLocation}
          disabled={isPending}
        >
          <LocateFixed className="h-4 w-4" />
          موقعي الحالي
        </Button>
      </div>
    </div>
  );
}

export default function Notifications() {
  const { currentStore, allStores, isSuperAdmin, reloadStores, switchStore } = useStore();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', targetMode: 'all', customerId: '' });
  const [sendResult, setSendResult] = useState(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', currentStore?.id],
    queryFn: () => currentStore
      ? db.entities.Notification.filter({ store_id: currentStore.id }, '-created_at', 50)
      : db.entities.Notification.list('-created_at', 50),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['notification-customers', currentStore?.id],
    queryFn: () => currentStore
      ? db.entities.StoreCustomer.filter({ store_id: currentStore.id }, '-created_at', 500)
      : [],
    enabled: Boolean(currentStore?.id),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (!currentStore?.id) {
        throw new Error('Select a store before sending Google Wallet notifications.');
      }

      const walletResult = await db.integrations.GoogleWallet.sendNotification({
        storeId: currentStore.id,
        customerId: data.targetMode === 'customer' ? data.customerId : undefined,
        title: data.title,
        message: data.message,
      });

      await db.entities.Notification.create({
        store_id: currentStore.id,
        title: data.title,
        message: data.message,
        type: 'google_wallet',
        target: data.targetMode === 'customer' ? `customer:${data.customerId}` : 'all',
        sent_count: walletResult?.sent || 0,
        status: walletResult?.failed ? 'partial' : 'sent',
      });

      return walletResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', currentStore?.id] });
      setSendResult({
        type: result?.failed ? 'warning' : 'success',
        text: `تم إرسال تحديث Google Wallet إلى ${result?.sent || 0} بطاقة.${result?.skipped ? ` تم تخطي ${result.skipped} عميل بدون بطاقة Google Wallet.` : ''}${result?.failed ? ` فشل ${result.failed} بطاقة.` : ''}`,
      });
      setShowAdd(false);
      setForm({ title: '', message: '', targetMode: 'all', customerId: '' });
    },
    onError: (error) => {
      setSendResult({
        type: 'error',
        text: error?.message || 'تعذر إرسال إشعار Google Wallet.',
      });
    },
  });

  const updateGeofenceMutation = useMutation({
    mutationFn: (data) => {
      if (!currentStore?.id) {
        throw new Error('Select a store before updating notification settings.');
      }

      return db.entities.Store.update(currentStore.id, data);
    },
    onSuccess: reloadStores,
  });

  const geofenceEnabled = currentStore?.geofence_enabled || false;
  const walletCustomersCount = customers.filter((customer) => customer.google_wallet_object_id).length;
  const hasStoreSelected = Boolean(currentStore?.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">الإشعارات</h2>
          <p className="mt-1 text-sm text-muted-foreground">إرسال رسائل داخل Google Wallet للعملاء</p>
        </div>
        {hasStoreSelected && (
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="ml-2 h-4 w-4" />
                إشعار Google Wallet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>إرسال إشعار Google Wallet</DialogTitle>
              </DialogHeader>
              <div className="mt-2 space-y-4">
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-700">
                  يصل الإشعار للعملاء الذين أضافوا البطاقة إلى Google Wallet فقط.
                </div>

                <div>
                  <Label>المستلم</Label>
                  <Select value={form.targetMode} onValueChange={(value) => setForm({ ...form, targetMode: value, customerId: '' })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل عملاء Google Wallet ({walletCustomersCount})</SelectItem>
                      <SelectItem value="customer">عميل محدد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.targetMode === 'customer' && (
                  <div>
                    <Label>اختر العميل</Label>
                    <Select value={form.customerId} onValueChange={(value) => setForm({ ...form, customerId: value })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="اختر عميل" /></SelectTrigger>
                      <SelectContent>
                        {customers.filter((customer) => customer.google_wallet_object_id).map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.full_name} - {customer.phone || 'بدون رقم'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>العنوان</Label>
                  <Input
                    className="mt-1"
                    placeholder="مثال: عرض اليوم"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                  />
                </div>

                <div>
                  <Label>الرسالة</Label>
                  <Input
                    className="mt-1"
                    placeholder="مثال: ختمين إضافيين عند زيارتك اليوم"
                    value={form.message}
                    onChange={(event) => setForm({ ...form, message: event.target.value })}
                  />
                </div>

                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.title || !form.message || (form.targetMode === 'customer' && !form.customerId) || createMutation.isPending}
                >
                  <Send className="ml-2 h-4 w-4" />
                  {createMutation.isPending ? 'جاري الإرسال...' : 'إرسال الإشعار'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isSuperAdmin && !hasStoreSelected && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">Select a store to send notifications</p>
                <p className="mt-1 text-sm text-amber-800">
                  Google Wallet notifications and geofence settings are store-specific.
                </p>
              </div>
            </div>
            <Select
              value=""
              onValueChange={(storeId) => {
                const store = allStores.find((item) => item.id === storeId);
                if (store) switchStore(store);
              }}
            >
              <SelectTrigger className="w-full bg-background sm:w-72">
                <SelectValue placeholder="Choose store" />
              </SelectTrigger>
              <SelectContent>
                {allStores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {sendResult && (
        <div className={`whitespace-pre-wrap rounded-xl border p-3 text-sm ${
          sendResult.type === 'error'
            ? 'border-destructive/20 bg-destructive/10 text-destructive'
            : sendResult.type === 'warning'
              ? 'border-amber-500/20 bg-amber-500/10 text-amber-700'
              : 'border-success/20 bg-success/10 text-success'
        }`}>
          {sendResult.text}
        </div>
      )}

      {hasStoreSelected && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Navigation className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">إشعارات الموقع الجغرافي</p>
                <p className="text-xs text-muted-foreground">جاهزة كإعدادات، وربطها كتنبيه موقع سيتم لاحقا</p>
              </div>
            </div>
            <Switch
              checked={geofenceEnabled}
              onCheckedChange={(value) => updateGeofenceMutation.mutate({ geofence_enabled: value })}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {geofenceEnabled && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">خط العرض</Label>
                  <Input className="mt-1 text-sm" dir="ltr" placeholder="24.7136"
                    defaultValue={currentStore.latitude}
                    onBlur={(event) => {
                      const latitude = parseFloat(event.target.value);
                      if (Number.isFinite(latitude)) updateGeofenceMutation.mutate({ latitude });
                    }} />
                </div>
                <div>
                  <Label className="text-xs">خط الطول</Label>
                  <Input className="mt-1 text-sm" dir="ltr" placeholder="46.6753"
                    defaultValue={currentStore.longitude}
                    onBlur={(event) => {
                      const longitude = parseFloat(event.target.value);
                      if (Number.isFinite(longitude)) updateGeofenceMutation.mutate({ longitude });
                    }} />
                </div>
              </div>
              <GeofenceMapPicker
                store={currentStore}
                isPending={updateGeofenceMutation.isPending}
                onUpdate={(location) => updateGeofenceMutation.mutate(location)}
              />
              <div>
                <Label className="text-xs">نطاق الإشعار بالمتر</Label>
                <Input className="mt-1 text-sm" dir="ltr" type="number" placeholder="200"
                  defaultValue={currentStore.geofence_radius || 200}
                  onBlur={(event) => updateGeofenceMutation.mutate({ geofence_radius: parseInt(event.target.value, 10) })} />
              </div>
              <div>
                <Label className="text-xs">رسالة الموقع</Label>
                <Input className="mt-1 text-sm" placeholder="أنت قريب من متجرنا، لا تنس بطاقتك"
                  defaultValue={currentStore.geofence_message}
                  onBlur={(event) => updateGeofenceMutation.mutate({ geofence_message: event.target.value })} />
              </div>
            </div>
          )}
        </motion.div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-semibold">الإشعارات المرسلة</h3>
        </div>
        {notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">لا توجد إشعارات بعد</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 last:border-0">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  {notification.type === 'geofence'
                    ? <MapPin className="h-4 w-4 text-primary" />
                    : <Wallet className="h-4 w-4 text-primary" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{notification.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">تم الإرسال إلى {notification.sent_count || 0} بطاقة</p>
                </div>
              </div>
              <Badge className={notification.status === 'sent' ? 'shrink-0 bg-success/10 text-success' : 'shrink-0 bg-muted text-muted-foreground'}>
                {notification.status === 'sent' ? 'مرسل' : 'جزئي'}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
