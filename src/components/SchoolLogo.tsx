import React from 'react';

interface SchoolLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md'
}) => {
  // Height map for responsive rendering
  const heightClasses = {
    xs: 'h-6 sm:h-7',
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-11',
    lg: 'h-14 sm:h-16',
    xl: 'h-20 sm:h-24',
  };

  return (
    <div className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      <img
        src="/logo.png"
        alt="Logo SMK Ekonomika"
        referrerPolicy="no-referrer"
        className={`${heightClasses[size] || heightClasses.md} w-auto object-contain block`}
        onError={(e) => {
          // Fallback to svg if png fails
          const target = e.currentTarget;
          if (!target.src.endsWith('/logo.svg')) {
            target.src = '/logo.svg';
          }
        }}
      />
    </div>
  );
};
