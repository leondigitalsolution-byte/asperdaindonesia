
import { supabase } from './supabaseClient';
import { FinanceRecord, FinanceType } from '../types';
import { authService } from './authService';

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export const financeService = {
  /**
   * Upload finance proof image
   */
  uploadFinanceProof: async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `proof_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Reusing 'driver-images' or any public bucket for simplicity in this demo environment
    // In production, use a dedicated 'finance-proofs' bucket
    const { error: uploadError } = await supabase.storage
      .from('driver-images') 
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Upload Failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('driver-images').getPublicUrl(filePath);
    return data.publicUrl;
  },

  getRecords: async (month?: number, year?: number): Promise<FinanceRecord[]> => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) return [];

    let query = supabase
      .from('finance_records')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('transaction_date', { ascending: false });

    // Optional Filter by Month/Year
    if (month !== undefined && year !== undefined) {
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0).toISOString();
      query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as FinanceRecord[];
  },

  addRecord: async (
    recordData: Omit<FinanceRecord, 'id' | 'company_id' | 'created_at' | 'proof_image_url'>,
    imageFile?: File | null
  ) => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) throw new Error("Company ID not found");

    let proofUrl = undefined;
    if (imageFile) {
        try {
            proofUrl = await financeService.uploadFinanceProof(imageFile);
        } catch(e) {
            console.warn("Upload proof failed", e);
        }
    }

    const { data, error } = await supabase
      .from('finance_records')
      .insert({
        company_id: profile.company_id,
        ...recordData,
        proof_image_url: proofUrl,
        status: recordData.status || 'paid' // Default to paid if not specified
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  deleteRecord: async (id: string) => {
    const { error } = await supabase.from('finance_records').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  },

  getSummary: async (): Promise<FinanceSummary> => {
    const records = await financeService.getRecords(); // Fetch all (or optimize to fetch month only)
    
    let totalIncome = 0;
    let totalExpense = 0;

    records.forEach(r => {
      if (r.type === FinanceType.INCOME) totalIncome += r.amount;
      if (r.type === FinanceType.EXPENSE) totalExpense += r.amount;
    });

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  }
};
