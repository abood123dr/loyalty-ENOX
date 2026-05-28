import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Plus, Percent, Tag, Cake, UserPlus, Ticket, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const typeIcons = {
  discount: Percent,
  free_item: Gift,
  cashback: Tag,
  birthday: Cake,
  referral: UserPlus,
  promo_code: Ticket,
};
const typeLabels = { discount: 'خصم', free_item: 'هدية مجانية', cashback: 'استرداد', birthday: 'عيد ميلاد', referral: 'إحالة', promo_code: 'كود خصم' };
const typeColors = { discount: 'bg-primary/10 text-primary', free_item: 'bg-success/10 text-success', cashback: 'bg-warning/10 text-warning', birthday: 'bg-chart-5/10 text-chart-5', referral: 'bg-chart-2/10 text-chart-2', promo_code: 'bg-destructive/10 text-destructive' };

const sampleRewards = [
  { id: '1', name: 'خصم 20% على الطلب', type: 'discount', points_required: 500, discount_value: 20, current_redemptions: 45, max_redemptions: 100, is_active: true },
  { id: '2', name: 'قهوة مجانية', type: 'free_item', points_required: 200, current_redemptions: 120, max_redemptions: -1, is_active: true },
  { id: '3', name: 'هدية عيد الميلاد', type: 'birthday', points_required: 0, current_redemptions: 34, max_redemptions: -1, is_active: true },
  { id: '4', name: 'مكافأة الإحالة', type: 'referral', points_required: 0, discount_value: 50, current_redemptions: 18, max_redemptions: -1, is_active: true },
  { id: '5', name: 'كود WELCOME10', type: 'promo_code', points_required: 0, discount_value: 10, promo_code: 'WELCOME10', current_redemptions: 89, max_redemptions: 200, is_active: false },
];

export default function Rewards() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">المكافآت</h2>
          <p className="text-muted-foreground text-sm mt-1">إدارة المكافآت والعروض الترويجية</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 ml-2" />
              مكافأة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>إضافة مكافأة</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>اسم المكافأة</Label><Input placeholder="مثال: خصم 20%" className="mt-1" /></div>
              <div>
                <Label>النوع</Label>
                <Select defaultValue="discount">
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>النقاط المطلوبة</Label><Input type="number" placeholder="0" className="mt-1" /></div>
              <Button className="w-full bg-primary hover:bg-primary/90">حفظ المكافأة</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-right">المكافأة</TableHead>
              <TableHead className="text-right">النوع</TableHead>
              <TableHead className="text-right">النقاط المطلوبة</TableHead>
              <TableHead className="text-right">الاستبدالات</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleRewards.map((reward) => {
              const TypeIcon = typeIcons[reward.type] || Gift;
              return (
                <TableRow key={reward.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', typeColors[reward.type])}>
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-sm">{reward.name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{typeLabels[reward.type]}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">{reward.points_required || 'مجاني'}</TableCell>
                  <TableCell className="text-sm">
                    {reward.current_redemptions}{reward.max_redemptions > 0 ? ` / ${reward.max_redemptions}` : ''}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(reward.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
                      {reward.is_active ? 'نشطة' : 'معطلة'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem>تعديل</DropdownMenuItem>
                        <DropdownMenuItem>تعطيل</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">حذف</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}

