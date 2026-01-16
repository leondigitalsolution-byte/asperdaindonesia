
import { supabase } from './supabaseClient';
import { Partner } from '../types';
import { authService } from './authService';

export const partnerService = {
  /**
   * Upload partner image to Supabase Storage
   */
  uploadPartnerImage: async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `partner_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Reuse driver-images bucket or ensure 'partner-images' exists
    // Using 'driver-images' as a shared bucket for people profiles to avoid creating too many buckets in this demo
    // Ideally create a specific bucket 'partner-images'
    const { error: uploadError } = await supabase.storage
      .from('driver-images') 
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Upload Failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('driver-images').getPublicUrl(filePath);
    return data.publicUrl;
  },

  getPartners: async (): Promise<Partner[]> => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) return [];

    // Fetch partners AND their cars to calculate stats
    const { data, error } = await supabase
      .from('partners')
      .select('*, cars(id, brand, model, license_plate)')
      .eq('company_id', profile.company_id)
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data as Partner[];
  },

  createPartner: async (
    partnerData: Omit<Partner, 'id' | 'company_id' | 'created_at' | 'image_url'>,
    imageFile?: File | null
  ) => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) throw new Error("Company ID not found");

    let imageUrl = null;
    if (imageFile) {
        try {
            imageUrl = await partnerService.uploadPartnerImage(imageFile);
        } catch(e) {
            console.warn("Upload failed, skipping image", e);
        }
    }

    const { data, error } = await supabase
      .from('partners')
      .insert({
        company_id: profile.company_id,
        ...partnerData,
        image_url: imageUrl
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  updatePartner: async (
    id: string,
    partnerData: Partial<Partner>,
    imageFile?: File | null
  ) => {
    let updates: any = { ...partnerData };

    if (imageFile) {
        const imageUrl = await partnerService.uploadPartnerImage(imageFile);
        updates.image_url = imageUrl;
    }

    // cleanup
    delete updates.id;
    delete updates.company_id;
    delete updates.created_at;
    delete updates.cars; // Don't update the joined relation

    const { data, error } = await supabase
        .from('partners')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
  },

  deletePartner: async (id: string) => {
    const { error } = await supabase.from('partners').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
};
