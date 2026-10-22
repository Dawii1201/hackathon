import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => <Icon {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Icon>;
export const ChevronRightIcon = (p: IconProps) => <Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>;
export const ChevronDownIcon = (p: IconProps) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>;
export const EyeIcon = (p: IconProps) => <Icon {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Icon>;
export const EyeOffIcon = (p: IconProps) => <Icon {...p}><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Icon>;
export const BellIcon = (p: IconProps) => <Icon {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" /></Icon>;
export const PlusCircleIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></Icon>;
export const PlusIcon = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const CheckCircleIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></Icon>;
export const AlertIcon = (p: IconProps) => <Icon {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" /></Icon>;
export const BookIcon = (p: IconProps) => <Icon {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></Icon>;
export const SearchIcon = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>;
export const FilterIcon = (p: IconProps) => <Icon {...p}><path d="M4 6h16M7 12h10M10 18h4" /></Icon>;
export const SendIcon = (p: IconProps) => <Icon {...p}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></Icon>;
export const MoreIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></Icon>;
export const LayoutIcon = (p: IconProps) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></Icon>;
export const WalletIcon = (p: IconProps) => <Icon {...p}><path d="M3 7a2 2 0 0 1 2-2h14v4M3 7v10a2 2 0 0 0 2 2h16V9H5a2 2 0 0 1-2-2zM16 14h.01" /></Icon>;
export const SwapIcon = (p: IconProps) => <Icon {...p}><path d="M17 3l4 4-4 4M21 7H8M7 21l-4-4 4-4M3 17h13" /></Icon>;
export const UserIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>;
export const MenuIcon = (p: IconProps) => <Icon {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Icon>;
export const CloseIcon = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const ArrowUpRightIcon = (p: IconProps) => <Icon {...p}><path d="M7 17 17 7M8 7h9v9" /></Icon>;
