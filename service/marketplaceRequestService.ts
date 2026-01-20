
import { supabase } from './supabaseClient';
import { MarketplaceRequest, BookingStatus, DriverOption } from '../types';
import { authService } from './authService';
import { bookingService } from './bookingService';
import { customerService } from './customerService';

export const marketplaceRequestService = {
  /**
   * Send a booking request to another rental company
   */
  sendRequest: async (
    requestData: Omit<MarketplaceRequest, 'id' | 'created_at' | 'status' | 'requester_company_id'>
  ) => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) throw new Error("Anda harus memiliki profil rental untuk mengajukan sewa.");

    // Validate self-booking
    if (profile.company_id === requestData.supplier_company_id) {
        throw new Error("Tidak dapat menyewa mobil milik sendiri via Marketplace.");
    }

    const { data, error } = await supabase
      .from('marketplace_requests')
      .insert({
        ...requestData,
        requester_company_id: profile.company_id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw new Error(`Gagal mengirim permintaan: ${error.message}`);
    return data;
  },

  /**
   * Get incoming requests for the current user's company (Supplier view)
   */
  getIncomingRequests: async (): Promise<MarketplaceRequest[]> => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) return [];

    const { data, error } = await supabase
      .from('marketplace_requests')
      .select(`
        *,
        cars (brand, model, license_plate, image_url),
        requester:companies!requester_company_id (name, phone, owner_name),
        drivers (full_name)
      `)
      .eq('supplier_company_id', profile.company_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as any[]; // Type casting to handle Joined fields
  },

  /**
   * Approve a request:
   * 1. Update status to Approved
   * 2. Find/Create Customer record for the Requester Company
   * 3. Create Booking
   */
  approveRequest: async (request: MarketplaceRequest) => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) throw new Error("Unauthorized");

    // 1. Update Request Status
    const { error: updateError } = await supabase
        .from('marketplace_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);
    
    if (updateError) throw new Error("Gagal update status request.");

    // 2. Resolve Customer (The Requester Company)
    // We assume 'requester' object is populated from getIncomingRequests join
    const requesterName = (request.requester as any)?.name || "Partner Rental";
    const requesterPhone = (request.requester as any)?.phone || "00000000";
    
    // Check if this partner already exists as a customer in our DB
    let customerId = '';
    const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', profile.company_id)
        .ilike('full_name', requesterName) // Simple matching by name
        .single();

    if (existingCustomer) {
        customerId = existingCustomer.id;
    } else {
        // Create new Customer record for this Partner
        const newCust = await customerService.createCustomer({
            full_name: requesterName + " (R2R Partner)",
            phone: requesterPhone,
            nik: `R2R-${Date.now()}`, // Dummy NIK for corporate partner
            address: "Marketplace Partner",
            is_blacklisted: false
        });
        customerId = newCust.id;
    }

    // 3. Create Real Booking
    const bookingPayload = {
        car_id: request.car_id,
        customer_id: customerId,
        driver_id: request.driver_id || null,
        start_date: request.start_date,
        end_date: request.end_date,
        total_price: request.total_price,
        status: BookingStatus.CONFIRMED, // Direct confirmed
        driver_option: request.driver_id ? DriverOption.WITH_DRIVER : DriverOption.LEPAS_KUNCI,
        notes: `Order via Marketplace R2R. Requester: ${requesterName}`,
        supplier_company_id: profile.company_id, // We are supplier
        amount_paid: 0,
        delivery_fee: 0
    };

    await bookingService.createBooking(bookingPayload);
    return true;
  },

  /**
   * Reject Request
   */
  rejectRequest: async (id: string) => {
      const { error } = await supabase
        .from('marketplace_requests')
        .update({ status: 'rejected' })
        .eq('id', id);
      
      if (error) throw new Error(error.message);
  }
};
