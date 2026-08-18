# Paneli Administrativ — Faza 1

Dokumentim i punës së kryer mbi projektin ekzistues Zone Real Estate.

---

## Çfarë nuk u prek

Këto skedarë janë **identikë** me ata që ishin:

| Skedari | Arsyeja |
|---|---|
| `auth.js` | Logjika e autentikimit funksionon dhe i zgjidh saktë rastet e vështira. U ripërdor, nuk u rishkrua. |
| `admin-config.js` | Konfigurim publik. Asnjë sekret nuk u shtua. |
| `supabase/functions/zone-admin/index.ts` | **Nuk kërkon ripublikim.** Shih më poshtë. |
| `listings.js` | Të dhëna prodhimi. Rigjenerohet vetë te publikimi i parë nga paneli. |
| `index.html`, `liquid.js` | Faqja publike. |

`style.css` u zgjerua vetëm në fund, me stilet e galerisë. Asnjë rregull ekzistuese nuk u ndryshua.

### Pse funksioni serverik nuk kërkon ndryshim

Veprimi `upload_image` pranon një fotografi për kërkesë. Shumë fotografi = shumë thirrje të të njëjtit veprim. Prandaj galeria u realizua plotësisht nga ana e shfletuesit, pa asnjë ndryshim serverik dhe pa asnjë migrim baze të dhënash.

**Faza 1 nuk kërkon as ripublikim të funksionit, as SQL.**

---

## Struktura e re

`admin.html` ra nga **1252 rreshta në 200**: tani është vetëm shtresë, pa CSS dhe pa logjikë brenda.

```
admin.html                 shtresa + ekranet e autentikimit

admin/
  admin.css                sistemi i dizajnit (tokenët, shtresa, komponentët)
  app.js                   autentikimi, sidebar, header, navigimi

  core/
    format.js              data, numra, çmime, sipërfaqe (formati i Kosovës)
    api.js                 klienti i vetëm i funksionit serverik
    model.js               fjalori, normalizimi, gjenerimi i listings.js
    store.js               gjendja + numërimi i ndryshimeve të papublikuara

  ui/
    ui.js                  toast, modale, konfirmime, ikona, fusha

  modules/
    dashboard.js  properties.js  property-form.js  images.js
    users.js      activity.js    publishing.js     settings.js
```

Asnjë ngjyrë nuk shkruhet jashtë bllokut `:root` të `admin.css` — u verifikua me kontroll automatik.

---

## Ndryshimi më i rëndësishëm: prona e veçuar

**Më parë:** prona e parë në `listings.js` ishte automatikisht ajo e ballinës. Rirenditja e skedarit e ndryshonte ballinën pa e ditur askush.

**Tani:** fushë e qartë `featured: true/false`, me `featuredOrder` për renditjen.

Rirenditja e listës nuk ka **asnjë** ndikim te ballina. Kjo u verifikua me test.

Migrimi është automatik: nëse asnjë pronë nuk ka `featured` të qartë, e para shënohet si e veçuar — pikërisht sjellja e vjetër. Pas ruajtjes së parë, vlen vetëm fusha e qartë.

---

## Statusi: dy koncepte, jo një

Fusha e vjetër `status` mbante tekstin `"Për shitje"` / `"Me qira"` — dmth. llojin e transaksionit dhe gjendjen e pronës në një vend të vetëm.

Tani janë të ndara:

```
transactionType   sale | rent
lifecycle         draft | active | reserved | sold | rented | inactive | archived
```

Pronat me status `draft`, `inactive` ose `archived` shkruhen te `listings.js` me `published: false` dhe **nuk shfaqen** në uebfaqe.

---

## Përputhshmëria me faqen publike

`listings.js` i gjeneruar shkruan **të dyja** format:

```js
status: "Për shitje",          // fusha e vjetër — e llogaritur
transactionType: "sale",       // fusha e re

image: "images/x.jpg",         // fusha e vjetër — = coverImage
coverImage: "images/x.jpg",    // fushat e reja
images: ["images/x.jpg", ...]
```

Kështu, edhe nëse një shfletues ka `script.js` të vjetër në cache, faqja punon.

`script.js` u përditësua për të lexuar fushat e reja me rezervë te ato të vjetrat. U testua me katër lloje të dhënash: skedarin e vjetër të prodhimit, një skedar krejt të ri, një skedar të përzier, dhe një skedar bosh — të gjitha renderohen saktë.

