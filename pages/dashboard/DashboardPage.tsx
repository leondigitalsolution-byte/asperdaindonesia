
import React, { useEffect, useState } from 'react';
import { dashboardService, DashboardStats } from '../../service/dashboardService';
import { authService } from '../../service/authService';
import { Profile, BookingStatus, UserRole } from '../../types';
import { Button } from '../../components/ui/Button';
// @ts-ignore
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, Search, ShoppingBag, ArrowRight } from 'lucide-react';

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
        
        if (userProfile?.company_id && userProfile.role !== UserRole.TOUR_AGENT) {
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
    checkDate.setHours(12, 0, 0, 0); 

    return stats.monthBookings.find(b => {
      if (b.car_id !== carId) return false;
      if (b.status !== BookingStatus.ACTIVE && b.status !== BookingStatus.CONFIRMED) return false;

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
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  // --- TOUR AGENT DASHBOARD VIEW ---
  if (profile?.role === UserRole.TOUR_AGENT) {
      return (
          <div className="space-y-8 pb-20">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="relative z-10">
                      <h1 className="text-3xl font-bold mb-2">Halo, {profile.full_name} 👋</h1>
                      <p className="text-blue-100 max-w-2xl">
                          Selamat datang di Panel Mitra Wisata ASPERDA. Cari unit rental terbaik dari jaringan kami untuk klien Anda.
                      </p>
                      
                      <div className="mt-8 flex flex-wrap gap-4">
                          <Link to="/dashboard/marketplace">
                              <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md hover:bg-blue-50 transition-colors">
                                  <Search size={20}/> Cari Mobil Sekarang
                              </button>
                          </Link>
                          <Link to="/dashboard/calculator">
                              <button className="bg-blue-500/30 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 border border-blue-400/50 hover:bg-blue-500/50 transition-colors">
                                  <i className="fas fa-calculator"></i> Cek Estimasi Harga
                              </button>
                          </Link>
                      </div>
                  </div>
              </div>

              {/* Quick Shortcuts */}
              <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Akses Cepat</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Link to="/dashboard/marketplace" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                              <ShoppingBag size={20}/>
                          </div>
                          <div className="font-bold text-slate-800">Status Order</div>
                          <div className="text-xs text-slate-500">Cek pesanan unit Anda</div>
                      </Link>
                      
                      <Link to="/dashboard/global-blacklist" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 mb-3 group-hover:scale-110 transition-transform">
                              <i className="fas fa-shield-alt text-lg"></i>
                          </div>
                          <div className="font-bold text-slate-800">Cek Blacklist</div>
                          <div className="text-xs text-slate-500">Verifikasi tamu aman</div>
                      </Link>

                      <Link to="/dashboard/customers" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mb-3 group-hover:scale-110 transition-transform">
                              <i className="fas fa-users text-lg"></i>
                          </div>
                          <div className="font-bold text-slate-800">Data Tamu</div>
                          <div className="text-xs text-slate-500">Kelola database pax</div>
                      </Link>

                      <Link to="/dashboard/help" className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 mb-3 group-hover:scale-110 transition-transform">
                              <i className="fas fa-question-circle text-lg"></i>
                          </div>
                          <div className="font-bold text-slate-800">Bantuan</div>
                          <div className="text-xs text-slate-500">Panduan & FAQ</div>
                      </Link>
                  </div>
              </div>

              {/* Promo Banner / Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                      <h4 className="font-bold text-slate-800 text-lg mb-1">Butuh unit High Season?</h4>
                      <p className="text-slate-600 text-sm max-w-lg">
                          Pastikan Anda memesan unit jauh-jauh hari untuk event besar. Gunakan fitur Marketplace untuk melihat ketersediaan real-time dari seluruh rental ASPERDA.
                      </p>
                  </div>
                  <Link to="/dashboard/marketplace">
                      <Button variant="outline" className="whitespace-nowrap">Lihat Marketplace &rarr;</Button>
                  </Link>
              </div>
          </div>
      );
  }

  // --- RENTAL OWNER DASHBOARD VIEW (EXISTING) ---
  return (
    <div className="space-y-6 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm">Ringkasan performa bisnis rental Anda.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <Link to="/dashboard/bookings/new" className="w-full md:w-auto">
             <Button className="!py-2 w-full">
               <i className="fas fa-plus mr-2"></i> Booking Baru
             </Button>
           </Link>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Total Armada</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalCars || 0}</h3>
            <p className="text-xs text-slate-400 mt-1">Unit terdaftar</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xl">
             <i className="fas fa-car"></i>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Sedang Jalan</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.activeRentals || 0}</h3>
            <p className="text-xs text-green-600 mt-1 font-medium">Unit beroperasi</p>
          </div>
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center text-xl">
             <i className="fas fa-road"></i>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Pelanggan</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalCustomers || 0}</h3>
            <p className="text-xs text-slate-400 mt-1">Total database</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-xl">
             <i className="fas fa-users"></i>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
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

      {/* GANTT CHART WIDGET */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/50">
          <div className="w-full sm:w-auto">
             <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm md:text-base">
               <Calendar size={18} className="text-indigo-600"/> Jadwal Unit (7 Hari)
             </h3>
             <p className="text-xs text-slate-500">Monitoring Booking Confirmed & Active.</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm w-full sm:w-auto justify-between">
             <button onClick={() => changeWeek(-1)} className="p-1 hover:bg-slate-100 rounded text-slate-600"><ChevronLeft size={16}/></button>
             <span className="text-sm font-bold text-slate-800 min-w-[140px] text-center uppercase tracking-wide text-xs">{getMonthLabel()}</span>
             <button onClick={() => changeWeek(1)} className="p-1 hover:bg-slate-100 rounded text-slate-600"><ChevronRight size={16}/></button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
           {(!stats?.cars || stats.cars.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-sm">Belum ada data unit mobil.</div>
           ) : (
              <div className="inline-block min-w-full align-middle">
                 <table className="min-w-full border-collapse">
                    <thead>
                       <tr>
                          <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-4 py-2 text-left text-xs font-bold text-slate-600 uppercase tracking-wide min-w-[140px] md:min-w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Unit Mobil</th>
                          {weekDates.map(date => {
                             const isToday = date.toDateString() === new Date().toDateString();
                             const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                             const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
                             const dayNum = date.getDate();

                             return (
                                <th key={date.toISOString()} className={`border-b border-r border-slate-100 px-1 py-3 text-center text-xs font-bold min-w-[50px] md:min-w-[60px] ${isToday ? 'bg-blue-100 text-blue-800' : isWeekend ? 'text-red-400 bg-slate-50' : 'text-slate-500'}`}>
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
                                <div className="truncate max-w-[120px] md:max-w-[160px]">{car.brand} {car.model}</div>
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
                                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-xs p-2 rounded whitespace-nowrap z-50 shadow-lg">
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
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-wrap gap-4 text-[10px] font-bold text-slate-500 uppercase justify-center md:justify-start">
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> Active (Jalan)</div>
           <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Booked (Confirmed)</div>
           <div className="hidden md:block flex-1 text-right normal-case text-slate-400">
              *Hanya status Booked & Active
           </div>
           <div className="normal-case w-full md:w-auto text-center md:text-right">
              <Link to="/dashboard/calendar" className="text-indigo-600 hover:underline">Lihat Kalender Lengkap &rarr;</Link>
           </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm md:text-base">Booking Terbaru</h3>
          <Link to="/dashboard/bookings" className="text-xs md:text-sm text-primary hover:underline font-medium">Lihat Semua &rarr;</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Pelanggan</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Unit Mobil</th>
                <th className="px-6 py-3 font-medium whitespace-nowrap">Tanggal</th>
                <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Total</th>
                <th className="px-6 py-3 font-medium text-center whitespace-nowrap">Status</th>
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
                    <td className="px-6 py-3 font-medium text-slate-900 whitespace-nowrap">{booking.customers?.full_name}</td>
                    <td className="px-6 py-3 text-slate-600 whitespace-nowrap">{booking.cars?.brand} {booking.cars?.model}</td>
                    <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(booking.start_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}
                    </td>
                    <td className="px-6 py-3 text-slate-900 font-bold text-right whitespace-nowrap">
                      Rp {booking.total_price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-3 text-center whitespace-nowrap">
                       <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase
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
