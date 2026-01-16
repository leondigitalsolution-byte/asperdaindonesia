
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

    const { error: uploadError } = await supabase.storage
      .from('driver-images') 
      .upload(filePath, file);

    if (uploadError) {
      // Fallback: try car-images if driver-images bucket is missing
      const { error: fallbackError } = await supabase.storage
        .from('car-images')
        .upload(filePath, file);
        
      if (fallbackError) throw new Error(`Upload Failed: ${uploadError.message}`);
      
      const { data } = supabase.storage.from('car-images').getPublicUrl(filePath);
      return data.publicUrl;
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
    
    // Map DB snake_case to TS camelCase
    return data.map((d: any) => ({
        ...d,
        dailyRate: d.daily_rate
    })) as Driver[];
  },

  getDriverById: async (id: string): Promise<Driver> => {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    
    // Map DB snake_case to TS camelCase
    return {
        ...data,
        dailyRate: data.daily_rate
    } as Driver;
  },

  createDriver: async (
    driverData: Omit<Driver, 'id' | 'company_id' | 'created_at' | 'image_url'>,
    imageFile?: File | null
  ) => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) throw new Error("Company ID not found");

    let imageUrl = null;
    if (imageFile) {
        try {
            imageUrl = await driverService.uploadDriverImage(imageFile);
        } catch(e) {
            console.warn("Upload failed, trying fallback or skipping image", e);
        }
    }

    // Explicit Mapping: dailyRate -> daily_rate
    // We separate dailyRate from the rest to prevent sending it as 'dailyRate' column
    const { dailyRate, ...rest } = driverData;

    const dbPayload = {
        company_id: profile.company_id,
        ...rest,
        daily_rate: dailyRate || 0, // Map here
        image_url: imageUrl
    };

    const { data, error } = await supabase
      .from('drivers')
      .insert(dbPayload)
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
    // Map camelCase to snake_case for update
    const { dailyRate, ...rest } = driverData;
    let updates: any = { ...rest };

    if (dailyRate !== undefined) {
        updates.daily_rate = dailyRate;
    }

    if (imageFile) {
        const imageUrl = await driverService.uploadDriverImage(imageFile);
        updates.image_url = imageUrl;
    }

    // cleanup read-only fields
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
