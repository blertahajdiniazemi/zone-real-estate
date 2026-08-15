/* =====================================================================
   ZONE REAL ESTATE — KONFIGURIMI PUBLIK I PANELIT
   =====================================================================

   Ky skedar është PUBLIK. Ai shkarkohet nga çdo vizitor i faqes.

   Vendosni këtu VETËM vlera publike:
     - URL-në e projektit Supabase
     - çelësin publik "anon" / "publishable" të Supabase
     - adresën e funksionit serverik

   MOS vendosni kurrë këtu:
     - GitHub token
     - çelësin "service_role" të Supabase
     - fjalëkalime punonjësish

   ===================================================================== */

window.ZONE_ADMIN_CONFIG = {

  /* Supabase → Project Settings → Data API → Project URL */
  SUPABASE_URL: "https://pigwoiskmxicjenhjqsp.supabase.co",

  /* Supabase → Project Settings → API Keys → anon / publishable key.
     Ky çelës është i sigurt për shfletuesin. */
  SUPABASE_ANON_KEY: "sb_publishable_O6EdsgNWDB7u6RUumpPALg_anHTEkBT",

  /* Adresa e funksionit serverik (Supabase Edge Function).
     Zakonisht: https://YOUR-PROJECT-REF.supabase.co/functions/v1/zone-admin */
  FUNCTION_URL: "https://pigwoiskmxicjenhjqsp.supabase.co/functions/v1/zone-admin",
  
  /* Adresa e faqes live — përdoret vetëm për të shfaqur fotot ekzistuese
     në listën e pronave. Lëreni bosh nëse nuk jeni të sigurt. */
  SITE_BASE: "",

  /* Rolet që lejohen të publikojnë. Serveri e zbaton të njëjtën listë;
     ndryshimi këtu nuk i jep leje askujt — vetëm fsheh butonat. */
  PUBLISH_ROLES: ["admin", "editor"]

};
