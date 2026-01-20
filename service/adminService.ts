
import { supabase } from './supabaseClient';
import { Company, MembershipStatus, UserRole, BlacklistReport, GlobalBlacklist } from '../types';
import { authService } from './authService';

export const adminService = {
  /**
   * Get Pending Members (New Registrations)
   */
  getPendingMembers: async (): Promise<Company[]> => {
    const profile = await authService.getUserProfile();
    if (!profile) throw new Error("Unauthorized");

    let query = supabase
      .from('companies')
      .select('*, dpc_regions(name, province)')
      .eq('membership_status', MembershipStatus.PENDING)
      .order('created_at', { ascending: false });

    // DPC Admin Restriction
    if (profile.role === UserRole.DPC_ADMIN && profile.company_id) {
      const { data: myCompany } = await supabase
        .from('companies')
        .select('dpc_id')
        .eq('id', profile.company_id)
        .single();
      
      if (myCompany?.dpc_id) {
        query = query.eq('dpc_id', myCompany.dpc_id);
      }
    } else if (profile.role !== UserRole.SUPER_ADMIN) {
        throw new Error("Access Denied");
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as Company[];
  },

  /**
   * Get Active Members (For Management)
   */
  getActiveMembers: async (): Promise<Company[]> => {
    const profile = await authService.getUserProfile();
    if (!profile) throw new Error("Unauthorized");

    let query = supabase
      .from('companies')
      .select('*, dpc_regions(name, province)')
      .eq('membership_status', MembershipStatus.ACTIVE)
      .order('name', { ascending: true });

    // DPC Admin Restriction
    if (profile.role === UserRole.DPC_ADMIN && profile.company_id) {
      const { data: myCompany } = await supabase
        .from('companies')
        .select('dpc_id')
        .eq('id', profile.company_id)
        .single();
      
      if (myCompany?.dpc_id) {
        query = query.eq('dpc_id', myCompany.dpc_id);
      }
    } else if (profile.role !== UserRole.SUPER_ADMIN) {
        throw new Error("Access Denied");
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as Company[];
  },

  /**
   * Approve or Reject a Member
   */
  updateMemberStatus: async (companyId: string, status: MembershipStatus) => {
    const { error } = await supabase
      .from('companies')
      .update({ membership_status: status })
      .eq('id', companyId);

    if (error) throw new Error(error.message);
    return true;
  },

  /**
   * Update Member Verification Status (Only allows changing verification status)
   */
  updateMemberCompliance: async (companyId: string, updates: { verification_status: string }) => {
      const { error } = await supabase
        .from('companies')
        .update({ verification_status: updates.verification_status })
        .eq('id', companyId);
      
      if (error) throw new Error(error.message);
      return true;
  },

  /**
   * Get Pending Blacklist Reports
   */
  getBlacklistReports: async (): Promise<BlacklistReport[]> => {
    const { data, error } = await supabase
      .from('blacklist_reports')
      .select('*, companies(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
       if(error.code === '42P01') return []; 
       throw new Error(error.message);
    }
    return data as BlacklistReport[];
  },

  /**
   * Process Report (Approve -> Move to Global / Reject)
   */
  processBlacklistReport: async (report: BlacklistReport, action: 'approve' | 'reject') => {
    if (action === 'reject') {
      const { error } = await supabase
        .from('blacklist_reports')
        .update({ status: 'rejected' })
        .eq('id', report.id);
      if (error) throw new Error(error.message);
    } else {
      const { error: insertError } = await supabase
        .from('global_blacklists')
        .insert({
           full_name: report.target_name,
           nik: report.target_nik,
           phone: report.target_phone,
           reason: report.reason,
           evidence_url: report.evidence_url,
           reported_by_company_id: report.reported_by_company_id
        });

      if (insertError) throw new Error(`Failed to insert global blacklist: ${insertError.message}`);

      const { error: updateError } = await supabase
        .from('blacklist_reports')
        .update({ status: 'approved' })
        .eq('id', report.id);

      if (updateError) throw new Error(`Failed to update report status: ${updateError.message}`);
    }
    return true;
  },

  /**
   * Manage DPC (Super Admin Only)
   */
  createDpcRegion: async (name: string, province: string) => {
    const { data, error } = await supabase
      .from('dpc_regions')
      .insert({ name, province })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
  
  deleteDpcRegion: async (id: string) => {
     const { error } = await supabase.from('dpc_regions').delete().eq('id', id);
     if(error) throw new Error(error.message);
     return true;
  }
};
