-- Table liste d'attente
CREATE TABLE IF NOT EXISTS liste_attente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  groupe_id uuid REFERENCES groupes(id),
  user_id uuid REFERENCES auth.users(id),
  prenom text,
  nom text,
  date_naissance date,
  tel text,
  statut text DEFAULT 'attente', -- 'attente' | 'contacte' | 'annule'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE liste_attente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist_insert_own" ON liste_attente;
DROP POLICY IF EXISTS "waitlist_select_own" ON liste_attente;
DROP POLICY IF EXISTS "waitlist_admin_all" ON liste_attente;

-- Une famille peut créer sa propre demande
CREATE POLICY "waitlist_insert_own" ON liste_attente
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Une famille peut voir ses propres demandes
CREATE POLICY "waitlist_select_own" ON liste_attente
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Les admins voient et gèrent tout
CREATE POLICY "waitlist_admin_all" ON liste_attente
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM profils WHERE profils.id = auth.uid() AND profils.role IN ('admin','responsable_inscriptions'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profils WHERE profils.id = auth.uid() AND profils.role IN ('admin','responsable_inscriptions'))
);
