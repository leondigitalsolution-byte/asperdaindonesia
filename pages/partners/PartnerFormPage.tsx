
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { partnerService } from '../../service/partnerService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ImageUploader } from '../../components/ImageUploader';

export const PartnerFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    profit_sharing_percentage: 0
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await partnerService.createPartner(formData, imageFile);
      navigate('/dashboard/partners');
    } catch (error) {
      alert("Gagal menyimpan mitra.");
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
            const file = new File([blob], "partner_photo.jpg", { type: "image/jpeg" });
            setImageFile(file);
        });
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6 flex items-center gap-2">
        <Link to="/dashboard/partners" className="text-slate-500 hover:text-slate-800 transition-colors">
          <i className="fas fa-arrow-left"></i>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Tambah Mitra Baru</h1>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="flex justify-center mb-4">
              <ImageUploader 
                  image={previewUrl}
                  onImageChange={handleImageChange}
                  label="Foto Mitra"
                  aspectRatio="square"
                  className="w-32"
                  placeholder="Upload Foto"
              />
          </div>

          <Input 
            label="Nama Lengkap Mitra" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            required 
            icon="fas fa-user"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="No. Telepon" 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
              required 
              icon="fab fa-whatsapp"
            />
            <Input 
              label="Email (Opsional)" 
              type="email"
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              icon="fas fa-envelope"
            />
          </div>
          <Input 
            label="Alamat Domisili" 
            value={formData.address} 
            onChange={e => setFormData({...formData, address: e.target.value})} 
            icon="fas fa-map-marker-alt"
          />
          <Input 
            label="Persentase Bagi Hasil (Untuk Mitra)" 
            type="number"
            placeholder="Contoh: 70"
            value={formData.profit_sharing_percentage} 
            onChange={e => setFormData({...formData, profit_sharing_percentage: Number(e.target.value)})} 
            icon="fas fa-percent"
            required
          />
          <p className="text-xs text-slate-500 -mt-4 ml-1">Masukkan angka saja (Misal 70 untuk 70%)</p>
          
          <div className="pt-4 flex gap-3">
             <Button type="button" variant="outline" onClick={() => navigate('/dashboard/partners')}>Batal</Button>
             <Button type="submit" isLoading={loading}>Simpan Mitra</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
