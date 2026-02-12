-- Create incident_reports table
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT,
  reported_by TEXT,
  status TEXT DEFAULT 'open',
  tags TEXT[],
  company_id UUID,
  season TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create incident_children junction table
CREATE TABLE IF NOT EXISTS public.incident_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  child_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_children ENABLE ROW LEVEL SECURITY;

-- RLS Policies for incident_reports
CREATE POLICY "Users can view incidents from their company"
ON public.incident_reports FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage incidents from their company"
ON public.incident_reports FOR ALL
USING (auth.role() = 'authenticated');

-- RLS Policies for incident_children
CREATE POLICY "Users can view incident children"
ON public.incident_children FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage incident children"
ON public.incident_children FOR ALL
USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incident_reports_company_id ON public.incident_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_season ON public.incident_reports(season);
CREATE INDEX IF NOT EXISTS idx_incident_reports_date ON public.incident_reports(date);
CREATE INDEX IF NOT EXISTS idx_incident_children_incident_id ON public.incident_children(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_children_child_id ON public.incident_children(child_id);
