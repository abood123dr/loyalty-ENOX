import React from 'react';
import { motion } from 'framer-motion';
import { QrCode, Nfc, Plus, Download, Eye, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const qrCodes = [
  { id: 1, name: 'QR الفرع الرئيسي', type: 'branch', scans: 1245, status: 'active', branch: 'الفرع الرئيسي' },
  { id: 2, name: 'QR فرع العليا', type: 'branch', scans: 892, status: 'active', branch: 'فرع العليا' },
  { id: 3, name: 'QR عرض رمضان', type: 'campaign', scans: 456, status: 'active', branch: 'جميع الفروع' },
  { id: 4, name: 'QR بطاقة VIP', type: 'card', scans: 234, status: 'inactive', branch: 'الفرع الرئيسي' },
  { id: 5, name: 'NFC كاونتر 1', type: 'nfc', scans: 678, status: 'active', branch: 'الفرع الرئيسي' },
];

const typeLabels = { branch: 'فرع', campaign: 'حملة', card: 'بطاقة', nfc: 'NFC' };

export default function QrNfc() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">إدارة QR & NFC</h2>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة رموز QR ونقاط NFC</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 ml-2" />
          رمز QR جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 text-center">
          <QrCode className="w-10 h-10 text-primary mx-auto mb-3" />
          <p className="text-2xl font-bold">5</p>
          <p className="text-sm text-muted-foreground">رموز QR نشطة</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card rounded-2xl border border-border p-5 text-center">
          <Nfc className="w-10 h-10 text-chart-2 mx-auto mb-3" style={{ color: 'hsl(190, 70%, 50%)' }} />
          <p className="text-2xl font-bold">3</p>
          <p className="text-sm text-muted-foreground">نقاط NFC نشطة</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-5 text-center">
          <Eye className="w-10 h-10 text-success mx-auto mb-3" />
          <p className="text-2xl font-bold">3,505</p>
          <p className="text-sm text-muted-foreground">إجمالي المسح</p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">النوع</TableHead>
              <TableHead className="text-right">الفرع</TableHead>
              <TableHead className="text-right">عدد المسح</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {qrCodes.map((qr) => (
              <TableRow key={qr.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium text-sm">{qr.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {qr.type === 'nfc' ? <Nfc className="w-3 h-3 ml-1" /> : <QrCode className="w-3 h-3 ml-1" />}
                    {typeLabels[qr.type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{qr.branch}</TableCell>
                <TableCell className="text-sm font-medium">{qr.scans.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={qr.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                    {qr.status === 'active' ? 'نشط' : 'معطل'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem><Download className="w-4 h-4 ml-2" />تحميل</DropdownMenuItem>
                      <DropdownMenuItem>تعديل</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">حذف</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}

