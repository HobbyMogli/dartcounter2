import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-primary-600">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-white text-xl font-bold">
            DartCounter
          </Link>
          <div className="flex space-x-4">
            <Link to="/" className="text-white hover:text-primary-200">
              Home
            </Link>
            <Link to="/setup" className="text-white hover:text-primary-200">
              Neues Spiel
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;