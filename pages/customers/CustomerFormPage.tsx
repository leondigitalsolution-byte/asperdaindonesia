
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate, Link, useParams } from 'react-router-dom';
import { customerService } from '../../service/customerService';
import { blacklistService } from '../../service/blacklistService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ImageUploader } from '../../components/ImageUploader';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export const CustomerFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    nik: '',
    phone: '',
    address: '',
    is_blacklisted: false
  });

  // Blacklist Reporting State
  const [blacklistReason, setBlacklistReason] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);

  // Load Data if Edit Mode
  useEffect(() => {
    if (isEditMode && id) {
        const loadData = async () => {
            setInitialLoading(true);
            try {
                const data = await customerService.getCustomerById(id);
                setFormData({
                    full_name: data.full_name,
                    nik: data.nik || '',
                    phone: data.phone,
                    address: data.address || '',
                    is_blacklisted: data.is_blacklisted || false
                });
            } catch (err: any) {
                console.error(err);
                setError("Gagal memuat data pelanggan.");
            } finally {
                setInitialLoading(false);
            }
        };
        loadData();
    }
  }, [id, isEditMode]);

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

  const handleEvidenceChange = (dataUrl: string | null) => {
      if (!dataUrl) {
          setEvidenceFile(null);
          setEvidencePreview(null);
          return;
      }
      setEvidencePreview(dataUrl);
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], "evidence.jpg", { type: "image/jpeg" });
            setEvidenceFile(file);
        });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Save Customer Data (Local)
      if (isEditMode && id) {
          await customerService.updateCustomer(id, formData);
      } else {
          await customerService.createCustomer(formData);
      }

      // 2. Handle Blacklist Reporting (Global)
      // Only report if Reason is provided and checkbox is checked
      if (formData.is_blacklisted && blacklistReason.trim()) {
          let evidenceUrl = undefined;
          if (evidenceFile) {
              evidenceUrl = await blacklistService.uploadEvidence(evidenceFile);
          }
          
          await blacklistService.createReport({
              target_name: formData.full_name,
              target_nik: formData.nik,
              target_phone: formData.phone,
              reason: blacklistReason,
              evidence_url: evidenceUrl
          });
      }

      navigate('/dashboard/customers');
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Gagal menyimpan data pelanggan.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
      return <div className="p-12 text-center text-slate-500"><i className="fas fa-spinner fa-spin mr-2"></i> Memuat data...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="mb-6 flex items-center gap-2">
        <Link to="/dashboard/customers" className="text-slate-500 hover:text-slate-800 transition-colors">
          <i className="fas fa-arrow-left"></i>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}</h1>
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

          <div className={`p-4 rounded-lg border transition-all ${formData.is_blacklisted ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
             <div className="flex items-center gap-3 mb-2">
                <input 
                  type="checkbox" 
                  id="is_blacklisted" 
                  name="is_blacklisted"
                  checked={formData.is_blacklisted}
                  onChange={handleCheckboxChange}
                  className="w-5 h-5 text-red-600 border-slate-300 rounded focus:ring-red-500"
                />
                <label htmlFor="is_blacklisted" className="text-sm font-bold text-slate-800 cursor-pointer flex items-center gap-2">
                   Tandai sebagai Blacklist (Bermasalah)
                </label>
             </div>
             
             {formData.is_blacklisted && (
                 <div className="mt-4 pl-8 animate-in fade-in slide-in-from-top-2">
                     <div className="bg-white p-4 rounded-lg border border-red-100 shadow-sm">
                         <h4 className="text-sm font-bold text-red-700 flex items-center gap-2 mb-3">
                             <ShieldAlert size={16}/> Laporan Global Blacklist
                         </h4>
                         <p className="text-xs text-slate-600 mb-4">
                             Isi formulir di bawah ini untuk melaporkan pelanggan ini ke database nasional ASPERDA. Laporan akan direview oleh Admin DPC sebelum dipublikasikan.
                         </p>
                         
                         <div className="space-y-4">
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kronologi / Alasan (Wajib)</label>
                                 <textarea 
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    rows={3}
                                    placeholder="Jelaskan masalah: Mobil digadaikan, tidak bayar, kabur, dll..."
                                    value={blacklistReason}
                                    onChange={e => setBlacklistReason(e.target.value)}
                                 />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bukti Foto / Dokumen (Opsional)</label>
                                 <ImageUploader 
                                    image={evidencePreview}
                                    onImageChange={handleEvidenceChange}
                                    placeholder="Upload Bukti"
                                    aspectRatio="video"
                                    className="h-32 bg-slate-50"
                                 />
                             </div>
                         </div>
                     </div>
                 </div>
             )}
             
             {!formData.is_blacklisted && (
                 <p className="text-xs text-slate-500 mt-1 ml-8">
                    Pelanggan yang di-blacklist akan ditandai merah di sistem Anda.
                 </p>
             )}
          </div>

          <div className="pt-4 flex gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/customers')}>
              Batal
            </Button>
            <Button type="submit" isLoading={loading} className={formData.is_blacklisted ? 'bg-red-600 hover:bg-red-700' : 'bg-primary'}>
              {isEditMode ? 'Simpan Perubahan' : 'Simpan Pelanggan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
