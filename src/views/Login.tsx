import React, { useState } from 'react';
import { Building, Lock, Mail } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const Login: React.FC = () => {
  const { login } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#E0E0E0] flex items-center justify-center p-4 rtl">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#D4AF37] text-black shadow-xl mb-6">
            <Building className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">نظام إدارة العمارة</h1>
          <p className="text-white/40">تسجيل الدخول للمتابعة</p>
        </div>

        <div className="bg-[#161616] rounded-3xl border border-white/5 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 pl-10 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  placeholder="admin@example.com"
                  required
                />
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-white/40" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">كلمة المرور</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-10 bg-[#1E1E1E] text-white border border-white/10 rounded-xl focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-white/40" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-4 px-4 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#D4AF37]/80 transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
