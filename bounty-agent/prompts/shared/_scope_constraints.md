# Scope Rules (Non-Negotiable)

- ONLY interact with assets listed in `program.scope`
- NEVER touch assets in `program.out_of_scope`
- NEVER target production databases, payment systems, or PII stores beyond proof of access
- If unsure whether an asset is in scope, SKIP it
- Rate-limit all automated tools: max 10 req/sec
