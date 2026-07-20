import React from 'react';
import { motion } from 'motion/react';
import { Building, LayoutDashboard, Wallet, AlertTriangle, Users, LogOut, Menu, X, Calendar, Bell } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { NotificationSettings } from './NotificationSettings';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { currentUser, logout, notifications, dismissNotification } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const adminNavItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'financials', label: 'المالية', icon: Wallet },
    { id: 'issues', label: 'الشكاوى والصيانة', icon: AlertTriangle },
    { id: 'tenants', label: 'الشقق', icon: Users },
    { id: 'meetings', label: 'الاجتماعات واللجان', icon: Calendar },
    { id: 'announcements', label: 'التعميمات والقرارات', icon: Bell },
  ];

  const tenantNavItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'payments', label: 'المدفوعات', icon: Wallet },
    { id: 'issues', label: 'الشكاوى والصيانة', icon: AlertTriangle },
    { id: 'meetings', label: 'الاجتماعات واللجان', icon: Calendar },
    { id: 'announcements', label: 'التعميمات والقرارات', icon: Bell },
  ];

  const navItems = currentUser?.role === 'admin' ? adminNavItems : tenantNavItems;

  return (
    <div className="min-h-screen flex bg-[#0F0F0F] text-[#E0E0E0] rtl">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-[#161616] border-l border-white/5 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-white/5">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37] flex items-center justify-center ml-3">
               <Building className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold text-white">إدارة العمارة</span>
            <button className="lg:hidden mr-auto text-white/40 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <div className="px-4 mb-6">
              <div className="p-3 bg-[#1E1E1E] rounded-xl flex items-center gap-3 border border-white/5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F2D06B]"></div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{currentUser?.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">{currentUser?.role === 'admin' ? 'مدير النظام' : 'ساكن وحدة'}</p>
                </div>
              </div>
            </div>

            <nav className="px-3 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-3 rounded-xl transition-colors ${
                      isActive 
                        ? 'bg-[#D4AF37]/10 text-[#D4AF37] font-medium' 
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ml-3 ${isActive ? 'text-[#D4AF37]' : 'text-white/40'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-white/5">
            <button
              onClick={logout}
              className="w-full flex items-center px-3 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5 ml-3" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-[#161616] border-b border-white/5">
          <div className="flex items-center">
            <button
              className="lg:hidden text-white/40 hover:text-white focus:outline-none"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-medium text-white mr-4 lg:mr-0">
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <NotificationSettings />
          </div>
        </header>

        {notifications && notifications.length > 0 && (
          <div className="bg-black/40 border-b border-white/5 max-h-[250px] overflow-y-auto">
            <div className="max-w-7xl mx-auto p-4 space-y-2">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`flex items-start justify-between p-3.5 rounded-2xl border transition-all ${
                    notification.type === 'rent'
                      ? 'bg-red-500/5 border-red-500/15 text-red-200'
                      : notification.type === 'meeting'
                      ? 'bg-blue-500/5 border-blue-500/15 text-blue-200'
                      : notification.type === 'issue'
                      ? 'bg-[#D4AF37]/5 border-[#D4AF37]/15 text-[#D4AF37]'
                      : 'bg-green-500/5 border-green-500/15 text-green-200'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      <Bell className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{notification.title}</h4>
                      <p className="text-xs opacity-80 mt-1">{notification.message}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => dismissNotification(notification.id)}
                    className="text-white/40 hover:text-white transition-colors p-1 rounded-lg mr-2"
                    title="تجاهل التنبيه"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};
