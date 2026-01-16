
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { carService } from '../../service/carService';
import { partnerService } from '../../service/partnerService';
import { getStoredData, DEFAULT_SETTINGS } from '../../service/dataService';
import { CarStatus, Transmission, CarOwnerType, Partner, MaintenanceRecord, MaintenanceType, AppSettings } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Wrench, Zap, Fuel, Gauge, MapPin, DollarSign, Info, Package, User } from 'lucide-react';

const MAINTENANCE_LABELS: Record<MaintenanceType, string> = {
    'service': 'Servis Rutin',
    'oil': 'Ganti Oli',
    'oil_filter': 'Ganti Filter Oli',
    'fuel_filter': 'Ganti Filter BBM',
    'tires': 'Ganti Ban'
};

export const CarFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get ID for edit mode
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [partners, setPartners] = useState<Partner[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'info' | 'pricing' | 'maintenance'>('info');

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    license_plate: '',
    year: new Date().getFullYear(),
    transmission: Transmission.MANUAL,
    status: CarStatus.AVAILABLE,
    price_per_day: 0,
    owner_type: CarOwnerType.OWN,
    partner_id: '',
    
    // New Fields
    category: '',
    gps_device_id: '',
    current_odometer: 0,
    driver_daily_salary: 0, // NEW FIELD
  });

  // Dynamic Pricing State
  const [pricing, setPricing] = useState<{[key: string]: number}>({});

  // Fuel State
  const [fuelCategory, setFuelCategory] = useState<'Gasoline' | 'Gasoil' | 'Electric'>('Gasoline');
  const [fuelType, setFuelType] = useState('');
  const [fuelRatio, setFuelRatio] = useState(10);

  // Maintenance State
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);

  // Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
        try {
            // Load Settings (Sync)
            const loadedSettings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
            setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings });

            // Initialize defaults from settings
            if (loadedSettings.carCategories?.length > 0) {
                setFormData(prev => ({ ...prev, category: loadedSettings.carCategories[0] }));
            }
            if (loadedSettings.fuelTypes?.length > 0) {
                const firstFuel = loadedSettings.fuelTypes[0];
                setFuelType(firstFuel.name);
                setFuelCategory(firstFuel.category || 'Gasoline');
            }

            // Load Partners
            const pData = await partnerService.getPartners();
            setPartners(pData);

            // Load Car if Edit Mode
            if(isEditMode && id) {
                setInitialLoading(true);
                const car = await carService.getCarById(id);
                
                // Populate Form
                setFormData({
                    brand: car.brand,
                    model: car.model,
                    license_plate: car.license_plate,
                    year: car.year,
                    transmission: car.transmission,
                    status: car.status,
                    price_per_day: car.price_per_day,
                    owner_type: car.owner_type,
                    partner_id: car.partner_id || '',
                    category: car.category || (loadedSettings.carCategories[0] || 'MPV'),
                    gps_device_id: car.gps_device_id || '',
                    current_odometer: car.current_odometer || 0,
                    driver_daily_salary: car.driver_daily_salary || 0,
                });

                if(car.image_url) setPreviewUrl(car.image_url);
                if(car.maintenance) setMaintenanceRecords(car.maintenance);
                if(car.pricing) setPricing(car.pricing);
                
                // Populate Fuel
                if(car.fuel_type === 'Electric') {
                    setFuelCategory('Electric');
                    setFuelType('Electric');
                } else {
                    // Try to match with Settings
                    const foundInSettings = loadedSettings.fuelTypes.find(f => f.name === car.fuel_type);
                    if (foundInSettings) {
                        setFuelCategory(foundInSettings.category || 'Gasoline');
                        setFuelType(foundInSettings.name);
                    } else {
                        // Fallback if not in settings anymore
                        setFuelType(car.fuel_type || '');
                        // Guess category
                        if (car.fuel_type?.toLowerCase().includes('solar') || car.fuel_type?.toLowerCase().includes('dex')) {
                             setFuelCategory('Gasoil');
                        } else {
                             setFuelCategory('Gasoline');
                        }
                    }
                }
                if(car.fuel_ratio) setFuelRatio(car.fuel_ratio);
            }
        } catch (err) {
            console.error(err);
            setError("Gagal memuat data. Silakan coba lagi.");
        } finally {
            setInitialLoading(false);
        }
    };
    initData();
  }, [id, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' || name === 'price_per_day' || name === 'current_odometer' || name === 'driver_daily_salary' ? Number(value) : value
    }));
  };

  const handlePricingChange = (pkg: string, val: string) => {
      setPricing(prev => ({
          ...prev,
          [pkg]: Number(val)
      }));
  };

  const handleFuelTypeChange = (name: string) => {
      setFuelType(name);
      const found = settings.fuelTypes.find(f => f.name === name);
      if (found) {
          setFuelCategory(found.category || 'Gasoline');
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Maintenance Logic
  const handleMaintenanceChange = (type: MaintenanceType, field: 'last_odometer' | 'interval', value: number) => {
      setMaintenanceRecords(prev => {
          const existingIndex = prev.findIndex(r => r.type === type);
          if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = { ...updated[existingIndex], [field]: value };
              return updated;
          } else {
              // Create new if not exists
              const newRecord: MaintenanceRecord = { 
                  type, 
                  last_odometer: field === 'last_odometer' ? value : 0, 
                  interval: field === 'interval' ? value : 5000 
              };
              return [...prev, newRecord];
          }
      });
  };

  const getMaintenanceValue = (type: MaintenanceType, field: 'last_odometer' | 'interval') => {
      const rec = maintenanceRecords.find(r => r.type === type);
      return rec ? rec[field] : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (formData.owner_type === CarOwnerType.PARTNER && !formData.partner_id) {
      setError("Silakan pilih Mitra pemilik mobil.");
      setLoading(false);
      return;
    }

    const finalFuelType = fuelCategory === 'Electric' ? 'Electric' : fuelType;
    const finalFuelRatio = fuelCategory === 'Electric' ? undefined : fuelRatio;

    const submissionData: any = { 
        ...formData,
        partner_id: formData.owner_type === CarOwnerType.OWN ? null : formData.partner_id,
        fuel_type: finalFuelType,
        fuel_ratio: finalFuelRatio,
        maintenance: maintenanceRecords,
        pricing: pricing
    };

    try {
      if (isEditMode && id) {
          await carService.updateCar(id, submissionData, imageFile);
      } else {
          await carService.createCar(submissionData, imageFile || undefined);
      }
      navigate('/dashboard/cars');
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Gagal menyimpan data mobil.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
      return <div className="p-12 text-center text-slate-500"><i className="fas fa-spinner fa-spin mr-2"></i> Memuat data mobil...</div>;
  }
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-2">
        <Link to="/dashboard/cars" className="text-slate-500 hover:text-slate-800 transition-colors">
          <i className="fas fa-arrow-left"></i>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Data Mobil' : 'Tambah Mobil Baru'}</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Tab Header */}
        <div className="flex border-b border-slate-200">
           <button 
             type="button"
             onClick={() => setActiveTab('info')}
             className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'info' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
           >
             <Info size={16}/> Informasi Umum
           </button>
           <button 
             type="button"
             onClick={() => setActiveTab('pricing')}
             className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'pricing' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
           >
             <DollarSign size={16}/> Harga & Driver
           </button>
           <button 
             type="button"
             onClick={() => setActiveTab('maintenance')}
             className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'maintenance' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
           >
             <Wrench size={16} /> Maintenance
           </button>
        </div>

        <div className="p-6 sm:p-8">
            {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-sm text-red-700 font-bold mb-1">Terjadi Kesalahan</p>
                <p className="text-sm text-red-600">{error}</p>
            </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
            
            {activeTab === 'info' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Image Upload */}
                    <div className="flex justify-center mb-6">
                        <div className="w-full">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Foto Mobil</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors relative">
                            {previewUrl ? (
                            <div className="relative h-48 w-full">
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                                <button 
                                type="button"
                                onClick={() => { setImageFile(null); setPreviewUrl(null); }}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                                >
                                <i className="fas fa-times"></i>
                                </button>
                            </div>
                            ) : (
                            <div className="py-8">
                                <i className="fas fa-cloud-upload-alt text-4xl text-slate-300 mb-2"></i>
                                <p className="text-slate-500 text-sm">Klik untuk upload foto</p>
                                <p className="text-xs text-slate-400 mt-1">PNG, JPG (Max 2MB)</p>
                            </div>
                            )}
                            <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={!!previewUrl}
                            />
                        </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Merek (Brand)"
                            name="brand"
                            placeholder="Toyota"
                            value={formData.brand}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            label="Model / Tipe"
                            name="model"
                            placeholder="Avanza G"
                            value={formData.model}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Plat Nomor"
                            name="license_plate"
                            placeholder="N 1234 ABC"
                            value={formData.license_plate}
                            onChange={handleChange}
                            required
                            className="uppercase"
                        />
                         <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kategori</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                            >
                                {settings.carCategories?.map(c => <option key={c} value={c}>{c}</option>)}
                                {(!settings.carCategories || settings.carCategories.length === 0) && <option value="MPV">MPV</option>}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tahun</label>
                            <input
                                name="year"
                                type="number"
                                placeholder="2023"
                                value={formData.year}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                            />
                         </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Transmisi</label>
                            <select
                                name="transmission"
                                value={formData.transmission}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                            >
                                <option value={Transmission.MANUAL}>Manual</option>
                                <option value={Transmission.AUTOMATIC}>Automatic</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Mobil</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                            >
                                <option value={CarStatus.AVAILABLE}>Aktif (Available)</option>
                                <option value={CarStatus.MAINTENANCE}>Maintenance (Servis)</option>
                                <option value={CarStatus.INACTIVE}>Non-Aktif</option>
                            </select>
                        </div>
                    </div>

                    {/* Fuel Config */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <label className="block text-sm font-semibold text-slate-700">Jenis Bahan Bakar</label>
                         
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Pilih BBM</label>
                                <select 
                                    className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-sm" 
                                    value={fuelType} 
                                    onChange={e => handleFuelTypeChange(e.target.value)}
                                >
                                    {settings.fuelTypes?.map(f => (
                                        <option key={f.name} value={f.name}>{f.name} ({f.category})</option>
                                    ))}
                                </select>
                            </div>
                            
                            {fuelCategory !== 'Electric' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Ratio Konsumsi (1:X)</label>
                                    <select className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-sm" value={fuelRatio} onChange={e => setFuelRatio(Number(e.target.value))}>
                                        {Array.from({length: 16}, (_, i) => i + 5).map(num => (
                                            <option key={num} value={num}>{num} KM / Liter</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        
                        {fuelCategory === 'Electric' && (
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3">
                                <Zap className="text-blue-600" size={20}/>
                                <div className="text-xs text-blue-800">
                                    <strong>Mobil Listrik (EV)</strong><br/>
                                    BBM & Ratio tidak diperlukan untuk kategori ini.
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* GPS */}
                    <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                             <MapPin size={16} /> ID Perangkat GPS (IMEI)
                         </label>
                         <input
                            name="gps_device_id"
                            type="text"
                            placeholder="Contoh: 8645..."
                            value={formData.gps_device_id}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-mono text-sm bg-slate-50"
                        />
                         <p className="text-xs text-slate-500 mt-1">Kosongkan jika tidak terpasang GPS tracker.</p>
                    </div>

                    {/* Owner Type Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Status Kepemilikan</label>
                        <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                            type="radio" 
                            name="owner_type" 
                            value={CarOwnerType.OWN} 
                            checked={formData.owner_type === CarOwnerType.OWN}
                            onChange={handleChange}
                            className="text-primary"
                            />
                            <span className="text-sm">Milik Sendiri (Asset)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                            type="radio" 
                            name="owner_type" 
                            value={CarOwnerType.PARTNER} 
                            checked={formData.owner_type === CarOwnerType.PARTNER}
                            onChange={handleChange}
                            className="text-primary"
                            />
                            <span className="text-sm">Titipan Mitra (Investor)</span>
                        </label>
                        </div>

                        {formData.owner_type === CarOwnerType.PARTNER && (
                        <div className="mt-3 animate-fade-in">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Mitra Pemilik</label>
                            <select
                            name="partner_id"
                            value={formData.partner_id}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                            required
                            >
                            <option value="">-- Pilih Nama Mitra --</option>
                            {partners.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (Bagi Hasil: {p.profit_sharing_percentage}%)</option>
                            ))}
                            </select>
                            <div className="mt-1 text-right">
                            <Link to="/dashboard/partners/new" className="text-xs text-primary hover:underline">+ Tambah Mitra Baru</Link>
                            </div>
                        </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'pricing' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                            <label className="block text-sm font-bold text-blue-900 mb-1.5">Harga Sewa Dasar (Lepas Kunci)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-blue-500 font-bold">Rp</span>
                                <input
                                    name="price_per_day"
                                    type="number"
                                    placeholder="350000"
                                    value={formData.price_per_day}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 px-4 py-2.5 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-bold text-lg"
                                />
                            </div>
                            <p className="text-xs text-blue-600 mt-2">Harga default per hari untuk unit ini.</p>
                        </div>

                        {/* NEW: Driver Salary for this Car */}
                        <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                            <label className="block text-sm font-bold text-green-900 mb-1.5 flex items-center gap-2">
                                <User size={16}/> Standar Gaji Driver (Per Hari)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-green-600 font-bold">Rp</span>
                                <input
                                    name="driver_daily_salary"
                                    type="number"
                                    placeholder="150000"
                                    value={formData.driver_daily_salary}
                                    onChange={handleChange}
                                    className="w-full pl-10 px-4 py-2.5 border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 bg-white font-bold text-lg"
                                />
                            </div>
                            <p className="text-xs text-green-700 mt-2">
                                Jika diisi &gt; 0, harga ini akan menimpa tarif dasar driver saat unit ini dipilih.
                            </p>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
                            <Package size={18}/> Harga Paket Sewa
                        </h4>
                        
                        {settings.rentalPackages?.length === 0 ? (
                            <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                                Belum ada paket sewa yang diatur. <br/>
                                <Link to="/dashboard/settings" className="text-primary hover:underline">Atur di Menu Pengaturan</Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {settings.rentalPackages.map((pkg) => (
                                    <div key={pkg} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{pkg}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">Rp</span>
                                            <input 
                                                type="number"
                                                className="w-full pl-8 border border-slate-300 rounded-md p-2 text-sm font-medium focus:ring-1 focus:ring-primary"
                                                placeholder="0"
                                                value={pricing[pkg] || ''}
                                                onChange={(e) => handlePricingChange(pkg, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'maintenance' && (
                 <div className="space-y-6 animate-fade-in">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <Gauge size={18} /> Odometer Saat Ini (KM)
                        </label>
                        <input 
                            type="number" 
                            className="w-full border border-slate-300 rounded-lg p-4 text-2xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            placeholder="0"
                            name="current_odometer"
                            value={formData.current_odometer}
                            onChange={handleChange}
                        />
                        <p className="text-xs text-slate-500 mt-2">Update angka ini secara berkala agar notifikasi servis akurat.</p>
                    </div>

                    <div>
                         <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide border-b pb-2">
                            Konfigurasi Jadwal Servis
                         </h4>
                         <div className="space-y-4">
                            {(['service', 'oil', 'oil_filter', 'fuel_filter', 'tires'] as MaintenanceType[]).map((type) => {
                                const interval = getMaintenanceValue(type, 'interval') || 
                                    (type === 'oil' ? 5000 : type === 'service' ? 10000 : type === 'oil_filter' ? 10000 : type === 'fuel_filter' ? 20000 : 40000);
                                
                                const lastService = getMaintenanceValue(type, 'last_odometer');
                                const remaining = (lastService + interval) - formData.current_odometer;
                                const isOverdue = remaining < 0;
                                const isNear = remaining < 1000 && !isOverdue;

                                return (
                                    <div key={type} className={`p-4 rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50' : isNear ? 'border-yellow-200 bg-yellow-50' : 'border-slate-200 bg-white'}`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <h5 className="font-bold text-sm text-slate-800">{MAINTENANCE_LABELS[type]}</h5>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${isOverdue ? 'bg-red-200 text-red-800' : isNear ? 'bg-yellow-200 text-yellow-800' : 'bg-green-100 text-green-700'}`}>
                                                {isOverdue ? `Lewat ${Math.abs(remaining)} KM` : `Sisa ${remaining} KM`}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Interval (KM)</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
                                                    value={interval}
                                                    onChange={e => handleMaintenanceChange(type, 'interval', Number(e.target.value))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">KM Terakhir Ganti</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full border border-slate-300 rounded p-2 text-sm bg-white"
                                                    value={lastService || ''}
                                                    placeholder="0"
                                                    onChange={e => handleMaintenanceChange(type, 'last_odometer', Number(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                         </div>
                    </div>
                 </div>
            )}

            <div className="pt-4 flex gap-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => navigate('/dashboard/cars')}>
                Batal
                </Button>
                <Button type="submit" isLoading={loading}>
                {isEditMode ? 'Simpan Perubahan' : 'Simpan Mobil'}
                </Button>
            </div>
            </form>
        </div>
      </div>
    </div>
  );
};
