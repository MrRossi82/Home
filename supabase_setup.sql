-- قم بتنفيذ هذا السكربت في محرر SQL في لوحة تحكم Supabase الخاص بك

CREATE TYPE user_role AS ENUM ('admin', 'tenant');
CREATE TYPE issue_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE issue_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE payment_status AS ENUM ('paid', 'unpaid');

CREATE TABLE lookups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  value VARCHAR(100) NOT NULL,
  label VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO lookups (category, value, label) VALUES
  ('issue_type', 'maintenance', 'صيانة'),
  ('issue_type', 'complaint', 'شكوى'),
  ('expense_type', 'cleaning', 'نظافة'),
  ('expense_type', 'maintenance', 'صيانة'),
  ('expense_type', 'utilities', 'كهرباء وماء'),
  ('expense_type', 'other', 'أخرى');

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'tenant',
  phone VARCHAR(50),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE apartments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  number VARCHAR(50) NOT NULL,
  floor VARCHAR(50),
  tenant_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  status payment_status NOT NULL DEFAULT 'unpaid',
  date_paid TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(apartment_id, month)
);

CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  category_id UUID REFERENCES lookups(id) ON DELETE SET NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN DEFAULT false,
  status issue_status NOT NULL DEFAULT 'open',
  priority issue_priority NOT NULL DEFAULT 'low',
  type_id UUID REFERENCES lookups(id) ON DELETE SET NULL,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- إعداد قواعد الأمان (RLS)
ALTER TABLE lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read lookups" ON lookups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow read apartments" ON apartments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage apartments" ON apartments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow read payments" ON payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage payments" ON payments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow read expenses" ON expenses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage expenses" ON expenses FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow read issues" ON issues FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
  reported_by = auth.uid() OR 
  apartment_id IN (SELECT id FROM apartments WHERE tenant_id = auth.uid())
);
CREATE POLICY "Allow create issues" ON issues FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin update issues" ON issues FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- إعداد Storage للمرفقات
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Allow public read attachments" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

-- ملاحظة: بعد تنفيذ هذا السكربت، يمكنك تشغيل `npx tsx seed.ts` لإنشاء المستخدم المسؤول وإضافته إلى جدول profiles.
