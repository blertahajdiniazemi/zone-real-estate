/* =====================================================================
   ZONE REAL ESTATE — EDIT THIS FILE TO MANAGE YOUR SITE
   =====================================================================
   This is the ONLY file you need to touch day to day.
   Change text between the "quote marks", save, upload to GitHub.
   Your live site updates in about a minute.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1) YOUR PHONE NUMBER  --  replace both lines below
   ---------------------------------------------------------------------
   DISPLAY_PHONE = what visitors SEE. Format it however you like.
   CALL_PHONE    = what actually gets DIALED when they tap.
                   Country code first, then digits only.
                   No spaces, no dashes, no brackets.

   Example, for the number +1 (555) 123-4567:
     DISPLAY_PHONE = "+1 (555) 123-4567";
     CALL_PHONE    = "+15551234567";
   --------------------------------------------------------------------- */
const DISPLAY_PHONE = "+1 (555) 123-4567";
const CALL_PHONE    = "+15551234567";

/* The area name shown in the summary box on the homepage. */
const CITY = "Springfield";

/* Shown as "Updated" on the homepage. Change it when you add listings. */
const LAST_UPDATED = "August 2026";


/* ---------------------------------------------------------------------
   2) YOUR LISTINGS
   ---------------------------------------------------------------------
   To ADD a property:    copy one whole block from {  to  },
                         including the comma after the closing brace,
                         paste it, then change the values.
   To REMOVE a property: delete its whole block, including the comma.
   To EDIT a property:   just change the text between the quote marks.

   FIELDS
     title       Property name or street. Shown as the card heading.
     status      Either "For Sale" or "For Rent" (spelling matters —
                 this is what the filter buttons use).
     price       Free text, so write it exactly as you want it to read:
                 "$245,000" or "$1,150/mo" or "Price on request".
     beds        Number of bedrooms.
     baths       Number of bathrooms.
     size        Floor area, free text: "140 m²" or "1,500 sqft".
     location    Neighbourhood / city line under the title.
     summary     One or two sentences, shown on the card.
     details     Longer description, shown when someone opens the
                 property. Can be as long as you like.
     features    Short bullet points. Add or remove as many as you want.
     image       Photo file name inside the "images" folder.
                 See the README for how to add your own photos.
   --------------------------------------------------------------------- */
