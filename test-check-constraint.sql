ALTER TABLE public.publications DROP CONSTRAINT IF EXISTS publications_status_check;
ALTER TABLE public.publications ADD CONSTRAINT publications_status_check CHECK (status IN ('Pendente', 'Concluída', 'Cancelada', 'Audiência'));