### Verifikimi i round-trip

Skedari aktual i prodhimit u lexua, u normalizua dhe u rigjenerua. Të gjitha fushat e vjetra dalin **byte për byte identike**:

```
OK  title     "Shtëpi në Arbëri"        -> "Shtëpi në Arbëri"
OK  status    "Për shitje"              -> "Për shitje"
OK  price     "185.000 €"               -> "185.000 €"
OK  size      "140 m²"                  -> "140 m²"
OK  location  "Arbëri, Prishtinë"       -> "Arbëri, Prishtinë"
OK  image     "images/maple-street.svg" -> "images/maple-street.svg"

idempotent (kalimi i dytë identik): true
```

Çmimet dhe sipërfaqet ruhen si tekst në faqe, por lexohen edhe si numra (`priceValue`, `sizeValue`) — pa këtë, renditja, filtrat dhe statistikat nuk do të punonin mbi të dhënat e vjetra.

---

## Siguria

- Tokeni i GitHub-it rri te funksioni serverik. U verifikua: **asnjë thirrje `api.github.com` nga kodi i shfletuesit.**
- Shfletuesi dërgon vetëm JWT-në e Supabase-it.
- Fshehja e butonave sipas rolit është mirësjellje, jo mbrojtje — serveri i refuzon vetë kërkesat pa leje.
- `publicShape()` te `model.js` është listë e **mbyllur** fushash, e shkruar me dorë. Asgjë nuk kalon te `listings.js` me një cikël mbi objektin, prandaj asnjë fushë private nuk mund të rrëshqasë atje aksidentalisht.

### Shënimet e brendshme — pse mungojnë ende

`listings.js` është skedar publik në një depo publike. Shënimet private nuk mund të shkojnë atje. Fusha nuk u shtua vetëm sa për të ekzistuar; ajo kërkon bazën e të dhënave dhe i takon Fazës 2. Formulari e thotë këtë hapur në vend që të heshtë.

---

## Rrjedha e publikimit

```
1. Duke kontrolluar versionin…      ← konflikti kapet KËTU, para fotove
2. Duke përgatitur fotografitë…     ← skedari verifikohet para se të niset
3. Duke ngarkuar fotografitë…       ← një nga një, me numërues
4. Duke përditësuar pronat…
5. Publikimi përfundoi me sukses.
```

Tri vendime me pasoja praktike:

- **Konflikti kapet në hapin 1.** Më parë dikush mund të priste ngarkimin e dhjetë fotove dhe pastaj të mësonte se puna e tij ishte e vjetruar.
- **Fotot nisen para pronave.** Nëse një foto dështon, `listings.js` nuk dërgohet fare — faqja nuk mbetet kurrë duke treguar një foto që s'ekziston.
- **Fotot e ngarkuara hiqen nga radha vetëm pas suksesit.** Një provë e dytë vazhdon aty ku mbeti.

Kur dikush tjetër publikon ndërkohë, dritarja e konfliktit e thotë qartë se ringarkimi **zëvendëson** ndryshimet e papublikuara. Asgjë nuk mbishkruhet në heshtje.

---

## Treguesi i ndryshimeve të papublikuara

Në header, gjithmonë i dukshëm:

> **3 ndryshime të papublikuara** — ose — **Të gjitha ndryshimet janë publikuar**

Ky numër del nga krahasimi i gjendjes aktuale me atë të momentit të ngarkimit/publikimit të fundit, dhe llogaritet vetëm mbi fushat që përfundojnë vërtet në uebfaqe. Administratori nuk duhet ta hamendësojë kurrë nëse puna e tij ka dalë live.

---

## Testimi i kryer

**64 teste, të gjitha të kaluara.**

| Grupi | Mbulon |
|---|---|
| Round-trip (t1) | Skedari real i prodhimit, përputhshmëria e fushave, idempotenca |
| Njësi (t2) | Leximi i numrave, datat, slug-u shqip, kodet unike, validimi, arratisja e thonjëzave/rreshtave/`<script>` |
| DOM (t3) | Të 8 pamjet renderohen; të 8 skedat e formularit hapen; shikimi paraprak |
| Sjellje (t4) | Numërimi i ndryshimeve, semantika e ballinës, gjenerimi i skedarit, bllokimi i ruajtjes së pavlefshme |
| Faqja publike (t5) | Të dhëna të vjetra / të reja / të përziera / bosh; draftet fshihen; galeria; filtrat |

