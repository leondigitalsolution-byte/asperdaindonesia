
import { supabase } from './supabaseClient';
import { Booking, BookingStatus, PaymentMethod } from '../types';
import { authService } from './authService';
import { payLaterService } from './payLaterService';

export const bookingService = {
  /**
   * Upload checklist image
   */
  uploadChecklistImage: async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `check_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('checklist-images')
      .upload(filePath, file);

    if (uploadError) {
        // Fallback to car-images if checklist-images not ready
        const { error: fallbackError } = await supabase.storage
            .from('car-images')
            .upload(filePath, file);
        
        if (fallbackError) throw new Error(`Upload Failed: ${uploadError.message}`);
        const { data } = supabase.storage.from('car-images').getPublicUrl(filePath);
        return data.publicUrl;
    }

    const { data } = supabase.storage.from('checklist-images').getPublicUrl(filePath);
    return data.publicUrl;
  },

  /**
   * Check for overlapping bookings
   */
  checkAvailability: async (carId: string, startDate: string, endDate: string, excludeBookingId?: string) => {
    let query = supabase
      .from('bookings')
      .select('id')
      .eq('car_id', carId)
      .neq('status', BookingStatus.CANCELLED)
      .lt('start_date', endDate)
      .gt('end_date', startDate);

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    
    return data.length === 0;
  },

  /**
   * Get lists of unavailable Car IDs and Driver IDs for a date range
   */
  getUnavailableResources: async (startDate: string, endDate: string, excludeBookingId?: string) => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) return { carIds: [], driverIds: [] };

    let query = supabase
      .from('bookings')
      .select('car_id, driver_id')
      .eq('company_id', profile.company_id)
      .neq('status', BookingStatus.CANCELLED)
      .lt('start_date', endDate) // Overlap logic
      .gt('end_date', startDate);

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const carIds = data.map(b => b.car_id).filter(id => id);
    const driverIds = data.map(b => b.driver_id).filter(id => id);

    return { carIds, driverIds };
  },

  /**
   * Create a new booking
   * Updated Type Definition to explicitly include driver_id
   */
  createBooking: async (bookingData: Omit<Booking, 'id' | 'company_id' | 'created_at' | 'cars' | 'customers' | 'drivers'> & { paylater_term?: number }) => {
    const profile = await authService.getUserProfile();
    
    if (!profile?.company_id) {
      throw new Error("User does not have a valid company.");
    }

    // 1. Overbooking Protection
    const isAvailable = await bookingService.checkAvailability(
      bookingData.car_id, 
      bookingData.start_date, 
      bookingData.end_date
    );

    if (!isAvailable) {
      throw new Error("Mobil tidak tersedia pada tanggal yang dipilih (Overbooked). Silakan pilih tanggal atau unit lain.");
    }

    // 2. Prepare Payload
    // Ensure all optional fields are handled or undefined
    const payload = {
        company_id: profile.company_id,
        car_id: bookingData.car_id,
        customer_id: bookingData.customer_id,
        driver_id: bookingData.driver_id || null, // Explicit null for DB
        start_date: bookingData.start_date,
        end_date: bookingData.end_date,
        
        // Costs
        total_price: bookingData.total_price,
        delivery_fee: bookingData.delivery_fee,
        amount_paid: bookingData.amount_paid,
        
        // Extra Fees & Return
        extra_fee: bookingData.extra_fee || 0,
        extra_fee_reason: bookingData.extra_fee_reason || '',
        overdue_fee: bookingData.overdue_fee || 0,
        actual_return_date: bookingData.actual_return_date,
        
        // Status & Options
        status: bookingData.status || BookingStatus.PENDING,
        driver_option: bookingData.driver_option,
        
        // Details
        rental_package: bookingData.rental_package,
        destination: bookingData.destination,
        notes: bookingData.notes,

        // Security Deposit
        deposit_type: bookingData.deposit_type,
        deposit_description: bookingData.deposit_description,
        deposit_value: bookingData.deposit_value,
        deposit_image_url: bookingData.deposit_image_url,

        // Payment
        payment_method: bookingData.payment_method || PaymentMethod.CASH
    };

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert(payload)
      .select()
      .single();

    if (error) {
        console.error("Booking Insert Error:", error);
        throw new Error(`Gagal menyimpan booking: ${error.message}`);
    }

    // 3. Handle PayLater Record Creation
    if (bookingData.payment_method === PaymentMethod.PAYLATER && booking && bookingData.paylater_term) {
        const { data: companyData } = await supabase
            .from('companies')
            .select('dpc_id')
            .eq('id', profile.company_id)
            .single();
        
        if (companyData?.dpc_id) {
            await payLaterService.createRecord({
                booking_id: booking.id,
                company_id: profile.company_id,
                customer_id: bookingData.customer_id,
                dpc_id: companyData.dpc_id,
                total_amount: bookingData.total_price,
                term_months: bookingData.paylater_term,
                monthly_installment: Math.ceil(bookingData.total_price / bookingData.paylater_term),
                start_date: new Date().toISOString().split('T')[0],
                status: 'active'
            });
        }
    }

    return booking;
  },

  /**
   * Get all bookings for the company with joined Car and Customer data
   */
  getBookings: async (): Promise<Booking[]> => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) return [];

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        cars (
          brand,
          model,
          license_plate,
          image_url,
          price_per_day
        ),
        customers (
          full_name,
          phone,
          address
        ),
        drivers (
          full_name,
          phone
        )
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as Booking[];
  },

  /**
   * Get single booking by ID
   */
  getBookingById: async (id: string): Promise<Booking> => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        cars (
          brand,
          model,
          license_plate,
          price_per_day
        ),
        customers (
          full_name,
          phone,
          address
        ),
        drivers (
          full_name,
          phone
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Booking;
  },

  /**
   * Update booking
   */
  updateBooking: async (id: string, updates: Partial<Booking>) => {
    // Availability Check for Date Changes
    if (updates.car_id && updates.start_date && updates.end_date) {
        const isAvailable = await bookingService.checkAvailability(
            updates.car_id,
            updates.start_date,
            updates.end_date,
            id
        );
        if (!isAvailable) {
            throw new Error("Jadwal bentrok dengan booking lain.");
        }
    }

    // Clean up payload
    const payload: any = { ...updates };
    delete payload.cars;
    delete payload.customers;
    delete payload.drivers;
    delete payload.id;
    delete payload.company_id;
    delete payload.created_at;
    delete payload.paylater_term;

    const { data, error } = await supabase
      .from('bookings')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
};
