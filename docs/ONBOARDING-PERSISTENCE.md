# Onboarding persistence — staging audit (2026-11-04)

Scope: authentication, `/auth/me`, onboarding persistence, logout/login. Evidence: staging OpenAPI (122 operations),
read-only live calls with the supplied test account, the frontend source, and the Speed-Gym repo copy.
Credentials were passed through the environment only; no secrets, tokens or authorization headers are recorded here.

## 1. Verdict

**The save/restore path exists on staging but the frontend never uses it.** The backend can persist and return the onboarding
fields; the frontend neither sends them nor reads them. A second, backend-side set of risks (validation, merge semantics, storage in
`behavioral_profile`) should be fixed before the frontend relies on it.

## 2. What staging actually exposes

| Operation | Status | Contract |
|---|---|---|
| `POST /api/v1/auth/login` | live, 200 | returns `{ user, token, refreshToken }` |
| `GET /api/v1/auth/me` | live, 200 | returns `{ user }`, the **same** user shape as login (verified: no field differs) |
| `PATCH /api/v1/auth/me` | **new** (not in the earlier snapshot, absent from the local repo copy) | bearer auth; body `UpdateProfileRequest`; 200 returns `{ user }`; 422 on bad JSON types |

**Read shape (camelCase)**, both login and `/auth/me`:
`id, name, email, role, tier, isOnboarded, persona, goal, targetExam, firstName, triggers, sex, dob, temporalWindow, activePreps, behavioral_profile`.

**Write shape (snake_case)**, `UpdateProfileRequest`, every field optional and nullable:
`display_name, name, first_name, persona, goal, target_exam, triggers[], sex, dob{}, temporal_window, active_preps[], is_onboarded, behavioral_profile{}`.

Observed state of the test account before any probe: `name null, firstName "", targetExam "", persona null, goal null, isOnboarded false,
triggers [], activePreps [], behavioral_profile {}`. That is exactly the user's report: the account has never had onboarding data written.

## 3. Root cause (frontend)

1. **No write call.** `grep` finds no `PATCH`, `is_onboarded`, `first_name`, `temporal_window` or `active_preps` anywhere in `src/`.
   Submitting the onboarding modal only updates the local Zustand store. Nothing reaches the server.
2. **No read.** The auth store's `User` type is `{id, name, email, role, phone?, tier?}`; `isOnboarded`, `persona`, `goal`, `targetExam`,
   `firstName`, `triggers`, `sex`, `dob`, `temporalWindow`, `activePreps` returned by login and `/auth/me` are discarded.
3. **Local gate.** Modal visibility uses the local `isOnboarded` flag; logout wipes every store (`resetAppState`, intentionally, so one user's
   data cannot leak to the next), so after login the flag is false and the form is empty. Only the name is re-seeded, and for this account
   `name` is `null`, so the email prefix is used.

## 4. Backend findings (what the backend team should fix or confirm)

**B1. Storage is a merge into `behavioral_profile` (observed, not from source).** After probes that sent only `is_onboarded` and `triggers`,
`GET /auth/me` returned `behavioral_profile = {"triggers": [], "is_onboarded": false}`. So onboarding answers are stored inside the JSONB
column that the schema documents as "computed from first 20 attempts". Risks: the behavioral-profile computation (telemetry event
`behavioral_profile_computed`) or a client sending `behavioral_profile` can overwrite or pollute onboarding data, and vice-versa.
Recommend a dedicated column/JSONB (e.g. `users.onboarding`) and keeping `behavioral_profile` for computed output.

**B2. Loose validation.** `PATCH {"is_onboarded": "yes"}` returned **200 and set `isOnboarded` to `true`** (lax string-to-bool coercion).
Unknown fields (`definitely_not_a_field`) are silently ignored with 200. Recommend strict models (`extra="forbid"`, strict bool) so client
bugs surface as 422.

**B3. No enum validation.** `persona`, `goal`, `target_exam` accept any string up to 50-100 characters. The database has
CHECK constraints (`users.persona` in `SchoolSupport|BrainTrainer|SpeedDemon`, `users.primary_goal` in `speed|accuracy|exam_prep|basics`,
`users.target_exam` in `CAT|GMAT|GRE|School`) and the UI uses different vocabularies (persona: Student / Working Professional / Job Seeker /
Parent / Educator; goal: "Prepare for CAT", "Master speed math", ...). It is **not verified** where these values are stored (column vs JSONB);
sending a value that violates a CHECK could 500 or silently land elsewhere. Needs a documented mapping and enum validation.

**B4. Null / empty semantics undocumented and untested.** Not verified: whether `null`, `""` or `[]` in a PATCH overwrite a stored value,
whether `behavioral_profile` in the body replaces or merges, and the `dob` object shape. The frontend must not guess; document it.

**B5. Response is untyped.** All three operations return `additionalProperties: true` objects in OpenAPI. Add a typed `UserOut` model shared by
login, `/auth/me` and PATCH. Also resolve the camelCase-read / snake_case-write asymmetry (`targetExam` vs `target_exam`, `isOnboarded` vs
`is_onboarded`, `firstName` vs `first_name`, `name` vs `display_name`), or document the mapping.

**B6. `name` is null** for an account registered without `display_name`; `display_name` and `name` both exist in the PATCH body, with no stated
precedence.

**B7. Not tested (non-destructive constraint).** A real write-then-read round trip, cross-user isolation, concurrent PATCH merging, refresh-token
rotation after PATCH. Recommended as backend integration tests.

## 5. Residue left on the test account by this audit

- A probe with an intentionally invalid type (`is_onboarded: "yes"`) was **accepted** and briefly set `isOnboarded = true`; a later same-value
  probe set it back to `false`. Verified afterwards: every identity and onboarding field matches the original state.
- The only remaining difference: `behavioral_profile` is now `{"triggers":[],"is_onboarded":false}` instead of `{}`. To restore it exactly, the
  backend team can reset that column for this user (a PATCH cannot be assumed to clear keys, see B4).

## 6. Frontend work once B1-B4 are confirmed

1. Extend the stored user type and the login/`/auth/me` mapping to keep the onboarding fields.
2. After login, await `/auth/me`; hydrate the onboarding store from it; show the modal only when the server says `isOnboarded === false`.
3. Submit the modal with `PATCH /auth/me` (snake_case body); set the local flag only after a 2xx; show the server error otherwise; send only changed
   fields so empty defaults never overwrite stored data.
4. Keep logout clearing local stores so the next login always rehydrates from the server.
5. Tests: save, refresh, logout/login, other device; partial edit; save failure leaves onboarding incomplete; completed users never see the modal.
