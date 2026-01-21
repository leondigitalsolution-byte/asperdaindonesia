
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { authService } from '../../service/authService';
import { getStoredData, DEFAULT_SETTINGS } from '../../service/dataService';
import { AppSettings } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Lock } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
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

    if (password.length < 6) {
        setError("Password minimal 6 karakter.");
        setLoading(false);
        return;
    }

    if (password !== confirmPassword) {
        setError("Konfirmasi password tidak cocok.");
        setLoading(false);
        return;
    }

    try {
      await authService.updateUserPassword(password);
      alert("Password berhasil diperbarui! Silakan login kembali.");
      navigate('/login');
    } catch (err: any) {
      console.error("Reset Error:", err);
      setError(err.message || "Gagal memperbarui password. Pastikan link reset masih berlaku.");
    } finally {
      setLoading(false);
    }
  };

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
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-2xl text-blue-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Buat Password Baru
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Silakan masukkan password baru untuk akun Anda.
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
            label="Password Baru"
            type="password"
            placeholder="Minimal 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            icon="fas fa-lock"
          />
          
          <Input
            label="Konfirmasi Password Baru"
            type="password"
            placeholder="Ulangi password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            icon="fas fa-check-double"
          />

          <div>
            <Button type="submit" isLoading={loading} className="w-full">
              Simpan Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
