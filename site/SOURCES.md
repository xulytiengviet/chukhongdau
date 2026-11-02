# Sources and modifications

## Runtime model and algorithm: Underthesea

- Upstream: https://github.com/undertheseanlp/underthesea
- Pinned commit: `0d3cf4dfd6f8ac6df3fda74332187d7c49d8bdde`
- Algorithm: `underthesea/pipeline/restore_diacritics/restorer.py`
- Model: `underthesea/pipeline/restore_diacritics/rd_model_2026_08_19.bin`
- Upstream model SHA-256: `2ca76de256c0efbbd460dfb0e541acb7a95feecb0342f75392620d6931b0579d`
- Copyright 2017 UndertheseaNLP. Apache-2.0; full license in `vendor/UNDERTHESEA-LICENSE.txt`.
- Upstream describes VNTC training text and Underthesea dictionary headwords, definitions and examples as model sources. This distribution converts the upstream packaged counts; it does not redistribute the training corpus.
- `scripts/convert-underthesea-model.py` checks the exact binary SHA, rejects pickle globals and produces deterministic indexed JSON/gzip. Converted SHA-256: `c00688e86f93c9db54db55e209c51f5318543f0692d4e46b73ec9a0e5898eecc`.
- 13,563 unigrams; 224,993 bigrams. Original gzip/pickle: 1,474,292 bytes. Browser gzip/JSON: 956,688 bytes; expanded JSON: 3,600,197 bytes. Runtime memory is larger.
- Scoring retains 0.8 interpolated bigram / 0.2 smoothed unigram and exact Viterbi decoding. JS modifications: indexed counts, spans that preserve raw text, English guards, line boundaries, unknown-token boundaries, deterministic ties, worker initialization and integrity checking.
- Already accented syllables remain byte-for-byte unchanged in the core. The explicitly ASCII input box intentionally strips pasted accents before calling the core. These are different contracts.
- The separate `undertheseanlp/restore_diacritics` repository contained only a short README when inspected; the packaged Underthesea implementation above is the actual source used.

## Architectural references (no source/model copied)

- https://github.com/VNOpenAI/vn-accent — n-gram + beam and neural alternatives. No root license was found in the inspected tree, so its code, weights and data are not bundled.
- https://github.com/vndangkhoa/vietc — English auto-restore. The inspected `engine/src/english.rs` uses HashSet, not a trie. Our small English trie and word list are independently implemented; they are heuristics, not a general language detector.
- https://github.com/tuyenvm/OpenKey — raw typing state and restore-if-wrong-spelling. GPL code is not copied; browser revision/snapshot handling is independently implemented.
- https://github.com/nrl-ai/nom-vn — existing optional HF API contract. Requires a separately configured server; no public AI server is bundled.

## Limits and validation

Upstream Python benchmarks are not browser guarantees. Local Node measurements and regression tests do not establish general Vietnamese accuracy. Proper nouns, semantic ambiguity and Vietnamese/English homographs can still fail. No claimed confidence percentages. No clipboard injection, keyboard hooks or IME integration is used in this webpage.

The model is loaded once per Web Worker from the same origin. No typed text leaves the browser in local mode. AI runs only on button click in AI mode, or after 1.2 seconds of inactivity if the user explicitly enables auto-AI. External server storage policies apply to AI. Requests carry cancellation plus revision/raw snapshot checks. Clearing or manual Unicode editing invalidates pending results.
