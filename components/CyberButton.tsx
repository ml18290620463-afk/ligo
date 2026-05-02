import React from 'react';
import { Theme } from '../types';

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost';
  theme?: Theme;
  children: React.ReactNode;
  as?: 'button' | 'label' | 'div';
  htmlFor?: string;
}

export const CyberButton: React.FC<CyberButtonProps> = ({
  variant = 'primary',
  theme = 'dark',
  children,
  className = '',
  as = 'button',
  htmlFor,
  ...props
}) => {
  const baseStyles =
    'relative px-6 py-2 font-mono font-bold uppercase tracking-widest transition-all duration-300 clip-path-polygon group overflow-hidden';

  const variants = {
    primary:
      theme === 'light'
        ? 'bg-white/80 backdrop-blur-xl text-[#007a8c] border border-[rgba(0,122,140,0.2)] hover:bg-[#007a8c] hover:text-white hover:border-[#007a8c] hover:shadow-sm'
        : 'bg-[#12d8ff]/10 text-[#12d8ff] border border-[#12d8ff]/70 hover:bg-[#12d8ff]/20 hover:text-white hover:border-[#12d8ff] shadow-[0_0_15px_rgba(18,216,255,0.15)] hover:shadow-[0_0_25px_rgba(18,216,255,0.3)]',
    danger:
      theme === 'light'
        ? 'bg-white/80 backdrop-blur-xl text-[#C85F72] border border-[#C85F72]/20 hover:bg-[#C85F72] hover:text-white hover:border-[#C85F72] hover:shadow-sm'
        : 'bg-[#C85F72]/10 text-[#C85F72] border border-[#C85F72]/50 hover:bg-[#C85F72] hover:text-white hover:shadow-[0_0_20px_rgba(200,95,114,0.4)] shadow-[0_0_10px_rgba(200,95,114,0.1)]',
    ghost:
      theme === 'light'
        ? 'text-[#4a5568] hover:text-[#007a8c] border border-transparent hover:bg-[rgba(0,122,140,0.05)] hover:border-[rgba(0,122,140,0.1)]'
        : 'text-[#6e8198] hover:text-[#12d8ff] border border-transparent hover:border-[#12d8ff]/30 hover:bg-[#12d8ff]/5',
  };

  const content = (
    <>
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>

      {/* Laser sheen effect on hover (Removed for performance) */}
      <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-0 group-hover:opacity-10 transition-opacity" />

      {/* Decorative corner markers */}
      <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-current opacity-60"></span>
      <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-current opacity-60"></span>
    </>
  );

  const composedClassName = `${baseStyles} ${variants[variant]} ${className} ${as === 'label' ? 'cursor-pointer inline-block text-center' : ''}`;

  if (as === 'label') {
    // <label htmlFor=...> is keyboard-accessible by definition (focus
    // and Enter/Space go through the bound control), so the extra
    // onClick is a UX shortcut for mouse users only. We do not need a
    // keyboard listener here, so silence the false positive.
    return (
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
      <label
        className={composedClassName}
        htmlFor={htmlFor}
        onClick={props.onClick as unknown as React.MouseEventHandler<HTMLLabelElement> | undefined}
      >
        {content}
      </label>
    );
  }

  if (as === 'div') {
    // Polymorphic "button" rendered as a div. Add the proper button
    // semantics so screen readers announce it correctly and keyboard
    // users can activate it (Enter / Space). Without this jsx-a11y
    // (rightfully) flags the click handler.
    const onClick = props.onClick as unknown as React.MouseEventHandler<HTMLDivElement> | undefined;
    return (
      <div
        role="button"
        tabIndex={0}
        aria-disabled={props.disabled || undefined}
        className={composedClassName}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>);
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <button className={composedClassName} {...props}>
      {content}
    </button>
  );
};
