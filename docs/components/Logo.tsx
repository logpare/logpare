import type { ComponentProps } from 'react';

export default function Logo(props: ComponentProps<'svg'>): React.JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" {...props}>
      {/* Stacked log lines being compressed */}
      <rect x="4" y="6" width="24" height="3" rx="1" fill="currentColor"/>
      <rect x="6" y="12" width="20" height="3" rx="1" fill="currentColor" opacity="0.8"/>
      <rect x="8" y="18" width="16" height="3" rx="1" fill="currentColor" opacity="0.6"/>
      <rect x="10" y="24" width="12" height="3" rx="1" fill="currentColor" opacity="0.4"/>
    </svg>
  );
}
