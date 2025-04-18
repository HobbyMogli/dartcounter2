import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-transparent backdrop-blur-sm border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-neon-blue text-xl font-bold hover:glow-blue">
            DartCounter
          </Link>
          <div className="flex space-x-6">
            <Link to="/" className="text-gray-300 hover:text-neon-blue transition-colors">
              Home
            </Link>
            <Link to="/players" className="text-gray-300 hover:text-neon-blue transition-colors">
              Spieler
            </Link>
            <Link to="/setup" className="text-gray-300 hover:text-neon-blue transition-colors">
              Neues Spiel
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;