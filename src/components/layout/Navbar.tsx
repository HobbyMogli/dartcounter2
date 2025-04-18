import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaCog } from 'react-icons/fa';

interface NavbarProps {
  onOpenSettings?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onOpenSettings }) => {
  const location = useLocation();
  
  // Liste der Pfade, bei denen das Einstellungs-Icon angezeigt werden soll
  const showSettingsIcon = ['/game', '/gameboard'].includes(location.pathname);

  return (
    <nav className="bg-transparent backdrop-blur-sm border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-neon-blue text-xl font-bold hover:glow-blue">
            Howizzers Dart Counter
          </Link>
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-gray-300 hover:text-neon-blue transition-colors">
              Home
            </Link>
            <Link to="/players" className="text-gray-300 hover:text-neon-blue transition-colors">
              Spieler
            </Link>
            <Link to="/setup" className="text-gray-300 hover:text-neon-blue transition-colors">
              Neues Spiel
            </Link>
            {showSettingsIcon && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="text-gray-300 hover:text-neon-blue transition-colors"
                title="Einstellungen"
              >
                <FaCog className="text-xl" />
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;