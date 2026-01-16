import React, { useEffect, useState } from 'react';
import { dashboardService, DashboardStats } from '../../service/dashboardService';
import { authService } from '../../service/authService';
import { Profile } from '../../types';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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