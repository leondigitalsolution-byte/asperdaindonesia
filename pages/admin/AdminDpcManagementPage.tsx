
import React, { useEffect, useState } from 'react';
import { adminService } from '../../service/adminService';
import { authService } from '../../service/authService';
import { DpcRegion } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const AdminDpcManagementPage: React.FC = () => {
  const [regions, setRegions] = useState<DpcRegion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    setLoading(true);
    try {
      const data = await authService.getDpcRegions();
      setRegions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.createDpcRegion(name, province);
      setName('');
      setProvince('');
      loadRegions(); // Reload
    } catch (err: any) {
      alert("Gagal menambah DPC: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if(!window.confirm(`Hapus wilayah ${name}?`)) return;
    try {
      await adminService.deleteDpcRegion(id);
      loadRegions();
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* List Section */}
      <div className="md:col-span-2 space-y-6">
         <div>
           <h1 className="text-2xl font-bold text-slate-900">Kelola Wilayah (DPC)</h1>
           <p className="text-slate-500 text-sm">Daftar wilayah operasional ASPERDA.</p>
         </div>

         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
               <div className="p-8 text-center text-slate-500">Loading...</div>
            ) : (
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 font-semibold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Nama Wilayah / Kota</th>
                      <th className="px-6 py-4">Provinsi</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {regions.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                         <td className="px-6 py-4 font-medium text-slate-900">{r.name}</td>
                         <td className="px-6 py-4 text-slate-600">{r.province}</td>
                         <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDelete(r.id, r.name)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                         </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
            )}
         </div>
      </div>

      {/* Form Section */}
      <div className="md:col-span-1">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-6">
            <h3 className="font-bold text-slate-900 mb-4">Tambah DPC Baru</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
               <Input 
                 label="Nama Wilayah (Kota/Kab)" 
                 placeholder="Contoh: Malang Raya"
                 value={name}
                 onChange={e => setName(e.target.value)}
                 required
               />
               <Input 
                 label="Provinsi" 
                 placeholder="Contoh: Jawa Timur"
                 value={province}
                 onChange={e => setProvince(e.target.value)}
                 required
               />
               <Button type="submit" isLoading={submitting}>
                 Simpan Wilayah
               </Button>
            </form>
         </div>
      </div>
    </div>
  );
};
