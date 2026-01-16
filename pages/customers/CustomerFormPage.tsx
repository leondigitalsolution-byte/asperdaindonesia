import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { customerService } from '../../service/customerService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const CustomerFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    nik: '',
    phone: '',
    address: '',
    is_blacklisted: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     setFormData(prev => ({
       ...prev,
       is_blacklisted: e.target.checked
     }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await customerService.createCustomer(formData);
      navigate('/dashboard/customers');
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Gagal menyimpan data pelanggan.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-2">
        <Link to="/dashboard/customers" className="text-slate-500 hover:text-slate-800 transition-colors">
          <i className="fas fa-arrow-left"></i>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Tambah Pelanggan Baru</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sm:p-8">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
               <div className="flex-shrink-0">
                  <i className="fas fa-exclamation-circle text-red-500"></i>
               </div>
               <div className="ml-3 w-full">
                  <h3 className="text-sm font-medium text-red-800">Gagal Menyimpan</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
               </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nama Lengkap (Sesuai KTP)"
            name="full_name"
            placeholder="Contoh: Budi Santoso"
            value={formData.full_name}
            onChange={handleChange}
            required
            icon="fas fa-user"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="NIK (Nomor Induk Kependudukan)"
              name="nik"
              type="text"
              placeholder="16 Digit NIK"
              value={formData.nik}
              onChange={handleChange}
              required
              minLength={16}
              maxLength={16}
              icon="fas fa-id-card"
            />
            <Input
              label="No. Telepon / WhatsApp"
              name="phone"
              type="tel"
              placeholder="08123456789"
              value={formData.phone}
              onChange={handleChange}
              required
              icon="fab fa-whatsapp"
            />
          </div>

          <div className="mb-4">
             <label className="block text-sm font-semibold text-slate-700 mb-1.5">
               Alamat Lengkap (Domisili)
             </label>
             <textarea
               name="address"
               rows={3}
               className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-slate-900 placeholder-slate-400"
               placeholder="Jl. Merdeka No. 45..."
               value={formData.address}
               onChange={handleChange}
             />
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
             <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="is_blacklisted" 
                  name="is_blacklisted"
                  checked={formData.is_blacklisted}
                  onChange={handleCheckboxChange}
                  className="w-5 h-5 text-red-600 border-slate-300 rounded focus:ring-red-500"
                />
                <label htmlFor="is_blacklisted" className="text-sm font-medium text-slate-700 cursor-pointer">
                   Tandai sebagai Blacklist (Bermasalah)
                </label>
             </div>
             <p className="text-xs text-slate-500 mt-2 ml-8">
                Pelanggan yang di-blacklist akan ditandai merah di sistem.
             </p>
          </div>

          <div className="pt-4 flex gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/customers')}>
              Batal
            </Button>
            <Button type="submit" isLoading={loading}>
              Simpan Pelanggan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};