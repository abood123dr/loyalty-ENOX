import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const data = [
  { month: 'يناير', revenue: 4200, visits: 320 },
  { month: 'فبراير', revenue: 5800, visits: 410 },
  { month: 'مارس', revenue: 6100, visits: 480 },
  { month: 'أبريل', revenue: 7200, visits: 520 },
  { month: 'مايو', revenue: 8900, visits: 610 },
  { month: 'يونيو', revenue: 9400, visits: 690 },
  { month: 'يوليو', revenue: 11200, visits: 780 },
];

export default function RevenueChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card rounded-2xl border border-border p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-foreground">الأرباح والزيارات</h3>
          <p className="text-sm text-muted-foreground">آخر 7 أشهر</p>
        </div>
      </div>
      <div className="h-72" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(262, 80%, 55%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(262, 80%, 55%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(190, 70%, 50%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(190, 70%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(250, 15%, 91%)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(250, 15%, 91%)',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              }}
            />
            <Area type="monotone" dataKey="revenue" stroke="hsl(262, 80%, 55%)" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} name="الأرباح" />
            <Area type="monotone" dataKey="visits" stroke="hsl(190, 70%, 50%)" fillOpacity={1} fill="url(#colorVisits)" strokeWidth={2} name="الزيارات" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

