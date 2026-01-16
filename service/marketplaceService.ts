
import { supabase } from './supabaseClient';
import { MarketplacePost } from '../types';

export const marketplaceService = {
  /**
   * Get marketplace posts with smart filtering
   * @param dpcId - Filter by DPC Region (via joined Company table)
   * @param startDate - Start of the date range (YYYY-MM-DD)
   * @param endDate - End of the date range (YYYY-MM-DD)
   */
  getPosts: async (dpcId?: string, startDate?: string, endDate?: string): Promise<MarketplacePost[]> => {
    // Start building query
    // NOTE: using companies!inner to enforce the join filter
    let query = supabase
      .from('marketplace_posts')
      .select(`
        *,
        companies!inner (
          id,
          name,
          phone,
          address,
          dpc_id,
          dpc_regions (
            name,
            province
          )
        )
      `)
      .eq('type', 'offering') // We only want available units
      .order('created_at', { ascending: false });

    // Apply Region Filter
    if (dpcId) {
      query = query.eq('companies.dpc_id', dpcId);
    }

    // Apply Date Range Filter
    // Logic: Tampilkan postingan yang 'Available Date'-nya berada di dalam rentang pencarian user.
    
    if (startDate) {
       // Unit harus tersedia SETELAH atau PADA tanggal mulai pencarian
       query = query.gte('date_needed', startDate);
    }
    
    if (endDate) {
       // Unit harus tersedia SEBELUM atau PADA tanggal akhir pencarian
       query = query.lte('date_needed', endDate);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data as unknown as MarketplacePost[];
  }
};
