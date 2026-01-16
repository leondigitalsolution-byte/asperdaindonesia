import React, { useEffect, useState } from 'react';
import { carService } from '../../service/carService';
import { bookingService } from '../../service/bookingService';
import { Car, Booking, BookingStatus } from '../../types';
import { Button } from '../../components/ui/Button';

export const BookingCalendarPage: React.FC = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

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

  // Generate Array of Days [1, 2, ..., 31]
  const days = Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => i + 1);
  const monthName = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kalender Booking</h1>
          <p className="text-slate-500 text-sm">Monitoring ketersediaan unit bulan {monthName}.</p>
        </div>
        
        <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200 p-1">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded text-slate-600">
            <i className="fas fa-chevron-left"></i>
          </button>
          <span className="px-4 font-bold text-slate-800 min-w-[150px] text-center">
            {monthName}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded text-slate-600">
            <i className="fas fa-chevron-right"></i>
          </button>
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
                    <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 min-w-[200px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      Unit Mobil
                    </th>
                    {days.map(day => {
                      const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const isToday = isSameDay(dateObj, new Date());
                      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                      return (
                        <th key={day} className={`border-b border-slate-200 px-2 py-3 text-center text-xs font-semibold min-w-[35px] ${isToday ? 'bg-blue-100 text-blue-700' : isWeekend ? 'bg-slate-50 text-red-400' : 'bg-white text-slate-700'}`}>
                          {day}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {cars.map((car) => (
                    <tr key={car.id} className="hover:bg-slate-50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="truncate max-w-[180px]">{car.brand} {car.model}</div>
                        <div className="text-xs text-slate-500 font-mono">{car.license_plate}</div>
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
                          <td key={day} className="border-b border-r border-slate-100 px-1 py-1 h-12 relative group">
                            {booking && (
                              <>
                                <div className={`w-full h-8 rounded-md ${bgClass} cursor-pointer opacity-90 hover:opacity-100 transition-opacity`}></div>
                                {/* Tooltip */}
                                <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                  {booking.customers?.full_name} ({booking.status})
                                </div>
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {cars.length === 0 && (
                    <tr>
                      <td colSpan={days.length + 1} className="p-8 text-center text-slate-500">
                        Belum ada data mobil.
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
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 bg-blue-500 rounded"></div>
           <span>Confirmed/Active</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 bg-amber-400 rounded"></div>
           <span>Pending</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 bg-slate-400 rounded"></div>
           <span>Completed</span>
        </div>
      </div>
    </div>
  );
};