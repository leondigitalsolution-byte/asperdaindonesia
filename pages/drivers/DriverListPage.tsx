
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { driverService } from '../../service/driverService';
import { Driver } from '../../types';
import { Button } from '../../components/ui/Button';
import { Edit, Trash2, History, Phone, Import, Download } from 'lucide-react';

export const DriverListPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await driverService.getDrivers();
      setDrivers(data);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('permission denied') || err.code === '42501') {
        setError("Akses ditolak. Hubungi administrator sistem.");
      } else {
        setError("Gagal memuat data driver.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if(window.confirm(`Hapus data driver "${name}"?`)) {
      try {
        await driverService.deleteDriver(id);
        loadDrivers();
      } catch (err: any) {
        alert("Gagal menghapus: " + err.message);
      }
    }
  };

  return (
    <div className="pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Driver</h1>
          <p className="text-slate-500 text-sm">Kelola data supir dan status operasional.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                <Import size={16}/> Import
            </button>
            <button className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                <Download size={16}/> Export
            </button>
            <Link to="/dashboard/drivers/new">
                <Button className="!w-auto"><i className="fas fa-plus mr-2"></i> Tambah Driver</Button>
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
              <button onClick={loadDrivers} className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50 transition-colors">
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <i className="fas fa-spinner fa-spin text-primary text-3xl mb-4"></i>
          <p className="text-slate-500">Memuat data driver...</p>
        </div>
      ) : drivers.length === 0 && !error ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-2xl">
             <i className="fas fa-id-card-alt"></i>
           </div>
           <h3 className="text-lg font-medium text-slate-900">Belum ada data driver</h3>
           <p className="text-slate-500 mb-6">Tambahkan data supir untuk manajemen operasional.</p>
           <Link to="/dashboard/drivers/new">
             <Button variant="outline" className="!w-auto mx-auto">Tambah Driver</Button>
           </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map(driver => (
                <div key={driver.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                                {driver.image_url ? (
                                    <img src={driver.image_url} alt={driver.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <i className="fas fa-user text-2xl"></i>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 leading-tight">{driver.full_name}</h3>
                                <div className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                                    <Phone size={12} /> {driver.phone}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-6">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 font-medium">Status</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${driver.status === 'active' ? 'bg-green-100 text-green-700' : driver.status === 'on_duty' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {driver.status?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button className="w-full py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                                <History size={14}/> Riwayat & Detail
                            </button>
                            <div className="flex gap-3">
                                <Link to={`/dashboard/drivers/new`} onClick={(e) => { e.preventDefault(); /* Mock navigation since we use generic new form for edit in this simplified structure, in real app pass ID */ }} className="flex-1">
                                    <button 
                                        className="w-full py-2 border border-slate-200 text-slate-600 font-medium text-xs rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2"
                                        onClick={() => window.location.href = `#/dashboard/drivers/new?id=${driver.id}` /* Hacky handling, ideally use Route params */ }
                                    >
                                        <Edit size={14}/> Edit
                                    </button>
                                </Link>
                                <button 
                                    onClick={() => handleDelete(driver.id, driver.full_name)}
                                    className="flex-1 py-2 border border-red-100 text-red-600 font-medium text-xs rounded-lg hover:bg-red-50 flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={14}/> Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
