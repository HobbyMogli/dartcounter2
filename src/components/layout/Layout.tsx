import React, { ReactNode } from 'react';
import Navbar from './Navbar';
import Background from './Background';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen relative">
      <Background />
      <Navbar />
      <main className="container mx-auto px-4 py-8 relative">
        {/* Hier könnte später der Hintergrund-Grafikcontainer eingefügt werden */}
        {children}
      </main>
    </div>
  );
};

export default Layout;