# Embedding the Aplomb widget

Add the AI fitting room to any product page with one script tag.

## Install

Paste this just before `</body>` on your product page:

```html
<script
  src="https://your-aplomb-domain.com/widget.js"
  data-brand="your-brand-slug"
  data-product="{{product.id}}"
  async
></script>
```

- `data-brand` (required) — your brand slug from the Aplomb dashboard.
- `data-product` (optional) — the current product's id, for context.

A floating "Find my size & outfit" button appears bottom-right. Clicking it
opens the fitting room in a modal. The whole flow stays locked to your brand —
shoppers only ever see your catalog.

## Restyling the trigger button

The button is styled via a stylesheet (not inline styles), so your site CSS
can override it. Target `[data-aplomb="trigger"]`.

Quick recolour using the exposed CSS variables:

```css
[data-aplomb="trigger"] {
  --aplomb-bg: #1d4ed8;     /* button background */
  --aplomb-fg: #ffffff;     /* text + focus ring  */
  --aplomb-radius: 999px;   /* corner radius      */
}
```

Full restyle (position, size, font, etc.):

```css
[data-aplomb="trigger"] {
  bottom: 16px;
  left: 16px;          /* move to bottom-left */
  right: auto;
  padding: 14px 24px;
  font-family: "Your Brand Font", sans-serif;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}
```

The button already includes:
- a visible `:focus-visible` ring (keyboard accessibility)
- `:hover` / `:active` feedback
- `prefers-reduced-motion` support (no transform on hover when the OS
  requests reduced motion)

## Browser compatibility note (Safari / ITP)

Safari's Intelligent Tracking Prevention blocks cookies set inside a
third-party iframe. The Aplomb widget handles this automatically: the session
token is also carried in the response body and echoed back via the
`X-Aplomb-Session` request header, so the fitting-room flow works in Safari
without relying on third-party cookies.

No action needed on your side — just be aware that if you proxy or strip
custom request headers at your CDN, you must allow the `X-Aplomb-Session`
header through for embedded usage.

## Accessibility

- The trigger button is a real `<button>` with `aria-haspopup="dialog"`.
- Inside the modal, the fitting-room flow uses semantic headings, labelled
  inputs, honest confidence indicators on size results, and respects
  `prefers-reduced-motion`.
- The decorative marketing visuals on Aplomb's own pages are marked
  `aria-hidden`; the widget itself is functional UI, not decoration.
