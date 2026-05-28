import db from '@/api/base44Client';

import React, { createContext, useState, useEffect } from 'react';

import { useAuth } from './AuthContext';

export const StoreContext = createContext(null);

export const StoreProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentStore, setCurrentStore] = useState(null);
  const [allStores, setAllStores] = useState([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);

  const isSuperAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsLoadingStore(false);
      return;
    }
    loadStores();
  }, [isAuthenticated, user]);

  const loadStores = async () => {
    setIsLoadingStore(true);
    try {
      if (isSuperAdmin) {
        // السوبر أدمن يرى كل المتاجر
        const stores = await db.entities.Store.list('-created_date', 100);
        setAllStores(stores);
        // إذا كان يختار متجراً معيناً من sessionStorage
        const savedStoreId = sessionStorage.getItem('selected_store_id');
        if (savedStoreId) {
          const found = stores.find(s => s.id === savedStoreId);
          setCurrentStore(found || stores[0] || null);
        } else {
          setCurrentStore(null); // السوبر أدمن يبدأ بدون متجر محدد (يرى الكل)
        }
      } else {
        // صاحب المتجر: يرى متجره فقط بناءً على owner_user_id
        const stores = await db.entities.Store.filter({ owner_user_id: user.id });
        setAllStores(stores);
        setCurrentStore(stores[0] || null);
      }
    } catch (e) {
      console.error('Failed to load stores', e);
    }
    setIsLoadingStore(false);
  };

  const switchStore = (store) => {
    setCurrentStore(store);
    if (store) {
      sessionStorage.setItem('selected_store_id', store.id);
    } else {
      sessionStorage.removeItem('selected_store_id');
    }
  };

  return (
    <StoreContext.Provider value={{
      currentStore,
      allStores,
      isLoadingStore,
      isSuperAdmin,
      switchStore,
      reloadStores: loadStores,
    }}>
      {children}
    </StoreContext.Provider>
  );
};


