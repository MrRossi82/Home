/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { Financials } from './views/Financials';
import { Issues } from './views/Issues';
import { Tenants } from './views/Tenants';
import { TenantDirectory } from './views/TenantDirectory';
import { Meetings } from './views/Meetings';
import { TenantPayments } from './views/TenantPayments';
import { Announcements } from './views/Announcements';

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useAppContext();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [paymentPreselectMonth, setPaymentPreselectMonth] = useState<string | null>(null);
  const [issuePreselectAdd, setIssuePreselectAdd] = useState<boolean>(false);

  // Handle redirects and live navigation messages from notifications click events
  useEffect(() => {
    if (!currentUser) return;

    // 1. Check URL parameters for ?tab=... on load
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    if (urlTab) {
      const validTabs = ['dashboard', 'financials', 'payments', 'issues', 'tenants', 'meetings', 'announcements'];
      if (validTabs.includes(urlTab)) {
        if (urlTab === 'payments' && currentUser.role === 'admin') {
          setActiveTab('financials');
        } else {
          setActiveTab(urlTab);
        }
      }
      // Clear query params to keep clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // 2. Listen to messages from the Service Worker for active sessions
    if ('serviceWorker' in navigator) {
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NAVIGATE_TO_TAB') {
          const targetTab = event.data.tab;
          const validTabs = ['dashboard', 'financials', 'payments', 'issues', 'tenants', 'meetings', 'announcements'];
          if (validTabs.includes(targetTab)) {
            if (targetTab === 'payments' && currentUser.role === 'admin') {
              setActiveTab('financials');
            } else {
              setActiveTab(targetTab);
            }
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center rtl">
        <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <Dashboard 
          setActiveTab={setActiveTab} 
          setPaymentPreselectMonth={setPaymentPreselectMonth} 
          setIssuePreselectAdd={setIssuePreselectAdd}
        />
      )}
      {activeTab === 'financials' && currentUser.role === 'admin' && <Financials />}
      {activeTab === 'payments' && currentUser.role === 'tenant' && (
        <TenantPayments 
          preselectMonth={paymentPreselectMonth} 
          setPreselectMonth={setPaymentPreselectMonth} 
        />
      )}
      {activeTab === 'issues' && (
        <Issues 
          preselectAdd={issuePreselectAdd}
          setPreselectAdd={setIssuePreselectAdd}
        />
      )}
      {activeTab === 'tenants' && (currentUser.role === 'admin' ? <Tenants /> : <TenantDirectory />)}
      {activeTab === 'meetings' && <Meetings />}
      {activeTab === 'announcements' && <Announcements />}
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
