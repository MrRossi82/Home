import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Phone, MessageSquare, Users } from 'lucide-react';

export const TenantDirectory: React.FC = () => {
  const { users, apartments } = useAppContext();
  const [searchTerm, setSearchTerm] = React.useState('');
  
  // Filter for tenants only
  const tenants = users.filter(u => u.role === 'tenant');

  const filteredTenants = tenants.filter(tenant => {
      const apartment = apartments.find(a => a.tenant_id === tenant.id);
      const matchesName = tenant.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesApt = apartment && apartment.number.toString().includes(searchTerm);
      return matchesName || matchesApt;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">سكان العمارة</h2>
        <input 
            type="text"
            placeholder="بحث بالاسم أو رقم الشقة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#1E1E1E] border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTenants.map(tenant => {
            const apartment = apartments.find(a => a.tenant_id === tenant.id);
            return (
            <div key={tenant.id} className="bg-[#161616] p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                {tenant.avatar_url ? (
                    <img src={tenant.avatar_url} className="w-16 h-16 rounded-full object-cover" alt={tenant.name} />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-[#1E1E1E] border border-white/10 flex items-center justify-center">
                        <Users className="w-8 h-8 text-white/20" />
                    </div>
                )}
                <div className="flex-1">
                    <h3 className="font-bold text-white">{tenant.name}</h3>
                    {apartment && (
                        <p className="text-sm text-white/60">
                            شقة: {apartment.number} - طابق: {apartment.floor}
                        </p>
                    )}
                    {tenant.phone && (
                        <div className="flex items-center gap-2 mt-2">
                             <a href={`tel:${tenant.phone}`} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
                                <Phone className="w-4 h-4 text-[#D4AF37]" />
                             </a>
                             <a href={`https://wa.me/${tenant.phone.replace(/^0/, '962').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-500/10 rounded-full hover:bg-emerald-500/20">
                                <MessageSquare className="w-4 h-4 text-emerald-400" />
                             </a>
                        </div>
                    )}
                </div>
            </div>
        )})}
      </div>
    </div>
  );
};
