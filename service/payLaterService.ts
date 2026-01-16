
import { supabase } from './supabaseClient';
import { PayLaterRecord } from '../types';
import { authService } from './authService';

export const payLaterService = {
  /**
   * Get PayLater Records based on Role
   */
  getPayLaterRecords: async (): Promise<PayLaterRecord[]> => {
    const profile = await authService.getUserProfile();
    if (!profile) return [];

    // Query dengan Join ke tabel terkait untuk info detail
    let query = supabase
      .from('paylater_records')
      .select(`
        *,
        companies (name, phone),
        customers (full_name, phone),
        bookings (id, start_date, end_date),
        dpc_regions (name)
      `)
      .order('created_at', { ascending: false });

    // Note: RLS di Database sudah otomatis memfilter:
    // - Super Admin: Lihat Semua
    // - DPC Admin: Lihat wilayahnya saja
    // - Owner: Lihat booking miliknya saja
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as PayLaterRecord[];
  },

  /**
   * Create a record (biasanya dipanggil internal saat booking dibuat)
   */
  createRecord: async (payload: Partial<PayLaterRecord>) => {
      const { error } = await supabase
        .from('paylater_records')
        .insert(payload);
      
      if (error) throw new Error(error.message);
  },

  /**
   * Update Status Pembayaran (Untuk Admin DPC menandai Lunas/Macet)
   */
  updateStatus: async (id: string, status: 'active' | 'paid_off' | 'default') => {
      const { error } = await supabase
        .from('paylater_records')
        .update({ status })
        .eq('id', id);
      
      if (error) throw new Error(error.message);
  }
};
