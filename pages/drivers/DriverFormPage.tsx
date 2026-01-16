
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { driverService } from '../../service/driverService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ImageUploader } from '../../components/ImageUploader';

export const DriverFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    sim_number: '',
    dailyRate: 0, // Defaulted to 0 as input is removed
    status: 'active'
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
      if(isEditMode && id) {
          const loadDriver = async () => {
              setInitialLoading(true);
              try {
                  const data = await driverService.getDriverById(id);
                  setFormData({
                      full_name: data.full_name,
                      phone: data.phone,
                      sim_number: data.sim_number || '',
                      dailyRate: data.dailyRate || 0,
                      status: data.status
                  });
                  if(data.image_url) setPreviewUrl(data.image_url);
              } catch(e) {
                  setError("Gagal memuat data driver");
              } finally {
                  setInitialLoading(false);
              }
          };
          loadDriver();
      }
  }, [id, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isEditMode && id) {
          await driverService.updateDriver(id, formData as any, imageFile);
      } else {
          await driverService.createDriver(formData as any, imageFile);
      }
      navigate('/dashboard/drivers');
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('permission denied') || err.code === '42501') {
        setError("Akses ditolak. Hubungi administrator sistem.");
      } else {
        setError(err.message || "Gagal menyimpan driver.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (dataUrl: string | null) => {
      if (!dataUrl) {
          setImageFile(null);
          setPreviewUrl(null);
          return;
      }
      setPreviewUrl(dataUrl);
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], "driver_photo.jpg", { type: "image/jpeg" });
            setImageFile(file);
        });
  };

  if (initialLoading) return <div className="p-8 text-center text-slate-500">Memuat data...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-2">
        <Link to="/dashboard/drivers" className="text-slate-500 hover:text-slate-800 transition-colors">
          <i className="fas fa-arrow-left"></i>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Driver' : 'Tambah Driver'}</h1>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-100">
        
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                 <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
              </div>
              <div className="ml-3">
                 <p className="text-sm text-red-700 font-bold">Gagal Menyimpan</p>
                 <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="flex justify-center mb-6">
              <ImageUploader 
                  image={previewUrl}
                  onImageChange={handleImageChange}
                  label="Foto Driver"
                  aspectRatio="square"
                  className="w-40"
                  placeholder="Upload Foto"
              />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
                label="Nama Lengkap" 
                placeholder="Sesuai KTP"
                value={formData.full_name} 
                onChange={e => setFormData({...formData, full_name: e.target.value})} 
                required 
                icon="fas fa-user"
            />
            <Input 
                label="No. Telepon / WA" 
                type="tel"
                placeholder="08..."
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                required 
                icon="fab fa-whatsapp"
            />
          </div>

          <div>
            <Input 
                label="Nomor SIM" 
                placeholder="Nomor SIM A/B"
                value={formData.sim_number} 
                onChange={e => setFormData({...formData, sim_number: e.target.value})} 
                icon="fas fa-id-card"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Driver</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                 <i className="fas fa-toggle-on"></i>
              </div>
              <select 
                className="w-full pl-10 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white appearance-none"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="active">Active (Siap Kerja)</option>
                <option value="inactive">Inactive (Libur/Non-aktif)</option>
                <option value="on_duty">On Duty (Sedang Jalan)</option>
              </select>
            </div>
          </div>
          
          <div className="pt-4 flex gap-3">
             <Button type="button" variant="outline" onClick={() => navigate('/dashboard/drivers')}>
               Batal
             </Button>
             <Button type="submit" isLoading={loading}>
               {isEditMode ? 'Simpan Perubahan' : 'Simpan Data'}
             </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
