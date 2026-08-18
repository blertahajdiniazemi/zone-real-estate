#!/usr/bin/env python3
"""
Ndërton admin-preview.html — një skedar i vetëm që hapet me dy klikime,
pa server dhe pa Supabase.

Pse duhet një ndërtues: paneli i vërtetë përdor module ES. Kur një faqe
hapet si skedar lokal (file://), shfletuesi i bllokon importet mes
skedarëve. Prandaj të gjitha modulet bashkohen këtu në një skedar të
vetëm, secili i mbështjellë në funksionin e vet që hapësirat e emrave të
mos përplasen.

I VETMI kod që ndryshon është shtresa e transportit: serveri
zëvendësohet me përgjigje të rreme. Logjika e panelit — modeli,
validimi, gjendja, pamjet, autentikimi — është saktësisht ajo e
prodhimit, e lexuar drejt nga skedarët.
"""

import json
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent

# Hapësirat e emrave, sipas shtegut me të cilin importohen.
NS = {
    "auth.js": "__auth",
    "api.js": "__api",
    "format.js": "__fmt",
    "model.js": "__model",
    "store.js": "__store",
    "ui.js": "__ui",
    "images.js": "__images",
    "property-form.js": "__propform",
    "properties.js": "__props",
    "activity.js": "__activity",
    "dashboard.js": "__dash",
    "users.js": "__users",
    "settings.js": "__settings",
    "publishing.js": "__publishing",
    "app.js": "__app",
}

IMPORT_RE = re.compile(
    r'^\s*import\s+(?P<what>[^;]+?)\s+from\s+["\'](?P<path>[^"\']+)["\']\s*;?\s*$',
    re.M,
)


def exported_names(src: str):
    """Emrat që një modul nxjerr jashtë."""
    names = []
    names += re.findall(r'^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)', src, re.M)
    names += re.findall(r'^\s*export\s+class\s+([A-Za-z_$][\w$]*)', src, re.M)
    names += re.findall(r'^\s*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)', src, re.M)
    for block in re.findall(r'^\s*export\s*\{([^}]*)\}\s*;?\s*$', src, re.M):
        for piece in block.split(","):
            piece = piece.strip()
            if not piece:
                continue
            names.append(piece.split(" as ")[-1].strip())
    seen, out = set(), []
    for n in names:
        if n not in seen:
            seen.add(n)
            out.append(n)
    return out


def alias_lines(src: str):
    """Kthen importet e një moduli në lidhje me hapësirat e emrave."""
    lines = []
    for m in IMPORT_RE.finditer(src):
        target = NS.get(pathlib.PurePath(m.group("path")).name)
        if not target:
            continue
        what = m.group("what").strip()

        if what.startswith("*"):                      # import * as ui from …
            lines.append(f'  const {what.split(" as ")[-1].strip()} = {target};')
            continue

        if what.startswith("{"):                      # import { a, b as c } from …
            for piece in what.strip("{} \n").split(","):
                piece = piece.strip()
                if not piece:
                    continue
                if " as " in piece:
                    orig, local = [p.strip() for p in piece.split(" as ")]
                else:
                    orig = local = piece
                lines.append(f'  const {local} = {target}.{orig};')
    return lines


def wrap(path: pathlib.Path, ns: str, patches=None) -> str:
    src = path.read_text(encoding="utf-8")
    for old, new in (patches or []):
        if old not in src:
            raise SystemExit(f"Arna nuk u gjet te {path}: {old[:60]}")
        src = src.replace(old, new)

    names = exported_names(src)
    aliases = alias_lines(src)

    body = IMPORT_RE.sub("", src)                          # hiq importet
    body = re.sub(r'^\s*export\s*\{[^}]*\}\s*;?\s*$', "", body, flags=re.M)
    body = re.sub(r'^(\s*)export\s+', r'\1', body, flags=re.M)   # hiq fjalën export
    body = re.sub(r'^\s*"use strict";\s*$', "", body, flags=re.M)

    returned = ", ".join(names)
    return (
        f"\n/* ================= {path.as_posix()} ================= */\n"
        f"const {ns} = (function () {{\n"
        + ("\n".join(aliases) + "\n" if aliases else "")
        + body
        + f"\n  return {{ {returned} }};\n}})();\n"
    )


# --------------------------------------------------------------------
# Renditja: çdo modul vjen pas atyre që i përdor.
# --------------------------------------------------------------------
ORDER = [
    # auth.js i vërtetë — vetëm rreshti i Supabase-it zëvendësohet, që
    # mesazhet shqip dhe normalizimi i roleve të mbeten origjinale.
    ("auth.js", "__auth", [(
        'import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";',
        "/* createClient vjen nga shtresa demonstruese më sipër */"
    )]),
    ("admin/core/format.js", "__fmt", None),
    ("admin/core/model.js", "__model", None),
    ("admin/core/store.js", "__store", None),
    ("admin/ui/ui.js", "__ui", None),
    ("admin/modules/images.js", "__images", None),
    ("admin/modules/property-form.js", "__propform", None),
    ("admin/modules/properties.js", "__props", None),
    ("admin/modules/activity.js", "__activity", None),
    ("admin/modules/dashboard.js", "__dash", None),
    ("admin/modules/users.js", "__users", None),
    ("admin/modules/settings.js", "__settings", None),
    ("admin/modules/publishing.js", "__publishing", None),
    # app.js i vërtetë — importi dinamik nuk punon në një skedar të
    # bashkuar, prandaj lidhet drejtpërdrejt me modulin tashmë të ngarkuar.
    ("admin/app.js", "__app", [(
        'const { fetchLastPublish } = await import("./modules/activity.js");',
        "const { fetchLastPublish } = __activity;"
    )]),
]


def build():
    shim = (ROOT / "admin/preview-shim.js").read_text(encoding="utf-8")

    # Pronat e vërteta futen brenda gjatë ndërtimit, që shim-i të mos
    # mbajë një kopje të dyfishtë të tyre në depo.
    listings = (ROOT / "listings.js").read_text(encoding="utf-8")
    shim = shim.replace('"__LISTINGS_JS__"', json.dumps(listings, ensure_ascii=False))

    parts = [shim]
    for rel, ns, patches in ORDER:
        parts.append(wrap(ROOT / rel, ns, patches))

    bundle = "\n".join(parts)
    css = (ROOT / "admin/admin.css").read_text(encoding="utf-8")
    shell = (ROOT / "admin.html").read_text(encoding="utf-8")

    # Hiq skriptin e përcjelljes së rivendosjes — i panevojshëm në demo.
    shell = re.sub(r'<script>\s*/\* Rivendosja.*?</script>', "", shell, flags=re.S)

    # CSS-ja dhe JS-ja futen brenda; asnjë skedar i jashtëm nuk mbetet.
    shell = shell.replace('<link rel="stylesheet" href="admin/admin.css">',
                          "<style>\n" + css + "\n</style>")
    shell = shell.replace('<script src="admin-config.js"></script>\n'
                          '<script type="module" src="admin/app.js"></script>',
                          "<script>\n" + bundle + "\n</script>")
    shell = shell.replace("<title>Paneli Administrativ — Zone Group Real Estate</title>",
                          "<title>Pamje demonstruese — Paneli Zone Real Estate</title>")

    out = ROOT / "admin-preview.html"
    out.write_text(shell, encoding="utf-8")
    print(f"admin-preview.html  —  {len(shell)/1024:.0f} KB, i vetëmjaftueshëm")


if __name__ == "__main__":
    build()
