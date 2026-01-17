
import { supabase } from './supabaseClient';
import { Car, CarStatus, Transmission } from '../types';
import { authService } from './authService';

export const carService = {
  /**
   * Upload car image to Supabase Storage
   */
  uploadCarImage: async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('car-images')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Upload Failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('car-images').getPublicUrl(filePath);
    return data.publicUrl;
  },

  /**
   * Create a new car record
   */
  createCar: async (
    carData: Omit<Car, 'id' | 'company_id' | 'created_at' | 'image_url' | 'partners' | 'companies'>,
    imageFile?: File
  ) => {
    // 1. Get current user profile to find company_id
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) {
      throw new Error("User does not have a valid company.");
    }

    let imageUrl = null;

    // 2. Upload image if exists
    if (imageFile) {
      imageUrl = await carService.uploadCarImage(imageFile);
    }

    // 3. Insert to DB
    const { data, error } = await supabase
      .from('cars')
      .insert({
        company_id: profile.company_id,
        brand: carData.brand,
        model: carData.model,
        license_plate: carData.license_plate,
        year: carData.year,
        transmission: carData.transmission,
        status: carData.status,
        price_per_day: carData.price_per_day,
        image_url: imageUrl,
        
        // New Fields
        partner_id: carData.partner_id || null,
        owner_type: carData.owner_type,
        category: carData.category,
        fuel_type: carData.fuel_type,
        fuel_ratio: carData.fuel_ratio,
        current_odometer: carData.current_odometer,
        maintenance: carData.maintenance,
        gps_device_id: carData.gps_device_id,
        driver_daily_salary: carData.driver_daily_salary,
        is_marketplace_ready: carData.is_marketplace_ready // New flag
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Get a single car by ID
   */
  getCarById: async (id: string): Promise<Car> => {
    const { data, error } = await supabase
      .from('cars')
      .select('*, partners(name, profit_sharing_percentage)')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Car;
  },

  /**
   * Update an existing car record
   */
  updateCar: async (
    id: string,
    carData: Partial<Car>,
    imageFile?: File | null
  ) => {
    let updates: any = { ...carData };

    // Handle Image Upload if new file provided
    if (imageFile) {
      const imageUrl = await carService.uploadCarImage(imageFile);
      updates.image_url = imageUrl;
    }

    // Remove joined tables or read-only fields if they exist in carData
    delete updates.partners;
    delete updates.companies;
    delete updates.company_id;
    delete updates.created_at;
    delete updates.id;

    const { data, error } = await supabase
      .from('cars')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Get all cars for the current user's company
   */
  getCars: async (): Promise<Car[]> => {
    const profile = await authService.getUserProfile();
    if (!profile?.company_id) return [];

    const { data, error } = await supabase
      .from('cars')
      .select('*, partners(name, profit_sharing_percentage)')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as Car[];
  },

  /**
   * Delete a car
   */
  deleteCar: async (id: string) => {
    const { error } = await supabase
      .from('cars')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return true;
  }
};
