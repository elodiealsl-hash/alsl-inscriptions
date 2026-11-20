// Module Demandes RH — fonctions communes (salarié + présidente)
const SUPABASE_URL = 'https://qenyxlvddmnqxcdomius.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jMu9PAZpsbplwxS6sEz-VA_vARu1XL_';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TYPES_RH = {
  conges: 'Congés payés',
  recuperation: 'Récupération',
  formation: 'Formation',
  absence: 'Absence exceptionnelle',
  arret: 'Arrêt de travail'
};
const STATUTS_RH = {
  en_attente: '<span class="badge badge-gold">⏳ En attente</span>',
  validee: '<span class="badge badge-green">✅ Validée</span>',
  refusee: '<span class="badge badge-red">❌ Refusée</span>',
  annulee: '<span class="badge badge-gray">Annulée</span>'
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtPeriode(d1, d2) {
  return d1 === d2 ? `le ${fmtDate(d1)}` : `du ${fmtDate(d1)} au ${fmtDate(d2)}`;
}
// Jours fériés français (dont Pâques, Ascension, Pentecôte)
function joursFeries(annee) {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  const paques = new Date(Date.UTC(annee, mois - 1, jour));
  const plus = n => { const x = new Date(paques); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  return new Set([
    `${annee}-01-01`, plus(1), `${annee}-05-01`, `${annee}-05-08`, plus(39), plus(50),
    `${annee}-07-14`, `${annee}-08-15`, `${annee}-11-01`, `${annee}-11-11`, `${annee}-12-25`
  ]);
}
// Jours ouvrables (lundi → samedi, hors fériés), base légale des congés payés
function joursOuvrables(d1, d2) {
  if (!d1 || !d2 || d2 < d1) return 0;
  let n = 0;
  const cur = new Date(d1 + 'T12:00:00Z'), fin = new Date(d2 + 'T12:00:00Z');
  const feries = {};
  while (cur <= fin) {
    const y = cur.getUTCFullYear();
    feries[y] = feries[y] || joursFeries(y);
    const iso = cur.toISOString().slice(0, 10);
    if (cur.getUTCDay() !== 0 && !feries[y].has(iso)) n++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return n;
}
function chevauche(a1, a2, b1, b2) { return a1 <= b2 && b1 <= a2; }

// Solde = solde saisi par la présidente à une date, moins les congés validés posés depuis
function soldeRestant(salarie, demandes) {
  const depuis = salarie.solde_maj_le || '1900-01-01';
  const pris = demandes
    .filter(d => d.salarie_id === salarie.id && d.type === 'conges' && d.statut === 'validee' && d.date_debut >= depuis)
    .reduce((s, d) => s + Number(d.nb_jours), 0);
  return Number(salarie.solde_conges_jours) - pris;
}

function toast(msg, type = 'success') {
  const c = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

async function envoyerLienConnexion(email) {
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname }
  });
  if (error) { toast('Erreur : ' + error.message, 'error'); return false; }
  toast('Lien envoyé : vérifiez votre boîte mail.');
  return true;
}
async function deconnexion() { await sb.auth.signOut(); location.reload(); }
