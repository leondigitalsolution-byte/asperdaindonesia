
import { supabase } from './supabaseClient';
import { Booking, BookingStatus, PaymentMethod, FinanceType, CarOwnerType } from '../types';
import { authService } from './authService';
import { payLaterService } from './payLaterService';
import { financeService } from './financeService';
import { customerService } from './customerService';
import { blacklistService } from './blacklistService';

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
   * Validate Customer against Global Blacklist
   */
  validateCustomerBlacklist: async (customerId: string) => {
      // 1. Get Customer Details
      const customer = await customerService.getCustomerById(customerId);
      if (!customer) throw new Error("Data pelanggan tidak ditemukan.");

      // 2. Check Global Blacklist
      const blacklistEntry = await blacklistService.checkBlacklistStatus(customer.nik, customer.phone);
      
      if (blacklistEntry) {
          throw new Error(`TRANSAKSI DITOLAK: Pelanggan ini terdaftar di GLOBAL BLACKLIST ASPERDA. \nAlasan: ${blacklistEntry.reason} \nDilaporkan oleh member lain.`);
      }
  },

  /**
   * Create a new booking
   */
  createBooking: async (bookingData: Omit<Booking, 'id' | 'company_id' | 'created_at' | 'cars' | 'customers' | 'drivers'> & { paylater_term?: number }) => {
    const profile = await authService.getUserProfile();
    
    if (!profile?.company_id) {
      throw new Error("User does not have a valid company.");
    }

    // 0. Global Blacklist Check (Security Layer)
    await bookingService.validateCustomerBlacklist(bookingData.customer_id);

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
    const payload = {
        company_id: profile.company_id,
        car_id: bookingData.car_id,
        customer_id: bookingData.customer_id,
        driver_id: bookingData.driver_id || null, 
        start_date: bookingData.start_date,
        end_date: bookingData.end_date,
        
        total_price: bookingData.total_price,
        delivery_fee: bookingData.delivery_fee,
        amount_paid: bookingData.amount_paid,
        
        extra_fee: bookingData.extra_fee || 0,
        extra_fee_reason: bookingData.extra_fee_reason || '',
        overdue_fee: bookingData.overdue_fee || 0,
        actual_return_date: bookingData.actual_return_date,
        
        status: bookingData.status || BookingStatus.PENDING,
        driver_option: bookingData.driver_option,
        
        rental_package: bookingData.rental_package,
        destination: bookingData.destination,
        notes: bookingData.notes,

        deposit_type: bookingData.deposit_type,
        deposit_description: bookingData.deposit_description,
        deposit_value: bookingData.deposit_value,
        deposit_image_url: bookingData.deposit_image_url,

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

    // 4. Trigger Finance Logic (If created as Lunas/Completed directly)
    if (booking) {
        await bookingService.generateFinanceRecords(booking.id);
    }

    return booking;
  },

  /**
   * Get all bookings
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
    // If customer is changing, check blacklist again
    if (updates.customer_id) {
        await bookingService.validateCustomerBlacklist(updates.customer_id);
    }

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

    // Trigger Finance Automation
    await bookingService.generateFinanceRecords(id);

    return data;
  },

  /**
   * AUTOMATED FINANCE GENERATOR
   * Checks booking status and payment, then creates Income/Expense records.
   */
  generateFinanceRecords: async (bookingId: string) => {
      try {
          // 1. Fetch Full Data including Partner and Driver details
          const { data: booking, error } = await supabase
            .from('bookings')
            .select(`
                *,
                cars (
                    id, brand, model, license_plate, owner_type, partner_id, driver_daily_salary,
                    partners (id, name, profit_sharing_percentage)
                ),
                customers (full_name),
                drivers (id, full_name, daily_rate)
            `)
            .eq('id', bookingId)
            .single();
          
          if (error || !booking) {
              console.error("AutoFinance: Booking not found", error);
              return;
          }

          const records = await financeService.getRecords();
          const bookingRefTag = `[REF:${booking.id.substring(0,8)}]`;

          // A. INCOME LOGIC (Pemasukan Sewa)
          // Trigger: LUNAS (Amount >= Total) OR PAYLATER
          const isLunas = (booking.amount_paid >= booking.total_price);
          const isPayLater = (booking.payment_method === PaymentMethod.PAYLATER);
          
          if (isLunas || isPayLater) {
              // Check duplicate based on Ref Tag
              const exists = records.some(r => r.description && r.description.includes(bookingRefTag) && r.type === FinanceType.INCOME);
              
              if (!exists) {
                  await financeService.addRecord({
                      transaction_date: new Date().toISOString().split('T')[0],
                      type: FinanceType.INCOME,
                      category: 'Sewa Mobil',
                      amount: booking.total_price,
                      description: `Pemasukan Booking ${booking.customers?.full_name} ${bookingRefTag}`,
                      status: 'paid'
                  });
              }
          }

          // B. EXPENSE LOGIC (Pengeluaran)
          // Trigger: Status COMPLETED (Selesai)
          if (booking.status === BookingStatus.COMPLETED) {
              const diffTime = Math.abs(new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime());
              const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

              // B1. Driver Salary
              if (booking.driver_id && booking.drivers) {
                  // Determine rate: Car specific rate > Driver default rate > Standard 150k
                  let rate = booking.cars?.driver_daily_salary || booking.drivers.daily_rate || 150000;
                  const salary = rate * days;
                  
                  const drvExists = records.some(r => r.description && r.description.includes(`Gaji Driver ${bookingRefTag}`));
                  
                  if (!drvExists && salary > 0) {
                      await financeService.addRecord({
                          transaction_date: new Date().toISOString().split('T')[0],
                          type: FinanceType.EXPENSE,
                          category: 'Gaji Driver',
                          amount: salary,
                          description: `Gaji Driver ${booking.drivers.full_name} (${days} Hari) ${bookingRefTag}`,
                          status: 'pending' // Usually paid after trip
                      });
                  }
              }

              // B2. Partner Share (Bagi Hasil)
              if (booking.cars?.owner_type === CarOwnerType.PARTNER && booking.cars?.partners) {
                  const partner = booking.cars.partners;
                  const percentage = partner.profit_sharing_percentage || 0;
                  
                  // Simple Calculation: Total Price * Percentage
                  // Note: In reality, might deduct expenses first, but keeping it simple as requested.
                  const shareAmount = booking.total_price * (percentage / 100);
                  
                  const ptrExists = records.some(r => r.description && r.description.includes(`Bagi Hasil ${bookingRefTag}`));

                  if (!ptrExists && shareAmount > 0) {
                      await financeService.addRecord({
                          transaction_date: new Date().toISOString().split('T')[0],
                          type: FinanceType.EXPENSE,
                          category: 'Setor Mitra',
                          amount: shareAmount,
                          description: `Bagi Hasil Unit ${booking.cars.brand} ke ${partner.name} (${percentage}%) ${bookingRefTag}`,
                          status: 'pending'
                      });
                  }
              }

              // B3. Reimbursement / Delivery Fee (Operasional)
              if (booking.delivery_fee && booking.delivery_fee > 0) {
                  const delExists = records.some(r => r.description && r.description.includes(`Uang Jalan/Antar ${bookingRefTag}`));
                  
                  if (!delExists) {
                      await financeService.addRecord({
                          transaction_date: new Date().toISOString().split('T')[0],
                          type: FinanceType.EXPENSE,
                          category: 'Reimbursement',
                          amount: booking.delivery_fee,
                          description: `Uang Jalan/Antar Unit ${bookingRefTag}`,
                          status: 'paid'
                      });
                  }
              }
          }

      } catch (e) {
          console.error("Auto Finance Error:", e);
      }
  }
};
