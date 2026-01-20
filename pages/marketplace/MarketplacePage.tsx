
import React, { useEffect, useState } from 'react';
import { marketplaceService } from '../../service/marketplaceService';
import { authService } from '../../service/authService';
import { Car, DpcRegion, Driver, ReviewDisplay } from '../../types';
import { Search, MapPin, Calendar, Building, Fuel, Settings, Zap, Star, UserCheck, X, Image as ImageIcon, MessageCircle, User } from 'lucide-react';

export const MarketplacePage: React.FC = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [dpcRegions, setDpcRegions] = useState<DpcRegion[]>([]);
  
  // Helper for dates
  const getToday = () => new Date().toISOString().split('T')[0];
  const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  // Filter States
  const [selectedDpc, setSelectedDpc] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(getToday());
  const [endDate, setEndDate] = useState<string>(getTomorrow());
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking Modal State
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [activeGalleryImage, setActiveGalleryImage] = useState<string | null>(null);
  
  // Reviews Tab State in Modal
  const [modalTab, setModalTab] = useState<'details' | 'reviews'>('details');
  const [reviews, setReviews] = useState<ReviewDisplay[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    const initPage = async () => {
      try {
        // Fetch Regions first
        const regions = await authService.getDpcRegions();
        setDpcRegions(regions || []);

        // Default DPC
        const surabaya = regions?.find(r => r.name.toLowerCase().includes('surabaya'));
        let defaultDpcId = surabaya ? surabaya.id : (regions[0]?.id || '');
        setSelectedDpc(defaultDpcId);
        
        // Initial Fetch
        await loadCars(defaultDpcId, getToday(), getTomorrow(), '');

      } catch (err) {
        console.error("Init Error", err);
        setError("Gagal memuat data awal.");
        setLoading(false);
      }
    };
    initPage();
  }, []);

  // 2. Fetch Cars Function
  const loadCars = async (dpcId: string, start: string, end: string, search: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!start || !end) throw new Error("Tanggal sewa wajib diisi.");
      
      const data = await marketplaceService.getMarketplaceCars(start, end, {
          dpcId: dpcId || undefined,
          search: search || undefined
      });
      setCars(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat data marketplace.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadCars(selectedDpc, startDate, endDate, searchTerm);
  };

  const handleSelectCar = async (car: Car) => {
      setSelectedCar(car);
      setActiveGalleryImage(getCarImage(car)); // Set main image as initial
      setSelectedDriver(null);
      setAvailableDrivers([]);
      setReviews([]);
      setModalTab('details'); // Reset tab
      
      setLoadingDrivers(true);
      
      // Load available drivers from same company
      try {
          const drivers = await marketplaceService.getAvailableDrivers(car.company_id, startDate, endDate);
          setAvailableDrivers(drivers);
      } catch (e) {
          console.error("Failed to load drivers", e);
      } finally {
          setLoadingDrivers(false);
      }
  };

  const loadReviews = async () => {
      if (!selectedCar) return;
      setLoadingReviews(true);
      try {
          const data = await marketplaceService.getCarReviews(selectedCar.id);
          setReviews(data);
      } catch (e) {
          console.error("Failed to load reviews", e);
      } finally {
          setLoadingReviews(false);
      }
  };

  // Trigger load reviews when switching tab
  useEffect(() => {
      if (modalTab === 'reviews' && reviews.length === 0) {
          loadReviews();
      }
  }, [modalTab]);

  const closeModal = () => {
      setSelectedCar(null);
      setSelectedDriver(null);
      setActiveGalleryImage(null);
  };

  const handleBookingProcess = () => {
      // Create WhatsApp message
      if (!selectedCar) return;
      const company = (selectedCar.companies as any);
      
      let msg = `Halo ${company.name}, saya melihat unit *${selectedCar.brand} ${selectedCar.model} (${selectedCar.year})* di Marketplace ASPERDA. \n\n`;
      msg += `📅 Rencana Sewa: ${startDate} s/d ${endDate}\n`;
      
      if (selectedDriver) {
          msg += `👮 Dengan Driver: ${selectedDriver.full_name} (Rating ${selectedDriver.rating}⭐)\n`;
      } else {
          msg += `🔑 Lepas Kunci\n`;
      }
      
      msg += `\nApakah unit tersedia?`;
      
      window.open(`https://wa.me/${company.phone?.replace(/^0/, '62')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Determine car category image
  const getCarImage = (car: Car) => {
      if (car.image_url) return car.image_url;
      // Fallbacks based on name
      const t = (car.brand + " " + car.model).toLowerCase();
      if (t.includes('innova') || t.includes('zenix')) return 'https://images.unsplash.com/photo-1609520505218-7421da3b3d80?auto=format&fit=crop&q=80&w=400';
      if (t.includes('alphard') || t.includes('vellfire')) return 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=400';
      if (t.includes('hiace') || t.includes('elf')) return 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=400';
      if (t.includes('fortuner') || t.includes('pajero')) return 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400';
      if (t.includes('avanza') || t.includes('xenia')) return 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400';
      return 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=400'; 
  };

  const StarRating = ({ rating, count }: { rating: number, count?: number }) => (
      <div className="flex items-center gap-1">
          <Star size={12} className={rating > 0 ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-300"} />
          <span className="text-xs font-bold text-slate-700">{rating > 0 ? rating : '0'}</span>
          {count !== undefined && (
              <span className="text-[10px] text-slate-400">({count})</span>
          )}
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      {/* ... (Keep existing Header & Search sections) ... */}
      <div className="bg-slate-900 pt-8 pb-24 px-4 sm:px-6 lg:px-8 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl -ml-10 -mb-10"></div>

          <div className="relative z-10 max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                  <div>
                      <h1 className="text-3xl font-extrabold text-white tracking-tight">Marketplace</h1>
                      <p className="text-blue-200 mt-2 text-sm max-w-xl">
                          Cari unit ready dari jaringan member. Driver & Unit diurutkan berdasarkan rating terbaik.
                      </p>
                  </div>
                  <div className="hidden md:block">
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-lg flex items-center gap-3">
                          <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse"></div>
                          <span className="text-xs font-bold text-white uppercase tracking-wider">{cars.length} Unit Tersedia</span>
                      </div>
                  </div>
              </div>

              {/* SEARCH BAR CARD */}
              <div className="bg-white rounded-xl shadow-2xl p-3 border border-slate-200 transform translate-y-8">
                  <form onSubmit={handleFilter} className="flex flex-col lg:flex-row gap-3">
                      
                      {/* Search Input */}
                      <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 hover:border-blue-400 transition-colors">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                              <Search size={10} /> Cari Unit
                          </label>
                          <input 
                              type="text" 
                              className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 placeholder-slate-400"
                              placeholder="Ketik Merk / Tipe..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                          />
                      </div>

                      <div className="w-px h-10 bg-slate-200 hidden lg:block self-center"></div>

                      {/* Region */}
                      <div className="lg:w-48 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 hover:border-blue-400 transition-colors">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                              <MapPin size={10} /> Wilayah
                          </label>
                          <select
                              className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 cursor-pointer"
                              value={selectedDpc}
                              onChange={(e) => setSelectedDpc(e.target.value)}
                          >
                              <option value="">Semua Wilayah</option>
                              {dpcRegions.map((dpc) => (
                                  <option key={dpc.id} value={dpc.id}>{dpc.name}</option>
                              ))}
                          </select>
                      </div>

                      <div className="w-px h-10 bg-slate-200 hidden lg:block self-center"></div>

                      {/* Dates */}
                      <div className="flex gap-2 lg:contents">
                          <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 hover:border-blue-400 transition-colors">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                  <Calendar size={10} /> Ambil
                              </label>
                              <input
                                  type="date"
                                  className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 cursor-pointer"
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
                              />
                          </div>
                          <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 hover:border-blue-400 transition-colors">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                                  <Calendar size={10} /> Kembali
                              </label>
                              <input
                                  type="date"
                                  className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 cursor-pointer"
                                  value={endDate}
                                  onChange={(e) => setEndDate(e.target.value)}
                              />
                          </div>
                      </div>

                      <div className="lg:w-auto">
                          <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full h-full min-h-[50px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-8 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
                          >
                              {loading ? <i className="fas fa-spinner fa-spin"></i> : <Search size={20} />}
                              Cari
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      </div>

      {/* RESULTS SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6 flex items-center gap-3">
               <i className="fas fa-exclamation-triangle text-red-500"></i>
               <span className="text-red-700 font-medium">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {[1,2,3,4].map(i => (
                   <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 h-80 animate-pulse">
                       <div className="bg-slate-200 h-40 rounded-xl mb-4"></div>
                       <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                       <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                   </div>
               ))}
            </div>
          ) : cars.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Search size={40} className="text-slate-300"/>
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-2">Unit Tidak Ditemukan</h3>
               <p className="text-slate-500 max-w-md mx-auto mb-6">
                 Tidak ada unit tersedia di <strong>{dpcRegions.find(r => r.id === selectedDpc)?.name || 'Wilayah Ini'}</strong> pada tanggal yang dipilih. Coba ganti tanggal atau wilayah.
               </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cars.map((car) => (
                <div key={car.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 overflow-hidden transition-all duration-300 group flex flex-col h-full">
                  
                  {/* Image Area */}
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                      <img 
                        src={getCarImage(car)} 
                        alt={car.model} 
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-blue-700 text-[10px] font-extrabold px-2 py-1 rounded shadow-sm border border-white/50 uppercase tracking-wide">
                          {car.transmission}
                      </div>
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded shadow-sm border border-white/50">
                          <StarRating rating={car.average_rating || 0} count={car.review_count || 0} />
                      </div>
                      {/* Gallery Indicator */}
                      {(car.gallery && Object.keys(car.gallery).filter(k => !!(car.gallery as any)[k]).length > 0) && (
                          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm">
                              <ImageIcon size={10}/> {Object.keys(car.gallery).filter(k => !!(car.gallery as any)[k]).length} Foto
                          </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent p-4">
                          <h3 className="text-white font-bold text-lg leading-tight shadow-black drop-shadow-md">{car.brand} {car.model}</h3>
                          <p className="text-slate-300 text-xs mt-0.5">{car.year} • {car.category || 'MPV'}</p>
                      </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start gap-3 mb-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {(car.companies as any)?.logo_url ? (
                                  <img src={(car.companies as any).logo_url} className="w-full h-full object-cover" alt="Logo"/>
                              ) : (
                                  <Building size={18} className="text-slate-400"/>
                              )}
                          </div>
                          <div className="overflow-hidden">
                              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Pemilik Unit</div>
                              <div className="font-bold text-slate-800 text-sm leading-tight truncate">{(car.companies as any)?.name}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                                  <MapPin size={10}/> {(car.companies as any)?.dpc_regions?.name || 'Indonesia'}
                              </div>
                          </div>
                      </div>

                      {/* Specs Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                          {car.fuel_type && (
                              <span className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-600 flex items-center gap-1">
                                  {car.fuel_type === 'Electric' ? <Zap size={10}/> : <Fuel size={10}/>} {car.fuel_type}
                              </span>
                          )}
                          <span className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-600 flex items-center gap-1">
                              <Settings size={10}/> {car.transmission === 'automatic' ? 'Matic' : 'Manual'}
                          </span>
                      </div>

                      <div className="mt-auto pt-4 border-t border-slate-100">
                          <div className="flex justify-between items-end mb-4">
                              <div className="text-xs text-slate-400 font-medium">Lepas Kunci</div>
                              <div className="text-lg font-black text-slate-900">
                                  Rp {car.price_per_day.toLocaleString('id-ID')}
                                  <span className="text-xs font-normal text-slate-400 ml-1">/hari</span>
                              </div>
                          </div>

                          <button 
                            onClick={() => handleSelectCar(car)}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
                          >
                            Lihat Detail & Pesan
                          </button>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* BOOKING MODAL */}
      {selectedCar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                  {/* Modal Header */}
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                      <div>
                          <h3 className="font-bold text-slate-900 text-lg">Detail Mobil</h3>
                          <p className="text-xs text-slate-500">{selectedCar.brand} {selectedCar.model} - {(selectedCar.companies as any)?.name}</p>
                      </div>
                      <button onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                          <X size={20}/>
                      </button>
                  </div>

                  {/* Modal Tabs */}
                  <div className="flex border-b border-slate-100 bg-white">
                      <button 
                        onClick={() => setModalTab('details')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${modalTab === 'details' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                      >
                          Informasi Unit
                      </button>
                      <button 
                        onClick={() => setModalTab('reviews')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${modalTab === 'reviews' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                      >
                          Ulasan ({selectedCar.review_count || 0})
                      </button>
                  </div>

                  {/* Modal Content - SCROLLABLE */}
                  <div className="p-0 overflow-y-auto flex-1">
                      
                      {modalTab === 'details' && (
                          <div className="animate-in fade-in">
                              {/* GALLERY SECTION */}
                              <div className="bg-black relative aspect-video flex items-center justify-center overflow-hidden">
                                  <img 
                                    src={activeGalleryImage || getCarImage(selectedCar)} 
                                    className="w-full h-full object-contain"
                                    alt="Main View"
                                  />
                              </div>
                              
                              {/* Thumbnails */}
                              {selectedCar.gallery && (
                                  <div className="flex gap-2 p-2 overflow-x-auto bg-slate-900 scrollbar-hide">
                                      {/* Main Image Thumb */}
                                      <div 
                                        onClick={() => setActiveGalleryImage(getCarImage(selectedCar))}
                                        className={`w-20 h-14 flex-shrink-0 rounded overflow-hidden cursor-pointer border-2 ${activeGalleryImage === getCarImage(selectedCar) ? 'border-blue-500' : 'border-transparent'}`}
                                      >
                                          <img src={getCarImage(selectedCar)} className="w-full h-full object-cover"/>
                                      </div>
                                      {/* Other Gallery Images */}
                                      {Object.values(selectedCar.gallery).filter(Boolean).map((url, idx) => (
                                          <div 
                                            key={idx}
                                            onClick={() => setActiveGalleryImage(url!)}
                                            className={`w-20 h-14 flex-shrink-0 rounded overflow-hidden cursor-pointer border-2 ${activeGalleryImage === url ? 'border-blue-500' : 'border-transparent'}`}
                                          >
                                              <img src={url!} className="w-full h-full object-cover"/>
                                          </div>
                                      ))}
                                  </div>
                              )}

                              <div className="p-6 space-y-6">
                                  {/* Description */}
                                  {selectedCar.description && (
                                      <div>
                                          <h4 className="font-bold text-slate-800 mb-2 border-b pb-1 text-sm">Deskripsi & Fasilitas</h4>
                                          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedCar.description}</p>
                                      </div>
                                  )}

                                  {/* Driver Selection */}
                                  <div>
                                      <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">Opsi Driver (Opsional)</h4>
                                      {loadingDrivers ? (
                                          <div className="p-4 text-center text-slate-500 text-sm"><i className="fas fa-spinner fa-spin mr-2"></i> Mencari driver available...</div>
                                      ) : availableDrivers.length === 0 ? (
                                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
                                              Tidak ada driver available dari rental ini untuk tanggal tersebut.
                                          </div>
                                      ) : (
                                          <div className="space-y-2">
                                              {availableDrivers.map(driver => (
                                                  <div 
                                                    key={driver.id} 
                                                    onClick={() => setSelectedDriver(selectedDriver?.id === driver.id ? null : driver)}
                                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedDriver?.id === driver.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'}`}
                                                  >
                                                      <div className="flex items-center gap-3">
                                                          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                                                              {driver.image_url ? <img src={driver.image_url} className="w-full h-full object-cover"/> : <UserCheck className="w-full h-full p-2 text-slate-400"/>}
                                                          </div>
                                                          <div>
                                                              <div className="font-bold text-sm text-slate-900">{driver.full_name}</div>
                                                              <div className="flex items-center gap-2 mt-0.5">
                                                                  <StarRating rating={driver.rating || 0} count={driver.review_count || 0}/>
                                                                  <span className="text-[10px] text-slate-500">• {driver.dailyRate ? `Rp ${driver.dailyRate.toLocaleString()}/hari` : 'Harga Std'}</span>
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedDriver?.id === driver.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                                                          {selectedDriver?.id === driver.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>

                                  {/* Price Summary */}
                                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
                                      <div className="flex justify-between">
                                          <span className="text-slate-500">Unit Mobil</span>
                                          <span className="font-bold text-slate-900">Rp {selectedCar.price_per_day.toLocaleString()} /hari</span>
                                      </div>
                                      {selectedDriver && (
                                          <div className="flex justify-between text-blue-700">
                                              <span className="">+ Driver ({selectedDriver.full_name})</span>
                                              <span className="font-bold">Rp {(selectedDriver.dailyRate || 150000).toLocaleString()} /hari</span>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      )}

                      {modalTab === 'reviews' && (
                          <div className="p-6 animate-in fade-in">
                              {loadingReviews ? (
                                  <div className="text-center py-8 text-slate-500"><i className="fas fa-spinner fa-spin mr-2"></i> Memuat ulasan...</div>
                              ) : reviews.length === 0 ? (
                                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                      <MessageCircle className="mx-auto text-slate-300 mb-2" size={32}/>
                                      <p className="text-slate-500 text-sm">Belum ada ulasan untuk mobil ini.</p>
                                  </div>
                              ) : (
                                  <div className="space-y-4">
                                      {reviews.map((rev, idx) => (
                                          <div key={idx} className="border-b border-slate-100 pb-4 last:border-none">
                                              <div className="flex justify-between items-start mb-1">
                                                  <div className="flex items-center gap-2">
                                                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                          <User size={16}/>
                                                      </div>
                                                      <div>
                                                          <div className="text-sm font-bold text-slate-800">{rev.reviewer_name}</div>
                                                          <StarRating rating={rev.rating} />
                                                      </div>
                                                  </div>
                                                  <span className="text-[10px] text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                                              </div>
                                              <p className="text-sm text-slate-600 pl-10 mt-1 italic">"{rev.comment}"</p>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>

                  {/* Modal Footer */}
                  {modalTab === 'details' && (
                      <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10">
                          <button 
                            onClick={handleBookingProcess}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
                          >
                              <i className="fab fa-whatsapp text-lg"></i>
                              Hubungi Pemilik & Pesan
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

    </div>
  );
};
