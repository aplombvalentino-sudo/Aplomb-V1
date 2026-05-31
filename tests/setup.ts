import { vi } from "vitest";

// The `server-only` package throws at import time outside a React Server
// Component context, which would break any vitest import of a module marked
// server-only (lib/stripe, lib/security/turnstile, lib/legal/acceptance, ...).
// Stub it to a no-op module so those files can be unit-tested.
vi.mock("server-only", () => ({}));
