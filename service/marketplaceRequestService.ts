
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
        cars (id, brand, model, license_plate, image_url, price_per_day, driver_daily_salary),
        requester:companies!requester_company_id (id, name, phone, owner_name, address),
        drivers (id, full_name)
      `)
      .eq('supplier_company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as any[];
  },

  /**
   * Get outgoing requests made by current user (Renter view)
   */
  getOutgoingRequests: async (): Promise<MarketplaceRequest[]> => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) return [];

    const { data, error } = await supabase
      .from('marketplace_requests')
      .select(`
        *,
        cars (id, brand, model, license_plate, image_url, price_per_day),
        supplier:companies!supplier_company_id (id, name, phone, owner_name, logo_url),
        drivers (id, full_name)
      `)
      .eq('requester_company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as any[];
  },

  /**
   * Update Status Request (Approve/Reject)
   */
  updateStatus: async (id: string, status: 'approved' | 'rejected') => {
      const { error } = await supabase
        .from('marketplace_requests')
        .update({ status })
        .eq('id', id);
      
      if (error) throw new Error(error.message);
  },

  /**
   * Legacy: Direct Approve (Creates booking immediately)
   * Kept for backward compatibility if needed, but UI now prefers redirecting to form.
   */
  approveRequest: async (request: MarketplaceRequest) => {
    // ... Existing logic if needed ...
    // Redirect flow prefers updating status manually after booking creation
    return marketplaceRequestService.updateStatus(request.id, 'approved');
  }
};
