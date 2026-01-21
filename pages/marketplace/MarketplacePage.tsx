
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { marketplaceService } from '../../service/marketplaceService';
import { marketplaceRequestService } from '../../service/marketplaceRequestService';
import { highSeasonService } from '../../service/highSeasonService';
import { authService } from '../../service/authService';
import { getStoredData, DEFAULT_SETTINGS } from '../../service/dataService'; 
import { Car, DpcRegion, Driver, ReviewDisplay, MarketplaceRequest, AppSettings, HighSeason } from '../../types';
import { Search, MapPin, Calendar, Building, Fuel, Settings, Zap, Star, UserCheck, X, Image as ImageIcon, MessageCircle, User, Clock, CheckCircle, XCircle, ShoppingBag, Car as CarIcon, ArrowRight, FileText, Filter, AlertTriangle } from 'lucide-react';

export const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState<'browse' | 'r2r_incoming' | 'r2r_outgoing'>('browse');

  const [cars, setCars] = useState<Car[]>([]);
  const [dpcRegions, setDpcRegions] = useState<DpcRegion[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // High Season Data (Loaded for current user to show general alerts)
  const [myHighSeasons, setMyHighSeasons] = useState<HighSeason[]>([]);
  // Supplier High Season Data (Loaded when a specific car is selected)
  const [supplierHighSeasons, setSupplierHighSeasons] = useState<HighSeason[]>([]);
  
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
  
  // NEW FILTERS
  const [filterBrand, setFilterBrand] = useState('');
  const [filterTrans, setFilterTrans] = useState('');
  const [filterFuel, setFilterFuel] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
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

  // R2R Lists
  const [incomingRequests, setIncomingRequests] = useState<MarketplaceRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<MarketplaceRequest[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Booking Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    const initPage = async () => {
      try {
        const loadedSettings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
        setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings });

        const regions = await authService.getDpcRegions();
        setDpcRegions(regions || []);

        const surabaya = regions?.find(r => r.name.toLowerCase().includes('surabaya'));
        let defaultDpcId = surabaya ? surabaya.id : (regions[0]?.id || '');
        setSelectedDpc(defaultDpcId);
        
        // Load High Seasons (Current User's view for general alert)
        const hsData = await highSeasonService.getHighSeasons();
        setMyHighSeasons(hsData);

        // Initial load
        await loadCars(defaultDpcId, getToday(), getTomorrow());

      } catch (err) {
        console.error("Init Error", err);
        setError("Gagal memuat data awal.");
        setLoading(false);
      }
    };
    initPage();
  }, []);

  // Effect to load lists when tab switches
  useEffect(() => {
      if (activeMainTab === 'r2r_incoming') {
          loadIncomingRequests();
      } else if (activeMainTab === 'r2r_outgoing') {
          loadOutgoingRequests();
      }
  }, [activeMainTab]);

  // 2. Fetch Cars Function
  const loadCars = async (dpcId: string, start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!start || !end) throw new Error("Tanggal sewa wajib diisi.");
      
      const data = await marketplaceService.getMarketplaceCars(start, end, {
          dpcId: dpcId || undefined,
          search: searchTerm || undefined,
          brand: filterBrand || undefined,
          transmission: filterTrans || undefined,
          fuelType: filterFuel || undefined,
          category: filterCategory || undefined,
          year: filterYear ? Number(filterYear) : undefined
      });
      setCars(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat data marketplace.");
    } finally {
      setLoading(false);
    }
  };

  const loadIncomingRequests = async () => {
      setLoadingList(true);
      try {
          const data = await marketplaceRequestService.getIncomingRequests();
          setIncomingRequests(data);
      } catch (e) { console.error(e); } finally { setLoadingList(false); }
  };

  const loadOutgoingRequests = async () => {
      setLoadingList(true);
      try {
          const data = await marketplaceRequestService.getOutgoingRequests();
          setOutgoingRequests(data);
      } catch (e) { console.error(e); } finally { setLoadingList(false); }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadCars(selectedDpc, startDate, endDate);
  };

  const handleSelectCar = async (car: Car) => {
      setSelectedCar(car);
      setActiveGalleryImage(getCarImage(car)); // Set main image as initial
      setSelectedDriver(null);
      setAvailableDrivers([]);
      setReviews([]);
      setModalTab('details'); // Reset tab
      setSupplierHighSeasons([]); // Reset supplier high season data
      
      setLoadingDrivers(true);
      try {
          // Parallel: Get Drivers AND Get Supplier's High Season Rules
          const [drivers, hsRules] = await Promise.all([
              marketplaceService.getAvailableDrivers(car.company_id, startDate, endDate),
              highSeasonService.getHighSeasonsByCompanyId(car.company_id)
          ]);
          setAvailableDrivers(drivers);
          setSupplierHighSeasons(hsRules);
      } catch (e) { console.error(e); } finally { setLoadingDrivers(false); }
  };

  const loadReviews = async () => {
      if (!selectedCar) return;
      setLoadingReviews(true);
      try {
          const data = await marketplaceService.getCarReviews(selectedCar.id);
          setReviews(data);
      } catch (e) { console.error(e); } finally { setLoadingReviews(false); }
  };

  useEffect(() => {
      if (modalTab === 'reviews' && reviews.length === 0) loadReviews();
  }, [modalTab]);

  const closeModal = () => {
      setSelectedCar(null);
      setSelectedDriver(null);
      setActiveGalleryImage(null);
      setShowConfirmModal(false);
  };

  // Helper to check overlapped high seasons based on provided rules
  const calculateHighSeasonSurcharge = (hsRules: HighSeason[]) => {
      if (hsRules.length === 0) return { amount: 0, names: [] };

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      let totalSurcharge = 0;
      let eventNames: string[] = [];

      let currentDate = new Date(start);
      currentDate.setHours(0,0,0,0); // Normalise

      for (let i = 0; i < days; i++) {
          const checkTime = currentDate.getTime();
          // Find rule that covers this day
          const season = hsRules.find(hs => {
              const s = new Date(hs.startDate).setHours(0,0,0,0);
              const e = new Date(hs.endDate).setHours(23,59,59,999);
              return checkTime >= s && checkTime <= e;
          });

          if (season) {
              totalSurcharge += season.priceIncrease;
              if (!eventNames.includes(season.name)) eventNames.push(season.name);
          }
          currentDate.setDate(currentDate.getDate() + 1);
      }

      return { amount: totalSurcharge, names: eventNames };
  };

  // Display Alert for general user view (using myHighSeasons)
  const generalHighSeasonAlert = calculateHighSeasonSurcharge(myHighSeasons);

  const calculateTotalPrice = () => {
      if(!selectedCar) return { total: 0, highSeason: 0 };
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
      
      let price = selectedCar.price_per_day * days;
      if (selectedDriver) {
          const driverRate = selectedDriver.dailyRate || 150000;
          price += (driverRate * days);
      }

      // Add High Season Surcharge based on SUPPLIER rules
      const hsResult = calculateHighSeasonSurcharge(supplierHighSeasons);
      price += hsResult.amount;

      return { total: price, highSeason: hsResult.amount, hsNames: hsResult.names };
  };

  const handleSendBookingRequest = async () => {
      if (!selectedCar) return;
      setSendingRequest(true);
      try {
          const { total } = calculateTotalPrice();
          await marketplaceRequestService.sendRequest({
              supplier_company_id: selectedCar.company_id,
              car_id: selectedCar.id,
              driver_id: selectedDriver?.id,
              start_date: `${startDate}T08:00:00`,
              end_date: `${endDate}T08:00:00`,
              total_price: total
          });
          alert("Permintaan sewa berhasil dikirim! Cek status di tab 'Status Order Saya'.");
          closeModal();
          setActiveMainTab('r2r_outgoing');
      } catch (err: any) {
          alert("Gagal mengirim permintaan: " + err.message);
      } finally {
          setSendingRequest(false);
      }
  };

  // --- ACTIONS ---

  // SUPPLIER ACTIONS
  const handleProcessOrder = (req: MarketplaceRequest) => {
      // Redirect to Booking Form with state to pre-fill
      navigate('/dashboard/bookings/new', { 
          state: { 
              r2rRequest: req,
              mode: 'supplier_process' // Mode: I am supplier accepting an order
          }
      });
  };

  const handleRejectRequest = async (id: string) => {
      if(!window.confirm("Tolak pesanan ini?")) return;
      try {
          await marketplaceRequestService.updateStatus(id, 'rejected');
          loadIncomingRequests();
      } catch(e: any) {
          alert("Error: " + e.message);
      }
  };

  // RENTER ACTIONS
  const handleCreateCustomerInvoice = (req: MarketplaceRequest) => {
      // Redirect to Booking Form with state to pre-fill
      navigate('/dashboard/bookings/new', { 
          state: { 
              r2rRequest: req,
              mode: 'renter_create' // Mode: I am renter creating invoice for my customer using external car
          } 
      });
  };

  const getCarImage = (car: Car) => {
      if (car.image_url) return car.image_url;
      const t = (car.brand + " " + car.model).toLowerCase();
      return 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=400'; 
  };

  const handleManualWA = (car: Car) => {
      const ownerPhone = (car.companies as any)?.phone;
      if (!ownerPhone) return;
      const message = `Halo, saya tertarik dengan unit ${car.brand} ${car.model} di Marketplace ASPERDA.`;
      window.open(`https://wa.me/${ownerPhone.replace(/^0/, '62')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const StarRating = ({ rating, count }: { rating: number, count?: number }) => (
      <div className="flex items-center gap-1">
          <Star size={12} className={rating > 0 ? "fill-yellow-400 text-yellow-400" : "fill-slate-200 text-slate-300"} />
          <span className="text-xs font-bold text-slate-700">{rating > 0 ? rating : '0'}</span>
          {count !== undefined && <span className="text-[10px] text-slate-400">({count})</span>}
      </div>
  );

  const { total: finalTotalPrice, highSeason: finalHighSeasonAmount, hsNames: finalHsNames } = calculateTotalPrice();

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      
      {/* HEADER SECTION WITH TABS */}
      <div className="bg-slate-900 pt-8 pb-32 px-4 sm:px-6 lg:px-8 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl -ml-10 -mb-10"></div>

          <div className="relative z-10 max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                  <div>
                      <h1 className="text-3xl font-extrabold text-white tracking-tight">Marketplace</h1>
                      <p className="text-blue-200 mt-2 text-sm max-w-xl">
                          Jaringan sewa mobil antar rental (B2B) terintegrasi.
                      </p>
                  </div>
                  
                  {/* MAIN TABS SWITCHER */}
                  <div className="bg-white/10 backdrop-blur-md p-1 rounded-xl flex gap-1 overflow-x-auto">
                      <button 
                        onClick={() => setActiveMainTab('browse')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeMainTab === 'browse' ? 'bg-white text-slate-900 shadow-lg' : 'text-blue-200 hover:bg-white/5'}`}
                      >
                          <Search className="inline-block mr-2" size={14}/> Cari Unit
                      </button>
                      <button 
                        onClick={() => setActiveMainTab('r2r_outgoing')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeMainTab === 'r2r_outgoing' ? 'bg-white text-slate-900 shadow-lg' : 'text-blue-200 hover:bg-white/5'}`}
                      >
                          <ShoppingBag className="inline-block mr-2" size={14}/> Status Order Saya
                      </button>
                      <button 
                        onClick={() => setActiveMainTab('r2r_incoming')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeMainTab === 'r2r_incoming' ? 'bg-white text-slate-900 shadow-lg' : 'text-blue-200 hover:bg-white/5'}`}
                      >
                          <ArrowRight className="inline-block mr-2" size={14}/> Pesanan Masuk
                      </button>
                  </div>
              </div>

              {/* SEARCH BAR (Only visible on Browse Tab) */}
              {activeMainTab === 'browse' && (
                  <div className="bg-white rounded-xl shadow-2xl p-4 border border-slate-200 transform translate-y-8 animate-in fade-in slide-in-from-bottom-4">
                      <form onSubmit={handleFilter} className="space-y-4">
                          
                          {/* Row 1: Primary Search & Date */}
                          <div className="flex flex-col lg:flex-row gap-3">
                              <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 hover:border-blue-400 transition-colors">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Search size={10} /> Cari Unit (Merk/Model)</label>
                                  <input type="text" className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 placeholder-slate-400" placeholder="Ketik Merk (misal: Innova)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                              </div>
                              <div className="lg:w-48 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 hover:border-blue-400 transition-colors">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><MapPin size={10} /> Wilayah</label>
                                  <select className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 cursor-pointer" value={selectedDpc} onChange={(e) => setSelectedDpc(e.target.value)}>
                                      <option value="">Semua Wilayah</option>
                                      {dpcRegions.map((dpc) => (<option key={dpc.id} value={dpc.id}>{dpc.name}</option>))}
                                  </select>
                              </div>
                              <div className="flex gap-2 lg:contents">
                                  <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 hover:border-blue-400 transition-colors">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar size={10} /> Ambil</label>
                                      <input type="date" className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 cursor-pointer" value={startDate} onChange={(e) => setStartDate(e.target.value)}/>
                                  </div>
                                  <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2 hover:border-blue-400 transition-colors">
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar size={10} /> Kembali</label>
                                      <input type="date" className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-800 focus:ring-0 cursor-pointer" value={endDate} onChange={(e) => setEndDate(e.target.value)}/>
                                  </div>
                              </div>
                          </div>

                          {/* Row 2: Advanced Filters */}
                          <div className="flex flex-col md:flex-row gap-3">
                              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {/* Filter: Category */}
                                  <select 
                                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                    value={filterCategory}
                                    onChange={e => setFilterCategory(e.target.value)}
                                  >
                                      <option value="">Semua Kategori</option>
                                      {settings.carCategories?.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>

                                  {/* Filter: Transmission */}
                                  <select 
                                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                    value={filterTrans}
                                    onChange={e => setFilterTrans(e.target.value)}
                                  >
                                      <option value="">Semua Transmisi</option>
                                      <option value="automatic">Automatic</option>
                                      <option value="manual">Manual</option>
                                  </select>

                                  {/* Filter: Year */}
                                  <select
                                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                    value={filterYear}
                                    onChange={e => setFilterYear(e.target.value)}
                                  >
                                      <option value="">Semua Tahun</option>
                                      <option value="2024">2024 ke atas</option>
                                      <option value="2023">2023 ke atas</option>
                                      <option value="2020">2020 ke atas</option>
                                      <option value="2018">2018 ke atas</option>
                                  </select>

                                  {/* Filter: Fuel */}
                                  <select 
                                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                    value={filterFuel}
                                    onChange={e => setFilterFuel(e.target.value)}
                                  >
                                      <option value="">Semua BBM</option>
                                      {settings.fuelTypes?.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                                  </select>
                              </div>

                              <div className="md:w-auto">
                                  <button type="submit" disabled={loading} className="w-full h-full min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg px-6 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all text-sm">
                                      {loading ? <i className="fas fa-spinner fa-spin"></i> : <Search size={16} />} Cari Mobil
                                  </button>
                              </div>
                          </div>
                      </form>
                  </div>
              )}
          </div>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          
          {/* TAB 1: BROWSE */}
          {activeMainTab === 'browse' && (
              <>
                {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6 flex items-center gap-3"><i className="fas fa-exclamation-triangle text-red-500"></i><span className="text-red-700 font-medium">{error}</span></div>}
                
                {/* HIGH SEASON ALERT */}
                {!loading && generalHighSeasonAlert.amount > 0 && (
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg mb-6 flex items-start gap-3 shadow-sm animate-in fade-in">
                        <AlertTriangle className="text-orange-600 mt-0.5" size={24}/>
                        <div>
                            <h4 className="font-bold text-orange-800 text-sm uppercase">Peringatan: High Season</h4>
                            <p className="text-orange-700 text-sm mt-1">
                                Tanggal yang Anda pilih termasuk dalam periode event: <strong>{generalHighSeasonAlert.names.join(', ')}</strong>. 
                                Kemungkinan akan ada penyesuaian harga (Surcharge) dari masing-masing rental saat pengajuan booking.
                            </p>
                        </div>
                    </div>
                )}

                {/* Info Bar */}
                {!loading && cars.length > 0 && (
                    <div className="flex justify-between items-center mb-4 text-xs text-slate-500">
                        <span>Menampilkan <strong>{cars.length}</strong> unit tersedia & STNK aktif.</span>
                        <span>Diurutkan berdasarkan Rating & Ulasan</span>
                    </div>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1,2,3,4].map(i => (<div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 h-80 animate-pulse"><div className="bg-slate-200 h-40 rounded-xl mb-4"></div><div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div></div>))}
                    </div>
                ) : cars.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Search size={40} className="text-slate-300"/></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Unit Tidak Ditemukan</h3>
                    <p className="text-slate-500 max-w-md mx-auto">Coba ubah filter pencarian Anda atau cari tanggal lain.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {cars.map((car) => (
                        <div key={car.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 overflow-hidden transition-all duration-300 group flex flex-col h-full">
                        <div className="relative h-48 overflow-hidden bg-slate-100">
                            <img src={getCarImage(car)} alt={car.model} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"/>
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-blue-700 text-[10px] font-extrabold px-2 py-1 rounded shadow-sm border border-white/50 uppercase tracking-wide">{car.transmission}</div>
                            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded shadow-sm border border-white/50"><StarRating rating={car.average_rating || 0} count={car.review_count || 0} /></div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent p-4">
                                <h3 className="text-white font-bold text-lg leading-tight shadow-black drop-shadow-md">{car.brand} {car.model}</h3>
                                <p className="text-slate-300 text-xs mt-0.5">{car.year} • {car.category || 'MPV'}</p>
                            </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {(car.companies as any)?.logo_url ? <img src={(car.companies as any).logo_url} className="w-full h-full object-cover" alt="Logo"/> : <Building size={18} className="text-slate-400"/>}
                                </div>
                                <div className="overflow-hidden">
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Pemilik Unit</div>
                                    <div className="font-bold text-slate-800 text-sm leading-tight truncate">{(car.companies as any)?.name}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate"><MapPin size={10}/> {(car.companies as any)?.dpc_regions?.name || 'Indonesia'}</div>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {car.fuel_type && <span className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-600 flex items-center gap-1">{car.fuel_type === 'Electric' ? <Zap size={10}/> : <Fuel size={10}/>} {car.fuel_type}</span>}
                                <span className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-600 flex items-center gap-1"><Settings size={10}/> {car.transmission === 'automatic' ? 'Matic' : 'Manual'}</span>
                            </div>
                            <div className="mt-auto pt-4 border-t border-slate-100">
                                <div className="flex justify-between items-end mb-4">
                                    <div className="text-xs text-slate-400 font-medium">Lepas Kunci</div>
                                    <div className="text-lg font-black text-slate-900">Rp {car.price_per_day.toLocaleString('id-ID')}<span className="text-xs font-normal text-slate-400 ml-1">/hari</span></div>
                                </div>
                                <button onClick={() => handleSelectCar(car)} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-600/20">Lihat Detail & Pesan</button>
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>
                )}
              </>
          )}

          {/* TAB 2: INCOMING REQUESTS (Supplier) */}
          {activeMainTab === 'r2r_incoming' && (
              <div className="animate-in fade-in">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><Clock size={24}/></div>
                      <div>
                          <h3 className="text-xl font-bold text-slate-900">Pesanan Masuk (Rent-to-Rent)</h3>
                          <p className="text-slate-500 text-sm">Permintaan sewa dari rental lain. Terima untuk proses booking.</p>
                      </div>
                  </div>

                  {loadingList ? (
                      <div className="text-center py-12"><i className="fas fa-spinner fa-spin text-slate-400"></i> Loading...</div>
                  ) : incomingRequests.length === 0 ? (
                      <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
                          <h4 className="font-bold text-slate-700 mb-1">Belum ada pesanan masuk</h4>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {incomingRequests.map(req => {
                              const requester = req.requester as any;
                              const car = req.cars as any;
                              
                              return (
                                  <div key={req.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
                                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${req.status === 'approved' ? 'bg-green-500' : req.status === 'rejected' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                                      
                                      <div className="w-full md:w-32 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                                          {car?.image_url ? (<img src={car.image_url} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-slate-400"><CarIcon size={24}/></div>)}
                                      </div>

                                      <div className="flex-1 space-y-2 w-full">
                                          <div className="flex justify-between items-start">
                                              <div>
                                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Pemohon</div>
                                                  <h4 className="font-bold text-slate-900 text-lg">{requester?.name || 'Unknown Rental'}</h4>
                                                  <p className="text-xs text-slate-500">{requester?.owner_name}</p>
                                              </div>
                                              <div className="text-right">
                                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Total Penawaran</div>
                                                  <div className="font-bold text-blue-600 text-lg">Rp {req.total_price.toLocaleString('id-ID')}</div>
                                              </div>
                                          </div>
                                          
                                          <div className="flex gap-4 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                              <div className="flex items-center gap-2">
                                                  <Calendar size={14} className="text-slate-400"/>
                                                  <span className="font-medium">{new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <CarIcon size={14} className="text-slate-400"/>
                                                  <span>{car?.brand} {car?.model}</span>
                                              </div>
                                          </div>
                                      </div>

                                      <div className="flex flex-col items-center gap-3 min-w-[140px]">
                                          <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                              {req.status}
                                          </span>
                                          
                                          {req.status === 'pending' && (
                                              <div className="flex gap-2 w-full">
                                                  <button onClick={() => handleRejectRequest(req.id)} className="flex-1 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-bold text-xs">Tolak</button>
                                                  <button onClick={() => handleProcessOrder(req)} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-xs shadow-md">Proses Order</button>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          )}

          {/* TAB 3: OUTGOING REQUESTS (Renter) */}
          {activeMainTab === 'r2r_outgoing' && (
              <div className="animate-in fade-in">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><ShoppingBag size={24}/></div>
                      <div>
                          <h3 className="text-xl font-bold text-slate-900">Status Order Saya</h3>
                          <p className="text-slate-500 text-sm">Daftar permintaan sewa unit ke rental lain.</p>
                      </div>
                  </div>

                  {loadingList ? (
                      <div className="text-center py-12"><i className="fas fa-spinner fa-spin text-slate-400"></i> Loading...</div>
                  ) : outgoingRequests.length === 0 ? (
                      <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
                          <h4 className="font-bold text-slate-700 mb-1">Belum ada order keluar</h4>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {outgoingRequests.map(req => {
                              const supplier = (req as any).supplier;
                              const car = req.cars as any;
                              
                              return (
                                  <div key={req.id} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6">
                                      <div className="w-full md:w-32 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                                          {car?.image_url ? (<img src={car.image_url} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-slate-400"><CarIcon size={24}/></div>)}
                                      </div>

                                      <div className="flex-1 space-y-2 w-full">
                                          <div className="flex justify-between items-start">
                                              <div>
                                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Supplier Unit</div>
                                                  <h4 className="font-bold text-slate-900 text-lg">{supplier?.name || 'Unknown Rental'}</h4>
                                              </div>
                                              <div className="text-right">
                                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Total Biaya</div>
                                                  <div className="font-bold text-blue-600 text-lg">Rp {req.total_price.toLocaleString('id-ID')}</div>
                                              </div>
                                          </div>
                                          
                                          <div className="flex gap-4 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                              <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400"/><span>{new Date(req.start_date).toLocaleDateString()}</span></div>
                                              <div className="flex items-center gap-2"><CarIcon size={14} className="text-slate-400"/><span>{car?.brand} {car?.model}</span></div>
                                          </div>
                                      </div>

                                      <div className="flex flex-col items-center gap-3 min-w-[140px]">
                                          <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full ${req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                              {req.status}
                                          </span>
                                          
                                          {req.status === 'approved' && (
                                              <button onClick={() => handleCreateCustomerInvoice(req)} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-xs shadow-md flex items-center justify-center gap-2">
                                                  <FileText size={14}/> Buat Invoice Pelanggan
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
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

                  {/* Tabs inside modal */}
                  <div className="flex border-b border-slate-100 bg-white">
                      <button onClick={() => setModalTab('details')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${modalTab === 'details' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Informasi Unit</button>
                      <button onClick={() => setModalTab('reviews')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${modalTab === 'reviews' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Ulasan ({selectedCar.review_count || 0})</button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-0 overflow-y-auto flex-1">
                      {modalTab === 'details' && (
                          <div className="animate-in fade-in">
                              <div className="bg-black relative aspect-video flex items-center justify-center overflow-hidden">
                                  <img src={activeGalleryImage || getCarImage(selectedCar)} className="w-full h-full object-contain" alt="Main View"/>
                              </div>
                              {selectedCar.gallery && (
                                  <div className="flex gap-2 p-2 overflow-x-auto bg-slate-900 scrollbar-hide">
                                      <div onClick={() => setActiveGalleryImage(getCarImage(selectedCar))} className={`w-20 h-14 flex-shrink-0 rounded overflow-hidden cursor-pointer border-2 ${activeGalleryImage === getCarImage(selectedCar) ? 'border-blue-500' : 'border-transparent'}`}><img src={getCarImage(selectedCar)} className="w-full h-full object-cover"/></div>
                                      {Object.values(selectedCar.gallery).filter(Boolean).map((url, idx) => (<div key={idx} onClick={() => setActiveGalleryImage(url!)} className={`w-20 h-14 flex-shrink-0 rounded overflow-hidden cursor-pointer border-2 ${activeGalleryImage === url ? 'border-blue-500' : 'border-transparent'}`}><img src={url!} className="w-full h-full object-cover"/></div>))}
                                  </div>
                              )}

                              <div className="p-6 space-y-6">
                                  {selectedCar.description && <div><h4 className="font-bold text-slate-800 mb-2 border-b pb-1 text-sm">Deskripsi & Fasilitas</h4><p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedCar.description}</p></div>}
                                  
                                  {/* Driver Selection */}
                                  <div>
                                      <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">Opsi Driver (Opsional)</h4>
                                      {loadingDrivers ? <div className="p-4 text-center text-slate-500 text-sm"><i className="fas fa-spinner fa-spin mr-2"></i> Mencari driver available...</div> : availableDrivers.length === 0 ? <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500">Tidak ada driver available dari rental ini untuk tanggal tersebut.</div> : (
                                          <div className="space-y-2">
                                              {availableDrivers.map(driver => (
                                                  <div key={driver.id} onClick={() => setSelectedDriver(selectedDriver?.id === driver.id ? null : driver)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedDriver?.id === driver.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                                                      <div className="flex items-center gap-3">
                                                          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">{driver.image_url ? <img src={driver.image_url} className="w-full h-full object-cover"/> : <UserCheck className="w-full h-full p-2 text-slate-400"/>}</div>
                                                          <div><div className="font-bold text-sm text-slate-900">{driver.full_name}</div><div className="flex items-center gap-2 mt-0.5"><StarRating rating={driver.rating || 0} count={driver.review_count || 0}/><span className="text-[10px] text-slate-500">• {driver.dailyRate ? `Rp ${driver.dailyRate.toLocaleString()}/hari` : 'Harga Std'}</span></div></div>
                                                      </div>
                                                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedDriver?.id === driver.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>{selectedDriver?.id === driver.id && <div className="w-2 h-2 bg-white rounded-full"></div>}</div>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>

                                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
                                      <div className="flex justify-between"><span className="text-slate-500">Unit Mobil</span><span className="font-bold text-slate-900">Rp {selectedCar.price_per_day.toLocaleString()} /hari</span></div>
                                      {selectedDriver && <div className="flex justify-between text-blue-700"><span className="">+ Driver ({selectedDriver.full_name})</span><span className="font-bold">Rp {(selectedDriver.dailyRate || 150000).toLocaleString()} /hari</span></div>}
                                      {finalHighSeasonAmount > 0 && <div className="flex justify-between text-orange-600"><span className="">+ High Season ({finalHsNames.join(', ')})</span><span className="font-bold">Rp {finalHighSeasonAmount.toLocaleString()}</span></div>}
                                  </div>
                              </div>
                          </div>
                      )}
                      
                      {/* Reviews Tab Content - Keep same */}
                      {modalTab === 'reviews' && (
                          <div className="p-6 animate-in fade-in">
                              {loadingReviews ? <div className="text-center py-8 text-slate-500"><i className="fas fa-spinner fa-spin mr-2"></i> Memuat ulasan...</div> : reviews.length === 0 ? <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200"><MessageCircle className="mx-auto text-slate-300 mb-2" size={32}/><p className="text-slate-500 text-sm">Belum ada ulasan untuk mobil ini.</p></div> : (
                                  <div className="space-y-4">{reviews.map((rev, idx) => (<div key={idx} className="border-b border-slate-100 pb-4 last:border-none"><div className="flex justify-between items-start mb-1"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User size={16}/></div><div><div className="text-sm font-bold text-slate-800">{rev.reviewer_name}</div><StarRating rating={rev.rating} /></div></div><span className="text-[10px] text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</span></div><p className="text-sm text-slate-600 pl-10 mt-1 italic">"{rev.comment}"</p></div>))}</div>
                              )}
                          </div>
                      )}
                  </div>

                  {/* Modal Footer */}
                  {modalTab === 'details' && !showConfirmModal && (
                      <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex gap-3">
                          <button onClick={() => handleManualWA(selectedCar)} className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 font-bold py-3 rounded-xl border border-green-200 flex items-center justify-center gap-2">
                              <MessageCircle size={18}/> Tanya via WA
                          </button>
                          <button onClick={() => setShowConfirmModal(true)} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2">
                              <ShoppingBag size={18}/> Ajukan Sewa (R2R)
                          </button>
                      </div>
                  )}
                  
                  {/* CONFIRMATION OVERLAY */}
                  {showConfirmModal && (
                      <div className="absolute inset-0 bg-white z-20 flex flex-col animate-in slide-in-from-bottom-10">
                          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                              <h3 className="font-bold text-slate-900">Konfirmasi Pengajuan</h3>
                              <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                          </div>
                          <div className="flex-1 p-6 overflow-y-auto">
                              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 rounded-r-lg">
                                  <h4 className="text-sm font-bold text-orange-800 flex items-center gap-2"><Clock size={16}/> System Auto-Expire</h4>
                                  <p className="text-xs text-orange-700 mt-1">
                                      Permintaan sewa ini akan otomatis kadaluarsa dalam <strong>60 menit</strong> jika tidak direspon oleh pemilik rental.
                                  </p>
                              </div>
                              
                              <div className="space-y-4">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Total Estimasi</label>
                                      <div className="text-3xl font-black text-slate-900">Rp {finalTotalPrice.toLocaleString('id-ID')}</div>
                                      {finalHighSeasonAmount > 0 && (
                                          <p className="text-xs text-orange-600 font-medium mt-1">
                                              *Termasuk biaya High Season {finalHsNames.join(', ')} (Rp {finalHighSeasonAmount.toLocaleString()})
                                          </p>
                                      )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tanggal</label>
                                          <div className="font-medium text-slate-700">{new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</div>
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Unit</label>
                                          <div className="font-medium text-slate-700">{selectedCar.brand} {selectedCar.model}</div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div className="p-4 border-t border-slate-100">
                              <button 
                                onClick={handleSendBookingRequest} 
                                disabled={sendingRequest}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                  {sendingRequest ? <i className="fas fa-spinner fa-spin"></i> : <CheckCircle size={20}/>}
                                  {sendingRequest ? 'Mengirim...' : 'Kirim Pengajuan Sekarang'}
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

    </div>
  );
};
