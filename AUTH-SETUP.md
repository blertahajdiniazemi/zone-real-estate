# Autentikimi — çfarë duhet konfiguruar me dorë

Kodi është gati. Këto katër gjëra vendosen te **Supabase Dashboard** dhe
nuk mund të vendosen nga kodi. Pa to, kyçja dhe rivendosja e
fjalëkalimit nuk punojnë në domenin e prodhimit.

---

## 1 · Site URL dhe Redirect URLs

**Authentication → URL Configuration**

**Site URL** (vetëm një, kjo është adresa e prodhimit):

```
https://realestate.zonegroup-ks.com
```

**Redirect URLs** (shtoni të gjitha këto rreshta):

```
https://realestate.zonegroup-ks.com/reset-password.html
https://realestate.zonegroup-ks.com/admin.html
https://realestate.zonegroup-ks.com/**
```

Nëse punoni edhe lokalisht ose në GitHub Pages, shtoni edhe:

```
http://localhost:8000/**
https://blertahajdiniazemi.github.io/zone-real-estate/**
```

> **Kjo është adresa kryesore që ju duhet:**
> `https://realestate.zonegroup-ks.com/reset-password.html`
>
> Kur një adresë nuk është në këtë listë, Supabase **nuk e kthen gabimin** —
> thjesht e dërgon përdoruesin te *Site URL* dhe tokeni humbet. Kjo është
> arsyeja pse linku i rivendosjes çonte te ballina dhe nuk bënte asgjë.

---

## 2 · SMTP — arsyeja pse emailet nuk mbërrinin

**Authentication → Emails → SMTP Settings**

Serveri i integruar i Supabase-it është **vetëm për testim**. Ai lejon
rreth **2–4 email në orë për të gjithë projektin** dhe nuk garanton
dërgim. Për prodhim duhet një SMTP i juaji:

| Shërbim | Falas |
|---|---|
| Resend | 3.000 email/muaj |
| Brevo | 300 email/ditë |
| Mailgun / SendGrid | plan falas i kufizuar |

Vendosni **Enable Custom SMTP**, pastaj host, port, user, pass dhe
adresën dërguese (p.sh. `noreply@zonegroup-ks.com`).

Pas kësaj, nëse dërgimi dështon, faqja e tregon gabimin qartë në shqip
në vend që të thotë gabimisht se linku u dërgua.

**Authentication → Rate Limits** — ngrini *"Rate limit for sending emails"*
nëse punonjësit ankohen për *"Shumë përpjekje"*.

---

## 3 · Shablloni i emailit të rivendosjes

**Authentication → Emails → Templates → Reset Password**

Shablloni standard punon. Sigurohuni që linku të jetë:

```html
<a href="{{ .ConfirmationURL }}">Vendos fjalëkalim të ri</a>
```

Faqja `reset-password.html` i pranon të tria format që Supabase mund të
dërgojë (`#access_token=…`, `?token_hash=…`, `?code=…`), prandaj nuk keni
nevojë ta ndryshoni shabllonin.

Koha e skadimit: **Authentication → Providers → Email → Email OTP Expiration**.
Parazgjedhja është 1 orë; 24 orë (`86400`) është më praktike për punonjësit.

---

## 4 · Kolona `active` dhe rolet

Në tabelën `profiles`:

```sql
-- Asnjë profil nuk duhet të ketë active = NULL
alter table public.profiles
  alter column active set default true;

update public.profiles set active = true where active is null;

-- Rolet të pastruara: 'admin' ose 'editor', me shkronja të vogla
update public.profiles set role = lower(trim(role));

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin','editor'));
```

Kodi tani e trajton `active = NULL` si **aktiv** dhe i krahason rolet pa
dallim shkronjash, prandaj asnjë përdorues nuk bllokohet edhe pa këtë
pastrim. Por pastrimi ia vlen.

---

## 5 · Sekretet e Edge Function-it

**Edge Functions → zone-admin → Secrets** — asnjë ndryshim, vetëm
verifikoni se ekzistojnë:

```
GITHUB_TOKEN      (fine-grained PAT, Contents: Read and write)
GITHUB_OWNER      blertahajdiniazemi
GITHUB_REPO       zone-real-estate
ALLOWED_ORIGINS   https://realestate.zonegroup-ks.com
```

`SUPABASE_URL` dhe `SUPABASE_SERVICE_ROLE_KEY` i vendos vetë Supabase.
**Çelësi `service_role` nuk shfaqet askund në kodin e shfletuesit** —
kontrollohet lehtë:

```bash
grep -ri "service_role\|SUPABASE_SERVICE" *.html *.js
```

Duhet të kthejë vetëm komente, asnjë vlerë.

---

## Si të testohet

| # | Rasti | Pritet |
|---|---|---|
| 1 | Kyçje e saktë | Hyn në panel |
| 2 | Fjalëkalim i gabuar | „Email ose fjalëkalim i gabuar." |
| 3 | Email i pavlefshëm | „Adresa e email-it nuk duket e saktë." |
| 4 | Përdorues joaktiv | „Përdorues joaktiv. Kontaktoni administratorin." |
| 5 | Dalje | Kthehet te hyrja, sesioni pastrohet |
| 6 | F5 gjatë punës | Mbetet i kyçur |
| 7 | Mbyll/hap shfletuesin | Mbetet i kyçur |
| 8 | Sesion i skaduar | „Sesioni ka skaduar. Kyçuni sërish." |
| 9 | Kërkesë rivendosjeje | „Nëse adresa ekziston, linku u dërgua ✓" |
| 10 | Emaili | Mbërrin brenda një minute |
| 11 | Linku | Hap `reset-password.html` |
| 12 | Fjalëkalim i ri | „Fjalëkalimi u ndryshua me sukses." |
| 13 | Kyçje me të riun | Funksionon; i vjetri jo |
| 14 | Link i skaduar | „Linku … ka skaduar ose nuk është valid." |
| 15 | Klikime të shumta | Butoni çaktivizohet, një kërkesë e vetme |

Për **14**, mënyra më e shpejtë: kërkoni dy linqe rresht dhe hapni të
parin — Supabase e anulon linkun e vjetër kur lëshon një të ri.

Për **8**, te DevTools → Application → Local Storage fshini çelësin
`zone-admin-auth` dhe rifreskoni faqen.
