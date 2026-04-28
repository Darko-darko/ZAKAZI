# zakazi.pro — Project Specification (v4)

> Last updated: 2026-04-26
> This is the canonical reference document for the project. Edit this file as decisions evolve. Future Claude sessions read this file at the start of work to understand context.

---

## 1. Overview

SaaS platforma za **online zakazivanje termina** za salone, studije i ordinacije u Srbiji (frizerski/kozmetički saloni, stomatološke ordinacije, masažni studiji, sve što prima klijente po terminima). Originalno je bila usko skrojena za frizerske salone — scope je proširen 2026-04-24 da pokrije sve uslužne delatnosti koje rade po terminima.

Svaki biznis dobija **mini sajt sa booking funkcijom**:

- `zakazi.pro/[slug]` (default)
- `salonmila.rs` (custom domena — Pro plan)

**Domen:** `zakazi.pro` (kupljen 2026-04-24). `.pro` jer signalizira profesionalne usluge i radi regionalno (potencijalno cela bivša Jugoslavija).

---

## 2. Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Framework | **Next.js 16** | App Router. **NIJE Next.js 15** — ima breaking changes (vidi §Conventions) |
| Database/Auth/Storage | **Supabase** | Postgres + Auth + Storage + Edge Functions + pg_cron |
| Hosting | **Vercel** | Wildcard domain + custom domain support |
| Email | **Resend** | Transakcioni |
| PDF | **@react-pdf/renderer** | Server-side fakture |
| Language | **TypeScript** | Strict, obavezno |
| Styling | **Tailwind CSS v4** | `@theme` u CSS-u, ne `tailwind.config.js` |
| UI Library | **shadcn/ui** | Samo admin/agent/superadmin paneli, ne mini sajt |

---

## 3. Current Implementation State

**Faza 1 — Infrastruktura — delom završena:**

