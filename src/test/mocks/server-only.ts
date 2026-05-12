// Stub for the `server-only` package so that vitest (which runs under jsdom)
// can import server-only modules without exploding. The real package throws
// at import time inside a client bundle; in tests we never bundle for the
// client, so the stub is a no-op.
export {}