Kontrolle të tjera: 48/48 importe relative zgjidhen, kllapat e CSS-së të balancuara, asnjë ngjyrë e shkruar jashtë tokenëve, asnjë sekret në kodin e shfletuesit.

---

## Çfarë duhet provuar në shfletues

Testet mbulojnë logjikën, jo pamjen dhe as serverin real. Para përdorimit në punë, provoni:

1. Kyçje e saktë, e pasaktë, llogari joaktive, harresë fjalëkalimi
2. Publikim i vërtetë me një pronë të ndryshuar
3. Ngarkim i disa fotografive njëherësh dhe rirenditja e tyre
4. Konflikt i vërtetë: publikoni nga dy shfletues njëkohësisht
5. Telefon — tabelat duhet të kthehen në kartela nën 680px

---

## Faza 2 — kur të vijë radha

Modulet e CRM-së (Klientët, Kërkesat, Pronarët, Agjentët, Vizitat, Kontratat, Pagesat, Komisionet) **nuk duhet të ruhen te `listings.js`**. Ato kërkojnë tabela në Supabase me RLS, plus veprime të reja te funksioni serverik.

Sidebar-i sot shfaq vetëm modulet që punojnë vërtet. Asnjë buton nuk është vendosur për t'u parë bukur.

---

## Pamja demonstruese — `admin-preview.html`

Për ta parë panelin pa Supabase dhe pa server: hapeni **`admin-preview.html`** me dy klikime në çfarëdo shfletuesi.

```
admin-preview.html      skedar i vetëm, hapet direkt (file://)
admin/preview-shim.js   serveri i rremë — përdoret VETËM nga preview
build-preview.py        e ndërton skedarin nga modulet e vërteta
```

Kredencialet janë të parambushura; shtypni **Kyçu**.

Për të parë çfarë **nuk** i shfaqet një redaktori:

```
admin-preview.html?role=editor
```

### Çfarë është e vërtetë në të

I gjithë CSS-i, modeli, validimi, gjendja, numërimi i ndryshimeve, të gjitha pamjet dhe formularët, `auth.js` me mesazhet dhe rolet e tij, dhe `app.js` — të gjitha lexohen **drejtpërdrejt nga skedarët e prodhimit** gjatë ndërtimit. Pronat janë ato reale të faqes.

### Çfarë është e rreme

Vetëm shtresa e transportit: përgjigjet e serverit, lista e përdoruesve dhe regjistri i aktivitetit. Publikimi ecën nëpër të pesë hapat por **nuk shkruan asgjë askund**. Ndryshimet nuk ruhen — rifreskimi e kthen gjithçka në gjendjen fillestare.

### Pse duhet një ndërtues

Paneli i vërtetë përdor module ES. Kur një faqe hapet si skedar lokal, shfletuesi i bllokon importet mes skedarëve. `build-preview.py` i bashkon modulet në një skedar të vetëm, secilin të mbështjellë veçmas që hapësirat e emrave të mos përplasen.

Nëse ndryshoni kodin ose pronat, rindërtojeni:

```
python3 build-preview.py
```

Skedari kërkon internet vetëm për shkronjat e Google-it; pa të, përdoren shkronjat e sistemit.

### Testimi mbi vetë pamjen demonstruese

25 teste ndërveprimi kalojnë mbi këtë skedar, pa asnjë gabim në konsolë: navigimi, kërkimi, filtrat, tabela dhe rrjeta, të tetë skedat e formularit, validimi, ruajtja, treguesi i ndryshimeve, të pesë hapat e publikimit, dhe pamja e kufizuar e redaktorit.

### Vërejtje e gjetur gjatë testimit

Pronat ekzistuese nuk kanë fushën `category` — ajo thjesht nuk ekzistonte më parë. Redaktuesi e kërkon atë, prandaj herën e parë që ndryshoni një pronë të vjetër, do t'ju kërkohet të zgjidhni kategorinë. Kjo është e qëllimshme: kategoria është ajo që bën të mundur filtrimin dhe statistikat. Formulari e shënon vetë skedën me gabim dhe ju çon te fusha.
