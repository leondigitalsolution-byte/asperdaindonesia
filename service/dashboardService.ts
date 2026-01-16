import { supabase } from './supabaseClient';
import { authService } from './authService';
import { Booking, BookingStatus } from '../types';

export interface DashboardStats {
  totalCars: number;
  totalCustomers: number;
  activeRentals: number;
  revenueThisMonth: number;
  recentBookings: Booking[];
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
        recentBookings: []
      };
    }

    const companyId = profile.company_id;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    try {
      // 1. Parallel Fetching for Counts
      const [carsRes, customersRes, activeRes, revenueRes, recentRes] = await Promise.all([
        // Total Cars
        supabase.from('cars').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        
        // Total Customers
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
        
        // Active Rentals (Status Active OR (Start <= Now <= End AND Status != Cancelled))
        supabase.from('bookings')
          .select('id')
          .eq('company_id', companyId)
          .neq('status', BookingStatus.CANCELLED)
          .lte('start_date', now.toISOString())
          .gte('end_date', now.toISOString()),

        // Revenue This Month (Based on start_date)
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
          .limit(5)
      ]);

      // Calculate Revenue
      const revenue = revenueRes.data?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;

      return {
        totalCars: carsRes.count || 0,
        totalCustomers: customersRes.count || 0,
        activeRentals: activeRes.data?.length || 0,
        revenueThisMonth: revenue,
        recentBookings: (recentRes.data as unknown as Booking[]) || []
      };

    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  }
};