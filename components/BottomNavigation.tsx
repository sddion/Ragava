'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, Search } from 'lucide-react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
}

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      icon: <Home size={20} />,
      label: 'Home',
      href: '/',
      isActive: pathname === '/',
    },
    {
      icon: <Search size={20} />,
      label: 'Search',
      href: '/search',
      isActive: pathname === '/search',
    },
  ];

  return (
    <nav className='fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border'>
      <div className='flex items-center justify-around py-2'>
        {navItems.map(item => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200 ${
              item.isActive
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <div
              className={`transition-transform duration-200 ${item.isActive ? 'scale-110' : ''}`}
            >
              {item.icon}
            </div>
            <span className='text-xs font-medium'>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
