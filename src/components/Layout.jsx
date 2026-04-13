import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import { Toaster } from 'react-hot-toast';

const Layout = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Toaster position="top-right" />
      <Navigation />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
