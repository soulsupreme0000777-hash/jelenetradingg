
import React, { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { Scanner } from './components/Scanner';
import { Login } from './components/Login';
import { LayoutDashboard, UserCircle, QrCode, LogOut, Menu, X, ChevronRight } from 'lucide-react';
import { Employee } from './types';

enum View {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  SCANNER = 'SCANNER'
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState<View>(View.SCANNER);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);

  useEffect(() => {
    // Check for kiosk mode in URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'kiosk') {
        setIsKioskMode(true);
    }
  }, []);

  // If in Kiosk Mode, render ONLY the scanner in a fullscreen layout
  if (isKioskMode) {
      return (
          <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-sans">
              <Scanner />
          </div>
      );
  }

  if (!currentUser) {
      return <Login onLogin={(user, admin) => {
          setCurrentUser(user);
          setIsAdmin(admin);
          setCurrentView(admin ? View.ADMIN : View.EMPLOYEE);
      }} />;
  }

  const handleLogout = () => {
      setCurrentUser(null);
      setIsAdmin(false);
  };

  const NavItem = ({ view, icon: Icon, label }: { view: View; icon: any; label: string }) => {
    if (view === View.ADMIN && !isAdmin) return null;
    
    const isActive = currentView === view;
    
    return (
        <button
        onClick={() => {
            setCurrentView(view);
            setIsMobileMenuOpen(false);
        }}
        className={`w-full group relative flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 mb-2 ${
            isActive 
            ? 'bg-[#1e1e22] text-white shadow-xl shadow-black/20' 
            : 'text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300'
        }`}
        >
        {/* Active Indicator Pill */}
        {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-violet-600 rounded-r-full shadow-[0_0_12px_rgba(124,58,237,0.5)]"></div>
        )}

        {/* Icon */}
        <Icon size={22} className={`relative z-10 transition-colors ${isActive ? 'text-violet-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
        
        {/* Label */}
        <span className={`relative z-10 font-bold text-sm tracking-wide ${isActive ? 'text-zinc-100' : ''}`}>
            {label}
        </span>

        {/* Chevron */}
        <ChevronRight size={16} className={`ml-auto relative z-10 transition-all duration-300 ${isActive ? 'text-zinc-500' : 'text-zinc-800 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0'}`} />
        </button>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex font-sans text-zinc-100 overflow-hidden selection:bg-violet-500/30">
      
      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden lg:flex flex-col w-72 bg-zinc-950 border-r border-zinc-900 h-screen sticky top-0 shadow-2xl z-20">
        <div className="p-6">
            <div className="flex flex-col items-center justify-center mb-10 pt-4">
                <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center mb-3 overflow-hidden shadow-2xl transition-transform hover:scale-105 duration-500">
                    <img src="https://i.imgur.com/legjheA.png" alt="Jelene Trading" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight mt-1">Jelene Trading</h1>
            </div>
            
            <nav className="space-y-1">
                <p className="px-4 text-xs font-bold text-zinc-600 uppercase tracking-wider mb-4">Menu</p>
                <NavItem view={View.ADMIN} icon={LayoutDashboard} label="Manage Employees" />
                {!isAdmin && <NavItem view={View.EMPLOYEE} icon={UserCircle} label="My Dashboard" />}
                {isAdmin && <NavItem view={View.SCANNER} icon={QrCode} label="Kiosk Preview" />}
            </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-zinc-900 bg-zinc-950">
            <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-zinc-900/50 border border-zinc-900">
                 <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-sm font-bold border border-zinc-700">
                    {currentUser.firstName[0]}{currentUser.lastName[0]}
                 </div>
                 <div className="overflow-hidden">
                     <p className="text-sm font-bold text-zinc-200 truncate">{currentUser.firstName}</p>
                     <p className="text-xs text-zinc-500 truncate">{currentUser.position}</p>
                 </div>
            </div>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all w-full py-3 rounded-xl font-bold tracking-wide">
                <LogOut size={16} />
                <span>Sign Out</span>
            </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-900 border-b border-zinc-800 z-50 flex items-center justify-between px-4 backdrop-blur-md bg-opacity-80">
          <div className="flex items-center gap-2">
               <img src="https://i.imgur.com/legjheA.png" alt="Logo" className="h-8 w-auto rounded-lg" />
               <span className="font-bold text-white text-sm">Jelene Trading</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-zinc-400 hover:text-white">
              {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-zinc-950 pt-20 px-4 space-y-2 lg:hidden">
                <NavItem view={View.ADMIN} icon={LayoutDashboard} label="Manage Employees" />
                {!isAdmin && <NavItem view={View.EMPLOYEE} icon={UserCircle} label="My Dashboard" />}
                {isAdmin && <NavItem view={View.SCANNER} icon={QrCode} label="Kiosk Preview" />}
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 font-medium border border-zinc-800 rounded-xl mt-8">
                    <LogOut size={20} /> Sign Out
                </button>
          </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:p-10 p-6 pt-24 lg:pt-10 overflow-y-auto h-screen bg-zinc-950 scroll-smooth relative">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
            <div>
                <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
                    {currentView === View.ADMIN && 'Employee Management'}
                    {currentView === View.EMPLOYEE && 'Employee Portal'}
                    {currentView === View.SCANNER && 'Attendance Kiosk'}
                </h1>
                {currentView !== View.SCANNER && (
                    <p className="text-zinc-500 mt-1 text-sm">Welcome back, {currentUser.firstName}. Here is what's happening today.</p>
                )}
            </div>
            {currentView !== View.SCANNER && (
                <div className="hidden md:block text-right bg-zinc-900/50 backdrop-blur-sm px-5 py-3 rounded-2xl border border-zinc-900">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-0.5">System Date</p>
                    <p className="text-violet-400 font-mono text-sm font-medium">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            )}
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
            {currentView === View.ADMIN && <AdminDashboard />}
            {currentView === View.EMPLOYEE && <EmployeeDashboard user={currentUser} />}
            {currentView === View.SCANNER && (
                <div className="flex items-center justify-center min-h-[600px]">
                    <Scanner />
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
