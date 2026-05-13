# Deferred Work

## Deferred from: code review of 1-5-suppression-de-compte-rgpd (2026-05-13)

- Concurrent deletion race condition — two rapid DELETE requests could both pass auth and start the transaction. Rate limiting (Story 1.6) mitigates this. Not a data integrity risk since double-anonymization is idempotent.