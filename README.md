# Zone Real Estate — liquid motion build (Albanian)

A complete real estate website with a continuous liquid motion system.
Plain HTML, CSS and JavaScript. No build tools, no dependencies, no
monthly fees.

Double-click `index.html` to see it. Everything works offline except
the web fonts, which need an internet connection.

---

## The design decisions

**Flow direction: down and to the right.** Every animation obeys this
one rule — wave dividers travel right, ambient masses rise and drift
right, light sweeps across cards left-to-right, content surfaces from
below. This is the whole reason it reads as one body of water instead
of a pile of separate effects. If you add anything later, make it flow
the same way.

**Palette: molten, not oceanic.** The obvious answer for "liquid" is
deep-sea blue and cyan caustics. This uses aubergine-black with
magenta and amber masses moving through it instead — warm light in
dark space, which for property reads as lit windows at night. It's
also what makes it hypnotic rather than merely smooth: the reference
is a lava lamp.

**Signature: the liquid gauge.** Down the right edge on desktop. It
fills as you scroll, and the meniscus is a real spring simulation —
it overshoots when you stop and wobbles back to level, the way liquid
in a tube actually behaves. Paired with it, scroll velocity feeds a
`--churn` variable that makes the wave dividers choppier the faster
you scroll. Scroll hard and the water gets rough.

---

## The motion system, piece by piece

| Effect | Where | How |
|---|---|---|
| Ambient masses | Behind everything | Five blurred blobs on 37s–61s cycles. The periods are deliberately unequal so the combined pattern effectively never repeats. |
| Surfacing | All content | Rises from below and blurs into focus on an overshoot curve, as if breaking a surface. |
| Wave dividers | Between sections | Two waves travelling right at different speeds. Amplitude reacts to scroll velocity. |
| Liquid gauge | Right edge, desktop | Spring-simulated meniscus with velocity-driven ripple. |
| Pointer wake | Desktop only | A warm smear lagging heavily behind the cursor — the lag is what makes it feel viscous. |
| Card deform | Hover | Corners go asymmetric and light refracts across the image. |
| Detail panel | On open | Arrives as a blob and rounds out into a panel. |
| Filter buttons | On select | The active state floods in from the left rather than switching. |
| Droplet | In the wordmark | Squashes and stretches on landing, forever. |

All of it stops under **prefers-reduced-motion**, with content left
visible and in place — nothing gets stuck invisible.

---

## The files

| File | What it is | Do you edit it? |
|---|---|---|
| `listings.js` | Your phone number, all interface text, and all your properties | **Yes — this is your file** |
| `images/` | Property pictures | **Yes — put photos here** |
| `index.html` | Page structure | No |
| `style.css` | All visual design and CSS animation | Only to change the look |
| `script.js` | Builds the cards from your data | No |
| `liquid.js` | The motion engine | No |

---

## Step 1 — Your phone number is already in

`listings.js` already has your number:

```js
const DISPLAY_PHONE = "+383 49 588 211";
const CALL_PHONE    = "+38349588211";
```

**DISPLAY_PHONE** is what visitors see — reformat it however you like.
**CALL_PHONE** is what actually gets dialled: country code, then digits
only, no spaces. Leave that one alone unless your number changes.

## Step 2 — The Albanian text

There are two places text lives, and the split matters:

**Property text** — in the `listings` list in `listings.js`. Title,
price, description, features. This is what you change every time you
add a property.

**Interface labels** — in the `TEXT` block near the top of the same
file. Words like `"Telefono për këtë"`, `"Detajet"`, `"Karakteristikat"`.
Change these only if you want different wording across the whole site.

**One rule that will break the filters if you ignore it:** the words
`"Për shitje"` and `"Me qira"` appear in three places — the `TEXT`
block, the `status` of every property, and the filter buttons in
`index.html`. They must match exactly, including capital letters and
the ë. If you change the wording, change all three or the filter
buttons will stop finding anything.

The card stat line uses short forms (`3 dh · 2 bnj · 140 m²`) because
the full words don't fit on a phone screen. The detail panel spells
them out. Both are in the `TEXT` block as `shkurtDhoma` and
`shkurtBanjo`.