✅ Napravljeno:
- Next.js 16 projekat na portu 3001 (`package.json`: `next dev -p 3001`)
- Supabase projekat (Ireland region), klijent povezan
- `lib/supabase/client.ts` — browser klijent
- `lib/supabase/server.ts` — server klijent (RSC, Server Actions)
- `lib/supabase/proxy.ts` — helper za session refresh
- `proxy.ts` (root) — Next.js 16 proxy za session handling
- `.env.local` sa Supabase credentialima (novi format: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`)
- `app/globals.css` sa shadcn-style design tokenima (light only, dark deferred)
- Univerzalna landing stranica `app/page.tsx`
- Metadata postavljen u `app/layout.tsx`

❌ Nedostaje (sledeći korak):
- Supabase CLI setup
- Migracije (kompletna šema)
- RLS politike
- pg_cron jobovi
- TypeScript tipovi iz baze (`types/database.ts`)
- Sve od Faze 2+

**Folder struktura:** `app/` u root-u (NE `src/app/`). Lib u `lib/` u root-u.

---

## 4. User Types

```
Super Admin      →  /superadmin/     (operator platforme — ti)
Komercijalist    →  /agent/          (terenska prodaja + referral)
Salon Admin      →  /admin/          (vlasnik biznisa)
Klijent          →  /[slug]/         (nikad ne pravi nalog)
```

Login je **jedan endpoint** (`/login`) — server detektuje ulogu i redirektuje.

---

## 5. Booking flow (klijent)

```
1. Izaberi radnika
2. Izaberi uslugu (samo što taj radnik radi)
3. Izaberi termin (slobodni slotovi)
4. Unesi ime i telefon
5. Potvrda → email sa cancel linkom
```

Klijent **NIKADA** ne pravi nalog.

---

## 6. Database Schema

> RSD se čuvaju kao integer (bez decimala). Sve `created_at` polja su `timestamptz default now()`.

### Agents

```sql
agents
  id uuid PK default gen_random_uuid()
  user_id uuid FK → auth.users (unique)
  name text NOT NULL
  email text NOT NULL
  phone text
  ref_code text UNIQUE NOT NULL          -- npr. "PERA2025" — referral kod
  default_commission_percent int default 15
  is_active bool default true
  created_at timestamptz default now()
```

> **Note:** Agente kreira **isključivo Super Admin** preko `/superadmin/agenti/novi`. Nema `/register/agent`.

### Providers (saloni/studiji/ordinacije)

```sql
providers
  id uuid PK default gen_random_uuid()
  user_id uuid FK → auth.users (unique)
  agent_id uuid FK → agents              -- ko je doveo (nullable)
  agent_commission_percent int           -- override; null = koristi agent default
  ref_code text                          -- referral kod korišćen pri registraciji (denorm za audit)
  name text NOT NULL
  slug text UNIQUE NOT NULL
  description text
  intro_text text
  address text
  city text
  phone text
  billing_email text
  company_name text
  company_pib text
  company_mb text
  company_address text
  logo_url text
  cover_url text
  primary_color text default '#000000'
  text_color text default '#ffffff'
  font_choice text default 'default'     -- 'default'|'serif'|'modern'|'elegant'
  google_review_url text
  instagram_url text
  facebook_url text
  tiktok_url text
  custom_domain text UNIQUE
  plan text default 'free'               -- 'free'|'basic'|'pro'
  plan_status text default 'trial'       -- 'trial'|'active'|'past_due'|'suspended'|'cancelled'
  trial_ends_at timestamptz              -- default now() + interval '30 days'
  plan_expires_at timestamptz
  booking_min_notice_hours int default 2
  booking_max_days_ahead int default 30
  cancel_min_hours int default 2
  created_at timestamptz default now()
```

### Galerija

```sql
provider_gallery
  id uuid PK
  provider_id uuid FK → providers
  image_url text
  sort_order int default 0
  created_at timestamptz default now()
```

### Radno vreme providera

```sql
provider_working_hours
  id uuid PK
  provider_id uuid FK → providers
  day_of_week int NOT NULL               -- 0=ned ... 6=sub
  opens_at time
  closes_at time
  is_closed bool default false
```

> Radno vreme providera je okvir u kom ordinacija/salon prima termine. Smene i custom radno vreme radnika moraju biti unutar tog okvira, osim ako admin eksplicitno potvrdi izuzetak.

### Smene

```sql
shifts
  id uuid PK
  provider_id uuid FK → providers
  name text NOT NULL                     -- "Smena A", "Jutarnja"
  start_time time NOT NULL
  end_time time NOT NULL
  break_start time
  break_end time
```

### Workers (radnici — frizeri/kozmetičari/lekari/itd)

```sql
workers
  id uuid PK
  provider_id uuid FK → providers
  name text NOT NULL
  photo_url text
  bio text
  buffer_minutes int default 0           -- pauza između termina
  is_active bool default true
  created_at timestamptz default now()
```

### Worker schedule

```sql
worker_schedule
  id uuid PK
  worker_id uuid FK → workers
  day_of_week int NOT NULL               -- 0=ned ... 6=sub
  shift_id uuid FK → shifts              -- null = ne radi
  custom_start_time time                 -- ako radnik taj dan radi van šablona smene
  custom_end_time time
  custom_break_start time
  custom_break_end time
```

> Raspored podržava dva režima po radniku/danu:
> - `shift_id` popunjen → radnik radi po definisanoj smeni
> - `custom_start_time` + `custom_end_time` popunjeni → radnik ima posebno radno vreme za taj dan u nedelji
> - sve null → radnik ne radi taj dan
>
> Custom vreme služi za situacije tipa: "Marko utorkom radi 10:00-16:00", bez pravljenja posebne smene samo za njega.

### Shift rotations

```sql
shift_rotations
  id uuid PK
  provider_id uuid FK → providers
  name text
  rotation_start_date date NOT NULL
  created_at timestamptz default now()

shift_rotation_members
  id uuid PK
  rotation_id uuid FK → shift_rotations
  worker_id uuid FK → workers
  week_odd_shift_id uuid FK → shifts
  week_even_shift_id uuid FK → shifts
  day_of_week int NOT NULL
```

### Schedule overrides (ručni override za konkretan datum)

```sql
schedule_overrides
  id uuid PK
  worker_id uuid FK → workers
  date date NOT NULL
  shift_id uuid FK → shifts              -- null = ne radi taj dan
  custom_start_time time                 -- ručno vreme za konkretan datum
  custom_end_time time
  custom_break_start time
  custom_break_end time
  reason text
```

> Override za konkretan datum ima isti princip kao nedeljni raspored:
> - može izabrati postojeću smenu
> - može uneti custom vreme
> - može označiti da radnik ne radi taj dan
>
> Primeri: "Ana 2026-05-15 radi 12:00-18:00", "Petar 2026-05-20 ne radi", "Milica 2026-05-21 prelazi u drugu smenu".

### Time off (godišnji, praznici, ad-hoc)

```sql
time_off
  id uuid PK
  provider_id uuid FK → providers
  worker_id uuid FK → workers            -- null = ceo biznis
  date_from date NOT NULL
  date_to date NOT NULL
  reason text
  is_public_holiday bool default false
```

### Services & worker_services

```sql
services
  id uuid PK
  provider_id uuid FK → providers
  name text NOT NULL
  duration_minutes int NOT NULL
  price int                              -- RSD, integer
  is_active bool default true
  sort_order int default 0

worker_services
  worker_id uuid FK → workers
  service_id uuid FK → services
  PRIMARY KEY (worker_id, service_id)
```

### Bookings

```sql
bookings
  id uuid PK
  provider_id uuid FK → providers
  worker_id uuid FK → workers
  service_id uuid FK → services
  client_name text NOT NULL
  client_phone text NOT NULL
  client_email text
  starts_at timestamptz NOT NULL
  ends_at timestamptz NOT NULL
  status text default 'pending'          -- 'pending'|'confirmed'|'cancelled'|'completed'|'noshow'|'expired'
  notes text
  cancel_token uuid default gen_random_uuid() UNIQUE
  review_token uuid default gen_random_uuid() UNIQUE
  review_score int                       -- 1-5
  review_sent_at timestamptz
  cancelled_by text                      -- 'client'|'admin'
  created_at timestamptz default now()
```

### Invoices

```sql
invoices
  id uuid PK
  provider_id uuid FK → providers
  number text UNIQUE NOT NULL            -- format "YYYY-NNNN" globalno (npr. "2026-0042"). Reset svake godine.
  period_from date
  period_to date
  amount int                             -- RSD
  plan text
  status text default 'draft'            -- 'draft'|'issued'|'paid'|'overdue'|'cancelled'
  issued_at timestamptz
  due_at timestamptz
  paid_at timestamptz
  payment_method text                    -- 'virman'|'cash'|'card'
  payment_proof_url text                 -- upload uplatnice
  payment_claimed_at timestamptz         -- kad je salon kliknuo "poslao sam"
  payment_claim_token uuid default gen_random_uuid() UNIQUE
  pdf_url text
  notes text
  created_at timestamptz default now()
```

> **Numeracija:** Globalna sekvenca, format `YYYY-NNNN`, reset svake godine 1. januara. Implementirati Postgres sequence + funkciju koja generiše broj pri insertovanju.

### Agent commissions

```sql
agent_commissions
  id uuid PK
  agent_id uuid FK → agents
  invoice_id uuid FK → invoices
  provider_id uuid FK → providers
  percent int                            -- procenat važeći u trenutku kreiranja
  amount int                             -- RSD, izračunato (snapshot)
  status text default 'pending'          -- 'pending'|'approved'|'paid'
  approved_at timestamptz
  paid_at timestamptz
  created_at timestamptz default now()
```

### Payments (future-proof, prazno za MVP)

```sql
payments
  id uuid PK
  invoice_id uuid FK → invoices
  provider_id uuid FK → providers
  gateway text                           -- 'monri'|'fastspring'|'paddle'|'stripe'
  gateway_payment_id text
  amount int
  currency text default 'RSD'
  status text                            -- 'pending'|'completed'|'failed'|'refunded'
  created_at timestamptz default now()
```

---

## 7. RLS Strategy

> "Sve tabele imaju provider_id" iz starog prompta nije tačno. Politike se razlikuju po tabeli. Detalji:

### Provider-scoped tables (workers, services, shifts, bookings, ...)

```
SELECT/UPDATE/DELETE: provider_id = (SELECT id FROM providers WHERE user_id = auth.uid())
INSERT: with check provider_id = (SELECT id FROM providers WHERE user_id = auth.uid())
```

### `providers` table

```
SELECT (own): user_id = auth.uid()
SELECT (public, by slug): bilo ko može da pročita osnovne kolone (name, slug, description, brending, etc.) — ZA mini sajt
UPDATE: user_id = auth.uid()
DELETE: zabranjeno za salon admina; samo super admin via service_role
```

### `agents` table

```
SELECT (own): user_id = auth.uid()
UPDATE (own): user_id = auth.uid() — samo neka polja (npr. phone, ne default_commission_percent)
INSERT/DELETE: zabranjeno; samo super admin via service_role
```

### `agent_commissions` table

```
SELECT: agent vidi gde je agent_id = svoj agent record; provider vidi gde je provider_id = svoj
UPDATE/DELETE: zabranjeno za sve osim super admin
```

### `invoices` table

```
SELECT: provider_id = svoj provider; super admin sve
INSERT (claim payment): public via payment_claim_token (no auth) — public funkcija sa parametrom
UPDATE/DELETE: samo super admin
```

### Public tables (za mini sajt — bez auth)

`provider_gallery`, `services` (read-only), `bookings` (insert-only za pending) — accessibility preko RPC funkcija ili public RLS sa whitelist kolonama.

### Super Admin

Super Admin **ne koristi RLS** — koristi `service_role` key sa servera (`lib/supabase/admin.ts`). Nikad ne sme biti exposed klijentu. Auth check je manuelni: `user.email IN ('admin@zakazi.pro', ...)` ili dedicated `super_admins` tabela.

---

## 8. Routes / Screens

### Javni mini sajt (`/[slug]/`)

| Ruta | Opis |
|------|------|
| `/[slug]` | Landing — hero, opis, radnici, galerija, CTA |
| `/[slug]/book` | Booking wizard (4 koraka) |
| `/[slug]/book/potvrda` | Potvrda sa cancel linkom |
| `/[slug]/otkazivanje/[token]` | Otkazivanje termina |
| `/[slug]/otkazivanje/uspesno` | Potvrda otkazivanja |
| `/[slug]/ocena/[token]` | Ocena (zadovoljan → Google, nije → interna) |

### Auth

| Ruta | Opis |
|------|------|
| `/login` | Login (svi role-ovi, redirect prema ulozi) |
| `/register` | Registracija salona |
| `/register?ref=KOD` | Registracija via referral link |
| `/register/onboarding` | Onboarding wizard (naziv, slug, prva smena, prvi radnik) |

### Faktura — public claim (`/faktura/[token]/`)

| Ruta | Opis |
|------|------|
| `/faktura/[payment_claim_token]` | "Poslao sam uplatu" forma — bez auth-a |

### Salon Admin (`/admin/`)

| Ruta | Opis |
|------|------|
| `/admin` | Today view — termini po radnicima |
| `/admin/termini` | Lista termina (filter: radnik, datum, status) |
| `/admin/termini/novi` | Ručno dodavanje |
| `/admin/termini/[id]` | Detalj — status, otkazivanje, pomeranje |
| `/admin/radnici` | Lista radnika |
| `/admin/radnici/novi` | Dodavanje |
| `/admin/radnici/[id]` | Uređivanje (ime, slika, bio, usluge, aktivan) |
| `/admin/usluge` | Lista usluga |
| `/admin/usluge/nova` | Dodavanje |
| `/admin/usluge/[id]` | Uređivanje |
| `/admin/smene` | Lista smena |
| `/admin/smene/nova` | Kreiranje smene |
| `/admin/radno-vreme` | Radno vreme ordinacije/salona po danima |
| `/admin/raspored` | Nedeljni raspored radnika: smene, custom vreme, rotacije + override |
| `/admin/blokade` | Blokiranje vremena |
| `/admin/sajt` | Live preview + uređivanje |
| `/admin/sajt/brending` | Boje, font, logo, cover |
| `/admin/sajt/galerija` | Upload slika |
| `/admin/sajt/sadrzaj` | Tekst, adresa, kontakt, socijalne mreže |
| `/admin/fakture` | Lista faktura |
| `/admin/fakture/[id]` | Detalj + download PDF + "Poslao sam uplatu" |
| `/admin/podesavanja` | Opšta podešavanja + podaci firme |
| `/admin/podesavanja/domena` | Custom domena (Pro) |
| `/admin/podesavanja/plan` | Plan i status |

### Komercijalist (`/agent/`)

| Ruta | Opis |
|------|------|
| `/agent` | Dashboard — moji saloni, zarada ovog meseca |
| `/agent/saloni` | Lista mojih salona sa statusima |
| `/agent/novi-salon` | Brza registracija na licu mesta |
| `/agent/zarada` | Provizije po fakturi, ukupno, isplaćeno |
| `/agent/referral` | Moj referral link + statistika |

### Super Admin (`/superadmin/`)

| Ruta | Opis |
|------|------|
| `/superadmin` | Dashboard — saloni, prihod, agenti, statistike |
| `/superadmin/saloni` | Lista svih salona |
| `/superadmin/saloni/[id]` | Detalj — plan, status, agent, komisija |
| `/superadmin/saloni/[id]/impersonate` | Ulaz u admin panel salona |
| `/superadmin/agenti` | Lista agenata |
| `/superadmin/agenti/novi` | Kreiranje agenta |
| `/superadmin/agenti/[id]` | Detalj — default komisija, lista salona, zarada |
| `/superadmin/fakture` | Sve fakture (filter po salonu, statusu, periodu) |
| `/superadmin/fakture/nova` | Ručno kreiranje fakture |
| `/superadmin/fakture/[id]` | Detalj — potvrdi uplatu, promeni status, PDF |
| `/superadmin/provizije` | Odobravanje i isplata provizija agentima |

---

## 9. Business Logic

### Plan status

```
trial        →  30 dana besplatno, sve funkcije
active       →  plaća, sve radi
past_due     →  kasni; booking radi, banner upozorenja
suspended    →  booking stranica: "Nije dostupno za online zakazivanje"
cancelled    →  isto kao suspended
```

### Billing flow (virman)

```
Registracija        →  trial (30 dana)
Dan 30              →  kreira se faktura, šalje PDF emailom
Dan 30 + 15         →  rok plaćanja (due_at)
Due - 3 dana        →  podsetnik email
Due + 1             →  status → 'overdue', email upozorenje
Overdue + 7         →  plan_status → 'past_due'
Overdue + 14        →  plan_status → 'suspended'
```

### "Poslao sam uplatu" flow

```
1. Salon klikne link iz emaila fakture (sadrži payment_claim_token)
2. Otvori /faktura/[payment_claim_token] (public, bez auth)
3. Unese datum uplate, iznos, opcionalno upload uplatnice
4. Klikne "Potvrdio sam uplatu" → invoice.payment_claimed_at = now()
5. Super adminu stigne email sa detaljima
6. Super admin proveri, klikne "Potvrdi" u /superadmin/fakture/[id]
7. invoice.status → 'paid', plan_status → 'active'
8. Ako salon ima agent_id → kreira se agent_commission zapis sa status='pending'
```

### Provizija agenta

```typescript
// Računica pri potvrdi uplate
const percent = provider.agent_commission_percent ?? agent.default_commission_percent
const amount = Math.round(invoice.amount * percent / 100)

// agent_commissions zapis:
// status: 'pending' → 'approved' (super admin) → 'paid' (super admin)
```

Super admin može promeniti `provider.agent_commission_percent` u svakom trenutku — važi od **sledeće** fakture (ne retroaktivno).

### Slobodni termini (slot logika)

```
1. Proveri radno vreme providera za taj dan:
   provider_working_hours.is_closed = true → nema termina
2. Radno vreme radnika za taj dan:
   schedule_override > shift_rotation > worker_schedule (prioritet)
3. Ako izvor rasporeda ima shift_id → koristi start/end/break iz shifts
4. Ako izvor rasporeda ima custom_start_time/custom_end_time → koristi custom vreme i custom pauzu
5. Presek radnog vremena radnika sa radnim vremenom providera
6. Oduzmi break_start/break_end
7. Oduzmi buffer_minutes između termina
8. Oduzmi bookinge (status: confirmed, pending)
9. Oduzmi time_off
10. Korak slota = trajanje izabrane usluge, poravnato sa početkom svakog slobodnog bloka (početak smene/custom vremena, kraj pauze, kraj postojećeg termina + buffer)
11. Ne prikazuj: prošlost, < min_notice, > max_days_ahead
```

### Race condition zaštita

```
Booking iz javne strane kreira se odmah sa status='confirmed'
Razlog: admin ne treba ručno da potvrđuje svaki termin u MVP-u.
Status 'pending' ostaje rezervisan za buduće online plaćanje ili ručne tokove.
Cancelled/expired se ne računaju kao zauzeti slotovi
```

### No-show evidencija

```
Admin moze rucno oznaciti zakazan termin kao status='noshow'
Ako isti telefon ili email kasnije zakaze novi termin:
  - admin pregled termina prikazuje upozorenje "Ranije nije dosao"
  - cilj je da admin/radnik telefonom proveri termin pre dolaska
Kasnije: poslati email/in-app notifikaciju adminu cim se takav termin kreira
```

### Rotacija smena

```
Parnost nedelje računa se od rotation_start_date
Neparna → week_odd_shift_id
Parna   → week_even_shift_id
schedule_overrides UVEK ima prednost nad svim
```

### Deaktivacija radnika

```
Pre nego što se setuje is_active=false:
1. Proveri buduće termine sa status IN ('confirmed','pending')
2. Prikaži upozorenje sa listom
3. Admin potvrđuje: "otkaži sve" ili "ostavi kako je"
4. Ako "otkaži sve" → bulk update bookings.status='cancelled', cancelled_by='admin', šalje email klijentima
```

### Cancellation policy

```
Pre dozvole za otkazivanje:
1. Proveri provider.cancel_min_hours
2. Ako now() + cancel_min_hours > booking.starts_at → blokiraj
3. Prikaži poruku: "Termin se ne može otkazati manje od X sati pre."
```

### Impersonate (Super Admin)

```
Super admin klikne "Uđi kao salon" u /superadmin/saloni/[id]
Server generiše JWT token sa { provider_id, impersonated_by: super_admin.id, exp: now()+15min }
Redirect na /admin sa cookie-jem
proxy.ts prepoznaje impersonate sesiju
Banner u /admin: "Pregledate kao: Salon Mila — [Izlaz]"
Zabranjeno tokom impersonate-a:
  - DELETE providers
  - UPDATE providers.billing_email, company_*
  - UPDATE providers.plan, plan_status
```

### Referral flow

```
Agent ima jedinstveni ref_code (npr. "PERA2025") — generisan pri kreiranju agenta
Link: zakazi.pro/register?ref=PERA2025
Pri registraciji:
  - Pročitaj ?ref param iz URL-a
  - Pronađi agent po ref_code
  - providers.agent_id = agent.id, providers.ref_code = "PERA2025"
Agent vidi salon u svojoj listi automatski
```

### Brza registracija (agent na terenu)

```
Agent otvori /agent/novi-salon na telefonu (mobile-first!)
Unese: naziv, email vlasnika, telefon, plan (free/basic/pro)
Sistem:
  1. Kreira auth user sa email + random temp password
  2. Kreira provider record sa agent_id = agent.id, ref_code = agent.ref_code
  3. Šalje email vlasniku: "Nalog kreiran, postavi lozinku" (Supabase magic link)
Agent odmah vidi salon u /agent/saloni sa statusom "trial"
```

### Custom domena

```
Next.js 16 proxy.ts (NE middleware.ts!) čita host header iz request-a
Ako host !== zakazi.pro:
  - SELECT * FROM providers WHERE custom_domain = $host
  - Ako found → rewrite na /[slug] sa internim header-om
Vercel:
  - Wildcard *.zakazi.pro
  - Custom domains dodavane manuelno (Pro plan upgrade)
SSL automatski via Vercel
```

---

## 10. Email Notifikacije (Resend)

### Booking

| Trigger | Prima | Sadržaj |
|---------|-------|---------|
| Nova rezervacija | Klijent | Potvrda + cancel link |
| Nova rezervacija | Admin | Ime, telefon, radnik, usluga, vreme |
| Otkazivanje (klijent) | Admin | Info |
| Otkazivanje (admin) | Klijent | Obaveštenje |
| 2h pre termina | Klijent | Reminder |
| Status → completed | Klijent | Zahvalnica + link za ocenu |

### Billing

| Trigger | Prima | Sadržaj |
|---------|-------|---------|
| Faktura izdata | Admin salona | PDF attachment + instrukcije |
| Due - 3 dana | Admin salona | Podsetnik |
| Overdue | Admin salona | Upozorenje |
| Suspended | Admin salona | Nalog suspendovan |
| "Poslao sam uplatu" | Super Admin | Detalji + link za potvrdu |
| Uplata potvrđena | Admin salona | Hvala, nalog aktivan |

### Agent

| Trigger | Prima | Sadržaj |
|---------|-------|---------|
| Novi salon via ref | Agent | "Salon X se registrovao via tvoj link" |
| Provizija odobrena | Agent | Iznos i detalji |
| Provizija isplaćena | Agent | Potvrda isplate |

---

## 11. Mini sajt — Brending sistem

```css
--primary-color    /* boja dugmadi, akcenata */
--text-color       /* tekst na primary pozadini */
--font-family      /* default | serif | modern | elegant */
```

Primenjuje se isključivo na `/[slug]/*` rutama (root layout za taj segment).
Admin vidi **live preview** u `/admin/sajt` dok menja vrednosti.

> **Mini sajt nikad nije light/dark toggle.** On je "sajt u bojama biznisa". Ako biznis hoće tamnu temu, bira tamne boje u brending panelu.

---

## 12. PDF faktura (server-side, @react-pdf/renderer)

Sadrži:
- Broj fakture, datum, rok plaćanja
- Podaci platforme (zakazi.pro, PIB, MB, adresa, žiro račun)
- Podaci klijenta (naziv firme, PIB, MB, adresa)
- Stavka: plan, period, iznos
- Poziv na broj (broj fakture)
- IPS QR kod za plaćanje (opciono, srpski standard)

Storage: `Supabase Storage → invoices/[number].pdf`

---

## 13. Project Structure

> **Trenutno koristimo `app/` u root-u, ne `src/`.** Razlog: jednostavnije za projekat ove veličine, Next.js to podržava nativno. Migrirati u `src/` kasnije ako treba (jeftino).

```
zakazivanje/
├── app/
│   ├── [slug]/                     # Javni mini sajt
│   │   ├── page.tsx
│   │   ├── book/
│   │   │   ├── page.tsx
│   │   │   └── potvrda/page.tsx
│   │   ├── otkazivanje/[token]/page.tsx
│   │   └── ocena/[token]/page.tsx
│   ├── faktura/[token]/page.tsx    # "Poslao sam uplatu"
│   ├── admin/                      # Salon admin
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── termini/
│   │   ├── radnici/
│   │   ├── usluge/
│   │   ├── smene/
│   │   ├── raspored/
│   │   ├── blokade/
│   │   ├── sajt/
│   │   ├── fakture/
│   │   └── podesavanja/
│   ├── agent/                      # Komercijalist
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── saloni/
│   │   ├── novi-salon/page.tsx
│   │   ├── zarada/page.tsx
│   │   └── referral/page.tsx
│   ├── superadmin/                 # Platforma operator
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── saloni/
│   │   ├── agenti/
│   │   ├── fakture/
│   │   └── provizije/
│   ├── login/page.tsx
│   ├── register/
│   │   ├── page.tsx
│   │   └── onboarding/page.tsx
│   ├── globals.css                 # ← već postoji
│   ├── layout.tsx                  # ← već postoji
│   └── page.tsx                    # ← landing — već postoji
├── components/
│   ├── booking/
│   ├── admin/
│   ├── agent/
│   ├── superadmin/
│   ├── salon/
│   └── ui/                         # Shadcn
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # ← već postoji
│   │   ├── server.ts               # ← već postoji
│   │   ├── proxy.ts                # ← već postoji
│   │   └── admin.ts                # service_role — samo serverside (TBD)
│   ├── slots.ts                    # Slot logika
│   ├── rotations.ts                # Rotacija smena
│   ├── emails.ts                   # Resend
│   ├── pdf.ts                      # Fakture
│   └── billing.ts                  # Billing logika + provizije
├── proxy.ts                        # ← već postoji (NE middleware.ts!)
├── types/
│   └── database.ts                 # Supabase generated types (TBD)
├── supabase/
│   └── migrations/                 # SQL migracije (TBD)
└── docs/
    └── SPEC.md                     # ← ovaj fajl
```

---

## 14. pg_cron Jobovi

```sql
-- Oslobodi expired pending bookinge (svakih 5 minuta)
SELECT cron.schedule('expire-pending-bookings', '*/5 * * * *', $$
  UPDATE bookings SET status='expired'
  WHERE status='pending'
  AND created_at < now() - interval '5 minutes'
$$);

