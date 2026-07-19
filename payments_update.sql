-- إضافة الأعمدة اللازمة لجدول المدفوعات لتتبع طريقة الدفع وحالة التحقق من قبل المسؤول
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'none';

-- تحديث سياسات الأمان (RLS) للسماح للمستأجرين بتحديث أو إدخال مدفوعات شققهم الخاصة عند تقديم طلب الدفع
DROP POLICY IF EXISTS "Tenants can update their own payments" ON payments;
CREATE POLICY "Tenants can update their own payments" ON payments
  FOR UPDATE
  USING (apartment_id IN (SELECT id FROM apartments WHERE tenant_id = auth.uid()))
  WITH CHECK (apartment_id IN (SELECT id FROM apartments WHERE tenant_id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can insert their own payments" ON payments;
CREATE POLICY "Tenants can insert their own payments" ON payments
  FOR INSERT
  WITH CHECK (apartment_id IN (SELECT id FROM apartments WHERE tenant_id = auth.uid()));
