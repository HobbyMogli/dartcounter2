import React, { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaCog } from 'react-icons/fa';
import Navbar from './Navbar';
import Background from './Background';
import { SettingsModal } from '../game-settings';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  return (
    <div className="min-h-screen relative">
      <Background />
      <Navbar onOpenSettings={handleOpenSettings} />
      <main className="container mx-auto px-4 py-8 relative">
        {/* Hier könnte später der Hintergrund-Grafikcontainer eingefügt werden */}
        {children}
      </main>
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default Layout;