-- Kreira mesečne fakture (1. u mesecu, 08:00)
SELECT cron.schedule('create-monthly-invoices', '0 8 1 * *', $$
  SELECT net.http_post(url := 'https://zakazi.pro/api/cron/create-invoices',
  headers := '{"Authorization": "Bearer CRON_SECRET"}')
$$);

-- Šalje fakture emailom (2. u mesecu, 08:00)
SELECT cron.schedule('send-invoices', '0 8 2 * *', $$
  SELECT net.http_post(url := 'https://zakazi.pro/api/cron/send-invoices',
  headers := '{"Authorization": "Bearer CRON_SECRET"}')
$$);

-- Podsetnici i status promene (svaki dan, 09:00)
SELECT cron.schedule('billing-reminders', '0 9 * * *', $$
  SELECT net.http_post(url := 'https://zakazi.pro/api/cron/billing-check',
  headers := '{"Authorization": "Bearer CRON_SECRET"}')
$$);
```

---

## 15. Implementation Plan (Phased)

> **Realan horizont:** Ako radiš sam, MVP do prve mušterije ≈ 4-6 nedelja punog tempa. Faze 7-9 mogu doći kasnije, kad jedan salon već koristi platformu.

| # | Faza | Status | Šta sadrži |
|---|------|--------|------------|
| 1 | **Infrastruktura** | 🟡 In progress | Supabase migracije, RLS, klijenti, proxy.ts, pg_cron |
| 2 | **Auth + Onboarding** | ⬜ Pending | Register (direktno + ref), Login (jedan endpoint, role redirect), onboarding wizard |
| 3 | **Admin core** | ⬜ Pending | Radnici/Usluge/Smene CRUD, raspored + rotacije + override, blokade |
| 4 | **Booking engine** | ⬜ Pending | `lib/slots.ts`, booking wizard (4 koraka), race condition, email notifikacije |
| 5 | **Mini sajt** | ⬜ Pending | Landing `/[slug]`, brending sistem, live preview, galerija |
| 6 | **Admin dashboard** | ⬜ Pending | Today view, lista termina + filteri, statusi |
| 7 | **Billing** | ⬜ Pending | PDF, "Poslao sam uplatu", emailovi, cron, plan status |
| 8 | **Agent panel** | ⬜ Pending | Dashboard, lista, brza registracija, referral, zarada |
| 9 | **Super Admin** | ⬜ Pending | Dashboard, saloni, impersonate, billing upravljanje, provizije |
| 10 | **Polish** | ⬜ Pending | Otkazivanje via token, reminder 2h pre, ocena + Google fork, custom domain setup flow |

**MVP launchable** = Faze 1-6 (one salon koristi). Posle toga uvodimo billing i agent panel u produkcionoj sredini.

### Šta je urađeno u Fazi 1 (delimično)

Vidi §3 za detalje. Faza 1 nije gotova — fali šema, RLS, pg_cron.

---

## 16. Conventions / Rules

### Jezik i lokalizacija
- **Srpski jezik, latinica** u svim UI tekstovima
- **Univerzalna terminologija** — koristiti reči koje rade za sve tipove biznisa:
  - "klijent" (NE "mušterija" — frizerski žargon, NE "pacijent" — medicinski)
  - "termin" (NE "frizura")
  - "nalog" (NE "salon") kad se obraća vlasniku
  - "radnik" (NE "frizer") u UI menijima — tabela ostaje `workers`
- **RSD** kao integer, bez decimala
- **Timezone: Europe/Belgrade** — koristiti `date-fns-tz` (NE samo `date-fns`)

### Styling
- **CSS varijable za sve boje** — nikad hardkodovane (`bg-white`, `#000`, `text-gray-900`)
- Komponente koriste `bg-primary`, `text-foreground`, `border-border`, itd.
- Trenutno samo light tema; dark mode kasnije bez diranja komponenti
- **Tailwind v4 caveat:** `@theme` blok sa **direktnim vrednostima** (`--color-primary: hsl(...)`) — NE `@theme inline { --color-primary: var(--primary) }` jer ne generiše utility klase u trenutnoj verziji. Kad budemo dodavali dark mode, treba istražiti zašto i možda update-ovati Tailwind.

