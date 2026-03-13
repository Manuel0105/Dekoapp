-- Löscht alle Gegenstände und automatisch auch alle angehängten Bewertungen (wegen ON DELETE CASCADE in der Datenbank)
DELETE FROM public.items;
