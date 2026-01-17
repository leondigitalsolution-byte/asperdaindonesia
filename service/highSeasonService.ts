
import { supabase } from './supabaseClient';
import { HighSeason } from '../types';
import { authService } from './authService';

export const highSeasonService = {
  /**
   * Get all high seasons for the current company
   */
  getHighSeasons: async (): Promise<HighSeason[]> => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) return [];

    const { data, error } = await supabase
      .from('high_seasons')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('start_date', { ascending: true });

    if (error) throw new Error(error.message);

    // Map DB snake_case to TS camelCase
    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      startDate: item.start_date,
      endDate: item.end_date,
      priceIncrease: item.price_increase
    })) as HighSeason[];
  },

  /**
   * Create new high season
   */
  createHighSeason: async (data: Omit<HighSeason, 'id'>) => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) throw new Error("Company ID not found");

    const { data: newItem, error } = await supabase
      .from('high_seasons')
      .insert({
        company_id: profile.company_id,
        name: data.name,
        start_date: data.startDate,
        end_date: data.endDate,
        price_increase: data.priceIncrease
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return newItem;
  },

  /**
   * Delete high season
   */
  deleteHighSeason: async (id: string) => {
    const { error } = await supabase
      .from('high_seasons')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return true;
  }
};
