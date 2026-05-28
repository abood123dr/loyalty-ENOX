export const SUPER_ADMIN_EMAIL = 'lamhatc1@gmail.com';

export const normalizeEmail = (email) => (email || '').trim().toLowerCase();

export const isPlatformAdmin = (user) => {
  const email = normalizeEmail(user?.email);
  const role = user?.role || user?.user_metadata?.role || user?.app_metadata?.role;

  return email === SUPER_ADMIN_EMAIL || role === 'admin' || role === 'super_admin';
};
