import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Plus, Phone, Users, Eye, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const sampleBranches = [
  { id: 1, name: 'الفرع الرئيسي', address: 'شارع العليا، الرياض', city: 'الرياض', phone: '0112345678', manager_name: 'محمد الأحمد', daily_visits: 67, is_active: true },
  { id: 2, name: 'فرع العليا', address: 'طريق الملك فهد، الرياض', city: 'الرياض', phone: '0112345679', manager_name: 'سارة العلي', daily_visits: 45, is_active: true },
  { id: 3, name: 'فرع الملز', address: 'حي الملز، الرياض', city: 'الرياض', phone: '0112345680', manager_name: 'عمر السعيد', daily_visits: 38, is_active: true },
  { id: 4, name: 'فرع النخيل', address: 'مول النخيل، الرياض', city: 'الرياض', phone: '0112345681', manager_name: 'هند الشمري', daily_visits: 0, is_active: false },
];

export default function Branches() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">الفروع</h2>
          <p className="text-muted-foreground text-sm mt-1">إدارة مواقع فروعك</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 ml-2" />فرع جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>إضافة فرع جديد</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>اسم الفرع</Label><Input className="mt-1" /></div>
              <div><Label>العنوان</Label><Input className="mt-1" /></div>
              <div><Label>المدينة</Label><Input className="mt-1" /></div>
              <div><Label>رقم الهاتف</Label><Input className="mt-1" dir="ltr" /></div>
              <div><Label>اسم المدير</Label><Input className="mt-1" /></div>
              <Button className="w-full bg-primary hover:bg-primary/90">إضافة الفرع</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sampleBranches.map((b, idx) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-card rounded-2xl border border-border p-6 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{b.name}</h3>
                  <p className="text-sm text-muted-foreground">{b.city}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>تعديل</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">{b.is_active ? 'تعطيل' : 'تفعيل'}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground mb-4">
              <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{b.address}</p>
              <p className="flex items-center gap-2" dir="ltr"><Phone className="w-3.5 h-3.5" />{b.phone}</p>
              <p className="flex items-center gap-2"><Users className="w-3.5 h-3.5" />المدير: {b.manager_name}</p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{b.daily_visits} زيارة اليوم</span>
              </div>
              <Badge className={b.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                {b.is_active ? 'نشط' : 'معطل'}
              </Badge>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

