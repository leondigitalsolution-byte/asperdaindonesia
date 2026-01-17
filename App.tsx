
import React, { useEffect, useState } from 'react';
// @ts-ignore
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LoginPage } from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import { CarListPage } from './pages/cars/CarListPage';
import { CarFormPage } from './pages/cars/CarFormPage';
import { CustomerListPage } from './pages/customers/CustomerListPage';
import { CustomerFormPage } from './pages/customers/CustomerFormPage';
import { BookingListPage } from './pages/bookings/BookingListPage';
import { BookingFormPage } from './pages/bookings/BookingFormPage';
import { BookingCalendarPage } from './pages/bookings/BookingCalendarPage';
import { DriverListPage } from './pages/drivers/DriverListPage';
import { DriverFormPage } from './pages/drivers/DriverFormPage';
import { PartnerListPage } from './pages/partners/PartnerListPage';
import { PartnerFormPage } from './pages/partners/PartnerFormPage';
import { FinancePage } from './pages/finance/FinancePage';
import { FinanceFormPage } from './pages/finance/FinanceFormPage';
import { MarketplacePage } from './pages/marketplace/MarketplacePage';
import { GlobalBlacklistPage } from './pages/blacklist/GlobalBlacklistPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import CalculatorPage from './pages/calculator/CalculatorPage';
import { HighSeasonPage } from './pages/high-season/HighSeasonPage';

// Admin Pages
import { AdminMemberApprovalPage } from './pages/admin/AdminMemberApprovalPage';
import { AdminBlacklistReviewPage } from './pages/admin/AdminBlacklistReviewPage';
import { AdminDpcManagementPage } from './pages/admin/AdminDpcManagementPage';
import { AdminPayLaterPage } from './pages/admin/AdminPayLaterPage'; // NEW

// Koperasi Pages
import { CoopMemberListPage } from './pages/coop/CoopMemberListPage';
import { CoopMemberFormPage } from './pages/coop/CoopMemberFormPage';

import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { authService } from './service/authService';

// Placeholder Component for New Features
const UnderConstruction: React.FC<{title: string}> = ({title}) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
      <i className="fas fa-tools text-3xl text-slate-400"></i>
    </div>
    <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
    <p className="text-slate-500 max-w-md">
      Fitur ini sedang dalam tahap pengembangan. Segera hadir di update berikutnya.
    </p>
  </div>
);

// Komponen untuk menangani logika di Root URL (/)
const RootRoute: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authService.getCurrentSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error("RootRoute auth check error:", error);
        setIsAuthenticated(false); // Default to logout on error
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

// Komponen Wrapper untuk halaman Publik
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authService.getCurrentSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error("PublicRoute auth check error:", error);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) return null;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        
        {/* Protected Dashboard Routes with Layout */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } 
        >
          <Route index element={<DashboardPage />} />
          
          <Route path="cars" element={<CarListPage />} />
          <Route path="cars/new" element={<CarFormPage />} />
          <Route path="cars/edit/:id" element={<CarFormPage />} />
          
          <Route path="customers" element={<CustomerListPage />} />
          <Route path="customers/new" element={<CustomerFormPage />} />
          <Route path="customers/edit/:id" element={<CustomerFormPage />} />

          <Route path="bookings" element={<BookingListPage />} />
          <Route path="bookings/new" element={<BookingFormPage />} />
          <Route path="bookings/edit/:id" element={<BookingFormPage />} />
          <Route path="calendar" element={<BookingCalendarPage />} />

          <Route path="drivers" element={<DriverListPage />} />
          <Route path="drivers/new" element={<DriverFormPage />} />
          
          <Route path="partners" element={<PartnerListPage />} />
          <Route path="partners/new" element={<PartnerFormPage />} />
          
          <Route path="finance" element={<FinancePage />} />
          <Route path="finance/new" element={<FinanceFormPage />} />
          <Route path="finance/edit/:id" element={<FinanceFormPage />} />

          {/* New Routes */}
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="global-blacklist" element={<GlobalBlacklistPage />} />
          
          {/* Functional Settings Page */}
          <Route path="settings" element={<SettingsPage />} />

          {/* Integrated Calculator Page */}
          <Route path="calculator" element={<CalculatorPage />} />
          
          <Route path="tracking" element={<UnderConstruction title="Tracking Unit" />} />
          <Route path="statistics" element={<UnderConstruction title="Laporan Statistik" />} />
          <Route path="high-season" element={<HighSeasonPage />} />
          <Route path="help" element={<UnderConstruction title="Bantuan & FAQ" />} />

          {/* Admin Routes */}
          <Route path="admin/members" element={<AdminMemberApprovalPage />} />
          <Route path="admin/blacklist-review" element={<AdminBlacklistReviewPage />} />
          <Route path="admin/dpc" element={<AdminDpcManagementPage />} />
          <Route path="admin/paylater" element={<AdminPayLaterPage />} /> {/* NEW */}
          
          {/* Koperasi Routes */}
          <Route path="coop" element={<CoopMemberListPage />} />
          <Route path="coop/new" element={<CoopMemberFormPage />} />
          <Route path="coop/edit/:id" element={<CoopMemberFormPage />} />
          
          {/* Fallback for sub-routes not yet implemented */}
          <Route path="*" element={<div className="p-8 text-center text-slate-500">Halaman ini sedang dalam pengembangan.</div>} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
