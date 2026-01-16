
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../service/authService';
import { getStoredData, DEFAULT_SETTINGS } from '../../service/dataService';
import { DpcRegion, RegistrationFormData, AppSettings } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const RegisterPage: React.FC = () => {
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
      await authService.registerOwner(formData);
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
            Akun Anda dan Profil Rental telah berhasil dibuat. Silakan login untuk melanjutkan.
          </p>
          <Link to="/login" className="text-primary hover:underline font-medium">Ke Halaman Login &rarr;</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative">
      {/* Background Layer: Blue is provided by bg-slate-900 on parent */}
      
      {/* Background Image Layer */}
      {settings.globalBackgroundUrl ? (
          <div className="absolute inset-0 z-0">
             {/* Image on top of blue background */}
             <img src={settings.globalBackgroundUrl} className="w-full h-full object-cover opacity-40" alt="Background" />
             {/* Optional: Subtle gradient to ensure text/card pop if needed, though card is white */}
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
            Bergabung dengan jaringan rental mobil terbesar di Indonesia.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <i className="fas fa-exclamation-circle text-red-500"></i>
              </div>
              <div className="ml-3 w-full">
                <p className="text-sm text-red-700 font-medium">{error}</p>
                <p className="text-xs text-red-600 mt-1">
                  Jika masalah berlanjut, hubungi administrator sistem.
                </p>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-medium text-slate-900 border-b pb-2 mb-4">Data Akun</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="nama@email.com"
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
              <h3 className="text-lg font-medium text-slate-900 border-b pb-2 mb-4">Data Pemilik</h3>
              <Input
                label="Nama Lengkap Pemilik"
                name="fullName"
                type="text"
                placeholder="Sesuai KTP"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-medium text-slate-900 border-b pb-2 mb-4">Data Perusahaan Rental</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nama Rental"
                  name="companyName"
                  type="text"
                  placeholder="CV. Maju Jaya Trans"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Nomor Telepon / WA"
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
                  Wilayah DPC
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
                  label="Alamat Lengkap Garasi/Kantor"
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
            <Button type="submit" isLoading={loading}>
              Daftar Sekarang
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
