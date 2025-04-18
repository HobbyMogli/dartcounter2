import React from 'react';
import DartboardBackground from '../../assets/DartboardBackground';

const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-dark-900/95" /> {/* Overlay für bessere Lesbarkeit */}
      <DartboardBackground />
    </div>
  );
};

export default Background;