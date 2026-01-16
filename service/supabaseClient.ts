import { createClient } from '@supabase/supabase-js';

// KONFIGURASI SUPABASE
// ----------------------------------------------------------------------------------
// URL dan Key diambil dari Environment Variable.
// Jika tidak terbaca (misal restart server diperlukan), gunakan fallback yang Anda berikan.
// ----------------------------------------------------------------------------------

const envUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const envKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Fallback ke kredensial yang Anda berikan agar aplikasi langsung jalan
const FALLBACK_URL = 'https://lvviirscnkhjwiugrsjh.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dmlpcnNjbmtoandpdWdyc2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzgxOTAsImV4cCI6MjA4MzgxNDE5MH0.xKScJv2zIIfGcAEMvFx0q8jjjFlUMiS9AwTmJ2Tm5Ns';

const SUPABASE_URL = envUrl || FALLBACK_URL; 
const SUPABASE_ANON_KEY = envKey || FALLBACK_KEY;

// Cek validitas
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('GANTI_DENGAN')) {
  console.error(
    '%c FATAL ERROR: Supabase Credentials Invalid! ', 
    'background: #ff0000; color: #ffffff; font-size: 16px; font-weight: bold; padding: 4px;'
  );
} else {
  console.log("Supabase Client initialized with:", SUPABASE_URL);
}

// Create client configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});