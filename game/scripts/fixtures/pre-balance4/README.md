# Frozen pre-balance4 engine

These 36 JavaScript files are copied byte for byte from the independently retained batch-A accepted snapshot, `source-after-stepA.tar.gz`. Archive and per-file SHA-256 values are recorded in `manifest.json`; the regression test verifies each file before comparing results.

The original 54-row snapshot hash fixture remains unchanged. On the original macOS/arm64 environment, this engine reproduces every archived row exactly. GitHub Linux/x64 produced a different serialized hash for at least one driven snapshot while all derived numeric checks passed. A cross-runtime JSON hash is therefore not a valid substitute for checking whether current and old engines behave the same on that runtime.

The same parity driver now runs both this frozen engine and the current engine in the same Node process. The comparison still covers each whole row (including exact driven and restored snapshot hashes), with no rounding, tolerances or skipped cases. Derived numeric hashes are also checked against the original fixture.

These files are test fixtures, never imported by the playable game. Their historical version labels and source are intentionally unchanged. Project GPL-3.0-only licensing applies; the original source files are kept intact for provenance.
