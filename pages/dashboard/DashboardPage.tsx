
import React, { useEffect, useState } from 'react';
import { dashboardService, DashboardStats } from '../../service/dashboardService';
import { authService } from '../../service/authService';
import { Profile, BookingStatus } from '../../types';
import { Button } from '../../components/ui/Button';
// @ts-ignore
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Calendar State (Start Date for the week view)
  const [weekStartDate, setWeekStartDate] = useState(new Date());

  useEffect(() => {
    const loadData = async () => {
      try {
        const userProfile = await authService.getUserProfile();
        setProfile(userProfile);
        
        if (userProfile?.company_id) {
          const statsData = await dashboardService.getStats();
          setStats(statsData);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- CALENDAR LOGIC (WEEK VIEW) ---
  
  // Generate 7 days starting from weekStartDate
  const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStartDate);
      d.setDate(d.getDate() + i);
      return d;
  });

  const getMonthLabel = () => {
      const start = weekDates[0];
      const end = weekDates[6];
      if (start.getMonth() === end.getMonth()) {
          return start.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
      }
      return `${start.toLocaleString('id-ID', { month: 'short' })} - ${end.toLocaleString('id-ID', { month: 'short', year: 'numeric' })}`;
  };

  const isDateBooked = (carId: string, date: Date) => {
    if (!stats?.monthBookings) return null;

    const checkDate = new Date(date);
    checkDate.setHours(12, 0, 0, 0); // Normalized time

    // STRICT FILTER: Only show ACTIVE or CONFIRMED (Booked)
    return stats.monthBookings.find(b => {
      if (b.car_id !== carId) return false;
      
      // Filter out Pending, Cancelled, Completed for this view
      if (b.status !== BookingStatus.ACTIVE && b.status !== BookingStatus.CONFIRMED) {
          return false;
      }

      const start = new Date(b.start_date);
      const end = new Date(b.end_date);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      
      return checkDate >= start && checkDate <= end;
    });
  };

  const changeWeek = (offset: number) => {
      const newDate = new Date(weekStartDate);
      newDate.setDate(newDate.getDate() + (offset * 7));
      setWeekStartDate(newDate);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm">Ringkasan performa bisnis rental Anda.</p>
        </div>
        <div className="flex gap-2">
           <Link to="/dashboard/bookings/new">
             <Button className="!py-2">
               <i className="fas fa-plus mr-2"></i> Booking Baru
             </Button>
           </Link>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Cars */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Total Armada</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalCars || 0}</h3>
            <p className="text-xs text-slate-400 mt-1">Unit terdaftar</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xl">
             <i className="fas fa-car"></i>
          </div>
        </div>

        {/* Card 2: Active Rentals */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Sedang Jalan</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.activeRentals || 0}</h3>
            <p className="text-xs text-green-600 mt-1 font-medium">Unit beroperasi</p>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center text-xl">
             <i className="fas fa-road"></i>
          </div>
        </div>

        {/* Card 3: Total Customers */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Pelanggan</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalCustomers || 0}</h3>
            <p className="text-xs text-slate-400 mt-1">Total database</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-xl">
             <i className="fas fa-users"></i>
          </div>
        </div>

        {/* Card 4: Revenue */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Omzet Bulan Ini</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1 truncate max-w-[140px]" title={`Rp ${stats?.revenueThisMonth.toLocaleString('id-ID')}`}>
              {(stats?.revenueThisMonth || 0) > 1000000 
                ? `${((stats?.revenueThisMonth || 0) / 1000000).toFixed(1)} Jt` 
                : `Rp ${(stats?.revenueThisMonth || 0).toLocaleString('id-ID')}`
              }
            </h3>
            <p className="text-xs text-emerald-600 mt-1 font-medium">Estimasi pendapatan</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-xl">
             <i className="fas fa-chart-line"></i>
          </div>
        </div>
      </div>

      {/* GANTT CHART WIDGET - WEEKLY VIEW */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/50">
          <div>
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <Calendar size={18} className="text-indigo-600"/> Jadwal Unit (7 Hari)
             </h3>
             <p className="text-xs text-slate-500">Monitoring Booking Confirmed & Active.</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
             <button onClick={() => changeWeek(-1)} className="p-1 hover:bg-slate-100 rounded text-slate-600"><ChevronLeft size={16}/></button>
             <span className="text-sm font-bold text-slate-800 min-w-[140px] text-center uppercase tracking-wide text-xs">{getMonthLabel()}</span>
             <button onClick={() => changeWeek(1)} className="p-1 hover:bg-slate-100 rounded text-slate-600"><ChevronRight size={16}/></button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
           {(!stats?.cars || stats.cars.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-sm">Belum ada data unit mobil.</div>
           ) : (
              <div className="inline-block min-w-full">
                 <table className="min-w-full border-collapse">
                    <thead>
                       <tr>
                          <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-4 py-2 text-left text-xs font-bold text-slate-600 uppercase tracking-wide min-w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Unit Mobil</th>
                          {weekDates.map(date => {
                             const isToday = date.toDateString() === new Date().toDateString();
                             const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                             const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
                             const dayNum = date.getDate();

                             return (
                                <th key={date.toISOString()} className={`border-b border-r border-slate-100 px-1 py-3 text-center text-xs font-bold min-w-[60px] ${isToday ? 'bg-blue-100 text-blue-800' : isWeekend ? 'text-red-400 bg-slate-50' : 'text-slate-500'}`}>
                                   <div className="uppercase text-[10px] opacity-70">{dayName}</div>
                                   <div className="text-sm">{dayNum}</div>
                                </th>
                             )
                          })}
                       </tr>
                    </thead>
                    <tbody>
                       {stats.cars.map(car => (
                          <tr key={car.id} className="hover:bg-slate-50 transition-colors">
                             <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 px-4 py-3 text-xs font-bold text-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                <div className="truncate max-w-[160px]">{car.brand} {car.model}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{car.license_plate}</div>
                             </td>
                             {weekDates.map(date => {
                                const booking = isDateBooked(car.id, date);
                                let barClass = "";
                                
                                if (booking) {
                                   if (booking.status === BookingStatus.ACTIVE) barClass = "bg-green-500";
                                   else if (booking.status === BookingStatus.CONFIRMED) barClass = "bg-blue-500";
                                }

                                return (
                                   <td key={date.toISOString()} className="border-b border-r border-slate-100 px-0.5 py-1 h-12 relative group">
                                      {booking && (
                                         <div 
                                            className={`w-full h-8 rounded-md ${barClass} cursor-help transition-opacity hover:opacity-90 shadow-sm`}
                                            title={`${booking.customers?.full_name} (${booking.status})`}
                                         >
                                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-xs p-2 rounded whitespace-nowrap z-50">
                                                {booking.customers?.full_name} - {booking.status}
                                            </div>
                                         </div>
                                      )}
                                   </td>
                                )
                             })}
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           )}
        </div>
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex gap-4 text-[10px] font-bold text-slate-500 uppercase">
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> Active (Jalan)</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Booked (Confirmed)</div>
           <div className="flex-1 text-right normal-case text-slate-400">
              *Hanya menampilkan status Booked & Active
           </div>
           <div className="normal-case">
              <Link to="/dashboard/calendar" className="text-indigo-600 hover:underline">Lihat Kalender Lengkap &rarr;</Link>
           </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Booking Terbaru</h3>
          <Link to="/dashboard/bookings" className="text-sm text-primary hover:underline font-medium">Lihat Semua &rarr;</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-medium">Pelanggan</th>
                <th className="px-6 py-3 font-medium">Unit Mobil</th>
                <th className="px-6 py-3 font-medium">Tanggal</th>
                <th className="px-6 py-3 font-medium text-right">Total</th>
                <th className="px-6 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(!stats?.recentBookings || stats.recentBookings.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Belum ada transaksi terbaru.
                  </td>
                </tr>
              ) : (
                stats.recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{booking.customers?.full_name}</td>
                    <td className="px-6 py-3 text-slate-600">{booking.cars?.brand} {booking.cars?.model}</td>
                    <td className="px-6 py-3 text-slate-500">
                      {new Date(booking.start_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}
                    </td>
                    <td className="px-6 py-3 text-slate-900 font-bold text-right">
                      Rp {booking.total_price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-3 text-center">
                       <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase
                         ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                           booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                           booking.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}
                       `}>
                         {booking.status}
                       </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
