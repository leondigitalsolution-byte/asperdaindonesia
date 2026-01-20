
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate, Link, useParams, useLocation } from 'react-router-dom';
import { bookingService } from '../../service/bookingService';
import { carService } from '../../service/carService';
import { customerService } from '../../service/customerService';
import { driverService } from '../../service/driverService';
import { highSeasonService } from '../../service/highSeasonService';
import { blacklistService } from '../../service/blacklistService';
import { marketplaceRequestService } from '../../service/marketplaceRequestService';
import { getStoredData, DEFAULT_SETTINGS } from '../../service/dataService';
import { Car, Customer, Driver, BookingStatus, DriverOption, AppSettings, PaymentMethod, PayLaterTerm, HighSeason } from '../../types';
import { Button } from '../../components/ui/Button';
import { ImageUploader } from '../../components/ImageUploader';
import { CreditCard, Wallet, QrCode, Clock, CheckCircle, RotateCcw, User as UserIcon, Calendar, ShieldAlert } from 'lucide-react';

export const BookingFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data Sources
  const [cars, setCars] = useState<Car[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [highSeasons, setHighSeasons] = useState<HighSeason[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Availability State
  const [unavailableCarIds, setUnavailableCarIds] = useState<string[]>([]);
  const [unavailableDriverIds, setUnavailableDriverIds] = useState<string[]>([]);

  // Form State
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]); // +1 day
  const [endTime, setEndTime] = useState('08:00');
  
  const [selectedCarId, setSelectedCarId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState(''); 
  const [withDriver, setWithDriver] = useState(false);
  
  // Customer Details (Auto-fill or Manual)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Blacklist Alert
  const [globalBlacklistAlert, setGlobalBlacklistAlert] = useState<{isBlacklisted: boolean, reason: string} | null>(null);

  const [rentalPackage, setRentalPackage] = useState('');
  const [destination, setDestination] = useState(''); 
  const [notes, setNotes] = useState('');

  // Security Deposit
  const [depositType, setDepositType] = useState<'barang' | 'uang'>('barang');
  const [depositDesc, setDepositDesc] = useState('');
  const [depositValue, setDepositValue] = useState<number>(0);
  const [depositImage, setDepositImage] = useState<string | null>(null);

  // Costs
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [payLaterTerm, setPayLaterTerm] = useState<PayLaterTerm>(1);

  // Return / Completion
  const [actualReturnDateStr, setActualReturnDateStr] = useState('');
  const [actualReturnTimeStr, setActualReturnTimeStr] = useState('');
  const [overdueFee, setOverdueFee] = useState<number>(0);
  const [extraFee, setExtraFee] = useState<number>(0);
  const [extraFeeReason, setExtraFeeReason] = useState('');
  
  // Existing Status - DEFAULT TO CONFIRMED (BOOKED)
  const [status, setStatus] = useState<BookingStatus>(BookingStatus.CONFIRMED);

  // R2R Context
  const [r2rRequest, setR2rRequest] = useState<any>(null);
  const [r2rMode, setR2rMode] = useState<'supplier_process' | 'renter_create' | null>(null);

  // Init Data
  useEffect(() => {
    const init = async () => {
      try {
        const [c, cust, drv, hs] = await Promise.all([
          carService.getCars(),
          customerService.getCustomers(),
          driverService.getDrivers(),
          highSeasonService.getHighSeasons()
        ]);
        setCars(c);
        setCustomers(cust);
        setDrivers(drv);
        setHighSeasons(hs);
        
        const storedSettings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
        setSettings({ ...DEFAULT_SETTINGS, ...storedSettings });
        
        if (!isEditMode && storedSettings.rentalPackages && storedSettings.rentalPackages.length > 0) {
            setRentalPackage(storedSettings.rentalPackages[0]);
        }

        // Handle Navigation State from Marketplace or Calendar
        if (location.state && !isEditMode) {
            const s = location.state as any;
            
            // Standard Params
            if(s.carId) setSelectedCarId(s.carId);
            if(s.startDate) setStartDate(s.startDate);
            if(s.startTime) setStartTime(s.startTime);
            if(s.endDate) setEndDate(s.endDate);
            if(s.endTime) setEndTime(s.endTime);
            if(s.withDriver !== undefined) setWithDriver(s.withDriver);
            if(s.coverageId) setDestination(s.coverageId);

            // R2R Handling
            if (s.r2rRequest) {
                setR2rRequest(s.r2rRequest);
                setR2rMode(s.mode);
                const req = s.r2rRequest;
                const reqStart = new Date(req.start_date);
                const reqEnd = new Date(req.end_date);

                setStartDate(reqStart.toISOString().split('T')[0]);
                setStartTime(reqStart.toTimeString().slice(0,5));
                setEndDate(reqEnd.toISOString().split('T')[0]);
                setEndTime(reqEnd.toTimeString().slice(0,5));

                if (s.mode === 'supplier_process') {
                    // I am Supplier. Accepting order from Renter Company.
                    setSelectedCarId(req.car_id); // My car
                    setUnitPrice(req.total_price); // Assuming total price / days roughly? Or just use normal price
                    setNotes(`Order via Marketplace R2R. Requester: ${req.requester?.name}`);
                    setPaymentMethod(PaymentMethod.PAYLATER); // B2B usually Paylater/Transfer
                    
                    // Attempt to find customer record for the requester company
                    const requesterName = req.requester?.name;
                    const existingCust = cust.find((c: Customer) => c.full_name.toLowerCase().includes(requesterName.toLowerCase()));
                    if (existingCust) {
                        setSelectedCustomerId(existingCust.id);
                    } else {
                        // Pre-fill prompt for creating new customer
                        // We can't auto-create here easily without disrupting flow, so we let user create or select "Non-Member"
                        alert(`Info: Pelanggan '${requesterName}' belum ada di database Anda. Silakan buat data pelanggan baru untuk perusahaan ini.`);
                    }
                } else if (s.mode === 'renter_create') {
                    // I am Renter. Creating invoice for my customer using Supplier's car.
                    // Inject External Car into list so it can be selected
                    const extCar = req.cars;
                    // Add temporary car to list
                    setCars(prev => [...prev, { ...extCar, is_external: true }]);
                    setSelectedCarId(extCar.id);
                    setNotes(`Unit R2R dari ${req.supplier?.name}.`);
                    // Price is editable (selling price to end customer)
                }
            }
        }

      } catch (e) {
        console.error(e);
      }
    };
    init();
  }, [location.state, isEditMode]);

  // Load Existing Booking if Edit Mode
  useEffect(() => {
    if (isEditMode && id) {
        const loadBooking = async () => {
            setInitialLoading(true);
            try {
                const booking = await bookingService.getBookingById(id);
                
                const start = new Date(booking.start_date);
                const end = new Date(booking.end_date);
                
                setStartDate(start.toISOString().split('T')[0]);
                setStartTime(start.toTimeString().slice(0, 5));
                setEndDate(end.toISOString().split('T')[0]);
                setEndTime(end.toTimeString().slice(0, 5));
                
                setSelectedCarId(booking.car_id);
                setSelectedCustomerId(booking.customer_id);
                setWithDriver(booking.driver_option === DriverOption.WITH_DRIVER);
                if (booking.driver_id) setSelectedDriverId(booking.driver_id);
                
                setRentalPackage(booking.rental_package || '');
                setDestination(booking.destination || '');
                setNotes(booking.notes || '');
                
                setDepositType(booking.deposit_type as any || 'barang');
                setDepositDesc(booking.deposit_description || '');
                setDepositValue(booking.deposit_value || 0);
                setDepositImage(booking.deposit_image_url || null);
                
                setDeliveryFee(booking.delivery_fee || 0);
                setAmountPaid(booking.amount_paid || 0);
                
                setOverdueFee(booking.overdue_fee || 0);
                setExtraFee(booking.extra_fee || 0);
                setExtraFeeReason(booking.extra_fee_reason || '');
                
                if (booking.actual_return_date) {
                    const actual = new Date(booking.actual_return_date);
                    setActualReturnDateStr(actual.toISOString().split('T')[0]);
                    setActualReturnTimeStr(actual.toTimeString().slice(0, 5));
                }
                
                setStatus(booking.status);
                if (booking.payment_method) setPaymentMethod(booking.payment_method);

            } catch (err) {
                console.error(err);
                setError("Gagal memuat data booking.");
            } finally {
                setInitialLoading(false);
            }
        };
        loadBooking();
    }
  }, [id, isEditMode]);

  // Check Availability when Dates Change
  useEffect(() => {
      const checkAvailability = async () => {
          if (!startDate || !endDate) return;
          const start = `${startDate}T${startTime}:00`;
          const end = `${endDate}T${endTime}:00`;
          if (new Date(end) <= new Date(start)) return;

          try {
              const resources = await bookingService.getUnavailableResources(start, end, isEditMode ? id : undefined);
              setUnavailableCarIds(resources.carIds);
              setUnavailableDriverIds(resources.driverIds);
          } catch (e) { console.error(e); }
      };
      const timer = setTimeout(checkAvailability, 500);
      return () => clearTimeout(timer);
  }, [startDate, startTime, endDate, endTime, isEditMode, id]);

  useEffect(() => {
    if (selectedCarId && r2rMode !== 'renter_create') {
      // Only auto-update price if NOT creating invoice for end customer (renter mode allows manual price override)
      const car = cars.find(c => c.id === selectedCarId);
      if (car) setUnitPrice(car.price_per_day);
    }
  }, [selectedCarId, cars, r2rMode]);

  // Customer Selection & Blacklist Check
  useEffect(() => {
    const checkCustomer = async () => {
        setGlobalBlacklistAlert(null); 
        if (selectedCustomerId) {
            const cust = customers.find(c => c.id === selectedCustomerId);
            if (cust) {
                setCustomerName(cust.full_name);
                setCustomerPhone(cust.phone);
                try {
                    const blacklistEntry = await blacklistService.checkBlacklistStatus(cust.nik, cust.phone);
                    if (blacklistEntry) {
                        setGlobalBlacklistAlert({ isBlacklisted: true, reason: blacklistEntry.reason });
                    }
                } catch (e) { console.error(e); }
            }
        }
    };
    checkCustomer();
  }, [selectedCustomerId, customers]);

  // Calculations
  const calculateTotal = () => {
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    let highSeasonSurcharge = 0;
    if (highSeasons.length > 0) {
        let currentDate = new Date(start);
        currentDate.setHours(0,0,0,0);
        for (let i = 0; i < diffDays; i++) {
            const checkTime = currentDate.getTime();
            const season = highSeasons.find(hs => {
                const s = new Date(hs.startDate).setHours(0,0,0,0);
                const e = new Date(hs.endDate).setHours(23,59,59,999);
                return checkTime >= s && checkTime <= e;
            });
            if (season) highSeasonSurcharge += season.priceIncrease;
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    let areaRentSurcharge = 0;
    let areaDriverSurcharge = 0;
    if (settings.coverageAreas) {
        const area = settings.coverageAreas.find(a => a.id === destination);
        if (area) {
            areaRentSurcharge = area.extraPrice;
            if (withDriver) areaDriverSurcharge = area.extraDriverPrice;
        }
    }

    let driverBasePrice = 0;
    if (withDriver) {
        const car = cars.find(c => c.id === selectedCarId);
        if (car && car.driver_daily_salary && car.driver_daily_salary > 0) {
            driverBasePrice = car.driver_daily_salary;
        } else {
            driverBasePrice = 150000;
        }
    }

    const dailyTotal = unitPrice + areaRentSurcharge + (withDriver ? areaDriverSurcharge : 0) + driverBasePrice;
    const baseTotal = dailyTotal * diffDays;
    
    let overnightTotal = 0;
    if (withDriver && diffDays > 1) {
        overnightTotal = (diffDays - 1) * (settings.driverOvernightPrice || 150000);
    }

    const total = baseTotal + deliveryFee + overdueFee + extraFee + overnightTotal + highSeasonSurcharge;
    return { total, overnightTotal, driverBasePrice, highSeasonSurcharge };
  };

  const { total: totalCost, overnightTotal, driverBasePrice, highSeasonSurcharge } = calculateTotal();

  // Effect to auto-fill amount paid for PayLater
  useEffect(() => {
      if (paymentMethod === PaymentMethod.PAYLATER) {
          setAmountPaid(totalCost);
      }
  }, [paymentMethod, totalCost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (globalBlacklistAlert) {
        setError("Transaksi diblokir: Pelanggan terdaftar di Global Blacklist.");
        setLoading(false);
        return;
    }

    if (!selectedCarId || !selectedCustomerId) {
       setError("Unit mobil dan pelanggan harus dipilih.");
       setLoading(false);
       return;
    }

    if (unavailableCarIds.includes(selectedCarId) && !isEditMode) {
        setError("Mobil yang dipilih sudah terjadwal pada tanggal tersebut.");
        setLoading(false);
        return;
    }

    let actualReturnDate = undefined;
    if (actualReturnDateStr && actualReturnTimeStr) {
        actualReturnDate = `${actualReturnDateStr}T${actualReturnTimeStr}:00`;
    }

    const payload = {
        car_id: selectedCarId,
        customer_id: selectedCustomerId,
        driver_id: (withDriver && selectedDriverId) ? selectedDriverId : null,
        start_date: `${startDate}T${startTime}:00`,
        end_date: `${endDate}T${endTime}:00`,
        driver_option: withDriver ? DriverOption.WITH_DRIVER : DriverOption.LEPAS_KUNCI,
        total_price: totalCost,
        delivery_fee: deliveryFee,
        amount_paid: amountPaid,
        rental_package: rentalPackage,
        destination: destination,
        notes: notes,
        deposit_type: depositType,
        deposit_description: depositDesc,
        deposit_value: depositValue,
        deposit_image_url: depositImage || undefined,
        status: status,
        overdue_fee: overdueFee,
        extra_fee: extraFee,
        extra_fee_reason: extraFeeReason,
        actual_return_date: actualReturnDate,
        payment_method: paymentMethod,
        paylater_term: paymentMethod === PaymentMethod.PAYLATER ? payLaterTerm : undefined
    };

    try {
      if (isEditMode && id) {
          await bookingService.updateBooking(id, payload);
      } else {
          await bookingService.createBooking(payload as any);
          
          // R2R Logic: If creating based on supplier request, update status
          if (r2rMode === 'supplier_process' && r2rRequest) {
              await marketplaceRequestService.updateStatus(r2rRequest.id, 'approved');
          }
      }
      navigate('/dashboard/bookings');
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan booking.");
    } finally {
      setLoading(false);
    }
  };
  
  if (initialLoading) return <div className="p-12 text-center text-slate-500">Memuat...</div>;

  const duration = Math.ceil(Math.abs(new Date(`${endDate}T${endTime}`).getTime() - new Date(`${startDate}T${startTime}`).getTime()) / (1000*3600*24)) || 1;
  const paymentStatus = amountPaid >= totalCost ? 'LUNAS' : 'BELUM LUNAS';

  return (
    <div className="max-w-7xl mx-auto pb-32">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Data Transaksi' : 'Buat Booking Baru'}</h1>
        {r2rMode && (
            <div className="mt-2 inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm font-bold border border-indigo-200">
                Mode: {r2rMode === 'supplier_process' ? 'Proses Order Masuk (Supplier)' : 'Buat Invoice Pelanggan (Renter)'}
            </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN (Unit & Time) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                 <Clock className="text-blue-600" size={16}/> Waktu & Unit
               </h3>
               <div className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mulai Sewa</label>
                    <div className="flex gap-2">
                        <input type="date" className="w-full border rounded-lg p-2.5 text-sm font-bold text-slate-700" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                        <input type="time" className="w-24 border rounded-lg p-2.5 text-sm font-bold text-slate-700" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                    </div>
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Selesai Sewa</label>
                    <div className="flex gap-2">
                        <input type="date" className="w-full border rounded-lg p-2.5 text-sm font-bold text-slate-700" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                        <input type="time" className="w-24 border rounded-lg p-2.5 text-sm font-bold text-slate-700" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                    </div>
                 </div>
                 <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Mobil</label>
                    <select 
                        className="w-full border rounded-lg p-3 text-sm font-bold text-slate-700 bg-slate-50" 
                        value={selectedCarId} 
                        onChange={e => setSelectedCarId(e.target.value)} 
                        required
                        disabled={r2rMode === 'supplier_process' || r2rMode === 'renter_create'} // Locked in R2R mode
                    >
                        <option value="">-- Pilih unit armada --</option>
                        {cars.map(c => {
                            const isUnavailable = unavailableCarIds.includes(c.id);
                            return (
                                <option key={c.id} value={c.id} disabled={isUnavailable}>
                                    {isUnavailable ? '[TERPAKAI] ' : ''}{c.brand} {c.model} - {c.license_plate} {(c as any).is_external ? '(R2R Unit)' : ''}
                                </option>
                            );
                        })}
                    </select>
                    {unavailableCarIds.includes(selectedCarId) && <p className="text-xs text-red-500 mt-1">Mobil ini sudah dibooking pada tanggal tersebut.</p>}
                 </div>
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2">
                     <label className="flex items-center gap-3 cursor-pointer">
                         <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={withDriver} onChange={e => setWithDriver(e.target.checked)}/>
                         <div className="flex flex-col">
                             <span className="font-bold text-slate-700 text-sm">Pakai Jasa Driver?</span>
                             {withDriver && driverBasePrice > 0 && <span className="text-[10px] text-green-600">+ Rp {driverBasePrice.toLocaleString('id-ID')} / hari</span>}
                         </div>
                     </label>
                     {withDriver && (
                         <div className="mt-3 pl-8 animate-in fade-in slide-in-from-top-1">
                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><UserIcon size={10}/> Pilih Driver (Opsional)</label>
                             <select 
                                className="w-full border border-blue-200 rounded-lg p-2 text-sm text-slate-700 bg-white"
                                value={selectedDriverId}
                                onChange={e => setSelectedDriverId(e.target.value)}
                             >
                                 <option value="">-- Auto Assign / Belum Ditentukan --</option>
                                 {drivers.map(d => {
                                     const isUnavailable = unavailableDriverIds.includes(d.id);
                                     return (
                                        <option key={d.id} value={d.id} disabled={isUnavailable}>
                                            {isUnavailable ? '[TERPAKAI] ' : ''}{d.full_name} ({d.status})
                                        </option>
                                     );
                                 })}
                             </select>
                         </div>
                     )}
                 </div>
               </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">Jaminan</h3>
               <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                   <button type="button" className={`flex-1 py-1.5 text-xs font-bold rounded-md ${depositType === 'barang' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`} onClick={() => setDepositType('barang')}>Barang / Dokumen</button>
                   <button type="button" className={`flex-1 py-1.5 text-xs font-bold rounded-md ${depositType === 'uang' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`} onClick={() => setDepositType('uang')}>Uang (Deposit)</button>
               </div>
               <div className="space-y-4">
                  <textarea rows={2} className="w-full border rounded-lg p-2.5 text-sm" placeholder="Deskripsi Jaminan..." value={depositDesc} onChange={e => setDepositDesc(e.target.value)} />
                  <input type="number" className="w-full border rounded-lg p-2.5 text-sm" placeholder="Nilai (Rp)" value={depositValue || ''} onChange={e => setDepositValue(Number(e.target.value))} />
                  {depositType === 'barang' && <ImageUploader image={depositImage} onImageChange={setDepositImage} placeholder="Foto Jaminan" aspectRatio="video" className="bg-slate-50" />}
               </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200 relative">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">1. Data Pelanggan & Tujuan</h3>
               
               {globalBlacklistAlert && (
                   <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4 animate-in slide-in-from-top-2 rounded-r-lg">
                       <div className="flex items-start gap-3">
                           <ShieldAlert size={24} className="text-red-600 mt-0.5"/>
                           <div>
                               <h3 className="text-red-800 font-bold text-sm uppercase">PERINGATAN: PELANGGAN BLACKLIST</h3>
                               <p className="text-red-700 text-sm mt-1">Pelanggan ini terdaftar di Global Blacklist ASPERDA.</p>
                               <p className="text-red-600 text-xs mt-1 font-mono bg-red-100 p-1 rounded">Alasan: {globalBlacklistAlert.reason}</p>
                           </div>
                       </div>
                   </div>
               )}

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cari Pelanggan</label>
                      <select className="w-full border rounded-lg p-2.5 text-sm font-bold bg-white" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} required>
                          <option value="">-- Pilih Pelanggan --</option>
                          {customers.map(c => (
                              <option key={c.id} value={c.id} className={c.is_blacklisted ? 'text-red-600 font-bold' : ''}>
                                  {c.full_name} - {c.nik} {c.is_blacklisted ? '(BLACKLIST LOKAL)' : ''}
                              </option>
                          ))}
                      </select>
                      {r2rMode === 'supplier_process' && !selectedCustomerId && (
                          <div className="text-xs text-orange-600 mt-1">
                              *Pelanggan '{r2rRequest?.requester?.name}' tidak ditemukan. Mohon buat data pelanggan baru terlebih dahulu.
                              <Link to="/dashboard/customers/new" target="_blank" className="font-bold underline ml-1">Buat Disini</Link>
                          </div>
                      )}
                  </div>
                  <div className="sm:col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nomor WhatsApp</label>
                      <input className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 font-mono text-slate-700" value={customerPhone} readOnly placeholder="Pilih Pelanggan..." />
                  </div>
                  <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Wilayah Tujuan</label>
                      <select className="w-full border rounded-lg p-2.5 text-sm font-bold bg-white" value={destination} onChange={e => setDestination(e.target.value)}>
                          <option value="">-- Dalam Kota / Standard --</option>
                          {settings.coverageAreas?.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Paket Sewa</label>
                      <select className="w-full border rounded-lg p-2.5 text-sm" value={rentalPackage} onChange={e => setRentalPackage(e.target.value)}>
                          {settings.rentalPackages.map((pkg, i) => <option key={i} value={pkg}>{pkg}</option>)}
                      </select>
                  </div>
               </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">2. Summary & Biaya</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Harga Unit Dasar / Hari</label>
                          <input type="number" className="w-full border rounded-lg p-2.5 text-sm font-bold" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))} />
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Biaya Antar / Jemput</label>
                          <input type="number" className="w-full border rounded-lg p-2.5 text-sm" value={deliveryFee} onChange={e => setDeliveryFee(Number(e.target.value))} />
                       </div>
                   </div>
                   <div className="bg-blue-600 rounded-xl p-5 text-white flex flex-col justify-between shadow-lg">
                       <div>
                           <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">Rincian Sewa ({duration} Hari)</h4>
                           <div className="flex justify-between text-sm mb-1"><span>Sewa Unit</span><span>Rp {(unitPrice * duration).toLocaleString('id-ID')}</span></div>
                           {withDriver && driverBasePrice > 0 && <div className="flex justify-between text-sm mb-1 text-green-200"><span>Driver</span><span>Rp {(driverBasePrice * duration).toLocaleString('id-ID')}</span></div>}
                           {overnightTotal > 0 && <div className="flex justify-between text-sm mb-1 text-pink-200"><span>Inap Driver</span><span>Rp {overnightTotal.toLocaleString('id-ID')}</span></div>}
                           {highSeasonSurcharge > 0 && <div className="flex justify-between text-sm mb-1 text-orange-300 font-bold"><span className="flex items-center gap-1"><Calendar size={12}/> High Season</span><span>Rp {highSeasonSurcharge.toLocaleString('id-ID')}</span></div>}
                           {deliveryFee > 0 && <div className="flex justify-between text-sm mb-1"><span>Antar/Jemput</span><span>Rp {deliveryFee.toLocaleString('id-ID')}</span></div>}
                           {overdueFee > 0 && <div className="flex justify-between text-sm mb-1 text-red-200"><span>Overdue</span><span>Rp {overdueFee.toLocaleString('id-ID')}</span></div>}
                           {extraFee > 0 && <div className="flex justify-between text-sm mb-1 text-red-200"><span>Biaya Extra</span><span>Rp {extraFee.toLocaleString('id-ID')}</span></div>}
                       </div>
                       <div className="pt-4 border-t border-blue-500 mt-2 flex justify-between items-end"><span className="font-bold text-lg">TOTAL</span><span className="font-bold text-2xl">Rp {totalCost.toLocaleString('id-ID')}</span></div>
                   </div>
               </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                 <Wallet className="text-blue-600" size={16}/> 3. Metode Pembayaran
               </h3>
               
               <div className="mb-6">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                       {[
                           { id: PaymentMethod.CASH, label: 'Tunai / Cash', icon: <Wallet size={18}/> },
                           { id: PaymentMethod.TRANSFER, label: 'Transfer Bank', icon: <CreditCard size={18}/> },
                           { id: PaymentMethod.QRIS, label: 'QRIS', icon: <QrCode size={18}/> },
                           { id: PaymentMethod.PAYLATER, label: 'PayLater', icon: <Clock size={18}/> }
                       ].map(method => (
                           <div key={method.id} onClick={() => setPaymentMethod(method.id)} className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === method.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                               {method.icon}<span className="text-xs font-bold text-center">{method.label}</span>
                           </div>
                       ))}
                   </div>
               </div>

               {paymentMethod === PaymentMethod.PAYLATER ? (
                   <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-4 animate-in fade-in">
                       <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2"><Clock size={16}/> Konfigurasi PayLater</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                               <label className="block text-[10px] font-bold text-orange-700 uppercase mb-1">Tempo Pembayaran</label>
                               <select className="w-full border border-orange-300 rounded-lg p-2.5 text-sm font-bold text-slate-700" value={payLaterTerm} onChange={e => setPayLaterTerm(Number(e.target.value) as PayLaterTerm)}>
                                   <option value={1}>Bayar Nanti (1 Bulan / Lunas)</option>
                                   <option value={3}>Cicilan 3 Bulan</option>
                                   <option value={6}>Cicilan 6 Bulan</option>
                                   <option value={12}>Cicilan 12 Bulan</option>
                                </select>
                           </div>
                           <div>
                               <label className="block text-[10px] font-bold text-orange-700 uppercase mb-1">Simulasi Cicilan (Per Bulan)</label>
                               <div className="text-xl font-bold text-orange-900">Rp {Math.ceil(totalCost / payLaterTerm).toLocaleString('id-ID')} <span className="text-xs font-normal text-orange-700 ml-1">/ bulan</span></div>
                           </div>
                       </div>
                   </div>
               ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                       <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jumlah Dibayarkan (DP / Lunas)</label>
                          <div className="relative"><span className="absolute left-3 top-2.5 text-green-600 font-bold text-lg">Rp</span><input type="number" className="w-full pl-10 border-2 border-green-100 rounded-lg p-3 text-2xl font-bold text-slate-800 bg-green-50/30 focus:ring-green-500 focus:border-green-500" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))}/></div>
                       </div>
                       <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                           <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Status Pembayaran</label>
                           <div className={`text-xl font-black uppercase tracking-wider py-1 px-4 rounded-lg inline-block ${paymentStatus === 'LUNAS' ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{paymentStatus}</div>
                       </div>
                   </div>
               )}
            </div>

            <div className="bg-slate-900 p-4 rounded-xl shadow-lg flex justify-between items-center fixed md:sticky bottom-4 md:bottom-6 left-4 right-4 md:left-auto md:right-auto z-40 safe-area-pb">
                 <div className="text-white"><p className="text-xs opacity-70">Total Transaksi</p><p className="text-lg md:text-xl font-bold">Rp {totalCost.toLocaleString('id-ID')}</p></div>
                 <div className="flex gap-3">
                     <Link to="/dashboard/bookings"><Button type="button" variant="secondary" className="bg-slate-700 hover:bg-slate-600 text-white border-none text-sm px-3 md:px-4">Batal</Button></Link>
                     <Button type="submit" isLoading={loading} className={`px-4 md:px-8 font-bold shadow-blue-900/50 shadow-lg text-sm ${globalBlacklistAlert ? 'bg-red-600 hover:bg-red-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`} disabled={!!globalBlacklistAlert}>{globalBlacklistAlert ? 'BLOKIR' : (isEditMode ? 'UPDATE' : 'SIMPAN')}</Button>
                 </div>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
};
