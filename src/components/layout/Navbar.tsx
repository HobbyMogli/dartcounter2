import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, UserGroupIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface NavbarProps {
  onOpenSettings?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onOpenSettings }) => {
  const location = useLocation();
  
  return (
    <nav className="bg-transparent backdrop-blur-md border-b border-dark-600">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left Spacer (empty or for future icons) */}
          <div className="w-1/4"></div>

          {/* Centered Title */}
          <div className="w-1/2 text-center">
            <Link
              to="/"
              className="text-neon-blue text-4xl font-bold hover:text-shadow-glow-blue transition-all duration-300"
            >
              Howizzers Dart Counter
            </Link>
          </div>

          {/* Right Aligned Links & Button - Updated Logic */}
          <div className="w-1/4 flex items-center justify-end space-x-6">
            {/* Show Spieler Icon only on Home page */}
            {location.pathname === '/' && (
              <Link to="/players" className="text-gray-300 hover:text-neon-blue transition-colors" title="Spielerverwaltung">
                <UserGroupIcon className="w-6 h-6" />
              </Link>
            )}
            
            {/* Show Home Icon on all pages EXCEPT Home */}
            {location.pathname !== '/' && (
              <Link to="/" className="text-gray-300 hover:text-neon-blue transition-colors" title="Home">
                <HomeIcon className="w-6 h-6" />
              </Link>
            )}

            {/* Show Settings Icon only on Game page */}
            {location.pathname === '/game' && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="text-gray-300 hover:text-neon-blue transition-colors"
                title="Einstellungen"
              >
                <Cog6ToothIcon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;