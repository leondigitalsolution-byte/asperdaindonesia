
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { authService } from '../../service/authService';
import { getStoredData, DEFAULT_SETTINGS } from '../../service/dataService';
import { DpcRegion, RegistrationFormData, AppSettings } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Car, Plane, Hotel, Briefcase } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'RENTAL' | 'TOURISM'>('RENTAL');
  const [dpcList, setDpcList] = useState<DpcRegion[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [formData, setFormData] = useState<RegistrationFormData>({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
    phone: '',
    address: '',
    dpcId: '',
  });

  useEffect(() => {
    // Load settings
    const loaded = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    setSettings({ ...DEFAULT_SETTINGS, ...loaded });

    const fetchDpc = async () => {
      try {
        const data = await authService.getDpcRegions();
        setDpcList(data || []);
      } catch (err) {
        console.error("Failed to load DPC Regions", err);
      }
    };
    fetchDpc();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.dpcId) {
      setError("Mohon pilih wilayah DPC.");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password minimal 6 karakter.");
      setLoading(false);
      return;
    }

    try {
      if (activeTab === 'RENTAL') {
          await authService.registerOwner(formData);
      } else {
          await authService.registerTourismPartner(formData);
      }
      setSuccess(true);
    } catch (err: any) {
      console.error("Registration Error:", err);
      const msg = err.message || "Terjadi kesalahan saat registrasi.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative">
        {/* Success Background */}
        {settings.globalBackgroundUrl && (
            <div className="absolute inset-0 z-0">
                <img src={settings.globalBackgroundUrl} className="w-full h-full object-cover opacity-20" alt="Background" />
            </div>
        )}
        
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-slate-100 relative z-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-check text-2xl text-green-600"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Registrasi Berhasil!</h2>
          <p className="text-slate-600 mb-6">
            Akun {activeTab === 'RENTAL' ? 'Rental' : 'Mitra Wisata'} Anda telah berhasil dibuat. Silakan login untuk melanjutkan.
          </p>
          <Link to="/login" className="text-primary hover:underline font-medium">Ke Halaman Login &rarr;</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative">
      {/* Background Image Layer */}
      {settings.globalBackgroundUrl ? (
          <div className="absolute inset-0 z-0">
             <img src={settings.globalBackgroundUrl} className="w-full h-full object-cover opacity-40" alt="Background" />
          </div>
      ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 to-blue-900"></div>
      )}

      <div className="max-w-2xl w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl border border-slate-100 relative z-10">
        <div className="text-center">
          {settings.globalLogoUrl ? (
              <img src={settings.globalLogoUrl} alt="Logo" className="h-16 w-auto mx-auto mb-4 object-contain" />
          ) : (
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                 <span className="text-2xl font-bold text-white">A</span>
              </div>
          )}
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
            Daftar Member ASPERDA
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Pilih jenis kemitraan yang sesuai dengan bisnis Anda.
          </p>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button 
                onClick={() => setActiveTab('RENTAL')}
                className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'RENTAL' ? 'bg-white text-blue-700 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Car size={18}/> Pengusaha Rental
            </button>
            <button 
                onClick={() => setActiveTab('TOURISM')}
                className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'TOURISM' ? 'bg-white text-green-700 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Briefcase size={18}/> Mitra Wisata
            </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <i className="fas fa-exclamation-circle text-red-500"></i>
              </div>
              <div className="ml-3 w-full">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          
          <div className={`p-4 rounded-lg text-sm border flex items-start gap-3 ${activeTab === 'RENTAL' ? 'bg-blue-50 text-blue-800 border-blue-100' : 'bg-green-50 text-green-800 border-green-100'}`}>
              <div className="mt-0.5">{activeTab === 'RENTAL' ? <Car size={16}/> : <Plane size={16}/>}</div>
              <p>
                  {activeTab === 'RENTAL' 
                    ? "Daftar sebagai Pemilik Rental Mobil. Anda akan mendapatkan akses penuh untuk manajemen armada, driver, dan menerima order dari marketplace."
                    : "Daftar sebagai Travel Agent, Hotel, atau Perusahaan (Corporate). Anda dapat menyewa unit dari jaringan rental ASPERDA dengan harga khusus (B2B)."
                  }
              </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-medium text-slate-900 border-b pb-2 mb-4">Data Akun</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email Perusahaan"
                  name="email"
                  type="email"
                  placeholder="admin@perusahaan.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-medium text-slate-900 border-b pb-2 mb-4">Data Penanggung Jawab</h3>
              <Input
                label="Nama Lengkap Owner / PIC"
                name="fullName"
                type="text"
                placeholder="Sesuai KTP"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-medium text-slate-900 border-b pb-2 mb-4">Data Perusahaan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={activeTab === 'RENTAL' ? "Nama Rental" : "Nama Biro / Hotel / PT"}
                  name="companyName"
                  type="text"
                  placeholder={activeTab === 'RENTAL' ? "CV. Maju Jaya Trans" : "PT. Wisata Indah"}
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Nomor Telepon / WA Bisnis"
                  name="phone"
                  type="tel"
                  placeholder="08123456789"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Wilayah Operasional (DPC)
                </label>
                <select
                  name="dpcId"
                  value={formData.dpcId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                  required
                >
                  <option value="">-- Pilih Wilayah DPC --</option>
                  {dpcList.map((dpc) => (
                    <option key={dpc.id} value={dpc.id}>
                      {dpc.name} - {dpc.province}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4">
                <Input
                  label={activeTab === 'RENTAL' ? "Alamat Garasi / Kantor" : "Alamat Kantor Pusat"}
                  name="address"
                  type="text"
                  placeholder="Jl. Raya..."
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" isLoading={loading} className={activeTab === 'RENTAL' ? 'bg-primary' : 'bg-green-600 hover:bg-green-700'}>
              {activeTab === 'RENTAL' ? 'Daftar Sebagai Rental' : 'Daftar Sebagai Mitra Wisata'}
            </Button>
            <p className="mt-4 text-center text-sm text-slate-600">
              Sudah punya akun? <Link to="/login" className="font-medium text-primary hover:text-blue-700">Masuk di sini</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
