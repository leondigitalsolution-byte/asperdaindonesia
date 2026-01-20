
import { supabase } from './supabaseClient';
import { Car, BookingStatus, Driver } from '../types';

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
      .eq('status', 'available') // Only physically available cars
      .order('average_rating', { ascending: false }); // Sort by Highest Rating

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
  },

  /**
   * Get available drivers from a specific company for a date range
   */
  getAvailableDrivers: async (
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<Driver[]> => {
      // 1. Find busy drivers in this range
      const { data: busyDrivers, error: busyError } = await supabase
        .from('bookings')
        .select('driver_id')
        .eq('company_id', companyId)
        .neq('status', BookingStatus.CANCELLED)
        .not('driver_id', 'is', null)
        .lt('start_date', endDate)
        .gt('end_date', startDate);

      if (busyError) throw new Error(busyError.message);
      
      const busyIds = busyDrivers.map(b => b.driver_id);

      // 2. Fetch Active drivers from that company, excluding busy ones
      let query = supabase
        .from('drivers')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('rating', { ascending: false }); // Sort by Rating

      if (busyIds.length > 0) {
          query = query.not('id', 'in', `(${busyIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      // Map DB snake_case to TS camelCase if needed, though type mostly matches
      return data.map((d: any) => ({
          ...d,
          dailyRate: d.daily_rate // ensure mapping
      })) as Driver[];
  }
};
