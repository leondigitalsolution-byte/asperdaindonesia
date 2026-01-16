import { supabase } from './supabaseClient';
import { Customer } from '../types';
import { authService } from './authService';

export const customerService = {
  /**
   * Get all customers for the current user's company
   */
  getCustomers: async (): Promise<Customer[]> => {
    const profile = await authService.getUserProfile();
    // Jika tidak ada profile atau company_id, kembalikan array kosong
    if (!profile?.company_id) return [];

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as Customer[];
  },

  /**
   * Create a new customer
   * FIX: Memastikan company_id diambil dari session user sebelum insert.
   */
  createCustomer: async (customerData: Omit<Customer, 'id' | 'company_id' | 'created_at'>) => {
    // 1. Cek User & Profile yang sedang login
    const profile = await authService.getUserProfile();
    
    if (!profile) {
      throw new Error("Gagal mengambil data user. Silakan login kembali.");
    }

    if (!profile.company_id) {
      throw new Error("Akun Anda tidak terhubung dengan perusahaan rental manapun (Company ID Missing).");
    }

    console.log("Creating customer for Company ID:", profile.company_id);

    // 2. Siapkan Payload dengan Explicit Company ID
    const newCustomerPayload = {
      company_id: profile.company_id, // Penting: Menempelkan ID Rental
      full_name: customerData.full_name,
      nik: customerData.nik,
      phone: customerData.phone,
      address: customerData.address,
      is_blacklisted: customerData.is_blacklisted || false
    };

    // 3. Kirim ke Supabase
    const { data, error } = await supabase
      .from('customers')
      .insert(newCustomerPayload)
      .select()
      .single();

    if (error) {
      console.error("Supabase Insert Error:", error);
      throw new Error(`Gagal menyimpan data pelanggan: ${error.message}`);
    }
    
    return data;
  },

  /**
   * Delete a customer
   */
  deleteCustomer: async (id: string) => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return true;
  }
};