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

## Viết tắt và độ tin cậy

Bật “Mở rộng viết tắt” để chuẩn hóa trước khi thêm dấu. Ô bên trái giữ nguyên đầu vào. Cụm đã mở rộng được hiển thị dưới kết quả. Bảng viết tắt bỏ qua mã viết hoa toàn bộ, địa chỉ web, email, mã có chữ số và các đơn vị dễ nhầm như kg. Chế độ AI kiểm tra đầu ra theo văn bản sau mở rộng.

Với mỗi âm tiết có nhiều cách đặt dấu, bộ giải mã tính điểm đường đi tốt nhất cho từng cách bằng hai lượt Viterbi. Tỉ số giữa hai điểm tốt nhất (trước khi lấy log) dưới 2 là Thấp, từ 2 đến dưới 8 là Trung bình, từ 8 là Cao. Mục chỉ có một ứng viên xếp Cao, mục ngoài từ điển xếp Thấp. Các mức này là quy tắc thực nghiệm, chưa hiệu chuẩn theo xác suất đúng. “Giữ nguyên từ có độ tin cậy thấp” chỉ áp dụng cho kết quả cục bộ.

Chạy `node scripts/benchmark-browser-chat.cjs` từ thư mục gốc để so sánh bật/tắt mở rộng. Có thể truyền đường dẫn đến restorer-core.js của bản trước để so sánh hai phiên bản. Với bản gốc 2e98c44, cả hai đạt 27/55 câu đúng hoàn toàn trên diacritic_eval_v0 (49 lỗi chỉnh sửa trên 777 đơn vị tách bằng khoảng trắng). Trên 15 câu của bộ này có thể thay cụm chuẩn bằng viết tắt tổng hợp, số lỗi giảm từ 36 xuống 17 trên 210 đơn vị, số câu đúng hoàn toàn tăng từ 0 lên 5. Phép đo phân biệt hoa/thường, giữ dấu câu và tắt chế độ giữ nguyên từ mức Thấp. Mẫu viết tắt tổng hợp nhỏ, dùng chính các dạng viết tắt được hỗ trợ.
