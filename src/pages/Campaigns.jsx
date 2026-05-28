import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Plus, Send, Clock, FileText, Ban, MoreHorizontal, Smartphone, MessageSquare, Mail, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const channelIcons = { push: Smartphone, sms: MessageSquare, whatsapp: MessageSquare, email: Mail, wallet: Wallet };
const channelLabels = { push: 'إشعار فوري', sms: 'SMS', whatsapp: 'واتساب', email: 'بريد إلكتروني', wallet: 'محفظة رقمية' };
const statusConfig = {
  draft: { label: 'مسودة', icon: FileText, color: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'مجدولة', icon: Clock, color: 'bg-warning/10 text-warning' },
  sent: { label: 'تم الإرسال', icon: Send, color: 'bg-success/10 text-success' },
  cancelled: { label: 'ملغاة', icon: Ban, color: 'bg-destructive/10 text-destructive' },
};

const sampleCampaigns = [
  { id: '1', name: 'عرض رمضان', type: 'push', message: 'احصل على نقاط مضاعفة طوال شهر رمضان!', target_segment: 'all', status: 'sent', sent_count: 2450, open_count: 1890, click_count: 670, is_ai_generated: false },
  { id: '2', name: 'عروض نهاية الأسبوع', type: 'whatsapp', message: 'خصم 30% على جميع المشروبات!', target_segment: 'vip', status: 'scheduled', sent_count: 0, open_count: 0, click_count: 0, is_ai_generated: true },
  { id: '3', name: 'تذكير العملاء الخاملين', type: 'sms', message: 'افتقدناك! عد واحصل على 50 نقطة مجانية', target_segment: 'inactive', status: 'draft', sent_count: 0, open_count: 0, click_count: 0, is_ai_generated: true },
  { id: '4', name: 'أعياد ميلاد الشهر', type: 'email', message: 'كل عام وأنت بخير! هديتك بانتظارك', target_segment: 'birthday', status: 'sent', sent_count: 34, open_count: 28, click_count: 19, is_ai_generated: false },
];

export default function Campaigns() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">الحملات التسويقية</h2>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة الحملات والإشعارات</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 ml-2" />
              حملة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>إنشاء حملة تسويقية</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>اسم الحملة</Label><Input placeholder="اسم الحملة" className="mt-1" /></div>
              <div>
                <Label>القناة</Label>
                <Select defaultValue="push">
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(channelLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الشريحة المستهدفة</Label>
                <Select defaultValue="all">
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع العملاء</SelectItem>
                    <SelectItem value="vip">عملاء VIP</SelectItem>
                    <SelectItem value="inactive">العملاء الخاملين</SelectItem>
                    <SelectItem value="new">العملاء الجدد</SelectItem>
                    <SelectItem value="birthday">أعياد الميلاد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>نص الرسالة</Label><Textarea placeholder="اكتب رسالة الحملة..." className="mt-1" rows={4} /></div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-primary hover:bg-primary/90">إرسال الآن</Button>
                <Button variant="outline" className="flex-1">جدولة</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-right">الحملة</TableHead>
              <TableHead className="text-right">القناة</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">تم الإرسال</TableHead>
              <TableHead className="text-right">الفتح</TableHead>
              <TableHead className="text-right">النقرات</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleCampaigns.map((c) => {
              const ChannelIcon = channelIcons[c.type] || Megaphone;
              const status = statusConfig[c.status];
              const StatusIcon = status.icon;
              return (
                <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.message}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ChannelIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{channelLabels[c.type]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('gap-1', status.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{c.sent_count.toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{c.open_count.toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{c.click_count.toLocaleString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem>تعديل</DropdownMenuItem>
                        <DropdownMenuItem>نسخ</DropdownMenuItem>
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

