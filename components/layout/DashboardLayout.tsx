import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar - Hidden on mobile (TODO: Add Mobile Toggle) */}
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative md:ml-0">
         {/* Mobile Header placeholder */}
         <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30">
            <span className="font-bold">ASPERDA Mobile</span>
            <button className="text-white"><i className="fas fa-bars"></i></button>
         </div>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};