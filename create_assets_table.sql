-- إنشاء جدول الأصول والممتلكات الخاصة بالعمارة
CREATE TABLE IF NOT EXISTS building_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  last_maintenance DATE,
  next_maintenance DATE,
  purchase_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل سياسات الحماية RLS لجدول الأصول
ALTER TABLE building_assets ENABLE ROW LEVEL SECURITY;

-- السياسات: قراءة للجميع، إدارة كاملة للمسؤول فقط
DROP POLICY IF EXISTS "Allow read building_assets" ON building_assets;
CREATE POLICY "Allow read building_assets" ON building_assets
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin manage building_assets" ON building_assets;
CREATE POLICY "Admin manage building_assets" ON building_assets
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- إدراج بيانات تجريبية أولية للأصول
INSERT INTO building_assets (name, description, value, category, status, last_maintenance, next_maintenance, purchase_date)
VALUES
  ('نظام المصعد الكهربائي', 'مصعد إيطالي الصنع حمولة 6 أشخاص، تم عمل صيانة دورية للمحرك والأسلاك والفرامل الكهربائية.', 8500.00, 'المرافق والمعدات', 'excellent', '2026-06-10', '2026-07-25', '2022-04-12'),
  ('نظام الخلايا الشمسية لتوليد الطاقة', 'نظام خلايا شمسية بقدرة 10 كيلوواط لتغذية الخدمات المشتركة (المصعد، إنارة الدرج والساحات الخارجية).', 5200.00, 'الطاقة والكهرباء', 'active', '2026-05-15', '2026-11-15', '2024-02-18'),
  ('مضخات وخزانات المياه الرئيسية', '3 مضخات إيطالية مع لوحة تحكم أوتوماتيكية مخصصة لرفع المياه لخزانات الشقق وخزانات أرضية سعة 12م³.', 1800.00, 'شبكة المياه', 'needs_maintenance', '2026-01-20', '2026-07-20', '2021-09-05'),
  ('نظام كاميرات المراقبة والحماية', 'شبكة مكونة من 8 كاميرات خارجية وداخلية بدقة 4K مع جهاز تسجيل NVR وشاشة مراقبة وسعة تخزين 30 يوماً.', 750.00, 'الأمن والحماية', 'active', '2026-04-01', '2026-10-01', '2023-11-10'),
  ('نظام الإنتركم والبوابة الإلكترونية', 'بوابة حديدية للمواقف بمحرك إيطالي أوتوماتيكي مع نظام إنتركم صوتي ومرئي متصل بجميع الشقق السكنية.', 1200.00, 'الأمن والحماية', 'excellent', '2026-03-10', '2026-09-10', '2023-01-20')
ON CONFLICT DO NOTHING;
