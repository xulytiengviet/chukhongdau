# Chữ không dấu Studio — local n-gram

Serve `site/` or repository root over HTTP(S); the model requires fetch and Web Worker, so opening `file://` is unsupported. The root `index.html` references `site/` assets; the Pages workflow serves `site/` directly. Keep both entrypoints synchronized.

## Architecture

- `restorer-core.js`: multi-candidate dictionary from real Underthesea unigram counts, exact bigram Viterbi, lossless spans, numeric context, English trie guard, `RevisionGate` and AI output validator.
- `models/underthesea-bigram-v1.json.gz`: pinned real upstream statistical model, not hand-written sample counts.
- `restorer-worker.js`: one lazy model load, gzip decompression, SHA-256 verification, computation outside the UI thread.
- `restorers.js`: interchangeable `LocalRestorer` / `AIRestorer` protocol: `restore(text, {signal}) -> Promise<{restored, backend, ...}>`.
- `app.js`: immediate raw input state; local debounce 100 ms; optional AI debounce 1,200 ms; manual edits/reset cancel outstanding work. Model or worker errors are shown explicitly without pretending the old dictionary is an n-gram engine.

## Privacy and text contracts

No storage of text, analytics or clipboard injection. English protection is conservative and heuristic. The core preserves already accented syllables; the ASCII-only input intentionally normalizes everything to printable ASCII plus tab/LF. AI requires a compatible nom-vn server and CORS. Local suggestions remain available before AI; AI cannot silently rewrite characters, whitespace, URLs, emails, English-guarded tokens or already accented syllables. Browser model caches may persist model bytes, never entered text.

## Validation

```
node site/test.cjs
node site/test-async.cjs
```

Tests cover contextual ambiguity, mixed accents, NFC/NFD, ASCII invariance, punctuation/paragraph boundaries, numeric context, URLs/emails/identifiers, English phrases, Viterbi future evidence, worker cancellation, stale results and AI output constraints. This is a regression suite, not an independent accuracy benchmark. See `SOURCES.md` for provenance, licenses, reproduction and limitations.
