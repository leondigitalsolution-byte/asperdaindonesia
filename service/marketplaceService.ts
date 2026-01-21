
import { supabase } from './supabaseClient';
import { Car, BookingStatus, Driver, ReviewDisplay } from '../types';

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
      search?: string; // General Keyword
      category?: string;
      brand?: string; // Specific Brand
      transmission?: string;
      year?: number; // Minimum Year
      fuelType?: string;
    }
  ): Promise<Car[]> => {
    
    const today = new Date().toISOString().split('T')[0];

    // 1. Get List of BOOKED Car IDs in the requested range
    const { data: busyBookings, error: busyError } = await supabase
        .from('bookings')
        .select('car_id')
        .neq('status', BookingStatus.CANCELLED)
        .lt('start_date', endDate) // Booking starts before requested end
        .gt('end_date', startDate); // Booking ends after requested start
    
    if (busyError) throw new Error(busyError.message);
    
    const busyCarIds = busyBookings?.map(b => b.car_id) || [];

    // 2. Query Cars
    // Include average_rating and review_count
    // Filter Active & Marketplace Ready
    // Filter STNK Valid (> Today)
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
      .gt('stnk_expiry_date', today); // STNK MUST be valid (Expiry date > Today)

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

    // Filter by Transmission
    if (filters?.transmission && filters.transmission !== '') {
        query = query.eq('transmission', filters.transmission);
    }

    // Filter by Fuel Type
    if (filters?.fuelType && filters.fuelType !== '') {
        query = query.eq('fuel_type', filters.fuelType);
    }

    // Filter by Minimum Year
    if (filters?.year && filters.year > 0) {
        query = query.gte('year', filters.year);
    }

    // Filter by Brand (Specific) or General Search
    if (filters?.brand) {
        query = query.ilike('brand', `%${filters.brand}%`);
    }
    
    // General Search (Model or Brand)
    if (filters?.search) {
        const term = filters.search;
        // Search in Brand OR Model
        query = query.or(`brand.ilike.%${term}%,model.ilike.%${term}%`); 
    }

    // 4. SORTING: Highest Rating -> Most Reviews
    query = query
        .order('average_rating', { ascending: false })
        .order('review_count', { ascending: false });

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
  },

  /**
   * Get reviews for a specific car using RPC
   */
  getCarReviews: async (carId: string): Promise<ReviewDisplay[]> => {
      const { data, error } = await supabase.rpc('get_car_reviews', { p_car_id: carId });
      if (error) throw new Error(error.message);
      return data as ReviewDisplay[];
  }
};
