# Plateforme d'apprentissage médical — Plan

## Objectif
Construire une plateforme d'apprentissage andragogique avec :
- Bibliothèque de **leçons complètes** (uploadées par l'admin)
- **Résumés** générés/édités pour chaque leçon
- Mode **Combat** (QCM) avec explications par proposition (a/b/c/d) affichées après validation
- Mode **Combat IA** : QCM générés par l'IA à partir du cours (en plus de ceux de l'admin)
- **Assistant IA contextuel** par section, qui connaît cours, examens et la page courante
- **Tooltips d'abréviations** (IR, AVC…) : points en dessous + popup au survol
- **Tri/recherche floue** des modules (par année + recherche tolérante aux fautes)
- **Interface admin** avec IA qui ingère du texte brut (cours + QCM) et génère automatiquement modules, pièges-prof, mini-cas, explications, emoji…

---

## Architecture

### Stack
- Front : React + Tailwind + shadcn (Vite)
- Backend : Lovable Cloud (auth, DB, edge functions, storage)
- IA : Lovable AI Gateway (Gemini par défaut)

### Modèle de données
```text
profiles(id, role, ...)
user_roles(user_id, role[student|admin])    -- table séparée (sécurité)
years(id, label)
modules(id, year_id, name, emoji, description, learning_info)
lessons(id, module_id, title, order, full_text, summary)
abbreviations(id, module_id, short, full)
questions(id, lesson_id, source[admin|ai], stem, traps, mini_case)
choices(id, question_id, letter, text, is_correct, explanation)
attempts(id, user_id, question_id, chosen[], correct, created_at)
ai_threads(id, user_id, scope, context_ref)
ai_messages(id, thread_id, role, parts)
```
RLS strict ; recherche floue via `pg_trgm`.

### Edge functions
- `ai-chat` : assistant contextuel streamé
- `ai-generate-module` : texte brut → JSON structuré (module/leçons/QCM/abréviations)
- `ai-generate-qcm` : QCM à la volée depuis une leçon
- `search-modules` : recherche floue tolérante aux fautes

---

## Écrans

### Étudiant
1. **Accueil** — filtre année + recherche floue de module
2. **Module** — onglets : Leçons complètes · Résumés · Combat Admin · Combat IA
3. **Lecture leçon** — abréviations annotées (tooltip), bouton « Demander à l'IA »
4. **Combat QCM** — après validation, chaque proposition affiche ✓/✗ + explication
5. **Drawer IA** omniprésent, contextuel à la page

### Admin
1. Dashboard modules
2. **Ingestion IA** : coller texte massif → IA propose module → admin édite (nom, emoji, ordre, pièges, infos) → publie
3. Édition manuelle complète

---

## Phases

1. **Fondations** : scaffold + Cloud + auth + rôles + schéma DB
2. **Étudiant lecture** : modules, leçons, résumés, tooltips abréviations
3. **Combat** : QCM admin + explications + Combat IA
4. **Assistant IA contextuel** partout
5. **Admin ingestion IA** : texte → module structuré éditable
6. **Seed** : les 6 leçons déjà fournies (Myasthénie, Confusion, Démence, HTIC, Méningé, Pyramidal) en module « Sémiologie neurologique »

---

## Détails techniques
- Recherche floue : `pg_trgm` + `similarity()`, seuil 0.2.
- Tooltips : parseur repère les abréviations connues du module et insère `<abbr>` avec Tooltip shadcn.
- Explications QCM : `explanation` obligatoire pour chaque choix, affichée après submit.
- IA contextuelle : chaque page publie un `pageContext` (type + ids) ; le chat l'envoie au backend qui charge le texte pertinent.
- Ingestion admin : sortie JSON validée par Zod, prévisualisée avant insert.

---

## Hors scope
- App mobile native, paiements, multi-tenants.
