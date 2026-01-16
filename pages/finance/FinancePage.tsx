
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { financeService } from '../../service/financeService';
import { FinanceRecord, FinanceType } from '../../types';
import { Button } from '../../components/ui/Button';
import { FileText, Eye, Edit2, Trash2, Filter, Download, Plus } from 'lucide-react';

export const FinancePage: React.FC = () => {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('Semua Kategori');
  const [filterStatus, setFilterStatus] = useState('Semua Status');

  useEffect(() => {
    loadData();
  }, []);

  // Filter Logic
  useEffect(() => {
      let result = records;

      if(filterStartDate) {
          result = result.filter(r => new Date(r.transaction_date) >= new Date(filterStartDate));
      }
      if(filterEndDate) {
          result = result.filter(r => new Date(r.transaction_date) <= new Date(filterEndDate));
      }
      if(filterCategory !== 'Semua Kategori') {
          result = result.filter(r => r.category === filterCategory);
      }
      if(filterStatus !== 'Semua Status') {
          const statusMap: any = { 'Dibayar': 'paid', 'Menunggu': 'pending' };
          const internalStatus = statusMap[filterStatus] || filterStatus.toLowerCase();
          // Backward compatibility for records without status (assume paid)
          result = result.filter(r => (r.status || 'paid') === internalStatus);
      }

      setFilteredRecords(result);
  }, [records, filterStartDate, filterEndDate, filterCategory, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const rec = await financeService.getRecords();
      setRecords(rec);
      setFilteredRecords(rec);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('permission denied') || err.code === '42501') {
        setError("Akses ditolak. Hubungi administrator sistem.");
      } else {
        setError("Gagal memuat data keuangan.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(window.confirm('Hapus transaksi ini?')) {
      try {
        await financeService.deleteRecord(id);
        loadData();
      } catch (err: any) {
        alert("Gagal menghapus: " + err.message);
      }
    }
  };

  // Extract unique categories for filter
  const categories = ['Semua Kategori', ...Array.from(new Set(records.map(r => r.category))).filter(Boolean)];

  return (
    <div className="space-y-6 pb-20">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengeluaran & Setoran</h1>
          <p className="text-slate-500 text-sm">Kelola operasional, reimbursement, dan setoran mitra.</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row items-center gap-3">
             <div className="flex items-center gap-2 text-slate-500 text-sm font-bold min-w-fit">
                 <Filter size={16}/> Filter:
             </div>
             
             <div className="flex items-center gap-2 w-full md:w-auto">
                 <input 
                    type="date" 
                    className="border border-slate-300 rounded-lg p-2 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto"
                    placeholder="dd-mm-yyyy"
                    value={filterStartDate}
                    onChange={e => setFilterStartDate(e.target.value)}
                 />
                 <span className="text-slate-400 text-sm">-</span>
                 <input 
                    type="date" 
                    className="border border-slate-300 rounded-lg p-2 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto"
                    placeholder="dd-mm-yyyy"
                    value={filterEndDate}
                    onChange={e => setFilterEndDate(e.target.value)}
                 />
             </div>

             <select 
                className="w-full md:w-48 border border-slate-300 rounded-lg p-2 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
             >
                 {categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>

             <select 
                className="w-full md:w-40 border border-slate-300 rounded-lg p-2 text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
             >
                 <option>Semua Status</option>
                 <option>Dibayar</option>
                 <option>Menunggu</option>
             </select>

             <div className="flex-1"></div>

             <div className="flex gap-2 w-full xl:w-auto">
                 <button className="flex items-center justify-center gap-2 px-4 py-2 border border-green-200 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm font-bold w-full xl:w-auto">
                     <Download size={16}/> CSV
                 </button>
                 <Link to="/dashboard/finance/new" className="w-full xl:w-auto">
                    <Button className="!w-full xl:!w-auto flex items-center gap-2 justify-center">
                        <Plus size={16}/> Catat Pengeluaran
                    </Button>
                 </Link>
             </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
            <div className="text-red-500"><i className="fas fa-exclamation-circle"></i></div>
            <div>
                <p className="text-sm text-red-700 font-bold">Terjadi Kesalahan</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
           <div className="p-12 text-center text-slate-500">
             <i className="fas fa-spinner fa-spin mr-2"></i> Memuat data keuangan...
           </div>
        ) : filteredRecords.length === 0 ? (
           <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-2xl">
                 <FileText size={24}/>
               </div>
               <h3 className="text-lg font-medium text-slate-900">Tidak ada data</h3>
               <p className="text-slate-500 mb-6 text-sm">Belum ada transaksi yang sesuai filter Anda.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Keterangan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Jumlah</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRecords.map(r => {
                    const isIncome = r.type === FinanceType.INCOME;
                    const status = r.status || 'paid';
                    
                    return (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                {new Date(r.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase border ${r.category.toLowerCase().includes('bbm') ? 'bg-orange-50 text-orange-700 border-orange-100' : r.category.toLowerCase().includes('gaji') ? 'bg-blue-50 text-blue-700 border-blue-100' : r.category.toLowerCase().includes('setor') ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                    {r.category}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-slate-800 font-medium">{r.description || '-'}</div>
                                {/* Placeholder for user logic if description contains pattern like 'name' */}
                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                    <i className="fas fa-user-circle"></i> {isIncome ? 'Admin' : 'Staff / Driver'}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                {status === 'paid' ? (
                                    <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 w-fit">
                                        <i className="fas fa-check-circle"></i> Dibayar
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100 w-fit">
                                        <i className="fas fa-clock"></i> Menunggu
                                    </span>
                                )}
                            </td>
                            <td className={`px-6 py-4 text-right font-bold ${isIncome ? 'text-green-600' : 'text-blue-600'}`}>
                                Rp {r.amount.toLocaleString('id-ID')}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-center gap-2">
                                    {status === 'pending' && (
                                        <button className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 shadow-sm">
                                            Bayar
                                        </button>
                                    )}
                                    {status === 'paid' && (
                                        <button className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 shadow-sm opacity-0 cursor-default">
                                            Lunas
                                        </button>
                                    )}
                                    
                                    {/* Proof Action */}
                                    {r.proof_image_url ? (
                                        <button 
                                            onClick={() => window.open(r.proof_image_url, '_blank')}
                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded border border-blue-100 transition-colors" 
                                            title="Lihat Bukti Nota"
                                        >
                                            <Eye size={14}/>
                                        </button>
                                    ) : (
                                        <button className="p-2 text-slate-300 rounded border border-slate-100 cursor-not-allowed" title="Tidak ada bukti">
                                            <Eye size={14}/>
                                        </button>
                                    )}

                                    <button 
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded border border-transparent transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={14}/>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(r.id)} 
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded border border-transparent transition-colors"
                                        title="Hapus"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
