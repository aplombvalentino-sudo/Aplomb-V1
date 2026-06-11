import { headers } from "next/headers";

/**
 * No-flash theme bootstrap.
 *
 * Inline script rendered as the FIRST child of <body> so it executes before
 * any content paints. Reads the stored preference ("light" | "dark" |
 * "system", default system), resolves "system" against
 * prefers-color-scheme, and stamps the result on <html data-theme="…">.
 *
 * CSP: the middleware runs a strict nonce + strict-dynamic script policy
 * (src/middleware.ts) — inline scripts without the per-request nonce are
 * blocked. We read the nonce the middleware echoes on the `x-nonce` request
 * header and attach it. This is why the component is a Server Component and
 * why root layout awaits it.
 *
 * The matching runtime logic (toggle clicks, system-preference changes)
 * lives in ThemeToggle.tsx — keep STORAGE_KEY in sync between the two.
 */

const STORAGE_KEY = "aplomb-theme";

// Single-line, dependency-free, ES5-safe. Kept tiny: parse → resolve → stamp.
const bootstrap = `(function(){try{var p=localStorage.getItem("${STORAGE_KEY}");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=p==="light"||p==="dark"?p:(d?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export async function ThemeScript() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: bootstrap }}
    />
  );
}
