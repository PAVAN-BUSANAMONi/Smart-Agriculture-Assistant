import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative bg-transparent">
      <Header />
      <div className="flex flex-1 w-full max-w-[1600px] mx-auto relative">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 w-full max-w-full overflow-x-hidden animate-fade-in">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
