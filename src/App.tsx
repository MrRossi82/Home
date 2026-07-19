/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { Financials } from './views/Financials';
import { Issues } from './views/Issues';
import { Tenants } from './views/Tenants';
import { Meetings } from './views/Meetings';
import { TenantPayments } from './views/TenantPayments';

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useAppContext();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [paymentPreselectMonth, setPaymentPreselectMonth] = useState<string | null>(null);
  const [issuePreselectAdd, setIssuePreselectAdd] = useState<boolean>(false);

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
      {activeTab === 'tenants' && currentUser.role === 'admin' && <Tenants />}
      {activeTab === 'meetings' && <Meetings />}
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
