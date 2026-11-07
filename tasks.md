# Project Tasks & Milestone Rules

## Universal Rule: Test-Driven Milestone Completion
**Every milestone must have passing tests (unit + integration) before being marked complete.**

| Milestone | Unit Tests | Integration Tests | Status |
|-----------|------------|-------------------|--------|
| 1. Project Foundation | Required | Required | ✅ **Complete** |
| 2. Scope & Evidence | Required | Required | ✅ **Complete** |
| 3. Feature & Endpoint Mapping | Required | Required | ✅ **Complete** |
| 4. AI Provider & Hypothesis Engine | Required | Required | ✅ **Complete** |
| 5. Research Sessions | Required | Required | ✅ **Complete** |
| 6. Report Builder | Required | Required | ✅ **Complete** |
| 7. Reliability & Security | Required | Required | ⏳ |

### Test Requirements per Milestone
- **Unit Tests**: Pure functions (scoring, validation, redaction, status transitions, utilities)
- **Integration Tests**: API routes with test DB, AI adapter mocks, import/export validation, DB migrations
- **Security Tests**: Scope bypass attempts fail, model cannot escape allowlist, untrusted HTML not rendered

### Commands
```bash
npm run test          # Run all tests (Vitest)
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests only
npm run test:security # Security tests only
```