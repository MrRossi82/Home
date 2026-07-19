CREATE TYPE meeting_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE evaluation_status AS ENUM ('approved', 'rejected', 'conditional');

CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status meeting_status NOT NULL DEFAULT 'scheduled',
  minutes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE meeting_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status evaluation_status NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meeting_id, tenant_id)
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read meetings" ON meetings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage meetings" ON meetings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow read evaluations" ON meeting_evaluations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Tenants manage their evaluations" ON meeting_evaluations FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY "Admin read evaluations" ON meeting_evaluations FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
