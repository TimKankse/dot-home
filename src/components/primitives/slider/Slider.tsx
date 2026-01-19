import React from 'react';
import styles from './Slider.module.css';

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  min: number;
  max: number;
  value: number;
}

export const Slider: React.FC<SliderProps> = ({ 
  min, 
  max, 
  value, 
  style,
  className = '',
  ...props 
}) => {
  // Calculate percentage for background fill
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className={styles.sliderWrapper}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        className={`${styles.slider} ${className}`}
        style={{
          ...style,
          '--progress': `${percentage}%`
        } as React.CSSProperties}
        {...props}
      />
    </div>
  );
};
