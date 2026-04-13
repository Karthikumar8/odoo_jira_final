import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Rocket, LogOut, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user, clearAuth, refreshToken } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch (e) {
      console.error(e);
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/projects', label: 'Projects' },
  ];

  if (user?.role === 'superuser' || user?.role === 'manager') {
    navLinks.push({ to: '/reporting', label: 'Reporting' });
  }

  return (
    <nav className="bg-[#161311] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center gap-2">
              <Rocket className="h-7 w-7 text-[#ff771c]" />
              <span className="font-bold text-xl text-white tracking-tight">Antigravity</span>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `${isActive
                      ? 'text-[#ff771c] border-b-2 border-[#ff771c]'
                      : 'text-gray-300 hover:text-white border-b-2 border-transparent hover:border-gray-500'
                    } inline-flex items-center px-3 pt-1 text-sm font-medium transition-colors`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="flex items-center gap-4">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: '#ff771c' }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium text-gray-300">{user?.name}</span>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                title="Logout"
              >
                {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="sm:hidden bg-[#1e1a18]">
          <div className="pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `${isActive
                    ? 'border-l-4 border-[#ff771c] text-[#ff771c] bg-[#2a2220]'
                    : 'border-l-4 border-transparent text-gray-300 hover:text-white hover:bg-gray-700'
                  } block pl-3 pr-4 py-2 text-base font-medium transition-colors`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="flex items-center px-4 justify-between">
              <div className="flex items-center">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: '#ff771c' }}
                >
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-white">{user?.name}</div>
                  <div className="text-sm font-medium text-gray-400">{user?.email}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"
              >
                {isLoggingOut ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogOut className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
