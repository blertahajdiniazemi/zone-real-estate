/* =====================================================================
   ZONE REAL ESTATE — SKEDARI I PRONAVE
   =====================================================================
   Gjeneruar nga paneli i administrimit më 8/15/2026, 8:33:53 PM
   ===================================================================== */

const DISPLAY_PHONE = "+383 49 588 211";
const CALL_PHONE    = "+38349588211";

const CITY         = "Prishtinë";
const LAST_UPDATED = "Gusht 2026";

const TEXT = {
  statusShitje: "Për shitje",
  statusQira: "Me qira",
  butoniThirr: "Telefono për këtë",
  butoniDetajet: "Detajet",
  eVecuar: "E veçuar",
  "specÇmimi": "Çmimi",
  specDhoma: "Dhoma gjumi",
  specBanjo: "Banjo",
  specSiperfaqja: "Sipërfaqja",
  shkurtDhoma: "dh",
  shkurtBanjo: "bnj",
  karakteristikat: "Karakteristikat",
  telefono: "Telefono",
  shenimiThirrjes: "Pyetni për këtë pronë me emër —",
  shikoDetajet: "Shiko detajet për",
  prona: "prona",
  pronaNjejes: "pronë",
  aktive: "aktive",
  bosh: "Asnjë pronë në këtë kategori për momentin. Telefononi",
  boshFund: "dhe pyesni çfarë vjen së shpejti.",
  shtoFoto: "SHTO FOTO"
};

