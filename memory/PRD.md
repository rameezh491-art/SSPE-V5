# NeuroHistory PK — PRD

## Problem Statement
Build a full-stack web application called NeuroHistory PK — a platform for neurology doctors and consultants across Pakistan to record, share, and research structured patient medical histories (with a dedicated SSPE intake protocol built on Dyken's Criteria).

## Architecture
- **Frontend**: React (CRA + Craco), Tailwind CSS + Shadcn UI, Cabinet Grotesk + Manrope fonts
- **Backend**: FastAPI (Python), JWT auth via httpOnly cookies, RBAC (admin / doctor / patient)
- **Database**: MongoDB (motor async)
- **Files**: Emergent Object Storage for diagnostic reports (PDF/image up to 15 MB)

## User Personas
1. **Admin** — verifies doctors, suspends accounts, overrides record permissions, audits activity
2. **Verified Doctor** — creates & manages own patient records, requests edit access on others, runs research queries
3. **Pending Doctor** — signed up but blocked from clinical workflows until Admin verifies
4. **Patient** — record subject only; no login (per skipped clarification default)

## Implemented (Feb 2026)
- ✅ JWT cookie auth (login/register/logout/me), bcrypt hashing, admin seeding on startup
- ✅ Landing page with hero, public doctor search (verified only), limited public patient search
- ✅ 8-section SSPE intake wizard with sticky Dyken's score badge (auto-computed)
- ✅ Typed enums for province, ethnicity, symptoms (with L/R/Both laterality), etc.
- ✅ Diagnostic file upload via Emergent Object Storage
- ✅ Edit-request workflow (pending/approved/denied), authorized_editors many-to-many
- ✅ Full audit trail (create / update / grant / revoke) — owner + admin visible
- ✅ Research/Filter tool with province, symptoms, dykens_min/max, vaccine status, ethnicity + CSV export
- ✅ Admin panel: doctors verify/reject/suspend/reactivate, patients editors override, stats
- ✅ Seed: 1 admin, 5 demo doctors (4 verified, 1 pending), 3 sample SSPE patient records
- ✅ Testing: 25/25 backend tests PASS, all frontend flows verified

## Prioritized Backlog
### P0 — reliability
- Add explicit CORS origin list (currently regex `.*` — works but harden for prod)

### P1 — feature
- Email/SMS notification to owner on new edit request (Resend / Twilio)
- Patient record versioning (snapshot per edit) & diff viewer
- Additional condition templates (form-builder for admin to add non-SSPE forms)
- Aggregate dashboard: national heat-map by province

### P2 — polish
- Cover art / logo mark for hospitals
- Fine-grained research: aggregate by ethnicity × symptom incidence
- PDF export of full patient record