## Step 3 — Add your properties

Each property is one block in `listings.js`:

```js
{
  title: "Shtëpi në Arbëri",
  status: "Për shitje",
  price: "185.000 €",
  beds: 3,
  baths: 2,
  size: "140 m²",
  location: "Arbëri, Prishtinë",
  summary: "Rreshti i shkurtër në kartelë.",
  details: "Përshkrimi i gjatë kur hapet prona.",
  features: [
    "Kuzhinë e renovuar",
    "Garazh për dy vetura"
  ],
  image: "images/maple-street.svg"
},
```

- **To add one:** copy a block from `{` to `}` including the comma
  after it, paste, change the values.
- **To remove one:** delete the whole block and its comma.

`price` is free text, so write euros exactly as you want them read:
`"185.000 €"` or `"420 €/muaj"` or `"Çmimi me marrëveshje"`.

**The first property in the list is the featured one** in the drop on
the homepage. Move a different block to the top to feature it.

The six properties in there now are samples with Prishtina locations
and realistic euro prices — replace them with your real ones.

## Step 4 — Add your own photos

The site ships with drawn illustrations so it looks finished straight
away. To use real photos:

1. Put the files in the `images` folder.
2. Name them simply, with no spaces and **no Albanian special
   characters** — `shtepi-arberi.jpg`, not `shtëpi arbëri.jpg`. Web
   servers handle ë and ç in filenames badly.
3. Change that property's `image:` line to match exactly.

Resize photos to about 1200px wide first. Straight-from-the-phone
photos are often 5MB each and will make the site slow — which matters
more here than on a plain site, because the animations and the image
loading compete for the same budget on older phones.

If a filename doesn't match, that listing shows a placeholder instead
of breaking.

### Videos
GitHub Pages isn't built for hosting video files. Upload to YouTube
(mark it **Unlisted** so it isn't publicly searchable, only reachable
by link) and link or embed it. Ask and I can wire an embedded video
into the detail panel.

---

## Step 4 — Put it online with GitHub Pages (free)

1. Create a new **public** repository on GitHub, e.g. `zone-real-estate`.
2. Upload all these files, keeping `images` as a folder.
3. Go to **Settings → Pages**.
4. Set **Source** to `Deploy from a branch`, branch `main`, folder
   `/ (root)`. Save.
5. Live in a minute or two at
   `https://yourusername.github.io/zone-real-estate/`

## Step 5 — Your own domain (optional)

1. Buy a domain (~$10–15/year) from Namecheap, Cloudflare or Porkbun.
2. Add a file named `CNAME` — no extension — containing just your
   domain on one line: `zonerealestate.com`
3. Point the domain at GitHub. Their guide lists the exact records:
   https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site
4. Back in **Settings → Pages**, enter your domain and tick
   **Enforce HTTPS** once it appears (usually within an hour).

## Making updates later

Edit `listings.js`, upload it to your repository, done. You can edit
it directly on GitHub — click the file, click the pencil, edit, commit.
The live site updates within a minute or two.

---

## Security

- GitHub Pages serves over HTTPS automatically. Nothing to configure.
- No database, no login, no server code, so the usual ways sites get
  broken into don't apply.
- Nothing about visitors is collected or stored. They read the page
  and call you.

---

## Tuning the motion

All in `style.css`, at the top in `:root`:

- `--flux-1`, `--flux-2`, `--flux-3`, `--gold` — the liquid colours.
- `--void`, `--void-2`, `--void-3` — the dark ground.
- `--settle` — the overshoot curve. Raise the third number (currently
  `1.28`) for a bouncier, more rubbery settle; lower it toward `1` to
  take the wobble out.

**To calm the whole thing down:** in `style.css` find `.flux__mass`
and lower `opacity` from `0.5`. To slow it, increase the animation
durations on `.flux__mass--a` through `--e`.

**To change how choppy the waves get when scrolling:** in `style.css`,
`.divider__svg` has `scaleY(calc(1 + var(--churn) * 0.5))`. Raise
`0.5` for rougher water, set it to `0` to switch the reaction off.

**To turn off the pointer wake:** delete the `<div class="wake">` line
from `index.html`.
