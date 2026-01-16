
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, AppSettings, Driver } from '../../types';
import { carService } from '../../service/carService';
import { driverService } from '../../service/driverService';
import { getStoredData, DEFAULT_SETTINGS as GLOBAL_DEFAULTS } from '../../service/dataService';
import { Calculator, Calendar, Navigation, MapPin, Search, ArrowRight, ArrowDown, Tag, User as UserIcon, MessageCircle, Locate, Repeat, Map, PlusCircle, Moon } from 'lucide-react';

// Declare Leaflet globals
declare global {
  interface Window {
    L: any;
  }
}

const CalculatorPage = () => {
  const navigate = useNavigate();
  const [cars, setCars] = useState<Car[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [settings, setSettings] = useState<AppSettings>(GLOBAL_DEFAULTS);

  // Inputs
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('08:00');
  
  const [selectedCarId, setSelectedCarId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [useDriver, setUseDriver] = useState(false);
  
  // NEW: Overnight Fee Toggle
  const [includeOvernight, setIncludeOvernight] = useState(true);
  
  const [distance, setDistance] = useState<number>(0);
  const [selectedTolls, setSelectedTolls] = useState<string[]>([]); // Array of Toll IDs
  
  // NEW: Coverage Area
  const [selectedCoverageId, setSelectedCoverageId] = useState('');

  // NEW: Search Tolls
  const [tollSearch, setTollSearch] = useState('');
  
  // NEW: Round Trip State
  const [isRoundTrip, setIsRoundTrip] = useState(false);

  // Custom Routing Inputs
  const [startLocation, setStartLocation] = useState('Surabaya');
  const [endLocation, setEndLocation] = useState('Malang');
  const [isSearching, setIsSearching] = useState(false);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const routingControlRef = useRef<any>(null);

  // Result State
  const [result, setResult] = useState<{
      days: number;
      rentalCost: number;
      fuelCost: number;
      driverCost: number;
      driverTier: string; 
      tollCost: number;
      
      // Surcharges
      areaRentSurcharge: number;
      areaDriverSurcharge: number;
      coverageName: string;
      
      // New: Overnight
      overnightCost: number;
      nights: number;

      totalBase: number;
      totalAgent: number;
      totalCustomer: number;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
       try {
         // Load Settings from Storage
         const loadedSettings = getStoredData<AppSettings>('appSettings', GLOBAL_DEFAULTS);
         setSettings({ ...GLOBAL_DEFAULTS, ...loadedSettings });

         const [carsData, driversData] = await Promise.all([
            carService.getCars(),
            driverService.getDrivers()
         ]);
         setCars(carsData);
         setDrivers(driversData);
       } catch (err) {
         console.error("Failed to load calculator data", err);
       }
    };
    fetchData();
  }, []);

  // --- LEAFLET MAP INITIALIZATION --- (Omitted for brevity, standard Leaflet setup)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    if (window.L && window.L.Routing) {
        const L = window.L;
        try {
            const map = L.map(mapContainerRef.current).setView([-7.2575, 112.7521], 9); 
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);

            const control = L.Routing.control({
                waypoints: [
                    L.latLng(-7.2575, 112.7521),
                    L.latLng(-7.9666, 112.6326)
                ],
                router: L.Routing.osrmv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1'
                }),
                routeWhileDragging: false,
                showAlternatives: false,
                fitSelectedRoutes: true,
                show: false, 
                addWaypoints: false,
                lineOptions: {
                    styles: [{color: '#6366f1', opacity: 0.8, weight: 6}]
                },
                createMarker: function(i: number, waypoint: any, n: number) {
                    return L.marker(waypoint.latLng, { draggable: true });
                }
            }).addTo(map);

            const container = document.querySelector('.leaflet-routing-container');
            if (container) (container as HTMLElement).style.display = 'none';

            control.on('routesfound', function(e: any) {
                const routes = e.routes;
                if (routes && routes.length > 0) {
                    const summary = routes[0].summary;
                    const distKm = parseFloat((summary.totalDistance / 1000).toFixed(1));
                    setDistance(distKm);
                }
            });

            routingControlRef.current = control;
            mapInstanceRef.current = map;
        } catch (err) {
            console.error("Map initialization failed:", err);
        }
    }
    return () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
            routingControlRef.current = null;
        }
    };
  }, []);

  const triggerLocateUser = () => { /* ...existing logic... */ };
  const handleRouteSearch = async () => { /* ...existing logic... */ };
  const handleTollToggle = (tollId: string) => { /* ...existing logic... */ };

  const calculate = () => {
      if (!selectedCarId) return;

      let days = 0;
      if (startDate && endDate) {
          const start = new Date(`${startDate}T${startTime}`);
          const end = new Date(`${endDate}T${endTime}`);
          const diffMs = end.getTime() - start.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          days = Math.max(1, Math.ceil(diffHours / 24));
      }

      const car = cars.find(c => c.id === selectedCarId);
      if (!car) return;

      const rentalCost = car.price_per_day * days;

      // --- COVERAGE AREA SURCHARGES ---
      let areaRentSurcharge = 0;
      let areaDriverSurcharge = 0;
      let coverageName = '';

      if (selectedCoverageId && settings.coverageAreas) {
          const area = settings.coverageAreas.find(a => a.id === selectedCoverageId);
          if (area) {
              areaRentSurcharge = area.extraPrice * days;
              if (useDriver) {
                  areaDriverSurcharge = area.extraDriverPrice * days;
              }
              coverageName = area.name;
          }
      }

      // --- DRIVER COST CALCULATION ---
      let driverCost = 0;
      let driverTier = '';
      let overnightCost = 0;
      let nights = 0;
      
      if (useDriver) {
          let dailyDriverRate = 0;
          
          // 1. Check Car Specific Driver Salary (Priority)
          if (car.driver_daily_salary && car.driver_daily_salary > 0) {
              dailyDriverRate = car.driver_daily_salary;
              driverTier = `Unit Rate (${car.brand})`;
          } 
          // 2. Fallback to Distance / Settings logic
          else {
              const totalTripDistance = isRoundTrip ? distance * 2 : distance;
              const shortLimit = settings.driverShortDistanceLimit || 30;
              const longLimit = settings.driverLongDistanceLimit || 600;
              const shortPrice = settings.driverShortDistancePrice || 100000;
              const longPrice = settings.driverLongDistancePrice || 500000;

              if (totalTripDistance > 0 && totalTripDistance < shortLimit) {
                  dailyDriverRate = shortPrice;
                  driverTier = `Jarak Dekat (<${shortLimit}km)`;
              } else if (totalTripDistance > longLimit) {
                  dailyDriverRate = longPrice;
                  driverTier = `Jarak Jauh (>${longLimit}km)`;
              } else {
                  if (selectedDriverId) {
                      const drv = drivers.find(d => d.id === selectedDriverId);
                      dailyDriverRate = drv?.dailyRate || 150000;
                  } else {
                      dailyDriverRate = 150000; 
                  }
                  driverTier = `Standar`;
              }
          }
          
          driverCost = dailyDriverRate * days;

          // Overnight Calculation
          if (days > 1 && includeOvernight) {
              nights = days - 1; // Assuming staying every night between start and end
              const pricePerNight = settings.driverOvernightPrice || 150000;
              overnightCost = nights * pricePerNight;
          }
      }

      let fuelCost = 0;
      const fuelRatio = car.fuel_ratio || 10;
      const fuelType = car.fuel_type || 'Pertalite';

      if (distance > 0) {
          const fuelPrice = settings.fuelTypes?.find(f => f.name === fuelType)?.price || 10000;
          const effectiveDistance = isRoundTrip ? distance * 2 : distance;
          const litersNeeded = effectiveDistance / fuelRatio;
          const rawCost = litersNeeded * fuelPrice;
          fuelCost = Math.ceil(rawCost / 1000) * 1000;
      }

      let tollCost = 0;
      selectedTolls.forEach(tid => {
          const toll = settings.tollRates?.find(t => t.id === tid);
          if (toll) tollCost += toll.price;
      });
      if (isRoundTrip) tollCost = tollCost * 2;

      const totalBase = rentalCost + fuelCost + driverCost + tollCost + areaRentSurcharge + areaDriverSurcharge + overnightCost;
      
      // Markup Calculations
      const agentVal = settings.agentMarkupValue || 10;
      const custVal = settings.customerMarkupValue || 20;
      
      let totalAgent = 0;
      if (settings.agentMarkupType === 'Nominal') {
          totalAgent = totalBase + agentVal;
      } else {
          totalAgent = totalBase + (totalBase * agentVal / 100);
      }
      
      let totalCustomer = 0;
      if (settings.customerMarkupType === 'Nominal') {
          totalCustomer = totalBase + custVal;
      } else {
          totalCustomer = totalBase + (totalBase * custVal / 100);
      }

      totalAgent = Math.ceil(totalAgent / 1000) * 1000;
      totalCustomer = Math.ceil(totalCustomer / 1000) * 1000;

      setResult({
          days,
          rentalCost,
          fuelCost,
          driverCost,
          driverTier,
          tollCost,
          areaRentSurcharge,
          areaDriverSurcharge,
          coverageName,
          overnightCost,
          nights,
          totalBase,
          totalAgent,
          totalCustomer
      });
  };

  useEffect(() => {
      calculate();
  }, [startDate, startTime, endDate, endTime, selectedCarId, useDriver, selectedDriverId, selectedCoverageId, distance, selectedTolls, isRoundTrip, cars, drivers, settings, includeOvernight]);

  const selectedCar = cars.find(c => c.id === selectedCarId);

  const filteredTolls = (settings.tollRates || []).filter(t => 
      t.name.toLowerCase().includes(tollSearch.toLowerCase())
  );

  const handleSendWhatsApp = () => {
      if (!result || !selectedCar) return;

      const message = `*ESTIMASI BIAYA PERJALANAN* 🚗
---------------------------
Unit: ${selectedCar.brand} ${selectedCar.model} (${selectedCar.license_plate})
Rute: ${startLocation} -> ${endLocation} ${isRoundTrip ? '(PP)' : ''}
Durasi: ${result.days} Hari (${new Date(startDate).toLocaleDateString('id-ID')} s.d ${new Date(endDate).toLocaleDateString('id-ID')})
Wilayah: ${result.coverageName || 'Standard'}

*Rincian Biaya:*
• Sewa Unit: Rp ${result.rentalCost.toLocaleString('id-ID')}
• Driver: Rp ${result.driverCost.toLocaleString('id-ID')} ${result.driverTier ? `(${result.driverTier})` : ''}
${result.overnightCost > 0 ? `• Biaya Inap Driver: Rp ${result.overnightCost.toLocaleString('id-ID')} (${result.nights} Malam)\n` : ''}${result.areaRentSurcharge > 0 ? `• Surcharge Area (Unit): Rp ${result.areaRentSurcharge.toLocaleString('id-ID')}\n` : ''}${result.areaDriverSurcharge > 0 ? `• Surcharge Area (Driver): Rp ${result.areaDriverSurcharge.toLocaleString('id-ID')}\n` : ''}• BBM (Est): Rp ${result.fuelCost.toLocaleString('id-ID')}
• Tol (Est): Rp ${result.tollCost.toLocaleString('id-ID')}

*TOTAL ESTIMASI (NET): Rp ${result.totalBase.toLocaleString('id-ID')}*
---------------------------
_Harga diatas adalah estimasi dasar & belum termasuk markup agen/customer._`;

      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const handleCreateBooking = () => {
      if (!selectedCarId) return;
      navigate('/dashboard/bookings/new', {
          state: {
              carId: selectedCarId,
              startDate,
              startTime,
              endDate,
              endTime,
              withDriver: useDriver,
              coverageId: selectedCoverageId
          }
      });
  };

  return (
    <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
                <h2 className="text-3xl font-bold text-slate-800">Kalkulator Sewa</h2>
                <p className="text-slate-500">Hitung estimasi biaya perjalanan, rute, dan BBM.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Waktu & Mobil */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Calendar className="text-indigo-600"/> Waktu & Armada</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mulai</label>
                            <div className="flex gap-2">
                                <input type="date" className="w-full border rounded-lg p-2 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                <input type="time" className="w-24 border rounded-lg p-2 text-sm" value={startTime} onChange={e => setStartTime(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selesai</label>
                            <div className="flex gap-2">
                                <input type="date" className="w-full border rounded-lg p-2 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                <input type="time" className="w-24 border rounded-lg p-2 text-sm" value={endTime} onChange={e => setEndTime(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pilih Mobil</label>
                        <select className="w-full border rounded-lg p-2.5 font-bold text-slate-700" value={selectedCarId} onChange={e => setSelectedCarId(e.target.value)}>
                            <option value="">-- Pilih Mobil --</option>
                            {cars.map(c => (
                                <option key={c.id} value={c.id}>{c.brand} {c.model} - {c.license_plate} ({c.fuel_type || 'Pertalite'}, 1:{c.fuel_ratio || '10'})</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={useDriver} onChange={e => setUseDriver(e.target.checked)} />
                            <span className="font-bold text-slate-700 text-sm">Pakai Jasa Driver?</span>
                        </label>
                        {useDriver && (
                            <div className="space-y-3 mb-4">
                                <select className="w-full border rounded-lg p-2.5 text-sm bg-slate-50" value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}>
                                    <option value="">-- Driver Random / Auto Assign --</option>
                                    {drivers.map(d => (
                                        <option key={d.id} value={d.id}>{d.full_name} (Base: Rp {(d.dailyRate || 150000).toLocaleString()}/hari)</option>
                                    ))}
                                </select>
                                
                                {/* Overnight Toggle */}
                                {(new Date(endDate).getTime() - new Date(startDate).getTime()) > 86400000 && (
                                    <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-indigo-600 rounded" 
                                            checked={includeOvernight} 
                                            onChange={e => setIncludeOvernight(e.target.checked)} 
                                        />
                                        <label className="text-xs font-bold text-indigo-800 flex items-center gap-1 cursor-pointer" onClick={() => setIncludeOvernight(!includeOvernight)}>
                                            <Moon size={12}/> Hitung Biaya Inap Driver? ({(settings.driverOvernightPrice || 150000)/1000}rb/mlm)
                                        </label>
                                    </div>
                                )}
                                
                                <p className="text-[10px] text-slate-500 italic">
                                    *Biaya driver menyesuaikan tarif unit mobil atau jarak tempuh.
                                </p>
                            </div>
                        )}
                        
                        {/* Coverage Area Selection */}
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Map size={12}/> Wilayah Tujuan (Coverage)</label>
                        <select 
                            className="w-full border rounded-lg p-2.5 text-sm bg-white" 
                            value={selectedCoverageId} 
                            onChange={e => setSelectedCoverageId(e.target.value)}
                        >
                            <option value="">-- Dalam Kota / Standard --</option>
                            {settings.coverageAreas?.map(area => (
                                <option key={area.id} value={area.id}>{area.name} - {area.description}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 2. Jarak & BBM */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    {/* ... (Existing Routing Section - Unchanged) ... */}
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Navigation className="text-orange-600"/> Routing & BBM</h3>
                        <label className="flex items-center gap-2 cursor-pointer bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                            <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={isRoundTrip} onChange={e => setIsRoundTrip(e.target.checked)} />
                            <span className="font-bold text-indigo-700 text-xs flex items-center gap-1"><Repeat size={12}/> Pulang Pergi (PP)</span>
                        </label>
                    </div>

                    {/* CUSTOM SEARCH INPUTS */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row gap-3 items-center">
                            {/* Start Input */}
                            <div className="w-full relative">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1"><MapPin size={10} className="text-green-600"/> Awal (Start)</label>
                                <div className="flex">
                                    <input 
                                        className="w-full text-sm font-bold border border-slate-300 rounded-l-lg p-2.5 focus:ring-2 ring-indigo-200 outline-none"
                                        value={startLocation}
                                        onChange={(e) => setStartLocation(e.target.value)}
                                        placeholder="Surabaya (atau Lokasi Saya)"
                                        onKeyDown={(e) => e.key === 'Enter' && handleRouteSearch()}
                                    />
                                    <button 
                                        onClick={triggerLocateUser}
                                        className="bg-white border border-l-0 border-slate-300 text-slate-500 p-2 rounded-r-lg hover:bg-slate-100"
                                        title="Gunakan GPS Saya"
                                    >
                                        <Locate size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="hidden md:block pt-4 text-slate-400"><ArrowRight size={20}/></div>
                            <div className="md:hidden text-slate-400"><ArrowDown size={20}/></div>

                            {/* End Input */}
                            <div className="w-full">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1"><MapPin size={10} className="text-red-600"/> Tujuan (End)</label>
                                <input 
                                    className="w-full text-sm font-bold border border-slate-300 rounded-lg p-2.5 focus:ring-2 ring-indigo-200 outline-none"
                                    value={endLocation}
                                    onChange={(e) => setEndLocation(e.target.value)}
                                    placeholder="Malang"
                                    onKeyDown={(e) => e.key === 'Enter' && handleRouteSearch()}
                                />
                            </div>

                            {/* Search Button */}
                            <div className="w-full md:w-auto pt-4 md:pt-0">
                                <button 
                                    onClick={() => handleRouteSearch()} 
                                    disabled={isSearching}
                                    className="bg-indigo-600 text-white p-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md h-[42px] w-full md:w-auto flex items-center justify-center gap-2 mt-auto"
                                >
                                    {isSearching ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div> : <><Search size={18} /> <span className="md:hidden">Hitung Rute</span></>}
                                </button>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 italic">* Masukkan nama kota/tempat lalu tekan tombol Cari atau Enter.</p>
                    </div>
                    
                    {/* MAP CONTAINER */}
                    <div className="relative w-full h-[350px] bg-slate-100 rounded-xl overflow-hidden border border-slate-300 z-0 group">
                        <div ref={mapContainerRef} className="w-full h-full z-0"></div>
                        {(!window.L) && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm bg-white/80 z-10 flex-col gap-2">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                <span>Memuat Peta...</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jarak Tempuh (Otomatis)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full border rounded-lg p-2.5 pl-4 text-slate-800 font-mono bg-slate-100 font-bold" 
                                    placeholder="0" 
                                    value={distance} 
                                    readOnly
                                />
                                <span className="absolute right-4 top-2.5 text-slate-400 text-sm font-bold">KM</span>
                            </div>
                        </div>
                        {selectedCar && (
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-sm text-orange-800">
                                <span className="font-bold">{selectedCar.brand}</span>: Konsumsi 1:{selectedCar.fuel_ratio || 10} ({selectedCar.fuel_type || 'Pertalite'})
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Tol */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><MapPin className="text-green-600"/> Tarif Tol {isRoundTrip && '(x2)'}</h3>
                        
                        {/* TOLL SEARCH BOX */}
                        <div className="relative w-full md:w-64">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="Cari gerbang tol..."
                                value={tollSearch}
                                onChange={(e) => setTollSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {filteredTolls.length === 0 ? (
                            <div className="col-span-full text-center py-4 text-sm text-slate-400 italic">Tarif tol tidak ditemukan.</div>
                        ) : (
                            filteredTolls.map(toll => (
                                <div 
                                    key={toll.id} 
                                    onClick={() => handleTollToggle(toll.id)}
                                    className={`cursor-pointer p-3 rounded-lg border text-sm transition-all ${selectedTolls.includes(toll.id) ? 'bg-green-50 border-green-500 text-green-800 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                >
                                    <div className="font-bold mb-1">{toll.name}</div>
                                    <div className="text-xs">Rp {toll.price.toLocaleString('id-ID')}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* RESULT SECTION */}
            <div className="lg:col-span-1">
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl sticky top-24 space-y-6">
                    <div className="border-b border-slate-700 pb-4">
                        <h3 className="text-xl font-bold text-indigo-400 flex items-center gap-2"><Calculator/> Estimasi Biaya</h3>
                        <p className="text-xs text-slate-400 mt-1">Total perkiraan biaya perjalanan.</p>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Durasi Sewa</span>
                            <span className="font-bold">{result?.days || 0} Hari</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Biaya Sewa Unit</span>
                            <span className="font-mono">Rp {result?.rentalCost.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <span className="text-slate-400">Biaya Driver</span>
                                {result?.driverTier && <span className="text-[10px] text-green-400">{result.driverTier}</span>}
                            </div>
                            <span className="font-mono">Rp {result?.driverCost.toLocaleString('id-ID')}</span>
                        </div>
                        
                        {/* Coverage Surcharges Breakdown */}
                        {result && result.areaRentSurcharge > 0 && (
                            <div className="flex justify-between items-center text-amber-300">
                                <span className="text-xs">+ Surcharge Wilayah (Unit)</span>
                                <span className="font-mono">Rp {result.areaRentSurcharge.toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        {result && result.areaDriverSurcharge > 0 && (
                            <div className="flex justify-between items-center text-amber-300">
                                <span className="text-xs">+ Surcharge Wilayah (Driver)</span>
                                <span className="font-mono">Rp {result.areaDriverSurcharge.toLocaleString('id-ID')}</span>
                            </div>
                        )}

                        {/* Overnight Cost */}
                        {result && result.overnightCost > 0 && (
                            <div className="flex justify-between items-center text-purple-300">
                                <span className="text-xs flex items-center gap-1"><Moon size={10}/> Biaya Inap ({result.nights} Malam)</span>
                                <span className="font-mono">Rp {result.overnightCost.toLocaleString('id-ID')}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Estimasi BBM {isRoundTrip && '(PP)'}</span>
                            <span className="font-mono text-orange-400">Rp {result?.fuelCost.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Biaya Tol {isRoundTrip && '(x2)'}</span>
                            <span className="font-mono text-green-400">Rp {result?.tollCost.toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-700">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-lg font-bold text-slate-300">TOTAL (Net)</span>
                            <span className="text-2xl font-black text-white">Rp {result?.totalBase.toLocaleString('id-ID')}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 text-right">*Hanya estimasi, realisasi bisa berbeda.</p>
                    </div>

                    {/* NEW: RECOMMENDATION PRICES */}
                    {result && result.totalBase > 0 && (
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
                            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1"><Tag size={12}/> Rekomendasi Jual</h4>
                            
                            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                <span className="text-xs text-slate-300 flex items-center gap-1"><UserIcon size={12}/> Harga Agen (+{settings.agentMarkupValue}{settings.agentMarkupType === 'Percent' ? '%' : 'rb'})</span>
                                <span className="font-bold text-emerald-400">Rp {result.totalAgent.toLocaleString('id-ID')}</span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-300 flex items-center gap-1"><UserIcon size={12}/> Harga Customer (+{settings.customerMarkupValue}{settings.customerMarkupType === 'Percent' ? '%' : 'rb'})</span>
                                <span className="font-bold text-blue-400">Rp {result.totalCustomer.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    )}

                    {/* BUTTONS */}
                    {result && result.totalBase > 0 && selectedCar && (
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={handleSendWhatsApp}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg active:scale-95"
                            >
                                <MessageCircle size={20} /> Kirim Estimasi via WA
                            </button>
                            
                            <button 
                                onClick={handleCreateBooking}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg active:scale-95 border border-indigo-500/30"
                            >
                                <PlusCircle size={20} /> Buat Booking
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default CalculatorPage;
