# Zone Real Estate

A complete, working real estate website. Plain HTML, CSS and JavaScript —
no build tools, no database, no monthly fees. You own every file.

## Try it right now

Double-click `index.html` to open it in your browser. The whole site
works offline, exactly as it will when it's live.

---

## The files

| File | What it is | Do you edit it? |
|---|---|---|
| `listings.js` | Your phone number and all your properties | **Yes — this is your file** |
| `images/` | Property pictures | **Yes — put photos here** |
| `index.html` | Page structure | No |
| `style.css` | Colours, fonts, layout | Only to change the look |
| `script.js` | Builds the page from your data | No |

---

## Step 1 — Put in your real phone number

Open `listings.js` in any text editor (Notepad on Windows, TextEdit on
Mac, or directly on GitHub). Near the top you'll see:

```js
const DISPLAY_PHONE = "+1 (555) 123-4567";
const CALL_PHONE    = "+15551234567";
```

- **DISPLAY_PHONE** is what visitors see. Format it however you like.
- **CALL_PHONE** is what actually gets dialled when someone taps the
  button. Country code first, then **digits only** — no spaces, no
  dashes, no brackets. If you get this wrong, the call buttons won't work.

Do this before you publish. The number in there now is a placeholder.

## Step 2 — Add your properties

Further down `listings.js` is the list of properties. Each one looks
like this:

```js
{
  title: "24 Maple Street",
  status: "For Sale",
  price: "$245,000",
  beds: 3,
  baths: 2,
  size: "140 m²",
  location: "Maple Heights",
  summary: "Short line shown on the card.",
  details: "The longer description, shown when someone opens it.",
  features: [
    "Renovated kitchen",
    "Two-car garage"
  ],
  image: "images/maple-street.svg"
},
```

- **To add a property:** copy a whole block from `{` to `}` including
  the comma after it, paste it, and change the values.
- **To remove a property:** delete its whole block and its comma.
- **To edit a property:** change the text between the quote marks.

Two things to be careful about:
1. `status` must be exactly `"For Sale"` or `"For Rent"` — the filter
   buttons at the top of the site match on that spelling.
2. Keep the commas and quote marks where they are. If the page goes
   blank after an edit, a comma or quote mark is almost always missing.

## Step 3 — Add your own photos

The site ships with drawn illustrations so it looks complete straight
away. To use real photos:

1. Put your photo files into the `images` folder.
2. Name them simply, with no spaces: `maple-street.jpg`, `unit-12b.jpg`.
3. In `listings.js`, change that property's `image:` line to match
   exactly, e.g. `image: "images/maple-street.jpg"`.

JPG works best for photos. Resize them to around 1200 pixels wide
before uploading — straight-off-the-phone photos are often 5+ MB each
and will make the site slow to load.

If a filename doesn't match, that listing shows a neutral placeholder
instead of breaking. Nothing else on the page is affected.

### About videos
GitHub Pages isn't built for hosting video files — they're large and
load slowly. The normal approach is to upload the video to YouTube
(you can mark it **Unlisted**, so it's not publicly searchable and
only reachable by link) and link or embed it. Ask and I can wire an
embedded video into the property detail panel.

---

## Step 4 — Put it online with GitHub Pages (free)

1. On GitHub, create a new **public** repository, e.g. `zone-real-estate`.
2. Upload all these files, keeping the `images` folder as a folder.
   (Drag-and-drop upload works — same as you've done before.)
3. In the repository go to **Settings → Pages**.
4. Under "Build and deployment" set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`. Save.
5. After a minute or two your site is live at
   `https://yourusername.github.io/zone-real-estate/`

## Step 5 — Use your own domain name (optional)

1. Buy a domain (roughly $10–15/year) from a registrar such as
   Namecheap, Cloudflare or Porkbun.
2. Add a file to your repository named `CNAME` — no file extension —
   containing just your domain on one line:
   ```
   zonerealestate.com
   ```
3. At your registrar, point the domain at GitHub. GitHub's own guide
   lists the exact records to add:
   https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site
4. Back in **Settings → Pages**, enter your domain and tick
   **Enforce HTTPS** once the option becomes available (usually within
   an hour).

---

## Making updates later

1. Edit `listings.js` (and drop any new photos into `images/`).
2. Upload the changed file to your GitHub repository. You can also
   click the file on GitHub, click the pencil icon, edit it right in
   the browser, and hit "Commit changes".
3. The live site updates by itself within a minute or two.

That's the whole workflow. No rebuilding, no redeploying.

---

## About security

- GitHub Pages serves your site over HTTPS automatically — that's the
  padlock in the address bar. You don't configure anything.
- There's no database, no login system and no server-side code, so the
  usual ways websites get broken into simply don't apply here. A static
  site like this is about as low-risk as the web gets.
- Nothing about your visitors is collected or stored. They read the
  page and call you; that's the entire flow.

## Changing the look

Colours and fonts are all defined at the top of `style.css` in the
`:root` block, so you can change the whole palette by editing a few
lines. `--brass` is the gold accent, `--ink` the dark blue background,
`--paper` the cream cards, `--stamp` the red "For Sale" badge.
