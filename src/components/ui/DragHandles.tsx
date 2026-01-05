import React from 'react';

export const DragHandles: React.FC = () => {
  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10,
    background: 'transparent',
    // Debug color
    // background: 'rgba(255, 0, 0, 0.2)', 
  };

  const thickness = '20px';

  return (
    <>
      {/* Top */}
      <div 
        className="grid-drag-handle"
        style={{
          ...handleStyle,
          top: 0,
          left: 0,
          right: 0,
          height: thickness,
          cursor: 'grab',
        }}
      />
      {/* Bottom */}
      <div 
        className="grid-drag-handle"
        style={{
          ...handleStyle,
          bottom: 0,
          left: 0,
          right: 0,
          height: thickness,
          cursor: 'grab',
        }}
      />
      {/* Left */}
      <div 
        className="grid-drag-handle"
        style={{
          ...handleStyle,
          top: 0,
          bottom: 0,
          left: 0,
          width: thickness,
          cursor: 'grab',
        }}
      />
      {/* Right */}
      <div 
        className="grid-drag-handle"
        style={{
          ...handleStyle,
          top: 0,
          bottom: 0,
          right: 0,
          width: thickness,
          cursor: 'grab',
        }}
      />
    </>
  );
};
