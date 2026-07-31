# Version 1.1 Technical Debt

The following Schedule work is intentionally deferred until Version 1.1:

- Add database transaction support for multi-record schedule imports and round edits.
- Revisit repository construction and boundaries after other Version 1 modules establish their requirements.
- Add operational observability for schedule imports, edits, and publication changes.
- Add concurrency control for simultaneous commissioner edits.
- Remove or migrate legacy schedule schemas and static data only after all remaining modules stop depending on them.

These items are documented, not implemented, as part of the Version 1.0 stabilization scope.
