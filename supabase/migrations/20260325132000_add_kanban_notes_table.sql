-- Dashboard notes (mobile "Notes" card + web NotesBoard)
CREATE TABLE IF NOT EXISTS public.kanban_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  column_status TEXT NOT NULL DEFAULT 'todo' CHECK (column_status IN ('todo', 'in_progress', 'done')),
  title TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  season TEXT NOT NULL DEFAULT '2026'
);

ALTER TABLE public.kanban_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view kanban notes from their company" ON public.kanban_notes;
CREATE POLICY "Users can view kanban notes from their company"
ON public.kanban_notes FOR SELECT
USING ((company_id = public.get_user_company(auth.uid())) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins and staff can manage kanban notes for their company" ON public.kanban_notes;
CREATE POLICY "Admins and staff can manage kanban notes for their company"
ON public.kanban_notes FOR ALL
USING ((company_id = public.get_user_company(auth.uid())) AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role)));

DROP TRIGGER IF EXISTS update_kanban_notes_updated_at ON public.kanban_notes;
CREATE TRIGGER update_kanban_notes_updated_at BEFORE UPDATE ON public.kanban_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