### Next.js 16 specifičnosti
- **`proxy.ts`** je novi naziv za middleware (Next.js 16 ga je preimenovao). NE `middleware.ts`.
- `cookies()` je sad **async**: `const cookieStore = await cookies()`
- `params` u `page.tsx` su sad **async** za dinamičke rute: `const { slug } = await params`

### Supabase
- **`service_role` key SAMO server-side** (u `lib/supabase/admin.ts`), NIKAD u klijentu
- **Novi format ključeva:** `sb_publishable_...` umesto JWT `eyJhbGc...`. Env var: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ne `_ANON_KEY`)
- Login endpoint detektuje ulogu pre redirekta
- Migracije idu u `supabase/migrations/` kao `.sql` fajlovi (CLI workflow)

### Mobile-first
- Svi javni ekrani (`/[slug]/*`)
- Cео agent panel (`/agent/*`) — agenti rade na terenu sa telefonom
- Admin panel je desktop-first, ali mora biti čitljiv na tabletu

### shadcn/ui
- Samo `/admin/*`, `/agent/*`, `/superadmin/*`, `/login`, `/register`
- Mini sajt (`/[slug]/*`) ima **custom dizajn** — shadcn ne pasuje brending sistemu

### Server Actions vs API routes
- **Default: Server Actions** za mutacije (forme, CRUD)
- **API routes** samo za:
  - Cron endpointi (`/api/cron/*`)
  - Webhookovi (Stripe, Resend, itd. ako budu)
  - Public endpointi koji ne idu kroz Next.js stranicu

---

## 17. Šta NE raditi u MVP-u

- SMS notifikacije (Faza 11+)
- Viber integracija
- Kartično plaćanje (tabela postoji, logika ne)
- Automatski srpski državni praznici (admin ručno dodaje)
- Kalendar view (tabela termina je dovoljna)
- Analytics dashboard
- Mobile aplikacija
- Multi-language

---

## 18. How to Resume Work

Future Claude: na početku sesije:

1. Pročitaj **ovaj fajl** (SPEC.md) — single source of truth
2. Pročitaj **memoriju** za user-specific kontekst
3. Pogledaj **§3 Current Implementation State** za stvarno stanje
4. Pogledaj **§15 Implementation Plan** za sledeću fazu
5. Proveri **`git log`** ako postoji repo
6. Pre nego što predložiš sledeći korak, **izvesti korisnika gde smo stali i šta ti deluje kao logičan sledeći potez**
