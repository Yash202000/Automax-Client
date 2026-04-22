import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { LicenseGraceBanner } from '../common/LicenseGraceBanner';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <LicenseGraceBanner />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
        <Outlet />
      </main>
    </div>
  );
};
