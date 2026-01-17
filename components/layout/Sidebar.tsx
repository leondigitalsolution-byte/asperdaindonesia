
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../../service/authService';
import { UserRole, AppSettings } from '../../types';
import { getStoredData, DEFAULT_SETTINGS } from '../../service/dataService';
import { X } from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [logoError, setLogoError] = useState(false);
  const [appLogo, setAppLogo] = useState<string>('');

  useEffect(() => {
    // Check Role for Menu Visibility & Display Name
    authService.getUserProfile().then(profile => {
      if (profile) {
        setRole(profile.role);
        setUserName(profile.full_name);
      }
    });

    // Load App Logo from Settings
    const settings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    if (settings.logoUrl) {
      setAppLogo(settings.logoUrl);
    }
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  // Function to handle link click on mobile
  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  // Grouped Menu Structure
  const menuGroups = [
    {
      title: 'KOMUNITAS',
      items: [
        { label: 'Global Blacklist', path: '/dashboard/global-blacklist', icon: 'fas fa-shield-alt' },
        { label: 'Marketplace', path: '/dashboard/marketplace', icon: 'fas fa-store' },
      ]
    },
    {
      title: 'UTAMA',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: 'fas fa-th-large', end: true },
        { label: 'List Transaksi', path: '/dashboard/bookings', icon: 'fas fa-list-alt' },
        { label: 'Kalender Sewa', path: '/dashboard/calendar', icon: 'fas fa-calendar-alt' },
        { label: 'Kalkulator Biaya', path: '/dashboard/calculator', icon: 'fas fa-calculator' },
        { label: 'Tracking Unit', path: '/dashboard/tracking', icon: 'fas fa-map-marked-alt' },
      ]
    },
    {
      title: 'DATABASE',
      items: [
        { label: 'Armada Mobil', path: '/dashboard/cars', icon: 'fas fa-car' },
        { label: 'Data Pelanggan', path: '/dashboard/customers', icon: 'fas fa-users' },
        { label: 'Data Driver', path: '/dashboard/drivers', icon: 'fas fa-id-card-alt' },
        { label: 'Mitra & Rekanan', path: '/dashboard/partners', icon: 'fas fa-handshake' },
      ]
    },
    {
      title: 'KEUANGAN',
      items: [
        { label: 'Arus Kas', path: '/dashboard/finance', icon: 'fas fa-wallet' },
        { label: 'Laporan Statistik', path: '/dashboard/statistics', icon: 'fas fa-chart-pie' },
      ]
    },
    {
      title: 'SISTEM',
      items: [
        { label: 'High Season', path: '/dashboard/high-season', icon: 'fas fa-calendar-plus' },
        { label: 'Pengaturan', path: '/dashboard/settings', icon: 'fas fa-cog' },
        { label: 'Bantuan & FAQ', path: '/dashboard/help', icon: 'fas fa-question-circle' },
      ]
    }
  ];

  const adminItems = [
    { label: 'Verifikasi Anggota', path: '/dashboard/admin/members', icon: 'fas fa-user-check text-green-400' },
    { label: 'Review Blacklist', path: '/dashboard/admin/blacklist-review', icon: 'fas fa-shield-alt text-amber-400' },
    { label: 'Daftar PayLater', path: '/dashboard/admin/paylater', icon: 'fas fa-clock text-orange-400' }, 
  ];

  const isOrgAdmin = role === UserRole.SUPER_ADMIN || role === UserRole.DPC_ADMIN;
  const displayRole = role ? role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Loading...';

  // CSS Classes for Responsive Behavior
  // Mobile: Fixed, transform based on isOpen. Desktop: Fixed, translate-0 (always visible).
  const sidebarClasses = `
    w-72 bg-slate-900 text-white flex flex-col h-[100dvh] fixed left-0 top-0 overflow-y-auto z-50
    transition-transform duration-300 ease-in-out shadow-2xl
    ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
    md:translate-x-0 md:w-64 md:shadow-none
  `;

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={onClose}
        ></div>
      )}

      <aside className={sidebarClasses}>
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 font-bold shadow-lg shadow-white/10 overflow-hidden">
              {appLogo && !logoError ? (
                <img 
                  src={appLogo} 
                  alt="Logo" 
                  className="w-full h-full object-cover" 
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-xl font-extrabold">A</span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">ASPERDA</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Management</p>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white p-2 rounded-lg active:bg-slate-800">
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          
          {menuGroups.map((group) => (
            <div key={group.title} className="mb-6">
              <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-2">
                {group.title}
              </p>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20 translate-x-1'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                    }`
                  }
                >
                  <i className={`${item.icon} w-5 text-center text-lg opacity-80`}></i>
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          {/* Organization Admin Menu */}
          {isOrgAdmin && (
            <div className="mb-6 pt-2 border-t border-slate-800">
              <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-4">
                MENU PENGURUS
              </p>
              {/* Koperasi ASPERDA */}
              <NavLink
                to="/dashboard/coop"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1 ${
                    isActive
                      ? 'bg-slate-800 text-white border-l-4 border-indigo-500'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <i className="fas fa-building w-5 text-center text-lg text-indigo-400"></i>
                Koperasi ASPERDA
              </NavLink>

              {adminItems.map((item) => (
                 <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1 ${
                      isActive
                        ? 'bg-slate-800 text-white border-l-4 border-amber-500'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <i className={`${item.icon} w-5 text-center text-lg`}></i>
                  {item.label}
                </NavLink>
              ))}
              
              {role === UserRole.SUPER_ADMIN && (
                 <NavLink
                  to="/dashboard/admin/dpc"
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1 ${
                      isActive
                        ? 'bg-slate-800 text-white border-l-4 border-amber-500'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <i className="fas fa-map-marked-alt w-5 text-center text-lg text-purple-400"></i>
                  Kelola Wilayah
                </NavLink>
              )}
            </div>
          )}

        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 sticky bottom-0 z-10 pb-8 md:pb-4 safe-area-pb">
          <div className="mb-4 px-2 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white shadow-lg flex-shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
               <div className="text-sm font-bold text-white truncate">{userName || 'User'}</div>
               <div className={`text-[10px] uppercase tracking-wide truncate ${isOrgAdmin ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                 {displayRole}
               </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors border border-slate-800 hover:border-red-900/30"
          >
            <i className="fas fa-sign-out-alt w-5 text-center"></i>
            KELUAR APLIKASI
          </button>
        </div>
      </aside>
    </>
  );
};
