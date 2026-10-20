# Afnan Perfumes: Ramadan gifting, free gift and loyalty (Shopify theme)

A Shopify theme built on [Dawn 16](https://github.com/Shopify/dawn) for a perfume store. It adds a merchant-controlled
Ramadan look, a gifting experience (landing page, build-your-own gift box, cart gift options), a free-gift-with-purchase
rule and a loyalty programme front end. Everything user-facing works in English and Arabic (right-to-left).

- Store: `https://afnan-perfumes-fuho9rct.myshopify.com` (storefront password is in the submission message, not in this repo)
- Theme name on the store: `afnan-ramadan`

## Task map

| Brief | Where it lives |
|---|---|
| 1.1 Ramadan on/off (header, announcement bar, colours, banner) | Theme settings > **Ramadan mode**. `snippets/ramadan-styles.liquid`, `assets/ramadan.css`, `sections/ramadan-banner.liquid`, `sections/announcement-bar.liquid` |
| 1.1 Gifting landing page (Eid countdown, budget tabs, grid, FAQ) | `templates/page.gifting.json`, `sections/gifting-hero.liquid`, `gifting-budget-tabs.liquid`, `gifting-faq.liquid`, `assets/gifting-*.js` |
| 1.2 Build-your-own gift box (any 3 perfumes, box price) | `sections/gift-box-builder.liquid`, `assets/gift-box.js` |
| 1.2 Gift options at cart (gift checkbox, 150-char message, wrap +AED 15) | `sections/cart-gift-options.liquid`, `assets/cart-gift-options.js` |
| 1.1 Arabic / RTL | `locales/ar.json`, `assets/rtl.css`, `dir` set in `layout/theme.liquid` |
| 2 Free gift with purchase | Admin automatic discount + `sections/gwp-cart.liquid`, `assets/gwp-cart.js`, `snippets/gwp-product-message.liquid` |
| 3 Loyalty flow, landing page, account widget | `docs/loyalty-flow.pdf`, `templates/page.loyalty.json`, `templates/page.my-loyalty.json`, `sections/loyalty-landing.liquid`, `sections/loyalty-account.liquid` |

## Run and deploy

```bash
shopify theme dev  --store afnan-perfumes-fuho9rct     # live preview
shopify theme push --store afnan-perfumes-fuho9rct --theme <id> --ignore "config/settings_data.json" --ignore "templates/index.json"
```

`config/settings_data.json` and the JSON templates hold what the merchant saved in the theme editor (logo, images,
Ramadan switch). The ignore flags stop a code push from overwriting that content.

## How to use it (merchant guide)

### Switch the Ramadan look on or off
Online Store > Customize > **Theme settings > Ramadan mode** > tick **Enable Ramadan mode** > Save.

- On: dark announcement bar with the Ramadan message, a full-width Ramadan hero replaces the homepage slideshow
  (the header stays a transparent overlay), gold accents on buttons and links.
- Off: the store returns to its normal look; nothing from Ramadan mode is rendered or loaded.
- Texts left blank use built-in English and Arabic copy. Colours, hero image, message and the **Eid date** (used by the
  countdown) are editable in the same group. Arabic overrides go through Translate & Adapt.

### Gifting page
Create a page with the **gifting** template (handle `ramadan-gifting`). The budget tabs read products from the
**Gift Sets** collection (or any product tagged `Gift Set`) and filter them by price in Liquid, so the merchant only
manages one collection. Tab ranges are editable (under AED 200, 200 to 400, 400+).

### Build-your-own gift box
Lists products tagged `Perfume`. The customer picks exactly three; the box is added as one cart line using the
**Build Your Own Gift Box** product (set price AED 399). Savings are shown against the three items' normal prices.

### Free gift with purchase
Theme settings > **Free gift with purchase**: choose the qualifying collection (default `femme-collection`) and the gift
product (default `free-gift-mini-perfume`). The AED 0 price comes from an automatic **Buy X Get Y** discount in admin
(see below); the theme only manages the cart line and the messages.

### Loyalty
Pages with the **loyalty** template (Rewards) and the **my-loyalty** template. Tier thresholds and a demo balance are in
Theme settings > **Loyalty programme**.

## Admin setup required (data, not code)

1. **Products.** Import `sample-data/products_perfumes.csv` and `products_gifting.csv` (perfumes tagged `Perfume`,
   gift sets tagged `Gift Set`, three helper products: gift-box, gift-wrap, free gifts).
2. **Collections.** `femme-collection` automated by tag `Femme`; `gift-sets` automated by tag `Gift Set`.
3. **Automatic discount** (Discounts > Buy X get Y > Automatic): customer buys any item from *Femme Collection*
   (min quantity 1); customer gets quantity 1 of the free gift products at 100% off; **maximum 1 use per order**.
4. **Pages.** `ramadan-gifting` (template gifting), `loyalty` (template loyalty), `my-loyalty` (template my-loyalty).
5. **Cart type: Page** (Theme settings > Cart), so every order passes the gift options before checkout.
6. **Shipping zone** for the UAE with at least one rate, otherwise checkout reports delivery as unavailable.
7. **Metafields (optional).** Product: `custom.scent_family`, `top_notes`, `middle_notes`, `base_notes` (single line
   text, storefront access). Customer: `custom.loyalty_points` (integer).

## Design decisions and trade-offs

### Gift box: one fixed-price product with the picks as line item properties
The three picks are stored on a single cart line as `Perfume 1/2/3` (name, size, SKU). That gives one clear line, one
price, and the warehouse sees the contents on the order and packing slip.
Trade-off: stock of the three perfumes is not reduced, because the line is the box product. In production I would use a
**Cart Transform Function** to expand the box into its component variants (inventory, reporting and per-item discounts
would then be correct). It was left out to keep the solution deployable from the theme without a custom app.

### Gift options are saved as cart attributes plus a real cart line
`Gift`, `Gift message` and `Gift wrap` are cart attributes, which Shopify copies to the order under *Additional details*.
Gift wrap is also an actual Gift Wrap line, so the AED 15 charge and the instruction are both on the order. Saves are
serialised, and the checkout button waits for pending saves, so a message typed right before clicking *Check out* is
never lost. The 150 character limit is enforced in the textarea and again when saving.

### Free gift: discount in admin, behaviour in the theme
Price rules belong in Shopify discounts (they apply at cart and checkout, are auditable and cannot be bypassed by
editing the page). The theme adds the gift when a qualifying product is present, removes it when the last one goes,
caps it at 1, and removes a gift added without a qualifying product (so the gift cannot be bought alone). If the gift
is out of stock a message is shown and the cart is left untouched.
Interpretation: "any second product free" is implemented as one free gift chosen from the free-gift products.
Known limit: the qualifying list is read from `collection.products` (first 50 products); for a large catalogue I would
use a tag or metafield instead.

### Loyalty: what the theme builds and what the app handles

| Theme (storefront) | Loyalty app (Smile.io free plan) |
|---|---|
| Landing page: how it works, tier table, ways to earn, sign-up | Points ledger: earn, spend, expire, with an audit trail |
| My Loyalty page: balance, tier, progress bar to the next tier | Earn rules: purchase, review, birthday, referral, fraud checks |
| Tier thresholds and copy as theme settings and translations | Tier logic and automatic tier changes (VIP tiers may need a paid plan) |
| Presentation only | Redemption: generates the discount code used at checkout, plus emails |

Why: points behave like money. They need one authoritative, tamper-proof ledger tied to orders, refunds and discount
codes. That belongs in an app (or backend) that can listen to order webhooks, not in Liquid, which only displays data.
The theme is the right place for the branded pages and for the explanation of the programme.

Shopify's **new customer accounts** do not render theme account templates, so the account widget is a normal store page
(`my-loyalty`) that reads the logged-in `customer`. The balance comes from the metafield `custom.loyalty_points`, with a
demo value as a fallback so the widget can be shown before the app is connected. In production the app's integration
(or a small sync) would write that metafield, or the widget would read the app's JavaScript SDK.

## Quality notes

- No framework or build step: plain Liquid, CSS and vanilla JS (web components such as `<gift-box-builder>`).
- Accessible by default: real buttons, labels, tab roles with arrow-key support, `aria-live` status messages, `<details>`
  for the FAQ, keyboard-reachable controls.
- RTL by design: logical CSS properties; `dir="rtl"` is set for Arabic, Hebrew, Persian and Urdu.
- All new copy is in `locales/en.default.json` and `locales/ar.json`; section text fields fall back to these keys when left
  blank, so a new language only needs a locale file.
- `shopify theme check` reports no errors (the warnings that remain come from Dawn itself).

## Known limitations

- Stock of perfumes inside a gift box is not decremented (see above).
- Prices in the budget tabs are compared in the visitor's currency, so the ranges are meant for AED.
- The loyalty widget shows a demo balance until the metafield is populated.
- The free gift is re-added automatically if a customer deletes it while a qualifying product is still in the cart
  (this is the intended behaviour of the rule).

## Repository layout

```
assets/      CSS and JS for the new features (ramadan.css, gifting.css, gift-box.js, cart-gift-options.js, gwp-cart.js, ...)
config/      theme settings schema (Ramadan mode, Free gift, Loyalty programme) and saved settings
docs/        loyalty flow diagram (PDF, PNG and HTML source)
layout/      theme.liquid (dir=rtl, Ramadan class, design layers)
locales/     en.default.json, ar.json
sections/    new sections: gifting-*, gift-box-builder, cart-gift-options, gwp-cart, loyalty-*, ramadan-banner, product-notes
snippets/    ramadan-styles, product page and free-gift snippets
templates/   page.gifting, page.loyalty, page.my-loyalty plus edited index, product and cart
sample-data/ CSVs used to create the demo products
```
