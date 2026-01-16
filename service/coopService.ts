
import { supabase } from './supabaseClient';
import { CoopMember, UserRole } from '../types';
import { authService } from './authService';

export const coopService = {
  /**
   * Upload member photo
   */
  uploadPhoto: async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `coop_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Using driver-images bucket for simplicity
    const { error: uploadError } = await supabase.storage
      .from('driver-images')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Upload Failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('driver-images').getPublicUrl(filePath);
    return data.publicUrl;
  },

  /**
   * Get members based on permission
   */
  getMembers: async (): Promise<CoopMember[]> => {
    const profile = await authService.getUserProfile();
    if (!profile) throw new Error("Unauthorized");

    let query = supabase
      .from('coop_members')
      .select('*, dpc_regions(name)')
      .order('member_id', { ascending: true });

    // Filter Logic based on Role
    if (profile.role === UserRole.SUPER_ADMIN) {
        // Can see all
    } else if (profile.role === UserRole.DPC_ADMIN) {
        // Only see members of their DPC
        // We need to fetch the admin's company to know their DPC ID
        const { data: adminCompany } = await supabase
            .from('companies')
            .select('dpc_id')
            .eq('id', profile.company_id)
            .single();
        
        if (adminCompany?.dpc_id) {
            query = query.eq('dpc_id', adminCompany.dpc_id);
        } else {
            return []; // No DPC assigned to this admin
        }
    } else {
        throw new Error("Akses Ditolak: Hanya Pengurus DPC dan Super Admin yang diizinkan.");
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as CoopMember[];
  },

  /**
   * Get the current user's membership data
   */
  getMyMembership: async (): Promise<CoopMember | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
          .from('coop_members')
          .select('*, dpc_regions(name)')
          .eq('user_id', user.id)
          .single();
      
      // If error is row not found, return null (not member yet)
      if (error && error.code !== 'PGRST116') {
          console.error("Fetch Membership Error", error);
      }
      return data as CoopMember | null;
  },

  /**
   * Get Pending Members for DPC Admin
   */
  getPendingMembers: async (): Promise<CoopMember[]> => {
      const profile = await authService.getUserProfile();
      if (profile?.role !== UserRole.DPC_ADMIN) return [];

      const { data: company } = await supabase.from('companies').select('dpc_id').eq('id', profile.company_id).single();
      if (!company?.dpc_id) return [];

      const { data, error } = await supabase
          .from('coop_members')
          .select('*, dpc_regions(name)')
          .eq('dpc_id', company.dpc_id)
          .eq('status', 'Pending');
      
      if (error) throw new Error(error.message);
      return data as CoopMember[];
  },

  getMemberById: async (id: string): Promise<CoopMember> => {
    const { data, error } = await supabase.from('coop_members').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data as CoopMember;
  },

  /**
   * Register Current User (Owner) as Coop Member
   */
  registerSelf: async (memberData: Partial<CoopMember>, imageFile?: File | null) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please login first.");

      let photoUrl = memberData.photo_url;
      if (imageFile) {
          photoUrl = await coopService.uploadPhoto(imageFile);
      }

      // Generate Temp ID if not provided (server or manual process usually handles this)
      const tempId = `REQ-${Date.now().toString().slice(-6)}`;

      const { data, error } = await supabase
          .from('coop_members')
          .insert({
              ...memberData,
              user_id: user.id,
              member_id: tempId, // Temporary ID until approved
              status: 'Pending',
              photo_url: photoUrl
          })
          .select()
          .single();

      if (error) throw new Error(error.message);
      return data;
  },

  createMember: async (memberData: Omit<CoopMember, 'id' | 'created_at'>, imageFile?: File | null) => {
     let photoUrl = memberData.photo_url;
     if (imageFile) {
        photoUrl = await coopService.uploadPhoto(imageFile);
     }

     const { data, error } = await supabase
        .from('coop_members')
        .insert({
            ...memberData,
            photo_url: photoUrl
        })
        .select()
        .single();
    
    if (error) throw new Error(error.message);
    return data;
  },

  updateMember: async (id: string, memberData: Partial<CoopMember>, imageFile?: File | null) => {
    let updates: any = { ...memberData };
    if (imageFile) {
        const photoUrl = await coopService.uploadPhoto(imageFile);
        updates.photo_url = photoUrl;
    }
    
    // Cleanup
    delete updates.id;
    delete updates.created_at;
    delete updates.dpc_regions;

    const { data, error } = await supabase
        .from('coop_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Approve Pending Member (DPC Admin)
   */
  approveMember: async (id: string, newMemberId: string) => {
      const { error } = await supabase
          .from('coop_members')
          .update({
              status: 'Aktif',
              member_id: newMemberId
          })
          .eq('id', id);
      
      if (error) throw new Error(error.message);
      return true;
  },

  deleteMember: async (id: string) => {
      const { error } = await supabase.from('coop_members').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return true;
  },

  /**
   * Helper to get user's DPC ID for form pre-filling
   */
  getMyDpcId: async (): Promise<string | null> => {
      const profile = await authService.getUserProfile();
      if (!profile?.company_id) return null;
      
      const { data } = await supabase.from('companies').select('dpc_id').eq('id', profile.company_id).single();
      return data?.dpc_id || null;
  }
};
