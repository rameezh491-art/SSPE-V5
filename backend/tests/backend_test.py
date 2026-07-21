"""NeuroHistory PK backend test suite."""
import os
import io
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://neuro-records-pk.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("admin@neurohistory.pk", "Admin@12345")
AYESHA = ("ayesha@neurohistory.pk", "Doctor@123")
BILAL = ("bilal@neurohistory.pk", "Doctor@123")
KAMRAN = ("kamran@neurohistory.pk", "Doctor@123")


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="session")
def admin_session():
    s, _ = _login(*ADMIN)
    return s


@pytest.fixture(scope="session")
def ayesha_session():
    s, u = _login(*AYESHA)
    return s, u["user"]


@pytest.fixture(scope="session")
def bilal_session():
    s, u = _login(*BILAL)
    return s, u["user"]


# ---------------- AUTH ----------------
class TestAuth:
    def test_admin_login(self):
        s, data = _login(*ADMIN)
        assert data["user"]["role"] == "admin"
        assert "access_token" in data
        # cookie present
        assert s.cookies.get("access_token") is not None

    def test_doctor_login(self):
        _, data = _login(*AYESHA)
        assert data["user"]["role"] == "doctor"
        assert data["user"]["status"] == "verified"

    def test_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN[0], "password": "wrong"})
        assert r.status_code == 401

    def test_me_no_cookie(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_cookie(self, ayesha_session):
        s, _ = ayesha_session
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == AYESHA[0]

    def test_register_pending_and_forbidden(self):
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@neurohistory.pk"
        s = requests.Session()
        r = s.post(f"{API}/auth/register", json={
            "name": "TEST Doctor",
            "email": email,
            "password": "Testpass@123",
            "cnic_or_pmdc": "PMDC-TEST",
            "specialty": "Neurology",
            "hospital": "Test Hosp",
            "city": "Karachi",
        })
        assert r.status_code == 200
        assert r.json()["user"]["status"] == "pending"
        # pending doctor cannot access /api/patients
        r2 = s.get(f"{API}/patients")
        assert r2.status_code == 403
        assert "pending" in r2.text.lower()


# ---------------- META/PUBLIC ----------------
class TestMetaPublic:
    def test_enums(self):
        r = requests.get(f"{API}/meta/enums")
        assert r.status_code == 200
        d = r.json()
        for k in ["provinces", "ethnicities", "symptoms", "laterality_symptoms", "specialties"]:
            assert k in d and isinstance(d[k], list) and len(d[k]) > 0

    def test_public_doctors_verified_only(self):
        r = requests.get(f"{API}/public/doctors")
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) > 0
        for d in docs:
            assert d["status"] == "verified"
            assert d["verified"] is True

    def test_public_doctors_filter_city(self):
        r = requests.get(f"{API}/public/doctors", params={"city": "Karachi"})
        assert r.status_code == 200
        docs = r.json()
        assert all("karachi" in (d.get("city") or "").lower() for d in docs)
        assert len(docs) >= 1

    def test_public_doctors_specialty(self):
        r = requests.get(f"{API}/public/doctors", params={"specialty": "Neurology"})
        assert r.status_code == 200
        assert all(d["specialty"] == "Neurology" for d in r.json())

    def test_public_patients_limited_fields(self):
        r = requests.get(f"{API}/public/patients")
        assert r.status_code == 200
        pts = r.json()
        if pts:
            allowed = {"id", "name", "city", "age", "gender"}
            for p in pts:
                assert set(p.keys()) <= allowed
                # ensure no clinical fields leak
                assert "section5" not in p
                assert "dykens_score" not in p


# ---------------- PATIENTS ----------------
def _sample_patient_payload(name="TEST Patient", province="Punjab", city="Lahore",
                            symptoms=None, section7=None):
    return {
        "section1": {"doctor_name": "Dr X", "hospital": "H"},
        "section2": {
            "full_name": name, "age": 12, "gender": "Male",
            "city": city, "province": province, "ethnicity": "Punjabi",
        },
        "section3": {},
        "section4": {"measles_vaccine_received": "Yes", "doses": 1},
        "section5": {"symptoms": symptoms or ["Seizures", "Cognitive decline"], "laterality": [], "previous_consultation": "No"},
        "section6": {},
        "section7": section7 or {
            "clinical_presentation": True, "eeg_findings": True,
            "elevated_measles_antibody": True, "histopathology": False, "mri_findings": True,
        },
        "section8": {},
    }