const listings = [

  {
    title: "24 Maple Street",
    status: "For Sale",
    price: "$245,000",
    beds: 3,
    baths: 2,
    size: "140 m²",
    location: "Maple Heights",
    summary: "Detached family home with a private garden, updated kitchen and a two-car garage on a quiet residential street.",
    details: "A well-kept three-bedroom detached house on one of the quietest streets in Maple Heights. The kitchen and both bathrooms were fully renovated two years ago, and the roof was replaced at the same time. The rear garden is fully enclosed and gets sun through the afternoon. Ten minutes' drive from the town centre, with a primary school and grocery store within walking distance. Available to view any day this month.",
    features: [
      "Renovated kitchen and bathrooms",
      "Enclosed rear garden",
      "Two-car garage",
      "New roof (2024)",
      "Gas central heating"
    ],
    image: "images/maple-street.svg"
  },

  {
    title: "Unit 12B, Riverside Apartments",
    status: "For Rent",
    price: "$1,150/mo",
    beds: 2,
    baths: 1,
    size: "78 m²",
    location: "Riverside District",
    summary: "Top-floor apartment with river views, in-unit laundry and a covered parking space, minutes from the metro.",
    details: "Bright top-floor two-bedroom apartment facing the river, with an open-plan living and dining area and a balcony running the width of the flat. In-unit washer and dryer, plus one covered parking space included in the rent. The building has a lift and secure entry. Two minutes' walk to the metro and a large grocery store. Minimum twelve-month lease, unfurnished, available from the first of next month.",
    features: [
      "Top floor, river-facing balcony",
      "Washer and dryer in the unit",
      "Covered parking included",
      "Lift and secure entry",
      "2 min walk to metro"
    ],
    image: "images/riverside-12b.svg"
  },

  {
    title: "8 Orchard Lane",
    status: "For Sale",
    price: "$389,000",
    beds: 4,
    baths: 3,
    size: "210 m²",
    location: "Orchard Hill",
    summary: "Spacious end-of-row townhouse over two floors, with a finished basement and a large south-facing back garden.",
    details: "An end-of-row townhouse with considerably more space than it looks from the street. Four bedrooms upstairs including a large main bedroom with an ensuite, plus a finished basement currently used as a home office and playroom. The back garden faces south and backs onto green space rather than another property. Driveway parking for two cars. Ideal for a family that needs room to spread out.",
    features: [
      "End-of-row, extra side windows",
      "Finished basement",
      "South-facing garden backing green space",
      "Main bedroom with ensuite",
      "Driveway parking for two"
    ],
    image: "images/orchard-lane.svg"
  },

  {
    title: "5 Cedar Close",
    status: "For Sale",
    price: "$198,000",
    beds: 2,
    baths: 1,
    size: "96 m²",
    location: "Cedar Close",
    summary: "Single-storey bungalow with a covered porch and wide living room windows. No stairs anywhere in the property.",
    details: "A comfortable two-bedroom bungalow on a small, quiet close. Everything is on one level with no steps at the entrance, which makes it a practical option for anyone wanting to avoid stairs. Wide windows make the living room unusually bright for its size, and the covered porch runs the full width of the front. Low-maintenance garden. Would suit a couple, a small family, or someone downsizing.",
    features: [
      "Everything on one level, no steps",
      "Covered full-width porch",
      "Bright living room",
      "Low-maintenance garden",
      "Quiet cul-de-sac"
    ],
    image: "images/cedar-bungalow.svg"
  },

  {
    title: "Mill Loft, Building 3",
    status: "For Rent",
    price: "$1,450/mo",
    beds: 1,
    baths: 1,
    size: "112 m²",
    location: "Old Mill Quarter",
    summary: "Converted warehouse loft with arched windows, exposed brick and a mezzanine sleeping level.",
    details: "A one-bedroom loft in a converted mill building, with the original arched windows and brickwork left exposed. The main space is open plan with a mezzanine sleeping level above the kitchen, and ceilings high enough that it never feels like a one-bedroom. Heating is underfloor. The building has a shared courtyard and a bike store. Suits one person or a couple who want an unusual space rather than a standard flat.",
    features: [
      "Original arched windows and brickwork",
      "Mezzanine sleeping level",
      "Underfloor heating",
      "Shared courtyard and bike store",
      "Pets considered"
    ],
    image: "images/mill-loft.svg"
  },

  {
    title: "Hillside Villa",
    status: "For Sale",
    price: "$720,000",
    beds: 5,
    baths: 4,
    size: "310 m²",
    location: "North Hillside",
    summary: "Modern villa with full-height glazing, a lower wing and a heated outdoor pool on a private plot.",
    details: "A contemporary five-bedroom villa set back on a private plot with views down over the valley. The main block holds the bedrooms and a double-height living area with full-height glazing along the garden side; the lower wing houses a guest suite and a garage. The pool is heated and screened from the road by mature planting. Underfloor heating throughout and solar panels on the wing roof. Viewings by appointment.",
    features: [
      "Heated outdoor pool",
      "Full-height glazing, valley views",
      "Separate guest suite in lower wing",
      "Solar panels and underfloor heating",
      "Private gated plot"
    ],
    image: "images/hillside-villa.svg"
  }

];


/* ---------------------------------------------------------------------
   Don't edit below this line — this passes your details to the page.
   --------------------------------------------------------------------- */
window.ZONE_CONFIG = { DISPLAY_PHONE, CALL_PHONE, CITY, LAST_UPDATED, listings };
