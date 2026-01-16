
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../service/authService';
import { getStoredData, DEFAULT_SETTINGS } from '../../service/dataService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AppSettings } from '../../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
      // Load Global Settings for Logo & Background
      const loaded = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
      setSettings({ ...DEFAULT_SETTINGS, ...loaded });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authService.login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.message && err.message.includes("Invalid login credentials")) {
        setError("Email atau password yang Anda masukkan salah.");
      } else {
        setError(err.message || "Gagal masuk ke aplikasi. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left Side - Branding & Visual (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img 
            src={settings.globalBackgroundUrl || "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1470&auto=format&fit=crop"} 
            alt="Background" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
        </div>

        {/* Branding Content */}
        <div className="relative z-10 w-full flex flex-col justify-between p-16 text-white">
          <div>
             {settings.globalLogoUrl ? (
                 <img src={settings.globalLogoUrl} alt="Logo" className="h-16 w-auto mb-6 object-contain" />
             ) : (
                 <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/50">
                    <span className="text-2xl font-bold">A</span>
                 </div>
             )}
             <h1 className="text-4xl font-bold tracking-tight mb-2">ASPERDA INDONESIA</h1>
             <p className="text-slate-300 text-lg tracking-wide">Sistem Manajemen Asosiasi Rental Daerah</p>
          </div>

          <div className="space-y-6">
             <blockquote className="text-xl font-light italic text-slate-200 leading-relaxed">
               "Platform digital terintegrasi untuk menghubungkan dan memberdayakan pengusaha rental mobil profesional di seluruh Indonesia."
             </blockquote>
             <div className="flex items-center gap-4 pt-4 border-t border-slate-700">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Secure Enterprise SaaS</p>
                <div className="h-1 w-1 bg-slate-500 rounded-full"></div>
                <p className="text-xs text-slate-400">v2.0.1 (Stable)</p>
             </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
             {settings.globalLogoUrl ? (
                 <img src={settings.globalLogoUrl} alt="Logo" className="h-16 w-auto mx-auto mb-4 object-contain" />
             ) : (
                 <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl font-bold">A</span>
                 </div>
             )}
             <h2 className="text-2xl font-bold text-slate-900">ASPERDA</h2>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Selamat Datang</h2>
            <p className="mt-2 text-sm text-slate-600">
              Silakan masuk untuk mengakses dashboard member.
            </p>
          </div>

          <div className="mt-8">
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <i className="fas fa-exclamation-circle text-red-500"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <Input
                label="Email Perusahaan"
                type="email"
                placeholder="user@asperda.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                icon="far fa-envelope"
                autoComplete="email"
                className="bg-slate-50"
              />

              <div>
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  icon="fas fa-lock"
                  autoComplete="current-password"
                  className="bg-slate-50"
                />
                <div className="flex justify-end mt-1">
                  <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500">
                    Lupa password?
                  </a>
                </div>
              </div>

              <Button type="submit" isLoading={loading} className="w-full py-3 shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20">
                Masuk Dashboard
              </Button>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-500">
                    Belum terdaftar sebagai member?
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/register"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                >
                  <i className="fas fa-user-plus text-slate-400"></i>
                  Daftar Member Baru (Owner)
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
