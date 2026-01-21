
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Validasi Env Vars untuk memudahkan debugging
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '%c FATAL ERROR: Supabase Credentials Missing! %c\n' +
    'Pastikan Anda telah membuat file .env.local di root folder dan mengisi VITE_SUPABASE_URL serta VITE_SUPABASE_ANON_KEY.',
    'background: #ff0000; color: #ffffff; font-weight: bold; padding: 4px;',
    'color: inherit;'
  );
}

// Create client configuration
export const supabase = createClient(
  supabaseUrl || '', // Fallback string kosong agar tidak crash saat init, error akan muncul di console
  supabaseAnonKey || '', 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
