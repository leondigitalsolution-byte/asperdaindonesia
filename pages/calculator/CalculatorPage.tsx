
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { Car, AppSettings, Driver, HighSeason } from '../../types';
import { carService } from '../../service/carService';
import { driverService } from '../../service/driverService';
import { highSeasonService } from '../../service/highSeasonService';
import { getStoredData, DEFAULT_SETTINGS as GLOBAL_DEFAULTS } from '../../service/dataService';
import { Calculator, Calendar, Navigation, MapPin, Search, ArrowRight, ArrowDown, Tag, User as UserIcon, MessageCircle, Locate, Repeat, Map, PlusCircle, AlertTriangle } from 'lucide-react';

// Declare Leaflet globals
declare global {
  interface Window {
    L: any;
  }
}

// ACCESS TOKEN LOCATIONIQ
const LOCATIONIQ_TOKEN = 'pk.207308c4230e0a9aa27b2389bcffe328';

const CalculatorPage = () => {
  const navigate = useNavigate();
  const [cars, setCars] = useState<Car[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [highSeasons, setHighSeasons] = useState<HighSeason[]>([]);
  const [settings, setSettings] = useState<AppSettings>(GLOBAL_DEFAULTS);

  // Inputs
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('08:00');
  
  const [selectedCarId, setSelectedCarId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [useDriver, setUseDriver] = useState(false);
  
  // Overnight Fee Logic
  const [includeOvernight, setIncludeOvernight] = useState(true);
  const [overnightPrice, setOvernightPrice] = useState(150000); // Default 150k
  
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
      
      // New: Overnight & High Season
      overnightCost: number;
      nights: number;
      highSeasonSurcharge: number;
      highSeasonNames: string[];

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
         
         // Update default overnight if in settings, otherwise keep 150000
         if (loadedSettings.driverOvernightPrice) {
             setOvernightPrice(loadedSettings.driverOvernightPrice);
         }

         const [carsData, driversData, hsData] = await Promise.all([
            carService.getCars(),
            driverService.getDrivers(),
            highSeasonService.getHighSeasons()
         ]);
         setCars(carsData);
         setDrivers(driversData);
         setHighSeasons(hsData);
       } catch (err) {
         console.error("Failed to load calculator data", err);
       }
    };
    fetchData();
  }, []);

  // --- LEAFLET MAP INITIALIZATION ---
  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (mapInstanceRef.current) return;
    if (!mapContainerRef.current) return;

    if (window.L && window.L.Routing) {
        const L = window.L;
        try {
            const map = L.map(mapContainerRef.current).setView([-7.2575, 112.7521], 9); 
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);

            // CUSTOM ROUTER IMPLEMENTATION (FIXED RACE CONDITION)
            const LocationIQRouter = L.Class.extend({
                initialize: function(apiKey: string, mapRef: React.MutableRefObject<any>) {
                    this.apiKey = apiKey;
                    this.mapRef = mapRef;
                },
                route: function(waypoints: any[], callback: any, context: any) {
                    // Safety check 1: If map is destroyed/null, don't route
                    if (!this.mapRef.current) return;

                    const validWps = waypoints.filter(wp => wp.latLng);
                    if (validWps.length < 2) return;

                    const coordString = validWps
                        .map(wp => `${wp.latLng.lng},${wp.latLng.lat}`)
                        .join(';');

                    const url = `https://us1.locationiq.com/v1/directions/driving/${coordString}?key=${this.apiKey}&overview=full&steps=false&geometries=geojson&alternatives=false`;

                    fetch(url)
                        .then(res => res.json())
                        .then(data => {
                            // Safety check 2: If map was destroyed during fetch, abort callback to prevent 'addLayer of null'
                            if (!this.mapRef.current) return;

                            if (data.code && data.code !== 'Ok' && !data.routes) {
                                console.warn("LocationIQ API Error:", data);
                                callback.call(context, { status: 400, message: data.message || "Routing failed" }, []);
                                return;
                            }

                            // Parse Routes
                            const routes = data.routes.map((route: any) => ({
                                name: "Rute Tercepat",
                                summary: {
                                    totalDistance: route.distance,
                                    totalTime: route.duration
                                },
                                coordinates: route.geometry.coordinates.map((coord: number[]) => 
                                    L.latLng(coord[1], coord[0]) 
                                ),
                                waypoints: validWps,
                                inputWaypoints: validWps,
                                instructions: [] 
                            }));

                            // Safely invoke callback
                            try {
                                callback.call(context, null, routes);
                            } catch (e) {
                                console.warn("Routing UI Update suppressed (Map destroyed)", e);
                            }
                        })
                        .catch(err => {
                            if (!this.mapRef.current) return;
                            console.error("Router Fetch Error:", err);
                            callback.call(context, { status: -1, message: err.message }, []);
                        });
                }
            });

            // Initialize Routing Control with Custom Router passing mapInstanceRef
            const control = L.Routing.control({
                waypoints: [
                    L.latLng(-7.2575, 112.7521), // Surabaya
                    L.latLng(-7.9666, 112.6326)  // Malang
                ],
                router: new LocationIQRouter(LOCATIONIQ_TOKEN, mapInstanceRef),
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

            control.on('routingerror', function(e: any) {
                // Suppress routing errors in UI
                setDistance(0); 
            });

            routingControlRef.current = control;
            mapInstanceRef.current = map;
        } catch (err) {
            console.error("Map initialization failed:", err);
        }
    }
    
    // SAFE CLEANUP TO PREVENT REMOVELAYER NULL ERROR
    return () => {
        if (mapInstanceRef.current) {
            // Nullify reference immediately to block async callbacks
            const map = mapInstanceRef.current;
            const control = routingControlRef.current;
            
            // Clear ref first
            mapInstanceRef.current = null;
            routingControlRef.current = null;

            if (control && map) {
                try {
                    // Try to remove control safely
                    map.removeControl(control);
                } catch (e) { /* ignore */ }
            }
            if (map) {
                try {
                    map.remove();
                } catch (e) { /* ignore */ }
            }
        }
    };
  }, []);

  const triggerLocateUser = () => { 
      if (navigator.geolocation && mapInstanceRef.current) {
          navigator.geolocation.getCurrentPosition(pos => {
              const { latitude, longitude } = pos.coords;
              if (mapInstanceRef.current) {
                  mapInstanceRef.current.setView([latitude, longitude], 13);
                  setStartLocation("Lokasi Saya (GPS)");
                  
                  if(routingControlRef.current && window.L) {
                      const waypoints = routingControlRef.current.getWaypoints();
                      waypoints[0].latLng = window.L.latLng(latitude, longitude);
                      routingControlRef.current.setWaypoints(waypoints);
                  }
              }
          });
      }
  };
  
  // Geocoding Helper
  const geocodeLocation = async (query: string) => {
      if (!query) return null;
      try {
          const res = await fetch(`https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_TOKEN}&q=${encodeURIComponent(query)}&format=json&limit=1`);
          const data = await res.json();
          if (data && data.length > 0) {
              return { 
                  lat: parseFloat(data[0].lat), 
                  lon: parseFloat(data[0].lon), 
                  display_name: data[0].display_name 
              };
          }
      } catch (e) {
          console.error("Geocoding failed:", e);
      }
      return null;
  };

  const handleRouteSearch = async () => { 
      if (!startLocation || !endLocation) {
          alert("Mohon isi lokasi asal dan tujuan.");
          return;
      }

      setIsSearching(true);
      
      try {
          // 1. Geocode Start
          let startCoords = null;
          if (startLocation === "Lokasi Saya (GPS)" && mapInstanceRef.current) {
              const center = mapInstanceRef.current.getCenter();
              startCoords = { lat: center.lat, lon: center.lng };
          } else {
              startCoords = await geocodeLocation(startLocation);
          }

          // 2. Geocode End
          const endCoords = await geocodeLocation(endLocation);

          if (!startCoords || !endCoords) {
              alert("Lokasi tidak ditemukan. Coba gunakan nama kota yang spesifik.");
              setIsSearching(false);
              return;
          }

          // 3. Update Map Route
          if (routingControlRef.current && window.L) {
              const startLatLng = window.L.latLng(startCoords.lat, startCoords.lon);
              const endLatLng = window.L.latLng(endCoords.lat, endCoords.lon);
              
              routingControlRef.current.setWaypoints([startLatLng, endLatLng]);
          }

      } catch (e) {
          console.error(e);
          alert("Gagal menghitung rute. Periksa koneksi internet.");
      } finally {
          setIsSearching(false);
      }
  };

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

      // --- HIGH SEASON CALCULATION ---
      let highSeasonSurcharge = 0;
      let highSeasonNames: string[] = [];
      
      if (highSeasons.length > 0) {
          const start = new Date(`${startDate}T${startTime}`);
          let currentDate = new Date(start);
          currentDate.setHours(0,0,0,0);
          
          for (let i = 0; i < days; i++) {
              const checkTime = currentDate.getTime();
              const season = highSeasons.find(hs => {
                  const s = new Date(hs.startDate).setHours(0,0,0,0);
                  const e = new Date(hs.endDate).setHours(23,59,59,999);
                  return checkTime >= s && checkTime <= e;
              });

              if (season) {
                  highSeasonSurcharge += season.priceIncrease;
                  if (!highSeasonNames.includes(season.name)) {
                      highSeasonNames.push(season.name);
                  }
              }
              currentDate.setDate(currentDate.getDate() + 1);
          }
      }

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
      let totalOvernightCost = 0;
      let nights = 0;
      
      if (useDriver) {
          let dailyDriverRate = 0;
          
          if (car.driver_daily_salary && car.driver_daily_salary > 0) {
              dailyDriverRate = car.driver_daily_salary;
              driverTier = `Tarif Driver Unit ${car.brand}`;
          } 
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

          if (days > 1 && includeOvernight) {
              nights = days - 1; 
              totalOvernightCost = nights * overnightPrice;
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

      const totalBase = rentalCost + fuelCost + driverCost + tollCost + areaRentSurcharge + areaDriverSurcharge + totalOvernightCost + highSeasonSurcharge;
      
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
          overnightCost: totalOvernightCost,
          nights,
          highSeasonSurcharge,
          highSeasonNames,
          totalBase,
          totalAgent,
          totalCustomer
      });
  };

  useEffect(() => {
      calculate();
  }, [startDate, startTime, endDate, endTime, selectedCarId, useDriver, selectedDriverId, selectedCoverageId, distance, selectedTolls, isRoundTrip, cars, drivers, settings, includeOvernight, overnightPrice, highSeasons]);

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
${result.highSeasonSurcharge > 0 ? `• High Season (${result.highSeasonNames.join(', ')}): Rp ${result.highSeasonSurcharge.toLocaleString('id-ID')}\n` : ''}• Driver: Rp ${result.driverCost.toLocaleString('id-ID')} ${result.driverTier ? `(${result.driverTier})` : ''}
${result.overnightCost > 0 ? `• Biaya Inap Driver: Rp ${result.overnightCost.toLocaleString('id-ID')} (${result.nights} Malam @ Rp ${overnightPrice.toLocaleString('id-ID')})\n` : ''}${result.areaRentSurcharge > 0 ? `• Surcharge Area (Unit): Rp ${result.areaRentSurcharge.toLocaleString('id-ID')}\n` : ''}${result.areaDriverSurcharge > 0 ? `• Surcharge Area (Driver): Rp ${result.areaDriverSurcharge.toLocaleString('id-ID')}\n` : ''}• BBM (Est): Rp ${result.fuelCost.toLocaleString('id-ID')}
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

  const durationDays = Math.ceil((new Date(`${endDate}T${endTime}`).getTime() - new Date(`${startDate}T${startTime}`).getTime()) / (1000 * 3600 * 24));

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

                    {result?.highSeasonSurcharge && result.highSeasonSurcharge > 0 ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-3">
                            <AlertTriangle size={18} className="text-orange-600 mt-0.5"/>
                            <div>
                                <p className="text-xs font-bold text-orange-800 uppercase">Periode High Season</p>
                                <p className="text-sm text-orange-700">
                                    Tanggal yang dipilih mencakup event: <strong>{result.highSeasonNames.join(', ')}</strong>. 
                                    Ada kenaikan harga sewa otomatis.
                                </p>
                            </div>
                        </div>
                    ) : null}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pilih Mobil</label>
                        <select className="w-full border rounded-lg p-2.5 font-bold text-slate-700" value={selectedCarId} onChange={e => setSelectedCarId(e.target.value)}>
                            <option value="">-- Pilih Mobil --</option>
                            {cars.map(c => (
                                <option key={c.id} value={c.id}>{c.brand} {c.model} - {c.license_plate} (BBM: {c.fuel_type}, {c.driver_daily_salary ? `Driver: Rp ${c.driver_daily_salary.toLocaleString()}` : 'Driver: Std'})</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2">
                        {/* ... Driver and Overnight Controls ... */}
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={useDriver} onChange={e => setUseDriver(e.target.checked)} />
                            <span className="font-bold text-slate-700 text-sm">Pakai Jasa Driver?</span>
                        </label>
                        {useDriver && (
                            <div className="space-y-3 mb-4 bg-indigo-50 p-4 rounded-lg border border-indigo-100 animate-in fade-in">
                                <div>
                                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Pilih Driver (Opsional)</label>
                                    <select className="w-full border rounded-lg p-2.5 text-sm bg-white" value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}>
                                        <option value="">-- Auto Assign / Random --</option>
                                        {drivers.map(d => (
                                            <option key={d.id} value={d.id}>{d.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                                {durationDays > 1 && (
                                    <div className="flex items-center gap-3 pt-2 border-t border-indigo-200">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={includeOvernight} onChange={e => setIncludeOvernight(e.target.checked)} />
                                            <label className="text-xs font-bold text-indigo-800 cursor-pointer" onClick={() => setIncludeOvernight(!includeOvernight)}>Hitung Biaya Inap?</label>
                                        </div>
                                        {includeOvernight && (
                                            <div className="flex-1 flex items-center gap-2 justify-end">
                                                <span className="text-xs text-indigo-600">Tarif/Malam:</span>
                                                <div className="relative w-32"><span className="absolute left-2 top-1.5 text-xs font-bold text-indigo-400">Rp</span><input type="number" className="w-full pl-8 pr-2 py-1 text-sm font-bold border border-indigo-300 rounded bg-white text-right" value={overnightPrice} onChange={e => setOvernightPrice(Number(e.target.value))}/></div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <p className="text-[10px] text-slate-500 italic mt-1">*Tarif driver otomatis menggunakan tarif unit mobil jika tersedia.</p>
                            </div>
                        )}
                        <div className="mt-3">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Map size={12}/> Wilayah Tujuan (Coverage)</label>
                            <select className="w-full border rounded-lg p-2.5 text-sm bg-white" value={selectedCoverageId} onChange={e => setSelectedCoverageId(e.target.value)}>
                                <option value="">-- Dalam Kota / Standard --</option>
                                {settings.coverageAreas?.map(area => (
                                    <option key={area.id} value={area.id}>{area.name} - {area.description}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. Jarak & BBM & Tol */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Navigation className="text-orange-600"/> Routing & BBM</h3>
                        <label className="flex items-center gap-2 cursor-pointer bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                            <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={isRoundTrip} onChange={e => setIsRoundTrip(e.target.checked)} />
                            <span className="font-bold text-indigo-700 text-xs flex items-center gap-1"><Repeat size={12}/> Pulang Pergi (PP)</span>
                        </label>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row gap-3 items-center">
                            <div className="w-full relative">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1"><MapPin size={10} className="text-green-600"/> Awal (Start)</label>
                                <div className="flex"><input className="w-full text-sm font-bold border border-slate-300 rounded-l-lg p-2.5 focus:ring-2 ring-indigo-200 outline-none" value={startLocation} onChange={(e) => setStartLocation(e.target.value)} placeholder="Surabaya" onKeyDown={(e) => e.key === 'Enter' && handleRouteSearch()}/><button onClick={triggerLocateUser} className="bg-white border border-l-0 border-slate-300 rounded-r-lg px-3 text-slate-500 hover:text-blue-600" title="Gunakan Lokasi Saya"><Locate size={18} /></button></div>
                            </div>
                            <ArrowRight size={24} className="text-slate-300 hidden md:block mt-6" /><ArrowDown size={24} className="text-slate-300 md:hidden" />
                            <div className="w-full relative">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block flex items-center gap-1"><MapPin size={10} className="text-red-600"/> Tujuan (End)</label>
                                <div className="flex"><input className="w-full text-sm font-bold border border-slate-300 rounded-lg p-2.5 focus:ring-2 ring-indigo-200 outline-none" value={endLocation} onChange={(e) => setEndLocation(e.target.value)} placeholder="Malang" onKeyDown={(e) => e.key === 'Enter' && handleRouteSearch()}/></div>
                            </div>
                        </div>
                        <button onClick={handleRouteSearch} disabled={isSearching} className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mt-2">{isSearching ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div> : <Search size={18}/>} Hitung Rute & Jarak</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><p className="text-xs text-slate-500">Estimasi Jarak</p><p className="text-xl font-mono font-bold text-slate-900">{isRoundTrip ? distance * 2 : distance} km</p></div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><p className="text-xs text-slate-500">Estimasi BBM</p><p className="text-xl font-mono font-bold text-orange-600">Rp {result?.fuelCost.toLocaleString('id-ID')}</p></div>
                    </div>
                    <div ref={mapContainerRef} className="w-full h-64 rounded-xl border border-slate-300 z-0 relative shadow-inner"></div>
                </div>

                {/* 3. Tol Calculator */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Tag className="text-green-600"/> Tarif Tol</h3>
                    <input type="text" placeholder="Cari Gerbang Tol..." className="w-full border rounded-lg p-2 text-sm mb-2" value={tollSearch} onChange={e => setTollSearch(e.target.value)} />
                    <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-2 bg-slate-50">
                        {filteredTolls.map(toll => (
                            <label key={toll.id} className="flex items-center justify-between p-2 hover:bg-white rounded cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                                <div className="flex items-center gap-2"><input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={selectedTolls.includes(toll.id)} onChange={() => { if (selectedTolls.includes(toll.id)) { setSelectedTolls(prev => prev.filter(id => id !== toll.id)); } else { setSelectedTolls(prev => [...prev, toll.id]); } }} /><span className="text-sm font-medium text-slate-700">{toll.name}</span></div>
                                <span className="text-xs font-bold text-slate-600">Rp {toll.price.toLocaleString('id-ID')}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: SUMMARY */}
            <div className="lg:col-span-1">
                <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xl sticky top-6">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-400"><Calculator size={24}/> Total Estimasi</h3>
                    
                    <div className="space-y-3 text-sm mb-6 border-b border-slate-700 pb-6">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Sewa Unit ({result?.days} Hari)</span>
                            <span className="font-bold">Rp {result?.rentalCost.toLocaleString('id-ID')}</span>
                        </div>
                        {result?.highSeasonSurcharge ? (
                            <div className="flex justify-between items-center text-orange-400">
                                <span>+ High Season</span>
                                <span className="font-bold">Rp {result.highSeasonSurcharge.toLocaleString('id-ID')}</span>
                            </div>
                        ) : null}
                        {useDriver && (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Jasa Driver</span>
                                    <span className="font-bold">Rp {result?.driverCost.toLocaleString('id-ID')}</span>
                                </div>
                                {result?.overnightCost ? (
                                    <div className="flex justify-between items-center text-xs text-yellow-400">
                                        <span>+ Biaya Inap ({result.nights} mlm)</span>
                                        <span>Rp {result.overnightCost.toLocaleString('id-ID')}</span>
                                    </div>
                                ) : null}
                            </>
                        )}
                        {result?.areaRentSurcharge ? (
                            <div className="flex justify-between items-center text-yellow-500">
                                <span>+ Area Unit ({result.coverageName})</span>
                                <span className="font-bold">Rp {result.areaRentSurcharge.toLocaleString('id-ID')}</span>
                            </div>
                        ) : null}
                        {result?.areaDriverSurcharge ? (
                            <div className="flex justify-between items-center text-yellow-500">
                                <span>+ Area Driver</span>
                                <span className="font-bold">Rp {result.areaDriverSurcharge.toLocaleString('id-ID')}</span>
                            </div>
                        ) : null}

                        <div className="flex justify-between items-center text-orange-400">
                            <span>Estimasi BBM</span>
                            <span className="font-bold">Rp {result?.fuelCost.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center text-green-400">
                            <span>Estimasi Tol {isRoundTrip ? '(PP)' : ''}</span>
                            <span className="font-bold">Rp {result?.tollCost.toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Harga Dasar (Net)</div>
                        <div className="text-3xl font-bold text-white mb-4">Rp {result?.totalBase.toLocaleString('id-ID')}</div>
                        
                        <div className="grid grid-cols-2 gap-3">
                             <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                <div className="text-[10px] text-indigo-400 uppercase font-bold">Harga Agen (+{settings.agentMarkupType === 'Percent' ? `${settings.agentMarkupValue}%` : `Rp ${settings.agentMarkupValue/1000}k`})</div>
                                <div className="text-lg font-bold">Rp {result?.totalAgent.toLocaleString('id-ID')}</div>
                             </div>
                             <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                <div className="text-[10px] text-green-400 uppercase font-bold">Harga Customer (+{settings.customerMarkupType === 'Percent' ? `${settings.customerMarkupValue}%` : `Rp ${settings.customerMarkupValue/1000}k`})</div>
                                <div className="text-lg font-bold">Rp {result?.totalCustomer.toLocaleString('id-ID')}</div>
                             </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button onClick={handleSendWhatsApp} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                            <MessageCircle size={20}/> Share WhatsApp
                        </button>
                        <button onClick={handleCreateBooking} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                            <PlusCircle size={20}/> Buat Booking
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
export default CalculatorPage;
