
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { carService } from '../../service/carService';
import { Car, CarStatus, Transmission, CarOwnerType } from '../../types';
import { exportToCSV, processCSVImport, downloadCSVTemplate } from '../../service/dataService';
import { Button } from '../../components/ui/Button';
import { Wrench, Gauge, Fuel, Zap, MapPin, Edit2, Download, Import, FileText } from 'lucide-react';

const MAINTENANCE_LABELS: Record<string, string> = {
    'service': 'Servis',
    'oil': 'Oli',
    'oil_filter': 'F. Oli',
    'fuel_filter': 'F. BBM',
    'tires': 'Ban'
};

export const CarListPage: React.FC = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await carService.getCars();
      setCars(data);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('permission denied') || err.code === '42501') {
        setError("Akses ditolak. Hubungi administrator sistem.");
      } else {
        setError(err.message || "Gagal memuat data mobil.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
      exportToCSV(cars, 'Data_Mobil_ASPERDA');
  };

  const handleDownloadTemplate = () => {
      const headers = ['Brand', 'Model', 'License_Plate', 'Year', 'Transmission', 'Price_Per_Day', 'Fuel_Type', 'Category'];
      const example = ['Toyota', 'Avanza G', 'N 1234 AB', '2023', 'Automatic', '350000', 'Pertalite', 'MPV'];
      downloadCSVTemplate(headers, 'Template_Import_Mobil', example);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setImporting(true);
          const file = e.target.files[0];
          
          processCSVImport(file, async (data) => {
              try {
                  let successCount = 0;
                  for (const row of data) {
                      if (row.Brand && row.License_Plate) {
                          await carService.createCar({
                              brand: row.Brand,
                              model: row.Model || '-',
                              license_plate: row.License_Plate,
                              year: Number(row.Year) || new Date().getFullYear(),
                              transmission: row.Transmission?.toLowerCase() === 'manual' ? Transmission.MANUAL : Transmission.AUTOMATIC,
                              price_per_day: Number(row.Price_Per_Day) || 0,
                              status: CarStatus.AVAILABLE,
                              owner_type: CarOwnerType.OWN, // Default to OWN
                              category: row.Category || 'MPV',
                              fuel_type: row.Fuel_Type || 'Gasoline',
                              current_odometer: 0,
                              maintenance: []
                          });
                          successCount++;
                      }
                  }
                  alert(`Berhasil import ${successCount} data mobil.`);
                  fetchCars();
              } catch (err: any) {
                  alert("Import Gagal: " + err.message);
              } finally {
                  setImporting(false);
                  e.target.value = ''; // Reset input
              }
          });
      }
  };

  const getStatusBadge = (status: CarStatus) => {
    switch (status) {
      case CarStatus.AVAILABLE:
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Tersedia</span>;
      case CarStatus.RENTED:
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Disewa</span>;
      case CarStatus.BOOKED:
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Booked</span>;
      case CarStatus.MAINTENANCE:
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Servis</span>;
      default:
        return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">{status}</span>;
    }
  };

  const getMaintenanceStatus = (car: Car) => {
      if (!car.maintenance || car.maintenance.length === 0) return null;
      const current = car.current_odometer || 0;
      
      let status: 'ok' | 'warning' | 'danger' = 'ok';
      let msg = '';

      for (const rec of car.maintenance) {
          const nextDue = rec.last_odometer + rec.interval;
          const remaining = nextDue - current;
          
          if (remaining <= 0) {
              return { status: 'danger', msg: `${MAINTENANCE_LABELS[rec.type]} Lewat` };
          }
          if (remaining <= 1000) {
              status = 'warning';
              msg = `${MAINTENANCE_LABELS[rec.type]} < ${remaining}km`;
          }
      }
      return status === 'ok' ? null : { status, msg };
  };

  return (
    <div className="pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Armada Mobil</h1>
          <p className="text-slate-500 text-sm">Kelola daftar kendaraan rental Anda.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
            <button onClick={handleDownloadTemplate} className="px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-2">
                <FileText size={14}/> Template CSV
            </button>
            <label className="cursor-pointer px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-2">
                {importing ? <i className="fas fa-spinner fa-spin"></i> : <Import size={14}/>}
                <span>Import CSV</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
            <button onClick={handleExport} className="px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-2">
                <Download size={14}/> Export
            </button>
            <Link to="/dashboard/cars/new" className="w-full sm:w-auto">
              <Button className="!w-full sm:!w-auto text-sm">
                <i className="fas fa-plus mr-2"></i> Tambah Unit
              </Button>
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
                onClick={fetchCars}
                className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-xl shadow-sm border border-slate-100 h-64 animate-pulse">
              <div className="h-40 bg-slate-200 rounded-t-xl"></div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-200 w-3/4 rounded"></div>
                <div className="h-4 bg-slate-200 w-1/2 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : cars.length === 0 && !error ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 text-2xl">
             <i className="fas fa-car"></i>
           </div>
           <h3 className="text-lg font-medium text-slate-900">Belum ada armada</h3>
           <p className="text-slate-500 mb-6">Mulai dengan menambahkan mobil pertama Anda.</p>
           <Link to="/dashboard/cars/new">
             <Button variant="outline" className="!w-auto mx-auto">Tambah Mobil</Button>
           </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cars.map((car) => {
            const maintStatus = getMaintenanceStatus(car);
            return (
            <div key={car.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group relative flex flex-col">
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                {car.image_url ? (
                  <img src={car.image_url} alt={car.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-300">
                    <i className="fas fa-image text-4xl"></i>
                  </div>
                )}
                <div className="absolute top-3 right-3 z-10">
                  {getStatusBadge(car.status)}
                </div>
                {/* Maintenance Alert */}
                {maintStatus && (
                    <div className={`absolute top-3 left-3 px-2 py-1 rounded-full flex items-center gap-1 shadow-sm z-10 text-[10px] font-bold uppercase ${maintStatus.status === 'danger' ? 'bg-red-600 text-white animate-pulse' : 'bg-yellow-400 text-yellow-900'}`}>
                        <Wrench size={10} /> {maintStatus.msg}
                    </div>
                )}
                {/* GPS Badge */}
                {car.gps_device_id && (
                    <div className="absolute bottom-2 left-2 bg-slate-900/80 text-green-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm z-10">
                        <MapPin size={10} /> GPS
                    </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{car.brand} {car.model}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{car.year} • {car.transmission === 'automatic' ? 'Matic' : 'Manual'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                      {car.category && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase border border-slate-200">{car.category}</span>}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono font-bold border border-slate-200">
                    {car.license_plate}
                  </span>
                  {/* Fuel Info */}
                  {car.fuel_type && (
                     <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${car.fuel_type === 'Electric' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                        {car.fuel_type === 'Electric' ? <Zap size={8}/> : <Fuel size={8}/>} {car.fuel_type}
                     </span>
                  )}
                </div>
                
                {/* Odometer */}
                <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
                   <Gauge size={12} className="text-indigo-500" />
                   <span>KM: {(car.current_odometer || 0).toLocaleString('id-ID')}</span>
                </div>

                <div className="mt-auto flex justify-between items-center pt-3 border-t border-slate-100">
                   <p className="text-primary font-bold">
                     Rp {car.price_per_day.toLocaleString('id-ID')} <span className="text-xs text-slate-400 font-normal">/hari</span>
                   </p>
                   
                   <div className="flex items-center gap-2">
                        <Link 
                            to={`/dashboard/cars/edit/${car.id}`} 
                            className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded hover:bg-indigo-50"
                            title="Edit Data"
                        >
                            <Edit2 size={18} />
                        </Link>
                       <button className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded hover:bg-red-50" 
                        title="Hapus Mobil"
                        onClick={() => {
                         if(window.confirm('Hapus mobil ini?')) {
                           carService.deleteCar(car.id).then(fetchCars);
                         }
                       }}>
                         <i className="fas fa-trash-alt text-lg"></i>
                       </button>
                   </div>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}
    </div>
  );
};
