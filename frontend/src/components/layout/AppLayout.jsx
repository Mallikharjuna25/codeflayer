import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ParticlesBackground from '../reactbits/ParticlesBackground';

export default function AppLayout() {
  return (
    <div className="app-shell-enterprise">
      {/* ReactBits dynamic particles background (subtle corporate blue) */}
      <ParticlesBackground
        particleCount={30}
        particleColor="rgba(37, 99, 235, 0.2)"
        lineColor="rgba(59, 130, 246, 0.07)"
        speed={0.3}
        interactive={true}
      />

      <div className="app-content-shell">
        <Navbar />

        <main className="app-main-viewport">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
