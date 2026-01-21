
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
      const { data } = await supabase.auth.getSession();
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

  // NEW: Register Tourism Partner (Travel Agent/Hotel/B2B)
  registerTourismPartner: async (data: RegistrationFormData) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.fullName } },
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Registrasi gagal.');

    // 2. Call existing RPC (it creates Company + Profile with role 'owner' by default)
    const { data: rpcData, error: rpcError } = await supabase.rpc('register_new_owner', {
      p_user_id: authData.user.id,
      p_email: data.email,
      p_full_name: data.fullName,
      p_company_name: data.companyName,
      p_phone: data.phone,
      p_address: data.address,
      p_dpc_id: data.dpcId
    });

    if (rpcError) throw new Error(`Gagal menyimpan data mitra: ${rpcError.message}`);

    // 3. FORCE UPDATE ROLE to TOUR_AGENT
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: UserRole.TOUR_AGENT })
        .eq('id', authData.user.id);

    if (updateError) {
        console.error("Failed to update role to TOUR_AGENT", updateError);
    }

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

  // --- PASSWORD RECOVERY ---
  resetPasswordForEmail: async (email: string) => {
    const redirectUrl = window.location.origin + '/#/reset-password';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    if (error) throw new Error(error.message);
    return true;
  },

  updateUserPassword: async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    return true;
  },
  // -------------------------

  getUserProfile: async (): Promise<Profile | null> => {
    // 1. Verify Authentication Status first (Catches 403/401 immediately)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        console.warn("getUserProfile: Auth Token Invalid/Expired.", authError);
        return null; // Return null to trigger logout in Context
    }

    // 2. Fetch Profile from Database
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
        console.error("getUserProfile Error:", error);
        return null; 
    }
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
  
  getUsers: () => {
    return supabase.from('profiles').select('*').then(({ data }) => {
        return (data || []).map((p: Profile) => ({
            id: p.id,
            name: p.full_name,
            username: p.email,
            role: p.role,
            email: p.email,
            phone: '', 
            image: null
        })) as User[];
    });
  },

  saveUser: async (user: User) => {
      if (user.id.length > 20 && !user.id.startsWith('u_')) {
          await supabase.from('profiles').update({
              full_name: user.name,
              role: user.role
          }).eq('id', user.id);
      } else {
          alert("Fitur tambah user baru dibatasi.");
      }
  },

  deleteUser: async (id: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw new Error(error.message);
  }
};
