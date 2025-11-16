'use client';

import type React from 'react';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMusicStore } from '@/store/musicStore';
import MusicPlayer from './MusicPlayer';
import BottomNavigation from './BottomNavigation';
import QueuePanel from './QueueTable';
import { Home, Search, Moon, Sun } from 'lucide-react';
import SearchBar from './SearchBar';
import Image from 'next/image';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { loadSongsWithFallback, loadFavorites, loadPlaybackState } =
    useMusicStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true); // Default to dark mode
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      await loadSongsWithFallback();
      await loadFavorites();
      // Load playback state to restore last played song
      await loadPlaybackState();
    };

    initializeApp();
  }, [loadSongsWithFallback, loadFavorites, loadPlaybackState]);

  useEffect(() => {
    // Set initial theme
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // Removed database subscription since we're using localStorage now

  const navItems = [
    {
      icon: <Home size={20} />,
      label: 'Home',
      onClick: () => router.push('/'),
      isActive: pathname === '/',
    },
  ];

  return (
    <div className='min-h-screen relative bg-background'>
      <div className='fixed inset-0 bg-gradient-to-br from-background via-background to-muted/30 -z-10' />

      {/* Header */}
      <header className='sticky top-0 z-30 bg-card border-b border-border'>
        <div className='container mx-auto px-4 py-4'>
          <div className='flex items-center justify-between'>
            {/* Logo + Desktop Navigation */}
            <div className='flex items-center space-x-4'>
              <Image
                src='/ragavaLogo.png'
                alt='Ragava Music Player'
                width={48}
                height={48}
                className='rounded-lg'
                priority
              />
              <nav className='hidden md:flex items-center space-x-1'>
                {navItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      item.isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Search Bar - Desktop */}
            <div className='hidden md:block flex-1 max-w-md mx-4'>
              <SearchBar />
            </div>

            {/* Theme Toggle and Mobile Menu */}
            <div className='flex items-center space-x-2'>
              <button
                onClick={toggleTheme}
                className='p-2 text-muted-foreground hover:text-foreground transition-colors'
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <Sun className='w-5 h-5' />
                ) : (
                  <Moon className='w-5 h-5' />
                )}
              </button>
              {/* Mobile Search Button */}
              <div className='md:hidden'>
                <button className='p-2 text-muted-foreground hover:text-foreground'>
                  <Search className='w-5 h-5' />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with proper spacing for minimized music player and bottom navigation */}
      <div className='relative z-10 pb-32 md:pb-16'>{children}</div>

      {/* Music Player - Minimized and Consistent */}
      <div className='fixed bottom-16 md:bottom-0 left-0 right-0 z-[60] bg-card border-t border-border shadow-lg'>
        <MusicPlayer onQueueClick={() => setIsQueueOpen(true)} />
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <div className='md:hidden'>
        <BottomNavigation />
      </div>

      {/* Queue Panel */}
      <QueuePanel isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
    </div>
  );
}
