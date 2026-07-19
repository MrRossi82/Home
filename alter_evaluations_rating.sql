-- إضافة عمود التقييم لجدول تقييمات الاجتماعات لتخزين تقييم من 1 إلى 5 نجوم
ALTER TABLE meeting_evaluations ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);
