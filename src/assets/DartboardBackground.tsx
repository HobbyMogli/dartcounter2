import React from 'react';

const BOARD_SIZE = 1200;
const SEGMENT_ANGLE = 360 / 20; // 18 degrees per segment
const HALF_SEGMENT = SEGMENT_ANGLE / 2; // 9 degrees offset
const DARTBOARD_NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Ring dimensions
const RING_WIDTH = 25;
const TRIPLE_RING_RADIUS = BOARD_SIZE * 0.3;
const DOUBLE_RING_RADIUS = BOARD_SIZE * 0.49;

// Ring styling
const RING_STYLES = {
  dark: 'fill-cyan-400/35 stroke-cyan-400/30',
  light: 'fill-cyan-400/70 stroke-cyan-400/70',
  strokeWidth: '2',
  filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.3))'
} as const;

const DartboardBackground: React.FC = () => {
  // Function to calculate segment points
  const calculateSegmentPoints = (index: number): string => {
    const startAngle = index * SEGMENT_ANGLE - HALF_SEGMENT;
    const endAngle = startAngle + SEGMENT_ANGLE;
    
    // Convert angles to radians
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    
    const radius = BOARD_SIZE / 2;
    const centerX = BOARD_SIZE / 2;
    const centerY = BOARD_SIZE / 2;
    
    // Calculate points for the segment
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    return `M ${centerX},${centerY} L ${x1},${y1} A ${radius},${radius} 0 0,1 ${x2},${y2} Z`;
  };

  // Function to calculate ring arc (used for both triple and double rings)
  const calculateRingArc = (index: number, ringRadius: number): string => {
    const startAngle = index * SEGMENT_ANGLE - HALF_SEGMENT;
    const endAngle = startAngle + SEGMENT_ANGLE;
    
    // Convert angles to radians
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    
    const centerX = BOARD_SIZE / 2;
    const centerY = BOARD_SIZE / 2;
    const innerRadius = ringRadius - RING_WIDTH / 2;
    const outerRadius = ringRadius + RING_WIDTH / 2;
    
    // Calculate points for inner and outer arcs
    const innerStartX = centerX + innerRadius * Math.cos(startRad);
    const innerStartY = centerY + innerRadius * Math.sin(startRad);
    const innerEndX = centerX + innerRadius * Math.cos(endRad);
    const innerEndY = centerY + innerRadius * Math.sin(endRad);
    
    const outerStartX = centerX + outerRadius * Math.cos(startRad);
    const outerStartY = centerY + outerRadius * Math.sin(startRad);
    const outerEndX = centerX + outerRadius * Math.cos(endRad);
    const outerEndY = centerY + outerRadius * Math.sin(endRad);
    
    return `
      M ${outerStartX},${outerStartY}
      A ${outerRadius},${outerRadius} 0 0,1 ${outerEndX},${outerEndY}
      L ${innerEndX},${innerEndY}
      A ${innerRadius},${innerRadius} 0 0,0 ${innerStartX},${innerStartY}
      Z
    `;
  };

  // Function to calculate line coordinates
  const calculateLineCoordinates = (index: number) => {
    const lineAngle = (index * SEGMENT_ANGLE) - HALF_SEGMENT;
    const lineRad = (lineAngle - 90) * Math.PI / 180;
    
    const centerX = BOARD_SIZE / 2;
    const centerY = BOARD_SIZE / 2;
    const radius = BOARD_SIZE / 2;
    
    const endX = centerX + radius * Math.cos(lineRad);
    const endY = centerY + radius * Math.sin(lineRad);
    
    return {
      x1: centerX,
      y1: centerY,
      x2: endX,
      y2: endY,
    };
  };

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 flex items-center justify-center">
        <svg 
          width={BOARD_SIZE} 
          height={BOARD_SIZE} 
          className="absolute"
          style={{
            transform: 'translate(-50%, -50%)',
            left: '50%',
            top: '50%',
          }}
        >
          {/* Base circle */}
          <circle 
            cx={BOARD_SIZE / 2} 
            cy={BOARD_SIZE / 2} 
            r={BOARD_SIZE / 2} 
            className="fill-gray-800"
          />
          
          {/* Segments */}
          {DARTBOARD_NUMBERS.map((number, index) => (
            <path
              key={number}
              d={calculateSegmentPoints(index)}
              className={`${index % 2 === 0 ? 'fill-gray-800' : 'fill-gray-700'}`}
            />
          ))}

          {/* Double Ring Segments */}
          {DARTBOARD_NUMBERS.map((number, index) => (
            <path
              key={`double-${number}`}
              d={calculateRingArc(index, DOUBLE_RING_RADIUS)}
              className={index % 2 === 0 ? RING_STYLES.dark : RING_STYLES.light}
              strokeWidth={RING_STYLES.strokeWidth}
              style={{ filter: RING_STYLES.filter }}
            />
          ))}

          {/* Triple Ring Segments */}
          {DARTBOARD_NUMBERS.map((number, index) => (
            <path
              key={`triple-${number}`}
              d={calculateRingArc(index, TRIPLE_RING_RADIUS)}
              className={index % 2 === 0 ? RING_STYLES.dark : RING_STYLES.light}
              strokeWidth={RING_STYLES.strokeWidth}
              style={{ filter: RING_STYLES.filter }}
            />
          ))}

          {/* Segment Lines */}
          {Array.from({ length: 20 }).map((_, index) => {
            const coords = calculateLineCoordinates(index);
            return (
              <line
                key={`line-${index}`}
                x1={coords.x1}
                y1={coords.y1}
                x2={coords.x2}
                y2={coords.y2}
                className="stroke-cyan-400/70"
                strokeWidth="3"
                style={{ filter: RING_STYLES.filter }}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default DartboardBackground; 