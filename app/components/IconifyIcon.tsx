import React from 'react';

interface IconifyIconProps {
  icon: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const IconifyIcon: React.FC<IconifyIconProps> = ({ icon, width, height, className, style }) => {
  return React.createElement('iconify-icon', {
    icon,
    width,
    height,
    class: className,
    style,
  });
};

export default IconifyIcon;
