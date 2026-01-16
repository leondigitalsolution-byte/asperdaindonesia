
import { supabase } from './supabaseClient';
import { GlobalBlacklist } from '../types';

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
  }
};
