
import React, { useState, useEffect } from 'react';
import { HighSeason, UserRole } from '../../types';
import { highSeasonService } from '../../service/highSeasonService';
import { authService } from '../../service/authService';
import { Plus, Trash2, Calendar } from 'lucide-react';

export const HighSeasonPage: React.FC = () => {
  const [highSeasons, setHighSeasons] = useState<HighSeason[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priceIncrease, setPriceIncrease] = useState(100000);

  const isOwner = role === UserRole.OWNER || role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        // 1. Get Role
        const p = await authService.getUserProfile();
        if(p) setRole(p.role);

        // 2. Get Data
        const data = await highSeasonService.getHighSeasons();
        setHighSeasons(data);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    if (new Date(endDate) < new Date(startDate)) {
        alert("Tanggal selesai harus setelah tanggal mulai");
        setSaving(false);
        return;
    }

    try {
        await highSeasonService.createHighSeason({
            name,
            startDate,
            endDate,
            priceIncrease: Number(priceIncrease)
        });
        
        await loadData(); // Reload list
        setIsModalOpen(false);
        
        // Reset
        setName(''); setStartDate(''); setEndDate(''); setPriceIncrease(100000);
    } catch (err: any) {
        alert("Gagal menyimpan: " + err.message);
    } finally {
        setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
      if(window.confirm('Hapus event High Season ini?')) {
          try {
              await highSeasonService.deleteHighSeason(id);
              loadData();
          } catch(err: any) {
              alert("Gagal menghapus: " + err.message);
          }
      }
  };

  const formatDate = (dateString: string) => {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">High Season</h2>
          <p className="text-slate-500">Atur kenaikan harga otomatis pada tanggal tertentu (Lebaran, Natal, Tahun Baru).</p>
        </div>
        {isOwner && (
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm font-bold transition-colors">
                <Plus size={18} /> Buat Event Baru
            </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
              <div className="p-12 text-center text-slate-500"><i className="fas fa-spinner fa-spin mr-2"></i> Memuat data...</div>
          ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">NAMA EVENT</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">PERIODE</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">KENAIKAN HARGA (PER HARI)</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">AKSI</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {highSeasons.map(hs => (
                            <tr key={hs.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900 text-sm">{hs.name}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-slate-400"/>
                                        {formatDate(hs.startDate)} - {formatDate(hs.endDate)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-orange-600">
                                    + Rp {hs.priceIncrease.toLocaleString('id-ID')}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {isOwner && (
                                        <button onClick={() => handleDelete(hs.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors" title="Hapus Event">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {highSeasons.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-12 text-slate-500">Belum ada event High Season.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
          )}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Buat Event Baru</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <span className="text-2xl">&times;</span>
                      </button>
                  </div>
                  
                  <form onSubmit={handleSave} className="space-y-5">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">Nama Event</label>
                          <input 
                            required 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium" 
                            placeholder="Contoh: NATARU 2025/2026" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Mulai</label>
                            <input 
                                required 
                                type="date" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-600" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Selesai</label>
                            <input 
                                required 
                                type="date" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-600" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                            />
                        </div>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">Kenaikan Harga (Per Hari)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-sm">Rp</span>
                            <input 
                                required 
                                type="number" 
                                className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-800" 
                                value={priceIncrease} 
                                onChange={e => setPriceIncrease(Number(e.target.value))} 
                            />
                          </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-slate-100">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors text-sm">Batal</button>
                          <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md transition-colors text-sm disabled:opacity-50">
                              {saving ? 'Menyimpan...' : 'Simpan Event'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
