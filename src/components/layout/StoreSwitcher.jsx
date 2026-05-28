import React from 'react';
import { useStore } from '@/lib/useStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Globe } from 'lucide-react';

export default function StoreSwitcher() {
  const { currentStore, allStores, isSuperAdmin, switchStore } = useStore();

  if (!isSuperAdmin) return null;

  return (
    <div className="px-2 mb-2">
      <Select
        value={currentStore?.id || '__all__'}
        onValueChange={(val) => {
          if (val === '__all__') {
            switchStore(null);
          } else {
            const store = allStores.find(s => s.id === val);
            if (store) switchStore(store);
          }
        }}
      >
        <SelectTrigger className="w-full bg-primary/5 border-primary/20 text-primary text-xs h-8">
          <div className="flex items-center gap-2">
            {currentStore ? <Building2 className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">
            <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" />كل المتاجر</div>
          </SelectItem>
          {allStores.map(s => (
            <SelectItem key={s.id} value={s.id}>
              <div className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" />{s.name}</div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

