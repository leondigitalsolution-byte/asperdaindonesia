
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { payLaterService } from '../../service/payLaterService';
import { PayLaterRecord } from '../../types';
import { Clock, Building, User, CheckCircle, AlertCircle, Filter, FileText, MapPin, Search } from 'lucide-react';

export const AdminPayLaterPage: React.FC = () => {
  const [records, setRecords] = useState<PayLaterRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<PayLaterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
      let result = records;

      // Filter Status
      if (statusFilter !== 'all') {
          result = result.filter(r => r.status === statusFilter);
      }

      // Search
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          result = result.filter(r => 
              r.customers?.full_name.toLowerCase().includes(lower) || 
              r.companies?.name.toLowerCase().includes(lower) ||
              r.booking_id.toLowerCase().includes(lower)
          );
      }

      setFilteredRecords(result);
  }, [statusFilter, searchTerm, records]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await payLaterService.getPayLaterRecords();
      setRecords(data);
      setFilteredRecords(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
      // Simple toggle logic for demo purposes, or prompt user
      const nextStatus = currentStatus === 'active' ? 'paid_off' : currentStatus === 'paid_off' ? 'active' : 'paid_off';
      if(window.confirm(`Ubah status menjadi ${nextStatus === 'paid_off' ? 'LUNAS' : 'BERJALAN'}?`)) {
          try {
              await payLaterService.updateStatus(id, nextStatus as any);
              loadData();
          } catch(e: any) {
              alert("Gagal update status: " + e.message);
          }
      }
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'active': return <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full w-fit bg-blue-100 text-blue-700 border border-blue-200"><Clock size={12}/> BERJALAN</span>;
          case 'paid_off': return <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full w-fit bg-green-100 text-green-700 border border-green-200"><CheckCircle size={12}/> LUNAS</span>;
          case 'default': return <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full w-fit bg-red-100 text-red-700 border border-red-200"><AlertCircle size={12}/> MACET</span>;
          default: return <span className="text-xs bg-slate-100 px-2 py-1 rounded">{status}</span>;
      }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="border-l-4 border-orange-500 pl-4">
            <h1 className="text-2xl font-bold text-slate-900">Monitoring PayLater</h1>
            <p className="text-slate-500 text-sm">Daftar tagihan berjalan anggota di wilayah DPC.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
              <div className="relative flex-1 md:w-48">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input 
                    type="text" 
                    placeholder="Cari Rental / Pelanggan..." 
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-orange-500 outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
              <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
              <div className="flex items-center gap-2 flex-1 md:flex-none">
                  <Filter size={16} className="text-slate-400"/>
                  <select 
                    className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer outline-none"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                      <option value="all">Semua Status</option>
                      <option value="active">Berjalan (Active)</option>
                      <option value="paid_off">Lunas (Paid Off)</option>
                      <option value="default">Macet (Default)</option>
                  </select>
              </div>
          </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
           <div className="p-12 text-center text-slate-500"><i className="fas fa-spinner fa-spin mr-2"></i> Memuat data transaksi...</div>
        ) : filteredRecords.length === 0 ? (
           <div className="p-12 text-center text-slate-500 border-dashed border-slate-200">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                   <FileText size={24} className="text-slate-300"/>
               </div>
               <p>Belum ada transaksi PayLater.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4">Wilayah (DPC)</th>
                  <th className="px-6 py-4">Penyewa & Rental</th>
                  <th className="px-6 py-4">Ref. Booking</th>
                  <th className="px-6 py-4 text-right">Total Hutang</th>
                  <th className="px-6 py-4 text-center">Tenor</th>
                  <th className="px-6 py-4 text-right">Cicilan/Bln</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <MapPin size={14} className="text-slate-400"/>
                            {rec.dpc_regions?.name || 'Wilayah Tidak Diketahui'}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{rec.customers?.full_name}</div>
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><User size={10}/> {rec.customers?.phone}</div>
                        <div className="text-xs text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded w-fit flex items-center gap-1 mt-1">
                            <Building size={10}/> {rec.companies?.name}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        {rec.bookings ? (
                            <Link to={`/dashboard/bookings/edit/${rec.booking_id}`} className="text-blue-600 hover:underline font-mono text-xs font-bold">
                                #{rec.booking_id.substring(0,8).toUpperCase()}
                            </Link>
                        ) : <span className="text-slate-400">-</span>}
                        <div className="text-[10px] text-slate-400 mt-1">
                            Mulai: {new Date(rec.start_date).toLocaleDateString('id-ID')}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 text-right">
                        Rp {rec.total_amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200 whitespace-nowrap">
                            {rec.term_months} Bulan
                        </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-orange-600 text-right">
                        Rp {rec.monthly_installment.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                            {getStatusBadge(rec.status)}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                        {rec.status !== 'paid_off' && (
                            <button 
                                onClick={() => handleUpdateStatus(rec.id, rec.status)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                            >
                                Update Status
                            </button>
                        )}
                        {rec.status === 'paid_off' && <span className="text-xs text-slate-400">-</span>}
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
