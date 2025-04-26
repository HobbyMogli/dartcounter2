import React, { useEffect, useState } from 'react';
import { SpecialThrow } from '../../services/animations/specialThrowService';
import './animation.css';

interface SpecialThrowAnimationProps {
  specialThrow: SpecialThrow;
  position?: 'top' | 'center' | 'bottom';
  size?: 'small' | 'medium' | 'large';
}

const SpecialThrowAnimation: React.FC<SpecialThrowAnimationProps> = ({
  specialThrow,
  position = 'center',
  size = 'medium',
}) => {
  // Keep track of whether we should render the image at all
  const [shouldRender, setShouldRender] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Use a two-phase approach to prevent flashing:
  // 1. First wait for component to mount but don't render anything
  // 2. Then render with opacity:0 and add animation class
  useEffect(() => {
    // Small delay to ensure component is fully mounted
    const renderTimer = setTimeout(() => {
      setShouldRender(true);
      
      // Once rendered but invisible, start the animation
      const animationTimer = setTimeout(() => {
        setIsActive(true);
      }, 50);
      
      return () => clearTimeout(animationTimer);
    }, 50);
    
    return () => clearTimeout(renderTimer);
  }, []);

  // Get image path based on special throw type
  const getImagePath = (type: string): string => {
    switch (type) {
      case 'breakfast':
        return '/animations/breakfast.png';
      case 'hatTrick':
        return '/animations/hattrick.png';
      case 'madhouse':
        return '/animations/madhouse.png';
      case 'shanghai':
        return '/animations/shanghai.png';
      default:
        return '';
    }
  };
  
  // Get the image path for this special throw
  const imagePath = getImagePath(specialThrow.type);

  // If no image is available or we're not ready to render, don't render anything
  if (!imagePath || !shouldRender) {
    return null;
  }

  return (
    <div className="absolute z-[9999] pointer-events-none" 
      style={{ 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -58%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Display only the image, positioned over the player's score */}
      <div 
        className={isActive ? 'animate-special-image' : ''}
        style={{ 
          width: '170px', 
          height: '170px', 
          opacity: 0 // Start completely invisible until animation kicks in
        }}
      >
        <img 
          src={imagePath}
          alt={specialThrow.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 15px rgba(0, 0, 0, 0.9))'
          }}
        />
      </div>
    </div>
  );
};

export default SpecialThrowAnimation;