
import React, { useState, useEffect } from 'react';
import { Booking, BookingChecklist } from '../../types';
import { bookingService } from '../../service/bookingService';
import { ImageUploader } from '../ImageUploader';
import { Button } from '../ui/Button';
import { X, CheckSquare, Save } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSave: () => void;
}

const DEFAULT_CHECKLIST: BookingChecklist = {
  km: 0,
  fuel: 'Full',
  images: {
    front: '',
    back: '',
    left: '',
    right: '',
    dashboard: ''
  },
  notes: ''
};

export const ChecklistModal: React.FC<Props> = ({ isOpen, onClose, booking, onSave }) => {
  const [activeTab, setActiveTab] = useState<'pickup' | 'return'>('pickup');
  const [loading, setLoading] = useState(false);
  
  const [pickupData, setPickupData] = useState<BookingChecklist>(DEFAULT_CHECKLIST);
  const [returnData, setReturnData] = useState<BookingChecklist>(DEFAULT_CHECKLIST);

  useEffect(() => {
    if (booking) {
      setPickupData({ ...DEFAULT_CHECKLIST, ...(booking.start_checklist || {}) });
      setReturnData({ ...DEFAULT_CHECKLIST, ...(booking.return_checklist || {}) });
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const handleUpdate = (type: 'pickup' | 'return', field: keyof BookingChecklist | string, value: any, subfield?: string) => {
    const setter = type === 'pickup' ? setPickupData : setReturnData;
    
    setter(prev => {
      if (field === 'images' && subfield) {
        return {
          ...prev,
          images: {
            ...prev.images,
            [subfield]: value
          }
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleImageUpload = async (type: 'pickup' | 'return', position: string, dataUrl: string | null) => {
      if (!dataUrl) {
          handleUpdate(type, 'images', '', position);
          return;
      }
      
      // Basic base64 to file conversion for upload
      try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `${type}_${position}.jpg`, { type: 'image/jpeg' });
          
          // Upload to Supabase
          // Note: In real world, we might want to show loading state specifically for image
          const url = await bookingService.uploadChecklistImage(file);
          handleUpdate(type, 'images', url, position);
      } catch (e) {
          console.error("Upload failed", e);
          alert("Gagal upload gambar.");
      }
  };

  const saveChecklist = async () => {
    setLoading(true);
    try {
      await bookingService.updateBooking(booking.id, {
        start_checklist: pickupData,
        return_checklist: returnData
      });
      onSave();
      onClose();
    } catch (err: any) {
      alert("Gagal menyimpan checklist: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentData = activeTab === 'pickup' ? pickupData : returnData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <CheckSquare className="text-blue-600"/> Checklist Kendaraan
            </h2>
            <p className="text-sm text-slate-500">{booking.cars?.brand} {booking.cars?.model} - {booking.cars?.license_plate}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button 
            onClick={() => setActiveTab('pickup')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pickup' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            1. Serah Terima (Awal)
          </button>
          <button 
            onClick={() => setActiveTab('return')}
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'return' ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            2. Pengembalian (Akhir)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Data Fisik */}
              <div className="space-y-4">
                  <h3 className="font-bold text-slate-700 border-b pb-2 mb-2">Data Fisik</h3>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Odometer (KM)</label>
                      <input 
                        type="number" 
                        className="w-full border border-slate-300 rounded-lg p-2.5 font-mono font-bold" 
                        placeholder="0"
                        value={currentData.km}
                        onChange={e => handleUpdate(activeTab, 'km', Number(e.target.value))}
                      />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Posisi BBM</label>
                      <select 
                        className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
                        value={currentData.fuel}
                        onChange={e => handleUpdate(activeTab, 'fuel', e.target.value)}
                      >
                          <option value="E">Empty (E)</option>
                          <option value="1/4">1/4</option>
                          <option value="1/2">Setengah (1/2)</option>
                          <option value="3/4">3/4</option>
                          <option value="Full">Penuh (F)</option>
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catatan Kondisi / Baret</label>
                      <textarea 
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm h-32" 
                        placeholder="Catat jika ada lecet, penyok, atau kelengkapan hilang..."
                        value={currentData.notes}
                        onChange={e => handleUpdate(activeTab, 'notes', e.target.value)}
                      />
                  </div>
              </div>

              {/* Foto Dokumentasi */}
              <div>
                  <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">Foto Dokumentasi (5 Sisi)</h3>
                  <div className="grid grid-cols-2 gap-3">
                      {['front', 'back', 'left', 'right'].map(pos => (
                          <div key={pos} className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">{pos === 'front' ? 'Depan' : pos === 'back' ? 'Belakang' : pos === 'left' ? 'Samping Kiri' : 'Samping Kanan'}</label>
                              <ImageUploader 
                                  image={currentData.images[pos as keyof typeof currentData.images] || null}
                                  onImageChange={(val) => handleImageUpload(activeTab, pos, val)}
                                  aspectRatio="video"
                                  placeholder={pos.toUpperCase()}
                                  className="h-24 bg-slate-50"
                              />
                          </div>
                      ))}
                  </div>
                  <div className="mt-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Dashboard / Interior</label>
                      <ImageUploader 
                          image={currentData.images.dashboard || null}
                          onImageChange={(val) => handleImageUpload(activeTab, 'dashboard', val)}
                          aspectRatio="video"
                          placeholder="FOTO DASHBOARD & ODOMETER"
                          className="h-32 bg-slate-50"
                      />
                  </div>
              </div>
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
            <Button variant="outline" onClick={onClose}>Tutup</Button>
            <Button onClick={saveChecklist} isLoading={loading} className="flex items-center gap-2">
                <Save size={18}/> Simpan Checklist
            </Button>
        </div>
      </div>
    </div>
  );
};
