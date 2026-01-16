import { supabase } from './supabaseClient';
import { RegistrationFormData, DpcRegion, Profile, Company, User, UserRole } from '../types';

// Fallback data to ensure dropdown is never empty if DB connection fails
const FALLBACK_DPC_REGIONS: DpcRegion[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Malang Raya', province: 'Jawa Timur' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Jakarta Pusat', province: 'DKI Jakarta' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Yogyakarta', province: 'DI Yogyakarta' },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Bandung', province: 'Jawa Barat' },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Denpasar', province: 'Bali' },
];

export const authService = {
  getCurrentSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      return data.session;
    } catch (err) {
      return null;
    }
  },

  registerOwner: async (data: RegistrationFormData) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.fullName } },
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Registrasi gagal.');

    const { data: rpcData, error: rpcError } = await supabase.rpc('register_new_owner', {
      p_user_id: authData.user.id,
      p_email: data.email,
      p_full_name: data.fullName,
      p_company_name: data.companyName,
      p_phone: data.phone,
      p_address: data.address,
      p_dpc_id: data.dpcId
    });

    if (rpcError) throw new Error(`Gagal menyimpan data perusahaan: ${rpcError.message}`);
    return { user: authData.user, result: rpcData };
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  logout: async () => {
    return await supabase.auth.signOut();
  },

  getUserProfile: async (): Promise<Profile | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) return null;
    return data as Profile;
  },
  
  getDpcRegions: async () => {
    try {
      const { data, error } = await supabase.from('dpc_regions').select('id, name, province').order('name');
      return (data && data.length > 0) ? data : FALLBACK_DPC_REGIONS;
    } catch (err) {
      return FALLBACK_DPC_REGIONS;
    }
  },

  getCompany: async (companyId: string) => {
    const { data, error } = await supabase
      .from('companies')
      .select('*, dpc_regions(name, province)')
      .eq('id', companyId)
      .single();
    if (error) throw new Error(error.message);
    return data as Company;
  },

  updateCompany: async (companyId: string, updates: Partial<Company>) => {
    const { error } = await supabase.from('companies').update(updates).eq('id', companyId);
    if (error) throw new Error(error.message);
    return true;
  },

  updateProfile: async (userId: string, updates: { full_name?: string }) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw new Error(error.message);
    return true;
  },

  // --- NEW METHODS FOR SETTINGS PAGE ---
  
  /**
   * Fetch all users/profiles (Mapped to User interface)
   */
  getUsers: () => {
    // For the SettingsPage which expects synchronous return in the provided code,
    // we have a conflict. The provided code calls `setUsersList(getUsers())` synchronously.
    // However, Supabase is async.
    // To make the provided code work WITHOUT rewriting it entirely to async/await in useEffect,
    // we would typically mock this or use localStorage.
    // But since we want to be "Senior", we will adapt the calling code in SettingsPage to be async.
    // Here we return the Promise.
    return supabase.from('profiles').select('*').then(({ data }) => {
        return (data || []).map((p: Profile) => ({
            id: p.id,
            name: p.full_name,
            username: p.email,
            role: p.role,
            email: p.email,
            // Fallbacks for fields not in DB
            phone: '', 
            image: null
        })) as User[];
    });
  },

  /**
   * Save User (Update Profile)
   * Note: Creation of new users via this method is restricted in client-side Supabase
   * without admin privileges. We will only support Update for now or dummy local.
   */
  saveUser: async (user: User) => {
      // If it looks like a Supabase ID (UUID)
      if (user.id.length > 20 && !user.id.startsWith('u_')) {
          await supabase.from('profiles').update({
              full_name: user.name,
              role: user.role
          }).eq('id', user.id);
      } else {
          // It's a new local/dummy user. 
          // In a real app, this would call an Edge Function to creating supabase.auth user.
          console.warn("Creating new users via Settings is disabled in this client-only demo.");
          alert("Fitur tambah user baru dibatasi. Gunakan halaman Register untuk menambah akun.");
      }
  },

  deleteUser: async (id: string) => {
      // Deleting from profiles triggers trigger to delete auth user (if configured) or just profile.
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw new Error(error.message);
  }
};