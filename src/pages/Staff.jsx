import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCog, Plus, Shield, MoreHorizontal, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const roleLabels = { owner: 'مالك', manager: 'مدير', staff: 'موظف' };
const roleColors = { owner: 'bg-primary/10 text-primary', manager: 'bg-warning/10 text-warning', staff: 'bg-muted text-muted-foreground' };

const sampleStaff = [
  { id: 1, name: 'محمد الأحمد', email: 'mohammed@example.com', phone: '0501234567', role: 'owner', branch: 'جميع الفروع', is_active: true },
  { id: 2, name: 'سارة العلي', email: 'sara@example.com', phone: '0559876543', role: 'manager', branch: 'الفرع الرئيسي', is_active: true },
  { id: 3, name: 'عمر السعيد', email: 'omar@example.com', phone: '0541112233', role: 'staff', branch: 'فرع العليا', is_active: true },
  { id: 4, name: 'هند الشمري', email: 'hind@example.com', phone: '0533445566', role: 'staff', branch: 'فرع الملز', is_active: false },
];

export default function Staff() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">إدارة الموظفين</h2>
          <p className="text-muted-foreground text-sm mt-1">إدارة فريق العمل والصلاحيات</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 ml-2" />إضافة موظف</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>إضافة موظف جديد</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>الاسم الكامل</Label><Input className="mt-1" /></div>
              <div><Label>البريد الإلكتروني</Label><Input type="email" className="mt-1" dir="ltr" /></div>
              <div><Label>رقم الجوال</Label><Input className="mt-1" dir="ltr" /></div>
              <div>
                <Label>الدور</Label>
                <Select defaultValue="staff"><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">مدير</SelectItem>
                    <SelectItem value="staff">موظف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الفرع</Label>
                <Select><SelectTrigger className="mt-1"><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">الفرع الرئيسي</SelectItem>
                    <SelectItem value="olaya">فرع العليا</SelectItem>
                    <SelectItem value="malaz">فرع الملز</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90">إضافة الموظف</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sampleStaff.map((s, idx) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-11 h-11">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {s.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{s.name}</p>
                  <Badge className={cn('text-xs mt-1', roleColors[s.role])}>{roleLabels[s.role]}</Badge>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>تعديل</DropdownMenuItem>
                  <DropdownMenuItem>تغيير الصلاحيات</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">تعطيل</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" />{s.email}</p>
              <p className="flex items-center gap-2 text-muted-foreground" dir="ltr"><Phone className="w-3.5 h-3.5" />{s.phone}</p>
              <p className="flex items-center gap-2 text-muted-foreground"><Shield className="w-3.5 h-3.5" />{s.branch}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <Badge className={cn(s.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
                {s.is_active ? 'نشط' : 'معطل'}
              </Badge>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

