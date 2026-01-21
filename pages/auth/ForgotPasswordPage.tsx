
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { authService } from '../../service/authService';
import { getStoredData, DEFAULT_SETTINGS } from '../../service/dataService';
import { AppSettings } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Mail } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const loaded = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    setSettings({ ...DEFAULT_SETTINGS, ...loaded });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authService.resetPasswordForEmail(email);
      setSuccess(true);
    } catch (err: any) {
      console.error("Reset Error:", err);
      // Supabase often returns 200 OK even if email doesn't exist for security privacy,
      // but if there's a config error it might throw.
      setError(err.message || "Gagal mengirim permintaan reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative">
        {settings.globalBackgroundUrl && (
            <div className="absolute inset-0 z-0">
                <img src={settings.globalBackgroundUrl} className="w-full h-full object-cover opacity-20" alt="Background" />
            </div>
        )}
        
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-slate-100 relative z-10">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="text-2xl text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Cek Email Anda</h2>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">
            Kami telah mengirimkan tautan reset password ke <strong>{email}</strong>. 
            Silakan periksa folder Inbox atau Spam Anda.
          </p>
          <Link to="/login" className="text-primary hover:underline font-medium flex items-center justify-center gap-2">
             <ArrowLeft size={16}/> Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative">
      {settings.globalBackgroundUrl ? (
          <div className="absolute inset-0 z-0">
             <img src={settings.globalBackgroundUrl} className="w-full h-full object-cover opacity-40" alt="Background" />
          </div>
      ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 to-blue-900"></div>
      )}

      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl border border-slate-100 relative z-10">
        <div className="text-center">
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
            Lupa Password?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Masukkan email terdaftar Anda untuk mendapatkan instruksi reset password.
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
              </div>
            </div>
          </div>
        )}

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <Input
            label="Email Perusahaan"
            name="email"
            type="email"
            placeholder="user@asperda.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon="far fa-envelope"
          />

          <div>
            <Button type="submit" isLoading={loading} className="w-full">
              Kirim Instruksi Reset
            </Button>
          </div>
          
          <div className="text-center">
             <Link to="/login" className="text-sm text-slate-500 hover:text-slate-800 font-medium">
                Batal, kembali ke Login
             </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
