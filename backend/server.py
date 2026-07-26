"""NeuroHistory PK — FastAPI backend."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import csv
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, UploadFile, File, Query, Header
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from models import (
    DoctorRegister, LoginRequest, PatientCreate, EditRequestCreate, ResearchQuery,
    PROVINCES, ETHNICITIES, GENDERS, PARENTAL_STATUS, LIVES_WITH, EDUCATION_LEVELS,
    EMPLOYMENT_STATUS, HEALTHCARE_ACCESS, YES_NO_UNK, SYMPTOMS, LATERALITY_SYMPTOMS, SPECIALTIES,
)
from auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    set_auth_cookies, clear_auth_cookies, get_current_user, require_admin,
    require_verified_doctor, require_doctor_any, _serialize_user, get_jwt_secret,
)
import storage as objstore
from seed import seed_admin, seed_doctors, seed_patients, write_test_credentials

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("neurohistory")

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="National SSPE Registry Pakistan")
api = APIRouter(prefix="/api")


# ---------- Helpers ----------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_doctor_public(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "name": u.get("name"),
        "specialty": u.get("specialty"),
        "hospital": u.get("hospital"),
        "city": u.get("city"),
        "status": u.get("status"),
        "verified": u.get("status") == "verified",
    }


def _compute_dykens(section7: dict) -> int:
    fields = ["clinical_presentation", "eeg_findings", "elevated_measles_antibody", "histopathology", "mri_findings"]
    return sum(1 for f in fields if section7.get(f))


async def _audit(patient_id: str, actor: dict, action: str, changes: Optional[dict] = None):
    await db.audit_logs.insert_one({
        "patient_id": patient_id,
        "actor_id": actor.get("id"),
        "actor_name": actor.get("name"),
        "actor_role": actor.get("role"),
        "action": action,
        "changes": changes or {},
        "at": _now_iso(),
    })


def _can_edit(patient: dict, user: dict) -> bool:
    if user.get("role") == "admin":
        return True
    uid = user.get("id")
    if patient.get("owner_id") == uid:
        return True
    if uid in (patient.get("authorized_editors") or []):
        return True
    return False


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.patients.create_index("owner_id")
    await db.patients.create_index("id", unique=True)
    await db.edit_requests.create_index([("patient_id", 1), ("requester_id", 1)])
    await db.audit_logs.create_index("patient_id")
    await seed_admin(db)
    await seed_doctors(db)
    await seed_patients(db)
    await write_test_credentials()
    objstore.init_storage()
    logger.info("Startup complete")


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ---------- Meta / Enums ----------
@api.get("/meta/enums")
async def get_enums():
    return {
        "provinces": PROVINCES,
        "ethnicities": ETHNICITIES,
        "genders": GENDERS,
        "parental_status": PARENTAL_STATUS,
        "lives_with": LIVES_WITH,
        "education_levels": EDUCATION_LEVELS,
        "employment_status": EMPLOYMENT_STATUS,
        "healthcare_access": HEALTHCARE_ACCESS,
        "yes_no_unk": YES_NO_UNK,
        "symptoms": SYMPTOMS,
        "laterality_symptoms": LATERALITY_SYMPTOMS,
        "specialties": SPECIALTIES,
    }


@api.get("/")
async def root():
    return {"service": "National SSPE Registry Pakistan", "status": "ok"}


# ---------- Site Settings ----------
DEFAULT_SETTINGS = {
    "site_name": "National SSPE Registry",
    "site_name_accent": "SSPE",
    "tagline": "Pakistan · SSPE Surveillance Network",
    "hero_eyebrow": "A national SSPE surveillance registry · Pakistan",
    "hero_headline_1": "Structured SSPE",
    "hero_headline_2": "histories, unified for",
    "hero_headline_3": "Pakistan's consultants.",
    "hero_headline_accent": "unified",
    "hero_description": "The National SSPE Registry Pakistan is a secure platform for verified SSPE clinicians to record, share, and research patient histories — with typed clinical fields, an SSPE intake protocol built on Dyken's Criteria, and cross-hospital edit governance.",
    "footer_text": "A national registry for SSPE surveillance & research",
    "logo_data_url": "",  # base64 data URL
    "favicon_data_url": "",  # base64 data URL for browser tab icon
    "accent_color": "#C48F38",  # brand accent (hex)
    # Announcement banner
    "announcement_enabled": False,
    "announcement_text": "",
    "announcement_variant": "info",  # info | warning | critical
    # Urdu translations (optional; fall back to English if empty)
    "site_name_ur": "",
    "tagline_ur": "",
    "hero_eyebrow_ur": "",
    "hero_headline_1_ur": "",
    "hero_headline_2_ur": "",
    "hero_headline_3_ur": "",
    "hero_description_ur": "",
    "footer_text_ur": "",
    "announcement_text_ur": "",
}


async def _get_settings_doc() -> dict:
    doc = await db.settings.find_one({"_id": "site"})
    if not doc:
        return dict(DEFAULT_SETTINGS)
    out = dict(DEFAULT_SETTINGS)
    for k, v in doc.items():
        if k == "_id":
            continue
        if v is not None:
            out[k] = v
    return out


@api.get("/settings/site")
async def get_site_settings():
    return await _get_settings_doc()


@api.put("/settings/site")
async def update_site_settings(body: dict, admin: dict = Depends(require_admin)):
    allowed = set(DEFAULT_SETTINGS.keys())
    update = {k: v for k, v in body.items() if k in allowed}
    # Image size guard (base64 up to ~600KB ≈ 450KB raw)
    for key in ("logo_data_url", "favicon_data_url"):
        val = update.get(key)
        if isinstance(val, str) and len(val) > 600_000:
            raise HTTPException(status_code=413, detail=f"{key.replace('_', ' ').title()} too large — please upload under 400 KB")
    # Validate variant
    if "announcement_variant" in update and update["announcement_variant"] not in ("info", "warning", "critical"):
        update["announcement_variant"] = "info"
    await db.settings.update_one({"_id": "site"}, {"$set": update}, upsert=True)
    return await _get_settings_doc()


@api.post("/settings/site/reset")
async def reset_site_settings(admin: dict = Depends(require_admin)):
    await db.settings.delete_one({"_id": "site"})
    return await _get_settings_doc()


# ---------- Auth ----------
@api.post("/auth/register")
async def register(body: DoctorRegister, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": "doctor",
        "status": "pending",
        "cnic_or_pmdc": body.cnic_or_pmdc,
        "specialty": body.specialty,
        "hospital": body.hospital,
        "city": body.city,
        "phone": body.phone or "",
        "created_at": _now_iso(),
    }
    result = await db.users.insert_one(doc)
    user = await db.users.find_one({"_id": result.inserted_id})
    user_s = _serialize_user(user)
    at = create_access_token(user_s["id"], user_s["email"], user_s["role"])
    rt = create_refresh_token(user_s["id"])
    set_auth_cookies(response, at, rt)
    return {"user": user_s, "access_token": at}


@api.post("/auth/login")
async def login(body: LoginRequest, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("role") == "doctor" and user.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended. Contact admin.")
    user_s = _serialize_user(user)
    at = create_access_token(user_s["id"], user_s["email"], user_s["role"])
    rt = create_refresh_token(user_s["id"])
    set_auth_cookies(response, at, rt)
    return {"user": user_s, "access_token": at}


@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- Public search (no login) ----------
@api.get("/public/doctors")
async def public_doctors(q: Optional[str] = None, specialty: Optional[str] = None, city: Optional[str] = None):
    filt: dict = {"role": "doctor", "status": "verified"}
    if q:
        filt["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"hospital": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
        ]
    if specialty:
        filt["specialty"] = specialty
    if city:
        filt["city"] = {"$regex": city, "$options": "i"}
    docs = await db.users.find(filt).limit(50).to_list(50)
    return [_clean_doctor_public(d) for d in docs]


@api.get("/public/patients")
async def public_patients(q: Optional[str] = None):
    """Public patient search — limited non-sensitive info only."""
    filt: dict = {}
    if q:
        filt["$or"] = [
            {"section2.full_name": {"$regex": q, "$options": "i"}},
            {"id": q},
        ]
    docs = await db.patients.find(filt).limit(30).to_list(30)
    return [
        {
            "id": d["id"],
            "name": d["section2"]["full_name"],
            "city": d["section2"].get("city"),
            "age": d["section2"].get("age"),
            "gender": d["section2"].get("gender"),
        }
        for d in docs
    ]


# ---------- Patients (doctor) ----------
def _patient_out(p: dict, user: dict) -> dict:
    p = dict(p)
    p.pop("_id", None)
    p["can_edit"] = _can_edit(p, user)
    p["is_owner"] = p.get("owner_id") == user.get("id")
    return p


@api.get("/patients")
async def list_patients(
    scope: str = "all",  # 'mine' | 'all'
    q: Optional[str] = None,
    user: dict = Depends(require_verified_doctor),
):
    filt: dict = {}
    if scope == "mine":
        filt["owner_id"] = user["id"]
    if q:
        filt["$or"] = [
            {"section2.full_name": {"$regex": q, "$options": "i"}},
            {"section2.city": {"$regex": q, "$options": "i"}},
            {"id": q},
        ]
    docs = await db.patients.find(filt).sort("created_at", -1).limit(200).to_list(200)
    return [_patient_out(d, user) for d in docs]


@api.post("/patients")
async def create_patient(body: PatientCreate, user: dict = Depends(require_verified_doctor)):
    data = body.model_dump()
    pid = str(uuid.uuid4())
    now = _now_iso()
    doc = {
        "id": pid,
        "owner_id": user["id"],
        "owner_name": user["name"],
        "authorized_editors": [],
        "section1": data["section1"],
        "section2": data["section2"],
        "section3": data["section3"],
        "section4": data["section4"],
        "section5": data["section5"],
        "section6": data["section6"],
        "section7": data["section7"],
        "dykens_score": _compute_dykens(data["section7"]),
        "section8": data["section8"],
        "created_at": now,
        "updated_at": now,
    }
    await db.patients.insert_one(doc)
    await _audit(pid, user, "created", {})
    return _patient_out(doc, user)


@api.get("/patients/{pid}")
async def get_patient(pid: str, user: dict = Depends(require_verified_doctor)):
    p = await db.patients.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    return _patient_out(p, user)


@api.put("/patients/{pid}")
async def update_patient(pid: str, body: PatientCreate, user: dict = Depends(require_verified_doctor)):
    p = await db.patients.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    if not _can_edit(p, user):
        raise HTTPException(status_code=403, detail="Not authorized to edit this record")
    data = body.model_dump()
    updates = {
        "section1": data["section1"],
        "section2": data["section2"],
        "section3": data["section3"],
        "section4": data["section4"],
        "section5": data["section5"],
        "section6": data["section6"],
        "section7": data["section7"],
        "dykens_score": _compute_dykens(data["section7"]),
        "section8": data["section8"],
        "updated_at": _now_iso(),
    }
    await db.patients.update_one({"id": pid}, {"$set": updates})
    await _audit(pid, user, "updated", {"sections": list(updates.keys())})
    p = await db.patients.find_one({"id": pid})
    return _patient_out(p, user)


@api.get("/patients/{pid}/audit")
async def patient_audit(pid: str, user: dict = Depends(require_verified_doctor)):
    p = await db.patients.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    # Only owner or admin can see audit
    if user.get("role") != "admin" and p.get("owner_id") != user.get("id"):
        raise HTTPException(status_code=403, detail="Only the owning doctor or admin can view audit trail")
    logs = await db.audit_logs.find({"patient_id": pid}, {"_id": 0}).sort("at", -1).to_list(500)
    return logs


# ---------- Edit Requests ----------
@api.post("/edit-requests")
async def create_edit_request(body: EditRequestCreate, user: dict = Depends(require_verified_doctor)):
    p = await db.patients.find_one({"id": body.patient_id})
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    if p["owner_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="You already own this record")
    if user["id"] in (p.get("authorized_editors") or []):
        raise HTTPException(status_code=400, detail="You already have edit access")
    existing = await db.edit_requests.find_one({"patient_id": body.patient_id, "requester_id": user["id"], "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="A pending request already exists")
    req = {
        "id": str(uuid.uuid4()),
        "patient_id": body.patient_id,
        "patient_name": p["section2"]["full_name"],
        "requester_id": user["id"],
        "requester_name": user["name"],
        "requester_specialty": user.get("specialty", ""),
        "requester_hospital": user.get("hospital", ""),
        "owner_id": p["owner_id"],
        "owner_name": p["owner_name"],
        "message": body.message or "",
        "status": "pending",
        "created_at": _now_iso(),
    }
    await db.edit_requests.insert_one(req)
    req.pop("_id", None)
    return req


@api.get("/edit-requests")
async def list_edit_requests(direction: str = "incoming", user: dict = Depends(require_verified_doctor)):
    if direction == "incoming":
        filt = {"owner_id": user["id"]}
    else:
        filt = {"requester_id": user["id"]}
    reqs = await db.edit_requests.find(filt, {"_id": 0}).sort("created_at", -1).to_list(200)
    return reqs


@api.post("/edit-requests/{rid}/approve")
async def approve_edit_request(rid: str, user: dict = Depends(require_verified_doctor)):
    req = await db.edit_requests.find_one({"id": rid})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the owning doctor can approve")
    await db.edit_requests.update_one({"id": rid}, {"$set": {"status": "approved", "resolved_at": _now_iso()}})
    await db.patients.update_one({"id": req["patient_id"]}, {"$addToSet": {"authorized_editors": req["requester_id"]}})
    await _audit(req["patient_id"], user, "grant_edit", {"grantee_id": req["requester_id"], "grantee_name": req["requester_name"]})
    return {"ok": True}


@api.post("/edit-requests/{rid}/deny")
async def deny_edit_request(rid: str, user: dict = Depends(require_verified_doctor)):
    req = await db.edit_requests.find_one({"id": rid})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the owning doctor can deny")
    await db.edit_requests.update_one({"id": rid}, {"$set": {"status": "denied", "resolved_at": _now_iso()}})
    return {"ok": True}


@api.post("/patients/{pid}/revoke-editor/{doctor_id}")
async def revoke_editor(pid: str, doctor_id: str, user: dict = Depends(require_verified_doctor)):
    p = await db.patients.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    if user.get("role") != "admin" and p["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only owning doctor or admin")
    await db.patients.update_one({"id": pid}, {"$pull": {"authorized_editors": doctor_id}})
    await _audit(pid, user, "revoke_edit", {"revoked_doctor_id": doctor_id})
    return {"ok": True}


# ---------- Research / Filter ----------
@api.post("/research/query")
async def research_query(body: ResearchQuery, user: dict = Depends(require_verified_doctor)):
    filt: dict = {}
    if body.province:
        filt["section2.province"] = body.province
    if body.city:
        filt["section2.city"] = {"$regex": body.city, "$options": "i"}
    if body.ethnicity:
        filt["section2.ethnicity"] = body.ethnicity
    if body.gender:
        filt["section2.gender"] = body.gender
    if body.age_min is not None or body.age_max is not None:
        age_f: dict = {}
        if body.age_min is not None:
            age_f["$gte"] = body.age_min
        if body.age_max is not None:
            age_f["$lte"] = body.age_max
        filt["section2.age"] = age_f
    if body.symptoms_any:
        filt["section5.symptoms"] = {"$in": body.symptoms_any}
    if body.dykens_min is not None or body.dykens_max is not None:
        d_f: dict = {}
        if body.dykens_min is not None:
            d_f["$gte"] = body.dykens_min
        if body.dykens_max is not None:
            d_f["$lte"] = body.dykens_max
        filt["dykens_score"] = d_f
    if body.measles_vaccine_received:
        filt["section4.measles_vaccine_received"] = body.measles_vaccine_received
    if body.created_from or body.created_to:
        d_f: dict = {}
        if body.created_from:
            d_f["$gte"] = body.created_from
        if body.created_to:
            d_f["$lte"] = body.created_to
        filt["created_at"] = d_f

    docs = await db.patients.find(filt, {"_id": 0}).limit(1000).to_list(1000)
    # De-identified default
    results = []
    for d in docs:
        results.append({
            "id": d["id"],
            "age": d["section2"].get("age"),
            "gender": d["section2"].get("gender"),
            "province": d["section2"].get("province"),
            "city": d["section2"].get("city"),
            "ethnicity": d["section2"].get("ethnicity"),
            "measles_vaccine_received": d["section4"].get("measles_vaccine_received"),
            "doses": d["section4"].get("doses"),
            "symptoms_count": len(d["section5"].get("symptoms") or []),
            "symptoms": d["section5"].get("symptoms", []),
            "dykens_score": d.get("dykens_score", 0),
            "created_at": d.get("created_at"),
        })
    # Aggregate by province
    agg: dict = {}
    for r in results:
        prov = r["province"] or "Unknown"
        agg.setdefault(prov, {"count": 0, "avg_dykens": 0, "sum_dykens": 0})
        agg[prov]["count"] += 1
        agg[prov]["sum_dykens"] += r["dykens_score"]
    for k, v in agg.items():
        v["avg_dykens"] = round(v["sum_dykens"] / v["count"], 2) if v["count"] else 0
    return {"total": len(results), "results": results, "by_province": agg}


@api.post("/research/export")
async def research_export(body: ResearchQuery, user: dict = Depends(require_verified_doctor)):
    data = await research_query(body, user)  # type: ignore
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "age", "gender", "province", "city", "ethnicity", "measles_vaccine", "doses", "symptoms_count", "symptoms", "dykens_score", "created_at"])
    for r in data["results"]:
        writer.writerow([
            r["id"], r["age"], r["gender"], r["province"], r["city"], r["ethnicity"],
            r["measles_vaccine_received"], r["doses"], r["symptoms_count"],
            "|".join(r.get("symptoms") or []), r["dykens_score"], r["created_at"],
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=neurohistory_research_export.csv"},
    )


# ---------- Files ----------
@api.post("/files/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(require_verified_doctor)):
    ext = (file.filename or "bin").rsplit(".", 1)[-1].lower()
    content_type = file.content_type or objstore.MIME_MAP.get(ext, "application/octet-stream")
    file_id = str(uuid.uuid4())
    path = f"{objstore.APP_NAME}/uploads/{user['id']}/{file_id}.{ext}"
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 15 MB)")
    try:
        result = objstore.put_object(path, data, content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")
    rec = {
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "uploader_id": user["id"],
        "is_deleted": False,
        "created_at": _now_iso(),
    }
    await db.files.insert_one(rec)
    rec.pop("_id", None)
    return rec


@api.get("/files/{file_id}/download")
async def download_file(file_id: str, user: dict = Depends(get_current_user)):
    rec = await db.files.find_one({"id": file_id, "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, ct = objstore.get_object(rec["storage_path"])
    except Exception as e:
        logger.error(f"Download failed: {e}")
        raise HTTPException(status_code=500, detail="Download failed")
    return Response(content=data, media_type=rec.get("content_type", ct), headers={"Content-Disposition": f'inline; filename="{rec.get("original_filename", file_id)}"'})


# ---------- Admin ----------
@api.get("/admin/doctors")
async def admin_list_doctors(q: Optional[str] = None, status: Optional[str] = None, admin: dict = Depends(require_admin)):
    filt: dict = {"role": "doctor"}
    if status:
        filt["status"] = status
    if q:
        filt["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"hospital": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.users.find(filt).sort("created_at", -1).to_list(500)
    out = []
    for d in docs:
        u = _serialize_user(d)
        u["records_created"] = await db.patients.count_documents({"owner_id": u["id"]})
        u["outgoing_requests"] = await db.edit_requests.count_documents({"requester_id": u["id"]})
        u["incoming_requests"] = await db.edit_requests.count_documents({"owner_id": u["id"]})
        out.append(u)
    return out


@api.post("/admin/doctors/{doctor_id}/verify")
async def admin_verify(doctor_id: str, admin: dict = Depends(require_admin)):
    await db.users.update_one({"_id": ObjectId(doctor_id)}, {"$set": {"status": "verified"}})
    return {"ok": True}


@api.post("/admin/doctors/{doctor_id}/reject")
async def admin_reject(doctor_id: str, admin: dict = Depends(require_admin)):
    await db.users.update_one({"_id": ObjectId(doctor_id)}, {"$set": {"status": "rejected"}})
    return {"ok": True}


@api.post("/admin/doctors/{doctor_id}/suspend")
async def admin_suspend(doctor_id: str, admin: dict = Depends(require_admin)):
    await db.users.update_one({"_id": ObjectId(doctor_id)}, {"$set": {"status": "suspended"}})
    return {"ok": True}


@api.post("/admin/doctors/{doctor_id}/reactivate")
async def admin_reactivate(doctor_id: str, admin: dict = Depends(require_admin)):
    await db.users.update_one({"_id": ObjectId(doctor_id)}, {"$set": {"status": "verified"}})
    return {"ok": True}


@api.get("/admin/patients")
async def admin_list_patients(q: Optional[str] = None, admin: dict = Depends(require_admin)):
    filt: dict = {}
    if q:
        filt["$or"] = [
            {"section2.full_name": {"$regex": q, "$options": "i"}},
            {"section2.city": {"$regex": q, "$options": "i"}},
            {"id": q},
        ]
    docs = await db.patients.find(filt, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    # attach editor names
    for d in docs:
        editor_ids = d.get("authorized_editors") or []
        editors = []
        for eid in editor_ids:
            try:
                u = await db.users.find_one({"_id": ObjectId(eid)}, {"name": 1, "hospital": 1})
                if u:
                    editors.append({"id": eid, "name": u.get("name"), "hospital": u.get("hospital")})
            except Exception:
                pass
        d["editors_detail"] = editors
    return docs


@api.post("/admin/patients/{pid}/add-editor/{doctor_id}")
async def admin_add_editor(pid: str, doctor_id: str, admin: dict = Depends(require_admin)):
    p = await db.patients.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    await db.patients.update_one({"id": pid}, {"$addToSet": {"authorized_editors": doctor_id}})
    await _audit(pid, admin, "admin_add_editor", {"doctor_id": doctor_id})
    return {"ok": True}


@api.post("/admin/patients/{pid}/remove-editor/{doctor_id}")
async def admin_remove_editor(pid: str, doctor_id: str, admin: dict = Depends(require_admin)):
    await db.patients.update_one({"id": pid}, {"$pull": {"authorized_editors": doctor_id}})
    await _audit(pid, admin, "admin_remove_editor", {"doctor_id": doctor_id})
    return {"ok": True}


@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    pending = await db.users.count_documents({"role": "doctor", "status": "pending"})
    verified = await db.users.count_documents({"role": "doctor", "status": "verified"})
    suspended = await db.users.count_documents({"role": "doctor", "status": "suspended"})
    total_patients = await db.patients.count_documents({})
    total_edit_reqs = await db.edit_requests.count_documents({"status": "pending"})
    return {
        "doctors_pending": pending,
        "doctors_verified": verified,
        "doctors_suspended": suspended,
        "total_patients": total_patients,
        "pending_edit_requests": total_edit_reqs,
    }


# ---------- Mount ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
