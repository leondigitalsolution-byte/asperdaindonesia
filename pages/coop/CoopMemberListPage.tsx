
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { coopService } from '../../service/coopService';
import { CoopMember } from '../../types';
import { Button } from '../../components/ui/Button';
import { exportToCSV, processCSVImport } from '../../service/dataService';
import { Edit, Trash2, Import, Download, User as UserIcon, Building, MapPin } from 'lucide-react';

export const CoopMemberListPage: React.FC = () => {
  const [members, setMembers] = useState<CoopMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await coopService.getMembers();
      setMembers(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat data koperasi.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if(window.confirm(`Hapus anggota "${name}" dari koperasi?`)) {
      try {
        await coopService.deleteMember(id);
        loadMembers();
      } catch (err: any) {
        alert("Gagal menghapus: " + err.message);
      }
    }
  };

  const handleExport = () => {
      const exportData = members.map(m => ({
          ID_Anggota: m.member_id,
          Username: m.username,
          Nama_Lengkap: m.full_name,
          Jenis_Kelamin: m.gender,
          Alamat: m.address,
          Kota: m.city,
          Departemen: m.department,
          Tanggal_Registrasi: m.join_date,
          Status: m.status
      }));
      exportToCSV(exportData, 'Data_Koperasi_ASPERDA');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setImporting(true);
          const file = e.target.files[0];
          
          processCSVImport(file, async (data) => {
              try {
                  const dpcId = await coopService.getMyDpcId();
                  if (!dpcId) throw new Error("Gagal mendeteksi wilayah DPC Anda.");

                  let successCount = 0;
                  // Minimal validation & mapping
                  for (const row of data) {
                      if (row.ID_Anggota && row.Nama_Lengkap) {
                          await coopService.createMember({
                              member_id: row.ID_Anggota,
                              username: row.Username || row.ID_Anggota,
                              full_name: row.Nama_Lengkap,
                              gender: row.Jenis_Kelamin === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
                              address: row.Alamat || '-',
                              city: row.Kota || '-',
                              department: row.Departemen || 'ANGGOTA',
                              join_date: row.Tanggal_Registrasi || new Date().toISOString().split('T')[0],
                              status: 'Aktif',
                              dpc_id: dpcId,
                              photo_url: undefined
                          });
                          successCount++;
                      }
                  }
                  alert(`Berhasil import ${successCount} data anggota.`);
                  loadMembers();
              } catch (err: any) {
                  alert("Import Gagal: " + err.message);
              } finally {
                  setImporting(false);
                  // Reset input
                  e.target.value = '';
              }
          });
      }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Koperasi ASPERDA</h1>
          <p className="text-slate-500 text-sm">Database keanggotaan koperasi DPC.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                {importing ? <i className="fas fa-spinner fa-spin"></i> : <Import size={16}/>}
                <span>Import CSV</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
            <button onClick={handleExport} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                <Download size={16}/> Export CSV
            </button>
            <Link to="/dashboard/coop/new">
                <Button className="!w-auto"><i className="fas fa-plus mr-2"></i> Tambah Anggota</Button>
            </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg text-red-700 font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
           <div className="p-12 text-center text-slate-500">
             <i className="fas fa-spinner fa-spin mr-2"></i> Memuat data...
           </div>
        ) : members.length === 0 ? (
           <div className="p-12 text-center text-slate-500">
             <Building size={48} className="mx-auto text-slate-300 mb-3"/>
             <p>Belum ada data anggota koperasi.</p>
             <p className="text-xs mt-1">Gunakan tombol Import CSV atau Tambah Anggota.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Photo</th>
                  <th className="px-6 py-4">ID Anggota</th>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Nama Lengkap</th>
                  <th className="px-6 py-4">L/P</th>
                  <th className="px-6 py-4">Alamat</th>
                  <th className="px-6 py-4">Kota</th>
                  <th className="px-6 py-4">Departemen</th>
                  <th className="px-6 py-4">Tgl Registrasi</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                            {m.photo_url ? (
                                <img src={m.photo_url} alt={m.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <UserIcon size={20} />
                                </div>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-3 font-mono font-bold text-slate-700">{m.member_id}</td>
                    <td className="px-6 py-3 text-slate-600">{m.username}</td>
                    <td className="px-6 py-3 font-bold text-slate-800">{m.full_name}</td>
                    <td className="px-6 py-3 text-slate-600">{m.gender === 'Laki-laki' ? 'L' : 'P'}</td>
                    <td className="px-6 py-3 text-slate-600 max-w-[200px] truncate" title={m.address}>{m.address}</td>
                    <td className="px-6 py-3 text-slate-600">{m.city}</td>
                    <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${m.department?.includes('KETUA') ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {m.department}
                        </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                        {new Date(m.join_date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${m.status === 'Aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {m.status}
                        </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                        <div className="flex justify-center gap-2">
                            <Link to={`/dashboard/coop/edit/${m.id}`}>
                                <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                            </Link>
                            <button onClick={() => handleDelete(m.id, m.full_name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                        </div>
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
