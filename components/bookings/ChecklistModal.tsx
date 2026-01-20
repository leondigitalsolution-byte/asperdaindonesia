
import React, { useState, useEffect } from 'react';
import { Booking, BookingChecklist, BookingStatus } from '../../types';
import { bookingService } from '../../service/bookingService';
import { carService } from '../../service/carService'; // Import carService
import { ImageUploader } from '../ImageUploader';
import { Button } from '../ui/Button';
import { X, CheckSquare, Save, Gauge } from 'lucide-react';

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
      
      try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `${type}_${position}.jpg`, { type: 'image/jpeg' });
          
          // Upload to Supabase
          const url = await bookingService.uploadChecklistImage(file);
          handleUpdate(type, 'images', url, position);
      } catch (e) {
          console.error("Upload failed", e);
          alert("Gagal upload gambar.");
      }
  };

  const saveChecklist = async () => {
    setLoading(true);
    const currentData = activeTab === 'pickup' ? pickupData : returnData;

    // VALIDATION: KM Wajib Diisi
    if (!currentData.km || currentData.km <= 0) {
        alert("Wajib Mengisi Odometer (KM) kendaraan saat ini untuk kalkulasi maintenance.");
        setLoading(false);
        return;
    }

    try {
      const updates: any = {
        start_checklist: pickupData,
        return_checklist: returnData
      };

      // AUTO STATUS UPDATE LOGIC
      if (activeTab === 'pickup') {
          updates.status = BookingStatus.ACTIVE;
      } else if (activeTab === 'return') {
          updates.status = BookingStatus.COMPLETED;
      }

      // 1. Update Booking Data
      await bookingService.updateBooking(booking.id, updates);
      
      // 2. AUTO-UPDATE CAR ODOMETER (Maintenance Feature)
      if (booking.car_id && currentData.km > 0) {
          await carService.updateCar(booking.car_id, {
              current_odometer: currentData.km
          });
      }
      
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
                  
                  {/* KM INPUT with Highlight */}
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <label className="block text-xs font-bold text-blue-800 uppercase mb-1 flex items-center gap-1">
                          <Gauge size={14}/> Odometer Saat Ini (Wajib)
                      </label>
                      <input 
                        type="number" 
                        className="w-full border border-blue-300 rounded-lg p-2.5 font-mono font-bold text-lg text-blue-900 focus:ring-2 focus:ring-blue-500" 
                        placeholder="0"
                        value={currentData.km || ''}
                        onChange={e => handleUpdate(activeTab, 'km', Number(e.target.value))}
                      />
                      <p className="text-[10px] text-blue-600 mt-1 italic">
                          *Angka ini akan otomatis mengupdate data servis/maintenance mobil.
                      </p>
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

        {/* Footer Layout Fixed */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                
                {/* Description Text: Below buttons on mobile (Order 2), Left on desktop (Order 1) */}
                <div className="text-xs text-slate-500 italic text-center md:text-left md:max-w-[50%] order-2 md:order-1">
                    *Simpan checklist akan otomatis mengupdate status Booking menjadi 
                    <strong className={activeTab === 'pickup' ? 'text-blue-600' : 'text-green-600'}>
                        {activeTab === 'pickup' ? ' ACTIVE (Jalan)' : ' COMPLETED (Selesai)'}
                    </strong>
                </div>

                {/* Buttons Group: Top on mobile (Order 1), Right on desktop (Order 2) */}
                <div className="flex gap-3 w-full md:w-auto justify-end order-1 md:order-2">
                    <Button variant="outline" onClick={onClose} className="flex-1 md:flex-none justify-center min-w-[100px]">
                        Batal
                    </Button>
                    <Button 
                        onClick={saveChecklist} 
                        isLoading={loading} 
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 min-w-[160px] ${activeTab === 'return' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        <Save size={18}/> 
                        {activeTab === 'pickup' ? 'Simpan & Aktifkan' : 'Selesai'}
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
