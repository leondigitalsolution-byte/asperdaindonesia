
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate, Link, useParams } from 'react-router-dom';
import { financeService } from '../../service/financeService';
import { FinanceType } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ImageUploader } from '../../components/ImageUploader';

export const FinanceFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    type: FinanceType.EXPENSE, // Default to Expense
    category: '',
    amount: 0,
    description: '',
    status: 'paid' as 'paid' | 'pending'
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
      if (isEditMode && id) {
          const loadRecord = async () => {
              setInitialLoading(true);
              try {
                  const data = await financeService.getRecordById(id);
                  setFormData({
                      transaction_date: data.transaction_date,
                      type: data.type,
                      category: data.category,
                      amount: data.amount,
                      description: data.description || '',
                      status: (data.status as 'paid' | 'pending') || 'paid'
                  });
                  if (data.proof_image_url) setPreviewUrl(data.proof_image_url);
              } catch (e) {
                  console.error(e);
                  alert("Gagal memuat data transaksi.");
                  navigate('/dashboard/finance');
              } finally {
                  setInitialLoading(false);
              }
          };
          loadRecord();
      }
  }, [id, isEditMode, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditMode && id) {
          await financeService.updateRecord(id, formData, imageFile);
      } else {
          await financeService.addRecord(formData, imageFile);
      }
      navigate('/dashboard/finance');
    } catch (error) {
      alert("Gagal menyimpan transaksi.");
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
            const file = new File([blob], "proof.jpg", { type: "image/jpeg" });
            setImageFile(file);
        });
  };

  if (initialLoading) {
      return <div className="p-12 text-center text-slate-500">Memuat data...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-2">
        <Link to="/dashboard/finance" className="text-slate-500 hover:text-slate-800 transition-colors">
          <i className="fas fa-arrow-left"></i>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Transaksi' : 'Catat Pengeluaran & Setoran'}</h1>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="flex justify-center mb-6">
              <div className="w-full">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Upload Bukti Nota / Kwitansi</label>
                  <ImageUploader 
                      image={previewUrl}
                      onImageChange={handleImageChange}
                      placeholder="Klik untuk upload foto nota"
                      aspectRatio="video"
                      className="bg-slate-50"
                  />
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Tanggal Transaksi" 
              type="date"
              value={formData.transaction_date} 
              onChange={e => setFormData({...formData, transaction_date: e.target.value})} 
              required 
            />
             <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipe Transaksi</label>
              <select 
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary bg-white"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as FinanceType})}
              >
                <option value={FinanceType.EXPENSE}>Pengeluaran (Expense)</option>
                <option value={FinanceType.INCOME}>Pemasukan (Income)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kategori</label>
                <input 
                  type="text"
                  list="category-suggestions"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="Pilih atau ketik..."
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  required 
                />
                <datalist id="category-suggestions">
                    <option value="BBM" />
                    <option value="Gaji Driver" />
                    <option value="Setor Mitra" />
                    <option value="Service Mobil" />
                    <option value="Makan & Minum" />
                    <option value="Sewa Mobil" />
                    <option value="Cuci Mobil" />
                </datalist>
             </div>
             
             <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Pembayaran</label>
                <select 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary bg-white"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                    <option value="paid">Lunas / Dibayar</option>
                    <option value="pending">Menunggu (Pending)</option>
                </select>
             </div>
          </div>

          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nominal (Rp)</label>
             <div className="relative">
                 <span className="absolute left-3 top-2.5 text-slate-500 font-bold">Rp</span>
                 <input 
                    type="number"
                    className="w-full pl-10 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary font-mono text-lg"
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                    required 
                 />
             </div>
          </div>

          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-1.5">Keterangan Detail</label>
             <textarea
               className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary"
               rows={3}
               placeholder="Contoh: Pembayaran service ganti oli Avanza B 1234 CD"
               value={formData.description}
               onChange={e => setFormData({...formData, description: e.target.value})}
             />
          </div>

          <div className="pt-4 flex gap-3">
             <Button type="button" variant="outline" onClick={() => navigate('/dashboard/finance')}>Batal</Button>
             <Button type="submit" isLoading={loading} className={formData.type === FinanceType.EXPENSE ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}>
                {isEditMode ? 'Simpan Perubahan' : 'Simpan Transaksi'}
             </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
