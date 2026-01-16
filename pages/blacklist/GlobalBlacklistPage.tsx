
import React, { useEffect, useState } from 'react';
import { blacklistService } from '../../service/blacklistService';
import { GlobalBlacklist } from '../../types';

export const GlobalBlacklistPage: React.FC = () => {
  const [blacklistData, setBlacklistData] = useState<GlobalBlacklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (keyword?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await blacklistService.getGlobalBlacklist(keyword);
      setBlacklistData(data);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('permission denied') || err.code === '42501') {
        setError("Akses ditolak. Anda tidak memiliki izin melihat data ini.");
      } else {
        setError("Gagal memuat data Global Blacklist.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(search);
  };

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-red-600 pl-4">
        <h1 className="text-2xl font-bold text-red-700">Global Blacklist</h1>
        <p className="text-slate-500 text-sm">Database terpusat pelaku kejahatan rental, penggelapan, dan penyewa bermasalah.</p>
      </div>

      <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex items-start gap-3">
        <i className="fas fa-shield-alt text-red-500 text-xl mt-1"></i>
        <div>
          <h3 className="font-bold text-red-800 text-sm">Peringatan Keras</h3>
          <p className="text-xs text-red-700 mt-1 leading-relaxed">
            Data ini dibagikan untuk kepentingan keamanan bersama anggota ASPERDA.
            Dilarang menyebarluaskan data pribadi ini ke publik (media sosial) tanpa izin otoritas hukum.
            Gunakan data ini hanya untuk verifikasi calon penyewa Anda.
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <form onSubmit={handleSearch} className="relative max-w-md w-full">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <i className="fas fa-search"></i>
           </div>
           <input 
             type="text" 
             className="w-full pl-10 pr-20 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
             placeholder="Cari NIK atau Nama..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
           <button 
             type="submit"
             className="absolute right-1 top-1 bottom-1 bg-slate-900 text-white px-4 rounded-md text-sm font-medium hover:bg-slate-800"
           >
             Cari
           </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg text-sm text-center font-medium">
          {error}
        </div>
      )}

      {/* Table Data */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
           <div className="p-12 text-center text-slate-500">
             <i className="fas fa-spinner fa-spin mr-2"></i> Mengakses Database Keamanan...
           </div>
        ) : blacklistData.length === 0 ? (
           <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 text-2xl">
                 <i className="fas fa-user-check"></i>
               </div>
               <h3 className="text-lg font-medium text-slate-900">Tidak Ditemukan</h3>
               <p className="text-slate-500">
                 {search ? `Tidak ada data blacklist dengan kata kunci "${search}"` : "Database blacklist kosong."}
               </p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Identitas (Nama / NIK)</th>
                  <th className="px-6 py-4">Kontak</th>
                  <th className="px-6 py-4">Kasus / Alasan</th>
                  <th className="px-6 py-4">Tanggal Lapor</th>
                  <th className="px-6 py-4 text-center">Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {blacklistData.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-6 py-4">
                       <div className="font-bold text-slate-900 text-base">{item.full_name}</div>
                       <div className="font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs inline-block mt-1 border border-red-100">
                         {item.nik}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                       {item.phone}
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-slate-800 font-medium">{item.reason}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                       {new Date(item.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                    </td>
                    <td className="px-6 py-4 text-center">
                       {item.evidence_url ? (
                         <a 
                           href={item.evidence_url} 
                           target="_blank" 
                           rel="noreferrer"
                           className="text-blue-600 hover:underline text-xs font-medium"
                         >
                           <i className="fas fa-external-link-alt mr-1"></i> Lihat
                         </a>
                       ) : (
                         <span className="text-slate-400 text-xs">-</span>
                       )}
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