class TestPatients:
    def test_list_all_and_mine(self, ayesha_session):
        s, _ = ayesha_session
        r = s.get(f"{API}/patients", params={"scope": "all"})
        assert r.status_code == 200
        all_p = r.json()
        assert isinstance(all_p, list)
        r2 = s.get(f"{API}/patients", params={"scope": "mine"})
        assert r2.status_code == 200
        mine = r2.json()
        for p in mine:
            assert p["is_owner"] is True

    def test_search_q(self, ayesha_session):
        s, _ = ayesha_session
        r = s.get(f"{API}/patients", params={"q": "a"})
        assert r.status_code == 200

    def test_create_dykens_computed_and_get(self, ayesha_session):
        s, user = ayesha_session
        payload = _sample_patient_payload(name=f"TEST_{uuid.uuid4().hex[:6]}")
        r = s.post(f"{API}/patients", json=payload)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["dykens_score"] == 4  # 4 trues
        assert p["is_owner"] is True
        assert p["can_edit"] is True
        pid = p["id"]

        # GET
        r2 = s.get(f"{API}/patients/{pid}")
        assert r2.status_code == 200
        assert r2.json()["dykens_score"] == 4
        pytest.pid_ayesha = pid

    def test_update_owner_recomputes(self, ayesha_session):
        s, _ = ayesha_session
        pid = getattr(pytest, "pid_ayesha", None)
        if not pid:
            pytest.skip("no pid")
        payload = _sample_patient_payload(name=f"TEST_upd_{uuid.uuid4().hex[:6]}",
                                          section7={"clinical_presentation": True, "eeg_findings": False,
                                                    "elevated_measles_antibody": False,
                                                    "histopathology": False, "mri_findings": False})
        r = s.put(f"{API}/patients/{pid}", json=payload)
        assert r.status_code == 200
        assert r.json()["dykens_score"] == 1

    def test_non_owner_cannot_edit(self, bilal_session):
        s, _ = bilal_session
        pid = getattr(pytest, "pid_ayesha", None)
        if not pid:
            pytest.skip("no pid")
        r = s.put(f"{API}/patients/{pid}", json=_sample_patient_payload())
        assert r.status_code == 403


# ---------------- EDIT REQUEST WORKFLOW ----------------
class TestEditRequests:
    def test_full_edit_request_flow(self, ayesha_session, bilal_session):
        s_a, user_a = ayesha_session
        s_b, user_b = bilal_session
        pid = getattr(pytest, "pid_ayesha", None)
        if not pid:
            pytest.skip("no pid")

        # Bilal requests
        r = s_b.post(f"{API}/edit-requests", json={"patient_id": pid, "message": "please"})
        assert r.status_code == 200, r.text
        rid = r.json()["id"]

        # Ayesha sees it incoming
        r = s_a.get(f"{API}/edit-requests", params={"direction": "incoming"})
        assert r.status_code == 200
        assert any(x["id"] == rid for x in r.json())

        # Ayesha approves
        r = s_a.post(f"{API}/edit-requests/{rid}/approve")
        assert r.status_code == 200

        # Bilal can now edit
        r = s_b.put(f"{API}/patients/{pid}", json=_sample_patient_payload(name="TEST_bilal_edit"))
        assert r.status_code == 200

        # Revoke
        r = s_a.post(f"{API}/patients/{pid}/revoke-editor/{user_b['id']}")
        assert r.status_code == 200

        # Bilal blocked again
        r = s_b.put(f"{API}/patients/{pid}", json=_sample_patient_payload())
        assert r.status_code == 403


