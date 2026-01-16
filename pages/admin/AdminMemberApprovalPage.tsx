
import React, { useEffect, useState } from 'react';
import { adminService } from '../../service/adminService';
import { Company, MembershipStatus } from '../../types';
import { Button } from '../../components/ui/Button';

export const AdminMemberApprovalPage: React.FC = () => {
  const [members, setMembers] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getPendingMembers();
      setMembers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if(!window.confirm(`Yakin ingin ${action === 'approve' ? 'menyetujui' : 'menolak'} member ini?`)) return;

    try {
      await adminService.updateMemberStatus(
        id, 
        action === 'approve' ? MembershipStatus.ACTIVE : MembershipStatus.INACTIVE
      );
      // Remove from list
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      alert("Gagal memproses: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Verifikasi Anggota Baru</h1>
        <p className="text-slate-500 text-sm">Validasi pendaftaran rental mobil di wilayah Anda.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
           <div className="p-12 text-center text-slate-500">
             <i className="fas fa-spinner fa-spin mr-2"></i> Memuat data pendaftaran...
           </div>
        ) : members.length === 0 ? (
           <div className="p-12 text-center text-slate-500">
             <i className="fas fa-check-circle text-4xl text-green-500 mb-3"></i>
             <p>Tidak ada pendaftaran baru yang menunggu persetujuan.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
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
                {members.map(m => (
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
                      <a href={`https://wa.me/${m.phone.replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        <i className="fab fa-whatsapp mr-1"></i> {m.phone}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-center flex justify-center gap-2">
                      <button 
                        onClick={() => handleAction(m.id, 'approve')}
                        className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-md text-xs font-bold transition-colors"
                      >
                        <i className="fas fa-check mr-1"></i> Setujui
                      </button>
                      <button 
                        onClick={() => handleAction(m.id, 'reject')}
                        className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-xs font-bold transition-colors"
                      >
                         <i className="fas fa-times mr-1"></i> Tolak
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
