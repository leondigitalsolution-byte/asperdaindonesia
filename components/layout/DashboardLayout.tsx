
import React, { useState } from 'react';
// @ts-ignore
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar Component */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Desktop Spacer */}
      {/* Because Sidebar is fixed on desktop, we need a spacer div to push content */}
      <div className="hidden md:block w-64 flex-shrink-0"></div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative w-full">
         
         {/* Mobile Header (Sticky) */}
         <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex justify-between items-center sticky top-0 z-30 shadow-md">
            <div className="flex items-center gap-3">
               <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors active:scale-95"
               >
                  <Menu size={24} />
               </button>
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg">A</div>
                  <span className="font-bold text-lg tracking-tight">ASPERDA</span>
               </div>
            </div>
         </div>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full max-w-[100vw] overflow-x-hidden">
          {/* Outlet is required for React Router v6 Nested Routes */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};