# ---------------- AUDIT ----------------
class TestAudit:
    def test_audit_owner_only(self, ayesha_session, bilal_session):
        s_a, _ = ayesha_session
        s_b, _ = bilal_session
        pid = getattr(pytest, "pid_ayesha", None)
        if not pid:
            pytest.skip("no pid")
        r = s_a.get(f"{API}/patients/{pid}/audit")
        assert r.status_code == 200
        logs = r.json()
        actions = {l["action"] for l in logs}
        assert "created" in actions
        assert "updated" in actions
        assert "grant_edit" in actions

        r2 = s_b.get(f"{API}/patients/{pid}/audit")
        assert r2.status_code == 403


# ---------------- RESEARCH ----------------
class TestResearch:
    def test_query_and_export(self, ayesha_session):
        s, _ = ayesha_session
        r = s.post(f"{API}/research/query", json={"province": "Punjab", "symptoms_any": ["Seizures"], "dykens_min": 0})
        assert r.status_code == 200
        data = r.json()
        assert "total" in data and "results" in data and "by_province" in data
        for row in data["results"]:
            # de-identified: no full_name
            assert "full_name" not in row
            assert "name" not in row

        r2 = s.post(f"{API}/research/export", json={"province": "Punjab"})
        assert r2.status_code == 200
        assert "text/csv" in r2.headers.get("content-type", "")
        assert "id,age,gender" in r2.text


# ---------------- FILES ----------------
class TestFiles:
    def test_upload_download(self, ayesha_session):
        s, _ = ayesha_session
        content = b"hello test file content"
        files = {"file": ("test.txt", io.BytesIO(content), "text/plain")}
        r = s.post(f"{API}/files/upload", files=files)
        assert r.status_code == 200, r.text
        fid = r.json()["id"]

        # Download unauthenticated
        r_un = requests.get(f"{API}/files/{fid}/download")
        assert r_un.status_code == 401

        # Download authenticated
        r_dl = s.get(f"{API}/files/{fid}/download")
        assert r_dl.status_code == 200
        assert r_dl.content == content
        assert "text/plain" in r_dl.headers.get("content-type", "")


# ---------------- ADMIN ----------------
class TestAdmin:
    def test_admin_list_doctors(self, admin_session):
        r = admin_session.get(f"{API}/admin/doctors")
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 4
        assert all("records_created" in d for d in docs)

    def test_admin_stats(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats")
        assert r.status_code == 200
        s = r.json()
        for k in ["doctors_pending", "doctors_verified", "doctors_suspended", "total_patients", "pending_edit_requests"]:
            assert k in s

    def test_admin_patients_with_editors_detail(self, admin_session):
        r = admin_session.get(f"{API}/admin/patients")
        assert r.status_code == 200
        for p in r.json():
            assert "editors_detail" in p

    def test_admin_reject_non_admin(self, ayesha_session):
        s, _ = ayesha_session
        r = s.get(f"{API}/admin/doctors")
        assert r.status_code == 403
        r2 = s.get(f"{API}/admin/stats")
        assert r2.status_code == 403

    def test_verify_suspend_reactivate_kamran(self, admin_session):
        # find kamran
        r = admin_session.get(f"{API}/admin/doctors")
        kamran = next((d for d in r.json() if d["email"] == KAMRAN[0]), None)
        assert kamran, "Kamran not found"
        kid = kamran["id"]

        # verify
        r = admin_session.post(f"{API}/admin/doctors/{kid}/verify")
        assert r.status_code == 200
        # now login should work & be verified
        _, data = _login(*KAMRAN)
        assert data["user"]["status"] == "verified"

        # suspend
        r = admin_session.post(f"{API}/admin/doctors/{kid}/suspend")
        assert r.status_code == 200
        r2 = requests.post(f"{API}/auth/login", json={"email": KAMRAN[0], "password": KAMRAN[1]})
        assert r2.status_code == 403

        # reactivate
        r = admin_session.post(f"{API}/admin/doctors/{kid}/reactivate")
        assert r.status_code == 200
        _, data = _login(*KAMRAN)
        assert data["user"]["status"] == "verified"
