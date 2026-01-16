
import { supabase } from './supabaseClient';
import { Booking, BookingStatus, PaymentMethod } from '../types';
import { authService } from './authService';
import { payLaterService } from './payLaterService';

export const bookingService = {
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
   * Create a new booking with overbooking protection, extended fields, and PayLater logic
   */
  createBooking: async (bookingData: Omit<Booking, 'id' | 'company_id' | 'created_at' | 'cars' | 'customers'> & { paylater_term?: number }) => {
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

    // 2. Insert Booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        company_id: profile.company_id,
        car_id: bookingData.car_id,
        customer_id: bookingData.customer_id,
        start_date: bookingData.start_date,
        end_date: bookingData.end_date,
        
        // Costs
        total_price: bookingData.total_price,
        delivery_fee: bookingData.delivery_fee,
        amount_paid: bookingData.amount_paid,
        
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
        payment_method: bookingData.payment_method
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // 3. Handle PayLater Record Creation
    if (bookingData.payment_method === PaymentMethod.PAYLATER && booking && bookingData.paylater_term) {
        // Get DPC ID from company
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
          image_url
        ),
        customers (
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
          license_plate
        ),
        customers (
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
    // If dates are changing, check availability (excluding self)
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

    // Clean up joined fields that shouldn't be sent to DB
    const payload: any = { ...updates };
    delete payload.cars;
    delete payload.customers;
    delete payload.id;
    delete payload.company_id;
    delete payload.created_at;

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
