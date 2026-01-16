import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { carService } from '../../service/carService';
import { bookingService } from '../../service/bookingService';
import { Car, Booking, BookingStatus } from '../../types';
import { Search, Filter, Plus } from 'lucide-react';

export const BookingCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [cars, setCars] = useState<Car[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [carsData, bookingsData] = await Promise.all([
        carService.getCars(),
        bookingService.getBookings()
      ]);
      setCars(carsData);
      setBookings(bookingsData);
    } catch (error) {
      console.error("Failed to load calendar data", error);
    } finally {
      setLoading(false);
    }
  };

  // Date Helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
    setCurrentDate(new Date(newDate));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const isDateBooked = (carId: string, day: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    checkDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone edge cases

    const booking = bookings.find(b => {
      if (b.car_id !== carId || b.status === BookingStatus.CANCELLED) return false;
      const start = new Date(b.start_date);
      const end = new Date(b.end_date);
      // Reset hours for comparison
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      
      return checkDate >= start && checkDate <= end;
    });

    return booking;
  };

  // Helper to check if car is active TODAY (real-time)
  const isCarActiveToday = (carId: string) => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      return bookings.some(b => {
          if (b.car_id !== carId || b.status === BookingStatus.CANCELLED) return false;
          const start = new Date(b.start_date);
          const end = new Date(b.end_date);
          start.setHours(0,0,0,0); 
          end.setHours(23,59,59,999);
          return today >= start && today <= end;
      });
  };

  // Navigation Handlers
  const handleCellClick = (carId: string, day: number) => {
      // Construct local date string YYYY-MM-DD
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // 0-indexed
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      navigate('/dashboard/bookings/new', {
          state: {
              carId: carId,
              startDate: dateStr,
              endDate: dateStr, // Default to same day
              startTime: '08:00',
              endTime: '08:00'
          }
      });
  };

  const handleBookingClick = (e: React.MouseEvent, bookingId: string) => {
      e.stopPropagation(); // Prevent triggering cell click
      navigate(`/dashboard/bookings/edit/${bookingId}`);
  };

  // Generate Array of Days [1, 2, ..., 31]
  const days = Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => i + 1);
  const monthName = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  // Processing Filter & Sort
  const categories = ['All', ...Array.from(new Set(cars.map(c => c.category || 'Lainnya').filter(Boolean)))];

  const filteredCars = cars
    .filter(car => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = car.brand.toLowerCase().includes(term) || 
                              car.model.toLowerCase().includes(term) || 
                              car.license_plate.toLowerCase().includes(term);
        const matchesCategory = selectedCategory === 'All' || (car.category || 'Lainnya') === selectedCategory;
        
        return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
        // Sort Priority: 
        // 1. Active Today (High priority)
        // 2. Alphabetical Brand
        const activeA = isCarActiveToday(a.id) ? 1 : 0;
        const activeB = isCarActiveToday(b.id) ? 1 : 0;
        
        if (activeA !== activeB) return activeB - activeA; // Active first
        return a.brand.localeCompare(b.brand);
    });

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kalender Booking</h1>
          <p className="text-slate-500 text-sm">Klik tanggal kosong untuk membuat booking baru.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full xl:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={16} />
                </div>
                <input 
                    type="text" 
                    placeholder="Cari Unit / Plat..." 
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Filter Category */}
            <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Filter size={16} />
                </div>
                <select 
                    className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-white w-full sm:w-40"
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                >
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Month Nav */}
            <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-1 w-full sm:w-auto justify-between sm:justify-start">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded shadow-sm text-slate-600 transition-all">
                <i className="fas fa-chevron-left"></i>
              </button>
              <span className="px-4 font-bold text-slate-800 text-sm min-w-[140px] text-center">
                {monthName}
              </span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded shadow-sm text-slate-600 transition-all">
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
             <i className="fas fa-spinner fa-spin mr-2"></i> Memuat Kalender...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 min-w-[220px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      Unit Mobil
                    </th>
                    {days.map(day => {
                      const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const isToday = isSameDay(dateObj, new Date());
                      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                      return (
                        <th key={day} className={`border-b border-slate-200 px-1 py-3 text-center text-[10px] font-bold min-w-[35px] ${isToday ? 'bg-blue-100 text-blue-800' : isWeekend ? 'bg-slate-50 text-red-400' : 'bg-white text-slate-600'}`}>
                          {day}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredCars.map((car) => {
                    const isActiveNow = isCarActiveToday(car.id);
                    return (
                        <tr key={car.id} className={`hover:bg-slate-50 transition-colors ${isActiveNow ? 'bg-green-50/30' : ''}`}>
                        <td className={`sticky left-0 z-10 border-b border-r border-slate-200 px-4 py-3 text-sm font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${isActiveNow ? 'bg-green-50 text-green-900' : 'bg-white text-slate-900'}`}>
                            <div className="flex justify-between items-start">
                                <div className="truncate max-w-[140px]">{car.brand} {car.model}</div>
                                {isActiveNow && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mt-1.5" title="Sedang Jalan"></span>}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{car.license_plate}</div>
                            {car.category && <div className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded w-fit mt-1 border border-slate-200">{car.category}</div>}
                        </td>
                        {days.map(day => {
                            const booking = isDateBooked(car.id, day);
                            let bgClass = "";
                            
                            if (booking) {
                                if (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.ACTIVE) {
                                    bgClass = "bg-blue-500";
                                } else if (booking.status === BookingStatus.COMPLETED) {
                                    bgClass = "bg-slate-400";
                                } else {
                                    bgClass = "bg-amber-400"; // Pending
                                }
                            }

                            return (
                            <td 
                                key={day} 
                                className="border-b border-r border-slate-100 px-0.5 py-1 h-14 relative group cursor-pointer hover:bg-indigo-50/50 transition-colors"
                                onClick={() => !booking && handleCellClick(car.id, day)}
                                title={!booking ? "Klik untuk tambah booking baru" : ""}
                            >
                                {booking ? (
                                    <>
                                        <div 
                                            className={`w-full h-10 rounded-sm ${bgClass} cursor-pointer opacity-90 hover:opacity-100 transition-opacity shadow-sm mx-auto flex items-center justify-center`}
                                            onClick={(e) => handleBookingClick(e, booking.id)}
                                        >
                                            {/* Optional: Small icon or indicator inside bar */}
                                        </div>
                                        {/* Tooltip */}
                                        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-3 py-2 whitespace-nowrap shadow-xl border border-slate-700 pointer-events-none">
                                            <div className="font-bold mb-1">{booking.customers?.full_name}</div>
                                            <div className="opacity-80 text-[10px] uppercase tracking-wide">{booking.status}</div>
                                            <div className="text-[9px] text-slate-300 mt-1">Klik untuk edit</div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <Plus size={12} className="text-indigo-300"/>
                                    </div>
                                )}
                            </td>
                            );
                        })}
                        </tr>
                    );
                  })}
                  {filteredCars.length === 0 && (
                    <tr>
                      <td colSpan={days.length + 1} className="p-12 text-center text-slate-500 bg-slate-50">
                        <div className="mb-2"><Search size={24} className="mx-auto text-slate-300"/></div>
                        Tidak ada mobil yang sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-600 font-medium px-2">
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 bg-blue-500 rounded"></div>
           <span>Confirmed / Active (Booked)</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 bg-amber-400 rounded"></div>
           <span>Pending Payment</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 bg-slate-400 rounded"></div>
           <span>Selesai (Completed)</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
           <span className="text-green-700">Indikator Unit Sedang Jalan Hari Ini</span>
        </div>
      </div>
    </div>
  );
};