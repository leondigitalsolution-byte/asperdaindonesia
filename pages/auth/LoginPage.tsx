
import React, { useState, useEffect } from 'react';
// @ts-ignore
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
      // Load Global Settings for Logo
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
    <div className="min-h-screen flex font-sans">
      
      {/* LEFT SIDE - BRANDING PANEL */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#0B1120] relative flex-col justify-between p-16 text-white overflow-hidden">
        
        {/* Background Image Layer (If configured) */}
        {settings.globalBackgroundUrl && (
            <div className="absolute inset-0 z-0">
               <img src={settings.globalBackgroundUrl} className="w-full h-full object-cover opacity-20" alt="Login Background" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-[#0B1120] opacity-80"></div>
            </div>
        )}

        {/* Ambient Background Effects (Fallback if no image or blended) */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none z-0"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-900/20 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none z-0"></div>

        {/* Top Header */}
        <div className="relative z-10">
           <h1 className="text-3xl font-bold tracking-tight mb-2 text-white uppercase">{settings.authTitle || 'ASPERDA | SURABAYA'}</h1>
           <p className="text-slate-400 text-sm tracking-wide">{settings.authSubtitle || 'Sistem Manajemen Asosiasi Rental Daerah'}</p>
        </div>

        {/* Center Emblem/Logo */}
        <div className="relative z-10 flex justify-center items-center flex-1 py-10">
           {settings.globalLogoUrl ? (
               <img 
                 src={settings.globalLogoUrl} 
                 alt="Logo" 
                 className="w-64 h-64 object-contain drop-shadow-2xl" 
               />
           ) : (
               // Fallback Emblem visual if no logo set
               <div className="w-64 h-64 rounded-full border-4 border-slate-700/50 flex items-center justify-center bg-[#0f172a] shadow-2xl relative">
                  <div className="absolute inset-2 border border-slate-600 rounded-full opacity-50"></div>
                  <div className="text-center">
                      <div className="text-6xl font-bold text-slate-600 mb-2">A</div>
                      <div className="text-xs tracking-[0.3em] text-slate-500 uppercase">Member</div>
                  </div>
               </div>
           )}
        </div>

        {/* Bottom Content */}
        <div className="relative z-10 space-y-8">
           <blockquote className="text-lg font-light italic text-slate-300 leading-relaxed border-l-4 border-blue-600 pl-6">
             {settings.authQuote || '"Platform digital terintegrasi untuk menghubungkan dan memberdayakan pengusaha rental mobil profesional di seluruh Indonesia."'}
           </blockquote>
           
           <div className="pt-6 border-t border-slate-800 flex items-center gap-4">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">SECURE ENTERPRISE SAAS</p>
              <div className="h-1 w-1 bg-slate-600 rounded-full"></div>
              <p className="text-[10px] text-slate-500">v2.0.1 (Stable)</p>
           </div>
        </div>
      </div>

      {/* RIGHT SIDE - LOGIN FORM */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white p-6 lg:p-12 relative">
        <div className="w-full max-w-md space-y-8">
          
          {/* Mobile Header (Only visible on small screens) */}
          <div className="lg:hidden text-center mb-8">
             <h2 className="text-2xl font-bold text-slate-900">ASPERDA</h2>
             <p className="text-slate-500 text-sm">Sistem Manajemen Rental</p>
          </div>

          <div className="text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Selamat Datang</h2>
            <p className="mt-2 text-sm text-slate-500">
              Silakan masuk untuk mengakses dashboard member.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
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

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-5">
                <Input
                  label="Email Perusahaan"
                  type="email"
                  placeholder="user@asperda.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  icon="far fa-envelope"
                  className="bg-white"
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
                    className="bg-white"
                  />
                  <div className="flex justify-end mt-2">
                    <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-500">
                      Lupa password?
                    </a>
                  </div>
                </div>
            </div>

            <Button 
              type="submit" 
              isLoading={loading} 
              className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-900/20 rounded-lg font-bold text-sm"
            >
              Masuk Dashboard
            </Button>
          </form>

          <div className="mt-10">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-4 bg-white text-slate-400 font-medium tracking-wide">
                  Belum terdaftar sebagai member?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link to="/register">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 shadow-sm text-sm font-bold rounded-lg text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 transition-all"
                >
                  <i className="fas fa-user-plus text-slate-400"></i>
                  Daftar Member Baru (Owner)
                </button>
              </Link>
            </div>
          </div>

        </div>
        
        {/* Footer Credit (Right Side) */}
        <div className="absolute bottom-6 text-center w-full text-[10px] text-slate-400 lg:hidden">
           &copy; 2024 ASPERDA Indonesia.
        </div>
      </div>
    </div>
  );
};
