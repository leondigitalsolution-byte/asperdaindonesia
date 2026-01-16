
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { partnerService } from '../../service/partnerService';
import { Partner } from '../../types';
import { Button } from '../../components/ui/Button';
import { Edit, Trash2, Import, Download, History, Phone } from 'lucide-react';

export const PartnerListPage: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await partnerService.getPartners();
      setPartners(data);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('permission denied') || err.code === '42501') {
        setError("Akses ditolak. Hubungi administrator sistem.");
      } else {
        setError("Gagal memuat data mitra.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if(window.confirm(`Hapus data mitra "${name}"? Data mobil yang terkait mungkin akan kehilangan referensi pemilik.`)) {
      try {
        await partnerService.deletePartner(id);
        loadPartners();
      } catch (err: any) {
        alert("Gagal menghapus: " + err.message);
      }
    }
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mitra & Rekanan</h1>
          <p className="text-slate-500 text-sm">Kelola pemilik mobil titipan, foto dan bagi hasil.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                <Import size={16}/> Import
            </button>
            <button className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                <Download size={16}/> Export
            </button>
            <Link to="/dashboard/partners/new">
                <Button className="!w-auto"><i className="fas fa-plus mr-2"></i> Tambah Mitra</Button>
            </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
            </div>
            <div className="ml-3 w-full flex justify-between items-center">
              <div>
                <p className="text-sm text-red-700 font-bold">Terjadi Kesalahan</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
              <button 
                onClick={loadPartners}
                className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <i className="fas fa-spinner fa-spin text-primary text-3xl mb-4"></i>
          <p className="text-slate-500">Memuat data mitra...</p>
        </div>
      ) : partners.length === 0 && !error ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
           <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400 text-2xl">
             <i className="fas fa-handshake"></i>
           </div>
           <h3 className="text-lg font-medium text-slate-900">Belum ada mitra investor</h3>
           <p className="text-slate-500 mb-6">Tambahkan mitra jika Anda mengelola unit titipan orang lain.</p>
           <Link to="/dashboard/partners/new">
             <Button variant="outline" className="!w-auto mx-auto">Tambah Mitra Baru</Button>
           </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {partners.map(partner => (
                <div key={partner.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                    
                    {/* Header: Photo, Name, Split, Actions */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                                {partner.image_url ? (
                                    <img src={partner.image_url} alt={partner.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <i className="fas fa-user text-2xl"></i>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 leading-tight">{partner.name}</h3>
                                <div className="text-slate-500 text-sm flex items-center gap-1 mt-1 font-mono">
                                    <Phone size={12} /> {partner.phone}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md">
                                Split: {partner.profit_sharing_percentage}%
                            </span>
                            <div className="flex gap-1">
                                <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                    <Edit size={16}/>
                                </button>
                                <button 
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" 
                                    title="Hapus"
                                    onClick={() => handleDelete(partner.id, partner.name)}
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Block */}
                    <div className="bg-slate-50 rounded-lg p-4 flex justify-between items-center mb-4">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Unit Mobil</p>
                            <p className="text-xl font-bold text-slate-900">{partner.cars?.length || 0}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Est. Pendapatan</p>
                            <p className="text-xl font-bold text-blue-600">
                                {/* Placeholder Revenue Calculation - In real app, sum from bookings */}
                                Rp {(partner.cars?.length || 0) > 0 ? ((partner.cars?.length || 0) * 15000000 + Math.random() * 5000000).toLocaleString('id-ID', {maximumFractionDigits: 0}) : '0'}
                            </p>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button className="w-full py-2 bg-blue-50 text-blue-600 font-bold text-sm rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 mb-6">
                        <History size={16}/> Riwayat & Detail
                    </button>

                    {/* Car List */}
                    <div>
                        <p className="text-xs text-slate-500 mb-2 font-medium">Mobil Dimiliki:</p>
                        {partner.cars && partner.cars.length > 0 ? (
                            <ul className="space-y-1">
                                {partner.cars.map((car, idx) => (
                                    <li key={car.id} className="text-sm text-slate-600 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                        {car.brand} {car.model} <span className="text-slate-400">({car.license_plate})</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-400 italic flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                Belum ada unit.
                            </p>
                        )}
                    </div>

                </div>
            ))}
        </div>
      )}
    </div>
  );
};
