import React from 'react';
import { motion } from 'framer-motion';
import { Users, RotateCcw, CreditCard, MapPin } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '@/components/dashboard/StatCard';

const monthlyData = [
  { month: 'يناير', visits: 320, returns: 180, newCustomers: 45 },
  { month: 'فبراير', visits: 410, returns: 240, newCustomers: 62 },
  { month: 'مارس', visits: 480, returns: 290, newCustomers: 58 },
  { month: 'أبريل', visits: 520, returns: 310, newCustomers: 71 },
  { month: 'مايو', visits: 610, returns: 380, newCustomers: 84 },
  { month: 'يونيو', visits: 690, returns: 420, newCustomers: 93 },
];

const tierData = [
  { name: 'برونزي', value: 1200, fill: 'hsl(340, 70%, 55%)' },
  { name: 'فضي', value: 800, fill: 'hsl(250, 15%, 60%)' },
  { name: 'ذهبي', value: 450, fill: 'hsl(35, 85%, 55%)' },
  { name: 'بلاتيني', value: 120, fill: 'hsl(262, 80%, 55%)' },
];

const branchData = [
  { name: 'الفرع الرئيسي', visits: 280 },
  { name: 'فرع العليا', visits: 210 },
  { name: 'فرع الملز', visits: 170 },
  { name: 'فرع النخيل', visits: 140 },
];

const stats = [
  { title: 'معدل العودة', value: '72%', icon: RotateCcw, trend: 'up', trendValue: '+3%', color: 'success' },
  { title: 'معدل الاحتفاظ', value: '68%', icon: Users, trend: 'up', trendValue: '+5%', color: 'primary' },
  { title: 'معدل استخدام البطاقات', value: '84%', icon: CreditCard, trend: 'up', trendValue: '+7%', color: 'chart2' },
  { title: 'أكثر الفروع نشاطًا', value: 'الفرع الرئيسي', icon: MapPin, color: 'warning' },
];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">التحليلات</h2>
        <p className="text-muted-foreground text-sm mt-1">تحليل شامل لأداء نشاطك التجاري</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={i} {...s} index={i} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Visits */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">الزيارات الشهرية</h3>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(250, 15%, 91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(250,15%,91%)' }} />
                <Bar dataKey="visits" fill="hsl(262, 80%, 55%)" radius={[6, 6, 0, 0]} name="الزيارات" />
                <Bar dataKey="returns" fill="hsl(190, 70%, 50%)" radius={[6, 6, 0, 0]} name="العودة" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Tier Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">توزيع المستويات</h3>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tierData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {tierData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(250,15%,91%)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* New Customers Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">العملاء الجدد</h3>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(250, 15%, 91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(250,15%,91%)' }} />
                <Line type="monotone" dataKey="newCustomers" stroke="hsl(150, 60%, 45%)" strokeWidth={2} dot={{ fill: 'hsl(150, 60%, 45%)' }} name="عملاء جدد" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Branch Performance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">أداء الفروع</h3>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(250, 15%, 91%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(250,15%,91%)' }} />
                <Bar dataKey="visits" fill="hsl(35, 85%, 55%)" radius={[0, 6, 6, 0]} name="الزيارات" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

