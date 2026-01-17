
import { supabase } from './supabaseClient';
import { GlobalBlacklist, BlacklistReport } from '../types';

export const blacklistService = {
  /**
   * Get global blacklist data with search capabilities
   */
  getGlobalBlacklist: async (searchKeyword?: string): Promise<GlobalBlacklist[]> => {
    let query = supabase
      .from('global_blacklists')
      .select('*')
      .order('created_at', { ascending: false });

    if (searchKeyword && searchKeyword.trim() !== '') {
      const term = searchKeyword.trim();
      // ILIKE search on Name OR NIK
      query = query.or(`full_name.ilike.%${term}%,nik.ilike.%${term}%`);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data as GlobalBlacklist[];
  },

  /**
   * Check if a person is in the Global Blacklist by NIK or Phone
   * Returns details if found, null if clean.
   */
  checkBlacklistStatus: async (nik: string, phone: string): Promise<GlobalBlacklist | null> => {
    if (!nik && !phone) return null;

    let queryStr = '';
    if (nik && phone) {
        queryStr = `nik.eq.${nik},phone.eq.${phone}`;
    } else if (nik) {
        queryStr = `nik.eq.${nik}`;
    } else if (phone) {
        queryStr = `phone.eq.${phone}`;
    }

    const { data, error } = await supabase
        .from('global_blacklists')
        .select('*')
        .or(queryStr)
        .limit(1);

    if (error) {
        console.error("Error checking blacklist:", error);
        return null;
    }

    return (data && data.length > 0) ? data[0] as GlobalBlacklist : null;
  },

  /**
   * Upload evidence image
   */
  uploadEvidence: async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `evidence_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Using 'driver-images' as generic bucket based on existing buckets
    const { error: uploadError } = await supabase.storage
      .from('driver-images')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Upload Failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('driver-images').getPublicUrl(filePath);
    return data.publicUrl;
  },

  /**
   * Create a new blacklist report
   */
  createReport: async (reportData: {
      target_name: string;
      target_nik: string;
      target_phone: string;
      reason: string;
      evidence_url?: string;
  }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Get company_id
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
        
      if (!profileData?.company_id) throw new Error("Company ID not found");

      const { error } = await supabase.from('blacklist_reports').insert({
          reported_by_company_id: profileData.company_id,
          target_name: reportData.target_name,
          target_nik: reportData.target_nik,
          target_phone: reportData.target_phone,
          reason: reportData.reason,
          evidence_url: reportData.evidence_url,
          status: 'pending'
      });

      if (error) throw new Error(error.message);
  }
};
