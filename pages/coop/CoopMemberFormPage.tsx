
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { coopService } from '../../service/coopService';
import { authService } from '../../service/authService';
import { CoopMember, DpcRegion, UserRole } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ImageUploader } from '../../components/ImageUploader';

export const CoopMemberFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dpcList, setDpcList] = useState<DpcRegion[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form
  const [formData, setFormData] = useState<Partial<CoopMember>>({
    member_id: '',
    username: '',
    full_name: '',
    gender: 'Laki-laki',
    address: '',
    city: '',
    department: 'ANGGOTA',
    join_date: new Date().toISOString().split('T')[0],
    status: 'Aktif',
    dpc_id: ''
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
        setInitialLoading(true);
        try {
            // Check Role
            const profile = await authService.getUserProfile();
            if (profile?.role === UserRole.SUPER_ADMIN) {
                setIsAdmin(true);
                const regions = await authService.getDpcRegions();
                setDpcList(regions || []);
            } else {
                // Auto set DPC ID for DPC Admin
                const myDpcId = await coopService.getMyDpcId();
                if (myDpcId) setFormData(prev => ({ ...prev, dpc_id: myDpcId }));
            }

            // Load Data if Edit
            if (isEditMode && id) {
                const data = await coopService.getMemberById(id);
                setFormData({
                    member_id: data.member_id,
                    username: data.username,
                    full_name: data.full_name,
                    gender: data.gender,
                    address: data.address,
                    city: data.city,
                    department: data.department,
                    join_date: data.join_date,
                    status: data.status,
                    dpc_id: data.dpc_id
                });
                if(data.photo_url) setPreviewUrl(data.photo_url);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setInitialLoading(false);
        }
    };
    init();
  }, [id, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.dpc_id) {
        setError("Wilayah DPC harus diisi.");
        setLoading(false);
        return;
    }

    try {
      if (isEditMode && id) {
          await coopService.updateMember(id, formData, imageFile);
      } else {
          // New Member
          await coopService.createMember(formData as any, imageFile);
      }
      navigate('/dashboard/coop');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal menyimpan data.");
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
            const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
            setImageFile(file);
        });
  };

  if (initialLoading) return <div className="p-12 text-center text-slate-500">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-2">
        <Link to="/dashboard/coop" className="text-slate-500 hover:text-slate-800 transition-colors">
          <i className="fas fa-arrow-left"></i>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Anggota' : 'Tambah Anggota Koperasi'}</h1>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-100">
         {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700 font-medium">
                {error}
            </div>
         )}

         <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="flex justify-center mb-6">
                 <ImageUploader 
                    image={previewUrl}
                    onImageChange={handleImageChange}
                    label="Foto Anggota"
                    aspectRatio="square"
                    className="w-40"
                    placeholder="Upload Foto"
                 />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isAdmin && (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Wilayah DPC (Super Admin)</label>
                        <select 
                            className="w-full border rounded-lg p-2.5 bg-white"
                            value={formData.dpc_id}
                            onChange={e => setFormData({...formData, dpc_id: e.target.value})}
                            required
                        >
                            <option value="">-- Pilih Wilayah --</option>
                            {dpcList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                )}

                <Input 
                    label="ID Anggota" 
                    value={formData.member_id} 
                    onChange={e => setFormData({...formData, member_id: e.target.value})} 
                    placeholder="Contoh: AG0001"
                    required 
                />
                <Input 
                    label="Username" 
                    value={formData.username} 
                    onChange={e => setFormData({...formData, username: e.target.value})} 
                    placeholder="username.login"
                    required 
                />
                
                <div className="md:col-span-2">
                    <Input 
                        label="Nama Lengkap" 
                        value={formData.full_name} 
                        onChange={e => setFormData({...formData, full_name: e.target.value})} 
                        required 
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jenis Kelamin</label>
                    <select 
                        className="w-full border rounded-lg p-2.5 bg-white"
                        value={formData.gender}
                        onChange={e => setFormData({...formData, gender: e.target.value as any})}
                    >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                    </select>
                </div>

                <Input 
                    label="Kota Domisili" 
                    value={formData.city} 
                    onChange={e => setFormData({...formData, city: e.target.value})} 
                    required 
                />

                <div className="md:col-span-2">
                    <Input 
                        label="Alamat Lengkap" 
                        value={formData.address} 
                        onChange={e => setFormData({...formData, address: e.target.value})} 
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jabatan / Departemen</label>
                    <input 
                        type="text" 
                        list="dept-list"
                        className="w-full border rounded-lg p-2.5"
                        value={formData.department}
                        onChange={e => setFormData({...formData, department: e.target.value})}
                    />
                    <datalist id="dept-list">
                        <option value="ANGGOTA" />
                        <option value="KETUA KOPERASI" />
                        <option value="BENDAHARA" />
                        <option value="SEKRETARIS" />
                        <option value="PENGAWAS" />
                    </datalist>
                </div>

                <Input 
                    label="Tanggal Registrasi" 
                    type="date"
                    value={formData.join_date} 
                    onChange={e => setFormData({...formData, join_date: e.target.value})} 
                    required 
                />

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Keanggotaan</label>
                    <select 
                        className="w-full border rounded-lg p-2.5 bg-white"
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                        <option value="Aktif">Aktif</option>
                        <option value="Non-Aktif">Non-Aktif</option>
                    </select>
                </div>

            </div>

            <div className="pt-6 flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate('/dashboard/coop')}>Batal</Button>
                <Button type="submit" isLoading={loading}>Simpan Anggota</Button>
            </div>

         </form>
      </div>
    </div>
  );
};
