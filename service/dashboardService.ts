import { supabase } from './supabaseClient';
import { authService } from './authService';
import { Booking, BookingStatus, Car } from '../types';

export interface DashboardStats {
  totalCars: number;
  totalCustomers: number;
  activeRentals: number;
  revenueThisMonth: number;
  recentBookings: Booking[];
  // New fields for Gantt Chart
  cars: Car[];
  monthBookings: Booking[];
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) {
      return {
        totalCars: 0,
        totalCustomers: 0,
        activeRentals: 0,
        revenueThisMonth: 0,
        recentBookings: [],
        cars: [],
        monthBookings: []
      };
    }

    const companyId = profile.company_id;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    // Range for Gantt (Current Month +/- small buffer if needed, keeping strict month for now)
    // We fetch bookings that overlap with current month
    // (start <= endOfMonth AND end >= startOfMonth)

    try {
      // 1. Parallel Fetching
      const [carsRes, customersRes, activeRes, revenueRes, recentRes, allCarsRes, monthBookingsRes] = await Promise.all([
        // Total Cars Count
        supabase.from('cars').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        
        // Total Customers Count
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        
        // Active Rentals Count
        supabase.from('bookings')
          .select('id')
          .eq('company_id', companyId)
          .neq('status', BookingStatus.CANCELLED)
          .lte('start_date', now.toISOString())
          .gte('end_date', now.toISOString()),

        // Revenue This Month
        supabase.from('bookings')
          .select('total_price')
          .eq('company_id', companyId)
          .neq('status', BookingStatus.CANCELLED)
          .gte('start_date', firstDayOfMonth)
          .lte('start_date', lastDayOfMonth),

        // Recent Bookings (Limit 5)
        supabase.from('bookings')
          .select(`
            id, 
            status, 
            start_date, 
            end_date, 
            total_price,
            customers (full_name),
            cars (brand, model, license_plate)
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5),

        // All Cars (For Gantt Rows)
        supabase.from('cars')
          .select('id, brand, model, license_plate, status')
          .eq('company_id', companyId)
          .order('brand', { ascending: true }),

        // Month Bookings (For Gantt Bars)
        supabase.from('bookings')
          .select(`
            id,
            car_id,
            start_date, 
            end_date, 
            status,
            customers (full_name)
          `)
          .eq('company_id', companyId)
          .neq('status', BookingStatus.CANCELLED)
          // Logic: Booking starts before end of month AND Booking ends after start of month
          .lte('start_date', lastDayOfMonth)
          .gte('end_date', firstDayOfMonth)
      ]);

      // Calculate Revenue
      const revenue = revenueRes.data?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;

      return {
        totalCars: carsRes.count || 0,
        totalCustomers: customersRes.count || 0,
        activeRentals: activeRes.data?.length || 0,
        revenueThisMonth: revenue,
        recentBookings: (recentRes.data as unknown as Booking[]) || [],
        cars: (allCarsRes.data as Car[]) || [],
        monthBookings: (monthBookingsRes.data as unknown as Booking[]) || []
      };

    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  }
};