const listings = [

  {
    title: "Shtëpi në Arbëri",
    status: "Për shitje",
    price: "185.000 €",
    beds: 3,
    baths: 2,
    size: "140 m²",
    location: "Arbëri, Prishtinë",
    summary: "Shtëpi individuale me oborr privat, kuzhinë të re dhe garazh për dy vetura, në një rrugë të qetë.",
    details: "Shtëpi e mirëmbajtur me tri dhoma gjumi, në një nga rrugët më të qeta të Arbërisë. Kuzhina dhe të dyja banjot janë renovuar plotësisht dy vjet më parë, dhe kulmi është ndërruar në të njëjtën kohë. Oborri i pasmë është i rrethuar dhe merr diell gjatë tërë pasdites. Dhjetë minuta me veturë nga qendra, me shkollë fillore dhe market brenda distancës për këmbë. Mund të vizitohet çdo ditë këtë muaj.",
    features: [
      "Kuzhinë dhe banjo të renovuara",
      "Oborr i rrethuar",
      "Garazh për dy vetura",
      "Kulm i ri (2024)",
      "Ngrohje qendrore"
    ],
    image: "images/maple-street.svg"
  },

  {
    title: "Banesë 12B, Bregu i Diellit",
    status: "Me qira",
    price: "420 €/muaj",
    beds: 2,
    baths: 1,
    size: "78 m²",
    location: "Bregu i Diellit, Prishtinë",
    summary: "Banesë në katin e fundit me ballkon, makinë larëse dhe vend parkimi të mbuluar, afër qendrës.",
    details: "Banesë e ndritshme në katin e fundit me dy dhoma gjumi, me hapësirë të hapur ditore dhe ballkon përgjatë tërë gjatësisë së banesës. Makinë larëse dhe tharëse brenda banesës, plus një vend parkimi i mbuluar i përfshirë në qira. Ndërtesa ka ashensor dhe hyrje të sigurt. Dy minuta në këmbë deri te stacioni i autobusit dhe një market i madh. Qira minimum dymbëdhjetë muaj, e pamobiluar, e lirë nga data një e muajit të ardhshëm.",
    features: [
      "Kati i fundit, ballkon i gjatë",
      "Makinë larëse dhe tharëse brenda",
      "Parking i mbuluar i përfshirë",
      "Ashensor dhe hyrje e sigurt",
      "2 minuta deri te stacioni"
    ],
    image: "images/riverside-12b.svg"
  },

  {
    title: "Shtëpi në Ulpianë",
    status: "Për shitje",
    price: "268.000 €",
    beds: 4,
    baths: 3,
    size: "210 m²",
    location: "Ulpianë, Prishtinë",
    summary: "Shtëpi këndore në dy kate, me bodrum të përfunduar dhe oborr të madh nga jugu.",
    details: "Shtëpi këndore me dukshëm më shumë hapësirë sesa duket nga rruga. Katër dhoma gjumi në katin e sipërm, përfshirë një dhomë kryesore me banjo private, plus një bodrum i përfunduar që tani përdoret si zyrë dhe dhomë loje. Oborri i pasmë është nga jugu dhe kufizohet me hapësirë të gjelbër, jo me shtëpi tjetër. Parking në oborr për dy vetura. Ideale për familje që kërkon hapësirë.",
    features: [
      "Shtëpi këndore, dritare shtesë anash",
      "Bodrum i përfunduar",
      "Oborr nga jugu me hapësirë të gjelbër",
      "Dhomë kryesore me banjo private",
      "Parking për dy vetura"
    ],
    image: "images/orchard-lane.svg"
  },

  {
    title: "Shtëpi përdhese, Veternik",
    status: "Për shitje",
    price: "112.000 €",
    beds: 2,
    baths: 1,
    size: "96 m²",
    location: "Veternik, Prishtinë",
    summary: "Shtëpi njëkatëshe me verandë të mbuluar dhe dritare të gjera. Pa shkallë askund në pronë.",
    details: "Shtëpi komode me dy dhoma gjumi në një rrugicë të qetë. Gjithçka është në një nivel, pa shkallë as në hyrje, çka e bën praktike për këdo që dëshiron të shmangë shkallët. Dritaret e gjera e bëjnë dhomën e ndenjes jashtëzakonisht të ndritshme për madhësinë e saj, dhe veranda e mbuluar shtrihet përgjatë tërë pjesës së përparme. Oborr i lehtë për mirëmbajtje. I përshtatet një çifti, një familjeje të vogël, ose dikujt që dëshiron hapësirë më të vogël.",
    features: [
      "Gjithçka në një nivel, pa shkallë",
      "Verandë e mbuluar përgjatë fasadës",
      "Dhomë ndenjeje e ndritshme",
      "Oborr i lehtë për mirëmbajtje",
      "Rrugicë e qetë pa kalim"
    ],
    image: "images/cedar-bungalow.svg"
  },

  {
    title: "Lokal banimi, Qendër",
    status: "Me qira",
    price: "600 €/muaj",
    beds: 1,
    baths: 1,
    size: "112 m²",
    location: "Qendër, Prishtinë",
    summary: "Hapësirë e konvertuar me dritare harkore, tulla të dukshme dhe nivel gjumi në mezanin.",
    details: "Hapësirë banimi me një dhomë gjumi në një objekt të konvertuar, ku dritaret origjinale harkore dhe tullat janë lënë të dukshme. Hapësira kryesore është e hapur, me nivel gjumi në mezanin mbi kuzhinë, dhe tavane aq të larta sa nuk ndihet kurrë si banesë njëdhomëshe. Ngrohja është nën dysheme. Objekti ka oborr të përbashkët dhe vend për biçikleta. I përshtatet një personi ose një çifti që kërkon hapësirë të veçantë, jo banesë standarde.",
    features: [
      "Dritare harkore dhe tulla origjinale",
      "Nivel gjumi në mezanin",
      "Ngrohje nën dysheme",
      "Oborr i përbashkët dhe vend biçikletash",
      "Kafshët shtëpiake merren parasysh"
    ],
    image: "images/mill-loft.svg"
  },

  {
    title: "Vilë në Matiçan",
    status: "Për shitje",
    price: "465.000 €",
    beds: 5,
    baths: 4,
    size: "310 m²",
    location: "Matiçan, Prishtinë",
    summary: "Vilë moderne me xhamllëk nga dyshemeja në tavan, krah të ulët dhe pishinë të ngrohur në parcelë private.",
    details: "Vilë bashkëkohore me pesë dhoma gjumi, e vendosur në një parcelë private me pamje nga lugina. Blloku kryesor përmban dhomat e gjumit dhe një hapësirë ditore me lartësi të dyfishtë me xhamllëk nga dyshemeja në tavan përgjatë anës së oborrit; krahu i ulët përmban një apartament për mysafirë dhe garazhin. Pishina është e ngrohur dhe e mbuluar nga rruga me bimësi të rritur. Ngrohje nën dysheme kudo dhe panele solare në kulmin e krahut. Vizitat me paralajmërim.",
    features: [
      "Pishinë e ngrohur",
      "Xhamllëk i plotë, pamje nga lugina",
      "Apartament i ndarë për mysafirë",
      "Panele solare dhe ngrohje nën dysheme",
      "Parcelë private me portë"
    ],
    image: "images/hillside-villa.svg"
  },

  {
    title: "Test Blerta",
    status: "Për shitje",
    price: "18000",
    beds: 4,
    baths: 2,
    size: "150",
    location: "Test",
    summary: "Test",
    details: "Test",
    features: [
      "Test"
    ],
    image: "images/test-xd5x.jpg"
  }

];

window.ZONE_CONFIG = { DISPLAY_PHONE, CALL_PHONE, CITY, LAST_UPDATED, TEXT, listings };
