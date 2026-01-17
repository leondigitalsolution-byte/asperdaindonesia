
import { supabase } from './supabaseClient';
import { Car, BookingStatus } from '../types';

export const marketplaceService = {
  /**
   * Get marketplace cars (V2 Logic)
   * Fetches real cars from 'cars' table where is_marketplace_ready = true
   * And performs availability check against bookings.
   */
  getMarketplaceCars: async (
    startDate: string,
    endDate: string,
    filters?: {
      dpcId?: string;
      search?: string;
      category?: string;
    }
  ): Promise<Car[]> => {
    
    // 1. Get List of BOOKED Car IDs in the requested range
    // Logic: Find bookings that overlap with requested start/end
    const { data: busyBookings, error: busyError } = await supabase
        .from('bookings')
        .select('car_id')
        .neq('status', BookingStatus.CANCELLED)
        .lt('start_date', endDate) // Booking starts before requested end
        .gt('end_date', startDate); // Booking ends after requested start
    
    if (busyError) throw new Error(busyError.message);
    
    const busyCarIds = busyBookings?.map(b => b.car_id) || [];

    // 2. Query Cars
    let query = supabase
      .from('cars')
      .select(`
        *,
        companies!inner (
          id,
          name,
          phone,
          address,
          dpc_id,
          logo_url,
          dpc_regions (
            name,
            province
          )
        )
      `)
      .eq('is_marketplace_ready', true)
      .eq('status', 'available'); // Only physically available cars

    // 3. Apply Filters
    
    // Exclude busy cars
    if (busyCarIds.length > 0) {
        query = query.not('id', 'in', `(${busyCarIds.join(',')})`);
    }

    // Filter by Region
    if (filters?.dpcId) {
        query = query.eq('companies.dpc_id', filters.dpcId);
    }

    // Filter by Category
    if (filters?.category && filters.category !== 'Semua') {
        query = query.eq('category', filters.category);
    }

    // Filter by Search Text (Brand/Model or Company Name)
    if (filters?.search) {
        const term = filters.search;
        // Search in car brand/model OR company name (requires specific syntax in supabase js)
        // Using 'or' with referenced tables is tricky in simple syntax. 
        // For simplicity/performance, we filter by car brand/model here.
        query = query.ilike('brand', `%${term}%`); 
        // Note: For advanced search across joined tables, usually needs a View or RPC.
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data as Car[];
  }
};
