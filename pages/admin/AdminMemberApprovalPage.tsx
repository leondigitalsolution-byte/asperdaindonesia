
import React, { useEffect, useState } from 'react';
import { adminService } from '../../service/adminService';
import { Company, MembershipStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, Star, Users, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

export const AdminMemberApprovalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
  
  const [pendingMembers, setPendingMembers] = useState<Company[]>([]);
  const [activeMembers, setActiveMembers] = useState<Company[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'pending') {
          const data = await adminService.getPendingMembers();
          setPendingMembers(data);
      } else {
          const data = await adminService.getActiveMembers();
          setActiveMembers(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS FOR PENDING ---
  const handleApprovalAction = async (id: string, action: 'approve' | 'reject') => {
    if(!window.confirm(`Yakin ingin ${action === 'approve' ? 'menyetujui' : 'menolak'} member ini?`)) return;

    try {
      await adminService.updateMemberStatus(
        id, 
        action === 'approve' ? MembershipStatus.ACTIVE : MembershipStatus.INACTIVE
      );
      setPendingMembers(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      alert("Gagal memproses: " + err.message);
    }
  };

  // --- ACTIONS FOR ACTIVE ---
  const handleUpdateRating = async (id: string, newRating: number) => {
      try {
          await adminService.updateMemberCompliance(id, { kpi_rating: newRating });
          setActiveMembers(prev => prev.map(m => m.id === id ? { ...m, kpi_rating: newRating } : m));
      } catch (e: any) {
          alert("Gagal update rating: " + e.message);
      }
  };

  const handleToggleVerification = async (id: string, currentStatus: string) => {
      const newStatus = currentStatus === 'verified' ? 'unverified' : 'verified';
      if(!window.confirm(`Ubah status menjadi ${newStatus.toUpperCase()}?`)) return;

      try {
          await adminService.updateMemberCompliance(id, { verification_status: newStatus });
          setActiveMembers(prev => prev.map(m => m.id === id ? { ...m, verification_status: newStatus } : m));
      } catch (e: any) {
          alert("Gagal update status: " + e.message);
      }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Manajemen Anggota</h1>
            <p className="text-slate-500 text-sm">Verifikasi pendaftaran dan kelola status member.</p>
        </div>
        
        {/* TAB SWITCHER */}
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <button 
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'pending' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <UserPlus size={16}/> Pendaftaran Baru
                {pendingMembers.length > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingMembers.length}</span>}
            </button>
            <button 
                onClick={() => setActiveTab('active')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'active' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <Users size={16}/> Database Anggota
            </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
           <div className="p-12 text-center text-slate-500">
             <i className="fas fa-spinner fa-spin mr-2"></i> Memuat data...
           </div>
        ) : (
          <div className="overflow-x-auto">
            
            {/* --- TABLE: PENDING MEMBERS --- */}
            {activeTab === 'pending' && (
                <>
                    {pendingMembers.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <CheckCircle className="mx-auto text-green-500 mb-2" size={32}/>
                            <p>Tidak ada pendaftaran baru yang menunggu.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                            <th className="px-6 py-4">Nama Rental / PT</th>
                            <th className="px-6 py-4">Pemilik</th>
                            <th className="px-6 py-4">Wilayah DPC</th>
                            <th className="px-6 py-4">Kontak</th>
                            <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pendingMembers.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{m.name}</div>
                                <div className="text-xs text-slate-500 truncate max-w-[200px]">{m.address}</div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-700">
                                {m.owner_name}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                {m.dpc_regions?.name || '-'}
                                <div className="text-xs text-slate-400">{m.dpc_regions?.province}</div>
                                </td>
                                <td className="px-6 py-4">
                                <a href={`https://wa.me/${m.phone?.replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                    <i className="fab fa-whatsapp mr-1"></i> {m.phone}
                                </a>
                                </td>
                                <td className="px-6 py-4 text-center flex justify-center gap-2">
                                <button 
                                    onClick={() => handleApprovalAction(m.id, 'approve')}
                                    className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-md text-xs font-bold transition-colors"
                                >
                                    <i className="fas fa-check mr-1"></i> Setujui
                                </button>
                                <button 
                                    onClick={() => handleApprovalAction(m.id, 'reject')}
                                    className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-xs font-bold transition-colors"
                                >
                                    <i className="fas fa-times mr-1"></i> Tolak
                                </button>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    )}
                </>
            )}

            {/* --- TABLE: ACTIVE MEMBERS (MANAGEMENT) --- */}
            {activeTab === 'active' && (
                <>
                    {activeMembers.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <p>Belum ada anggota aktif.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                            <th className="px-6 py-4">Rental & Owner</th>
                            <th className="px-6 py-4 text-center">Verifikasi</th>
                            <th className="px-6 py-4 text-center">Rating (KPI)</th>
                            <th className="px-6 py-4">Statistik</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {activeMembers.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-900">{m.name}</div>
                                    <div className="text-xs text-slate-500">{m.owner_name} • {m.dpc_regions?.name}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleToggleVerification(m.id, m.verification_status || 'unverified')}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 mx-auto transition-all ${
                                            m.verification_status === 'verified' 
                                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' 
                                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200'
                                        }`}
                                        title="Klik untuk ubah status"
                                    >
                                        {m.verification_status === 'verified' ? <ShieldCheck size={14}/> : <AlertCircle size={14}/>}
                                        {m.verification_status === 'verified' ? 'VERIFIED' : 'UNVERIFIED'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1 group">
                                        <Star className="text-amber-400 fill-amber-400" size={16}/>
                                        <select 
                                            className="font-bold text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer p-0 w-10 text-center"
                                            value={m.kpi_rating || 5.0}
                                            onChange={(e) => handleUpdateRating(m.id, Number(e.target.value))}
                                        >
                                            <option value="1">1.0</option>
                                            <option value="2">2.0</option>
                                            <option value="3">3.0</option>
                                            <option value="4">4.0</option>
                                            <option value="5">5.0</option>
                                        </select>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500">
                                    <div>Success Rate: <span className="font-bold text-green-600">{m.kpi_order_success_ratio || 100}%</span></div>
                                    <div>Respon: {m.kpi_response_time_minutes || 0} Menit</div>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    )}
                </>
            )}

          </div>
        )}
      </div>
    </div>
  );
};
