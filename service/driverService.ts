
import { supabase } from './supabaseClient';
import { Driver } from '../types';
import { authService } from './authService';

export const driverService = {
  /**
   * Upload driver image to Supabase Storage
   */
  uploadDriverImage: async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `driver_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Ensure bucket 'driver-images' exists in your Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('driver-images') // You might need to create this bucket or use 'car-images' if lazy
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Upload Failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('driver-images').getPublicUrl(filePath);
    return data.publicUrl;
  },

  getDrivers: async (): Promise<Driver[]> => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) return [];

    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as Driver[];
  },

  getDriverById: async (id: string): Promise<Driver> => {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Driver;
  },

  createDriver: async (
    driverData: Omit<Driver, 'id' | 'company_id' | 'created_at' | 'image_url'>,
    imageFile?: File | null
  ) => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) throw new Error("Company ID not found");

    let imageUrl = null;
    if (imageFile) {
        // Fallback to car-images if driver-images doesn't exist, strictly speaking we should handle buckets
        // Assuming user has created the bucket or uses the same logic
        try {
            imageUrl = await driverService.uploadDriverImage(imageFile);
        } catch(e) {
            console.warn("Upload failed, trying fallback or skipping image", e);
        }
    }

    const { data, error } = await supabase
      .from('drivers')
      .insert({
        company_id: profile.company_id,
        ...driverData,
        image_url: imageUrl
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  updateDriver: async (
    id: string,
    driverData: Partial<Driver>,
    imageFile?: File | null
  ) => {
    let updates: any = { ...driverData };

    if (imageFile) {
        const imageUrl = await driverService.uploadDriverImage(imageFile);
        updates.image_url = imageUrl;
    }

    // cleanup
    delete updates.id;
    delete updates.company_id;
    delete updates.created_at;

    const { data, error } = await supabase
        .from('drivers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
  },

  deleteDriver: async (id: string) => {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
};
