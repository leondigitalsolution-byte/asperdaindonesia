
import React, { useEffect, useState } from 'react';
import { payLaterService } from '../../service/payLaterService';
import { PayLaterRecord } from '../../types';
import { Clock, Building, User, CheckCircle, AlertCircle } from 'lucide-react';

export const AdminPayLaterPage: React.FC = () => {
  const [records, setRecords] = useState<PayLaterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await payLaterService.getPayLaterRecords();
      setRecords(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="border-l-4 border-orange-500 pl-4">
        <h1 className="text-2xl font-bold text-slate-900">Daftar PayLater (DPC)</h1>
        <p className="text-slate-500 text-sm">Monitoring tagihan member yang menggunakan fasilitas PayLater.</p>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
           <div className="p-12 text-center text-slate-500"><i className="fas fa-spinner fa-spin mr-2"></i> Memuat data...</div>
        ) : records.length === 0 ? (
           <div className="p-12 text-center text-slate-500">Belum ada transaksi PayLater.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Penyewa</th>
                  <th className="px-6 py-4">Rental (Member)</th>
                  <th className="px-6 py-4">Total Hutang</th>
                  <th className="px-6 py-4">Tenor</th>
                  <th className="px-6 py-4">Cicilan/Bulan</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{rec.customers?.full_name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1"><User size={10}/> {rec.customers?.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-700">{rec.companies?.name}</div>
                        <div className="text-xs text-slate-500">{new Date(rec.start_date).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                        Rp {rec.total_amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{rec.term_months} Bulan</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-orange-600">
                        Rp {rec.monthly_installment.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full w-fit ${rec.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                            {rec.status === 'active' ? <Clock size={12}/> : <CheckCircle size={12}/>}
                            {rec.status.toUpperCase()}
                        </span>
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
