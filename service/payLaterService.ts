
import { supabase } from './supabaseClient';
import { PayLaterRecord, UserRole } from '../types';
import { authService } from './authService';

export const payLaterService = {
  /**
   * Get PayLater Records based on Role
   */
  getPayLaterRecords: async (): Promise<PayLaterRecord[]> => {
    const profile = await authService.getUserProfile();
    if (!profile) return [];

    let query = supabase
      .from('paylater_records')
      .select(`
        *,
        companies (name, phone),
        customers (full_name, phone),
        bookings (id, start_date, end_date)
      `)
      .order('created_at', { ascending: false });

    // RLS in DB handles general access, but logical filtering here:
    if (profile.role === UserRole.DPC_ADMIN) {
        // DPC Admin logic is handled by RLS policy `dpc_id IN (...)`
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as PayLaterRecord[];
  },

  /**
   * Create a record (called internally when booking is made)
   */
  createRecord: async (payload: Partial<PayLaterRecord>) => {
      const { error } = await supabase
        .from('paylater_records')
        .insert(payload);
      
      if (error) throw new Error(error.message);
  },

  /**
   * Mark as paid (Optional for future use)
   */
  updateStatus: async (id: string, status: 'active' | 'paid_off' | 'default') => {
      const { error } = await supabase
        .from('paylater_records')
        .update({ status })
        .eq('id', id);
      
      if (error) throw new Error(error.message);
  }
};
