"""Seed demo data: admin, doctors, patients."""
import os
import uuid
import logging
from datetime import datetime, timezone
from auth import hash_password, verify_password

logger = logging.getLogger(__name__)

# tiny 1x1 PNG (transparent) as data URL placeholder for CNIC images on seeded users
PLACEHOLDER_ID_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

DEMO_DOCTORS = [
    {"name": "Dr. Ayesha Khan", "email": "ayesha@neurohistory.pk", "password": "Doctor@123", "cnic_or_pmdc": "PMDC-45781", "specialty": "Pediatric Neurology", "hospital": "Aga Khan University Hospital", "city": "Karachi", "phone": "+92 300 1234567", "status": "verified"},
    {"name": "Dr. Bilal Ahmed", "email": "bilal@neurohistory.pk", "password": "Doctor@123", "cnic_or_pmdc": "PMDC-32901", "specialty": "Neurology", "hospital": "Shaukat Khanum", "city": "Lahore", "phone": "+92 300 2345678", "status": "verified"},
    {"name": "Dr. Sana Malik", "email": "sana@neurohistory.pk", "password": "Doctor@123", "cnic_or_pmdc": "PMDC-88123", "specialty": "Neurology", "hospital": "PIMS", "city": "Islamabad", "phone": "+92 300 3456789", "status": "verified"},
    {"name": "Dr. Kamran Iqbal", "email": "kamran@neurohistory.pk", "password": "Doctor@123", "cnic_or_pmdc": "PMDC-77420", "specialty": "Neurosurgery", "hospital": "Lady Reading Hospital", "city": "Peshawar", "phone": "+92 300 4567890", "status": "pending"},
    {"name": "Dr. Fatima Zahra", "email": "fatima@neurohistory.pk", "password": "Doctor@123", "cnic_or_pmdc": "PMDC-11987", "specialty": "Pediatric Neurology", "hospital": "Civil Hospital", "city": "Quetta", "phone": "+92 300 5678901", "status": "verified"},
]

DEMO_DATA_COLLECTORS = [
    {"name": "Zara Iqbal", "email": "zara.dc@neurohistory.pk", "password": "Collector@123", "cnic": "42101-9876543-2", "phone": "+92 321 5551122", "status": "verified"},
    {"name": "Omar Sheikh", "email": "omar.dc@neurohistory.pk", "password": "Collector@123", "cnic": "35202-1122334-5", "phone": "+92 321 5553344", "status": "pending"},
]


async def seed_admin(db):
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@neurohistory.pk")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Platform Admin",
            "role": "admin",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Updated admin password for {admin_email}")


async def seed_doctors(db):
    for d in DEMO_DOCTORS:
        existing = await db.users.find_one({"email": d["email"]})
        if existing:
            # backfill CNIC card if missing (older seed)
            if not existing.get("cnic_card_data_url"):
                await db.users.update_one({"_id": existing["_id"]}, {"$set": {"cnic_card_data_url": PLACEHOLDER_ID_IMG}})
            continue
        await db.users.insert_one({
            "name": d["name"],
            "email": d["email"],
            "password_hash": hash_password(d["password"]),
            "role": "doctor",
            "status": d["status"],
            "cnic_or_pmdc": d["cnic_or_pmdc"],
            "cnic_card_data_url": PLACEHOLDER_ID_IMG,
            "specialty": d["specialty"],
            "hospital": d["hospital"],
            "city": d["city"],
            "phone": d.get("phone", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    logger.info("Seeded demo doctors")


async def seed_data_collectors(db):
    for dc in DEMO_DATA_COLLECTORS:
        existing = await db.users.find_one({"email": dc["email"]})
        if existing:
            continue
        await db.users.insert_one({
            "name": dc["name"],
            "email": dc["email"],
            "password_hash": hash_password(dc["password"]),
            "role": "data_collector",
            "status": dc["status"],
            "cnic": dc["cnic"],
            "id_card_data_url": PLACEHOLDER_ID_IMG,
            "phone": dc["phone"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    logger.info("Seeded demo data collectors")


async def seed_patients(db):
    count = await db.patients.count_documents({})
    if count > 0:
        return
    # Pick verified doctors as owners
    doctors = await db.users.find({"role": "doctor", "status": "verified"}).to_list(20)
    if not doctors:
        return
    now = datetime.now(timezone.utc).isoformat()

    samples = [
        {
            "owner_index": 0,
            "section1": {"doctor_name": "Dr. Ayesha Khan", "hospital": "Aga Khan University Hospital"},
            "section2": {"full_name": "Ali Raza", "father_name": "Imran Raza", "mother_name": "Naila Raza", "patient_cnic": "", "father_cnic": "42101-1234567-1", "mother_cnic": "42101-7654321-2", "age": 8, "gender": "Male", "area": "Gulshan-e-Iqbal", "city": "Karachi", "province": "Sindh", "ethnicity": "Muhajir", "contact": "+92 300 1234567"},
            "section3": {"parental_status": "Married", "lives_with": ["Both biological parents"], "lives_with_other": "", "mother_education": "Bachelor's", "father_education": "Master's+", "mother_occupation": "Teacher", "mother_employment": "Full-time", "father_occupation": "Engineer", "father_employment": "Full-time", "monthly_income": 120000, "household_size": 5, "siblings_biological": 2, "siblings_step": 0, "siblings_half": 0, "siblings_adopted": 0, "sibling_ages": [10, 4], "healthcare_access": "Private", "healthcare_access_other": ""},
            "section4": {"measles_vaccine_received": "Yes", "doses": 1, "dose_ages": [1.0], "measles_infection_age": 3.0, "siblings_measles_history": "None", "siblings_vaccination_status": "All vaccinated", "family_sspe_history": "No"},
            "section5": {"symptoms": ["Memory problems", "Personality change", "Seizures", "Cognitive decline"], "laterality": [], "other_symptom": "", "duration_measles_to_symptoms_months": 60, "first_symptom": "Memory problems", "previous_consultation": "Yes", "previous_treatments": "Anti-epileptic drugs"},
            "section6": {"eeg": {"performed": True, "findings": "Periodic high-amplitude slow waves consistent with SSPE", "file_id": None}, "csf_analysis": {"performed": True, "findings": "Elevated measles antibody titers", "file_id": None}, "serum_analysis": {"performed": True, "findings": "Elevated measles IgG", "file_id": None}, "mri": {"performed": True, "findings": "White matter changes, cortical atrophy", "file_id": None}, "ct_scan": {"performed": False, "findings": "", "file_id": None}, "fundoscopy": {"performed": True, "findings": "Normal", "file_id": None}, "vep": {"performed": False, "findings": "", "file_id": None}, "ssep": {"performed": False, "findings": "", "file_id": None}, "metabolic_blood_tests": {"performed": True, "findings": "Negative for Wilson's", "file_id": None}, "infectious_panel": {"performed": True, "findings": "Negative", "file_id": None}, "autoimmune_encephalitis_panel": {"performed": False, "findings": "", "file_id": None}},
            "section7": {"clinical_presentation": True, "eeg_findings": True, "elevated_measles_antibody": True, "histopathology": False, "mri_findings": True},
            "section8": {"vaccination_views": "Parents supportive but missed second dose due to travel.", "barriers": ["Access"], "barriers_other": "", "other_observations": "Family history of measles in older sibling."},
        },
        {
            "owner_index": 1,
            "section1": {"doctor_name": "Dr. Bilal Ahmed", "hospital": "Shaukat Khanum"},
            "section2": {"full_name": "Zainab Bibi", "father_name": "Ahmad Ali", "mother_name": "Rukhsana Ahmad", "patient_cnic": "", "father_cnic": "35202-2345678-3", "mother_cnic": "35202-8765432-4", "age": 12, "gender": "Female", "area": "Model Town", "city": "Lahore", "province": "Punjab", "ethnicity": "Punjabi", "contact": "+92 321 9876543"},
            "section3": {"parental_status": "Married", "lives_with": ["Both biological parents"], "lives_with_other": "", "mother_education": "Matric", "father_education": "Intermediate", "mother_occupation": "Homemaker", "mother_employment": "Homemaker", "father_occupation": "Shopkeeper", "father_employment": "Full-time", "monthly_income": 55000, "household_size": 7, "siblings_biological": 4, "siblings_step": 0, "siblings_half": 0, "siblings_adopted": 0, "sibling_ages": [15, 10, 7, 4], "healthcare_access": "Government-funded insurance", "healthcare_access_other": ""},
            "section4": {"measles_vaccine_received": "No", "doses": 0, "dose_ages": [], "measles_infection_age": 2.0, "siblings_measles_history": "Two siblings had measles", "siblings_vaccination_status": "Partially", "family_sspe_history": "No"},
            "section5": {"symptoms": ["Seizures", "Regression", "Abnormal movements", "Trouble walking", "Behavioral changes"], "laterality": [], "other_symptom": "", "duration_measles_to_symptoms_months": 108, "first_symptom": "Behavioral changes", "previous_consultation": "Yes", "previous_treatments": "Referred from local GP"},
            "section6": {"eeg": {"performed": True, "findings": "Classic burst-suppression pattern", "file_id": None}, "csf_analysis": {"performed": True, "findings": "Very high measles antibody titer", "file_id": None}, "serum_analysis": {"performed": True, "findings": "Elevated", "file_id": None}, "mri": {"performed": True, "findings": "Extensive white matter involvement", "file_id": None}, "ct_scan": {"performed": True, "findings": "Cortical atrophy", "file_id": None}, "fundoscopy": {"performed": True, "findings": "Chorioretinitis", "file_id": None}, "vep": {"performed": True, "findings": "Prolonged latency", "file_id": None}, "ssep": {"performed": False, "findings": "", "file_id": None}, "metabolic_blood_tests": {"performed": False, "findings": "", "file_id": None}, "infectious_panel": {"performed": True, "findings": "Negative", "file_id": None}, "autoimmune_encephalitis_panel": {"performed": True, "findings": "Negative", "file_id": None}},
            "section7": {"clinical_presentation": True, "eeg_findings": True, "elevated_measles_antibody": True, "histopathology": False, "mri_findings": True},
            "section8": {"vaccination_views": "Parents skeptical due to misinformation in community.", "barriers": ["Misinformation", "Cost"], "barriers_other": "", "other_observations": "Rapid clinical deterioration."},
        },
        {
            "owner_index": 2,
            "section1": {"doctor_name": "Dr. Sana Malik", "hospital": "PIMS"},
            "section2": {"full_name": "Hassan Shah", "father_name": "Nadeem Shah", "mother_name": "Saima Shah", "patient_cnic": "", "father_cnic": "61101-1111222-1", "mother_cnic": "61101-3333444-2", "age": 6, "gender": "Male", "area": "F-11", "city": "Islamabad", "province": "Islamabad Capital Territory", "ethnicity": "Pushtoon", "contact": "+92 333 4445555"},
            "section3": {"parental_status": "Married", "lives_with": ["Both biological parents", "Grandparent(s)"], "lives_with_other": "", "mother_education": "Master's+", "father_education": "Master's+", "mother_occupation": "Doctor", "mother_employment": "Full-time", "father_occupation": "Civil Servant", "father_employment": "Full-time", "monthly_income": 250000, "household_size": 6, "siblings_biological": 1, "siblings_step": 0, "siblings_half": 0, "siblings_adopted": 0, "sibling_ages": [3], "healthcare_access": "Private", "healthcare_access_other": ""},
            "section4": {"measles_vaccine_received": "Yes", "doses": 2, "dose_ages": [1.0, 5.0], "measles_infection_age": None, "siblings_measles_history": "None", "siblings_vaccination_status": "Fully", "family_sspe_history": "No"},
            "section5": {"symptoms": ["Headache", "Dizziness", "Memory problems"], "laterality": [], "other_symptom": "", "duration_measles_to_symptoms_months": None, "first_symptom": "Headache", "previous_consultation": "No", "previous_treatments": ""},
            "section6": {"eeg": {"performed": True, "findings": "Mild abnormality", "file_id": None}, "csf_analysis": {"performed": True, "findings": "Normal", "file_id": None}, "serum_analysis": {"performed": True, "findings": "Normal", "file_id": None}, "mri": {"performed": True, "findings": "No significant findings", "file_id": None}, "ct_scan": {"performed": False, "findings": "", "file_id": None}, "fundoscopy": {"performed": True, "findings": "Normal", "file_id": None}, "vep": {"performed": False, "findings": "", "file_id": None}, "ssep": {"performed": False, "findings": "", "file_id": None}, "metabolic_blood_tests": {"performed": True, "findings": "Normal", "file_id": None}, "infectious_panel": {"performed": True, "findings": "Negative", "file_id": None}, "autoimmune_encephalitis_panel": {"performed": True, "findings": "Negative", "file_id": None}},
            "section7": {"clinical_presentation": False, "eeg_findings": False, "elevated_measles_antibody": False, "histopathology": False, "mri_findings": False},
            "section8": {"vaccination_views": "Parents fully pro-vaccination.", "barriers": [], "barriers_other": "", "other_observations": "Likely differential diagnosis; ruling out SSPE."},
        },
    ]

    for s in samples:
        owner = doctors[s["owner_index"] % len(doctors)]
        s7 = s["section7"]
        score = sum(bool(v) for v in [s7["clinical_presentation"], s7["eeg_findings"], s7["elevated_measles_antibody"], s7["histopathology"], s7["mri_findings"]])
        doc = {
            "id": str(uuid.uuid4()),
            "owner_id": str(owner["_id"]),
            "owner_name": owner["name"],
            "authorized_editors": [],
            "section1": s["section1"],
            "section2": s["section2"],
            "section3": s["section3"],
            "section4": s["section4"],
            "section5": s["section5"],
            "section6": s["section6"],
            "section7": s["section7"],
            "dykens_score": score,
            "section8": s["section8"],
            "created_at": now,
            "updated_at": now,
        }
        await db.patients.insert_one(doc)
    logger.info("Seeded demo patients")


async def write_test_credentials():
    path = "/app/memory/test_credentials.md"
    os.makedirs("/app/memory", exist_ok=True)
    content = """# National SSPE Registry Test Credentials

## Admin
- Email: `admin@neurohistory.pk`
- Password: `Admin@12345`

## Verified Doctors
| Name | Email | Password | Status |
|------|-------|----------|--------|
| Dr. Ayesha Khan | ayesha@neurohistory.pk | Doctor@123 | verified |
| Dr. Bilal Ahmed | bilal@neurohistory.pk | Doctor@123 | verified |
| Dr. Sana Malik | sana@neurohistory.pk | Doctor@123 | verified |
| Dr. Fatima Zahra | fatima@neurohistory.pk | Doctor@123 | verified |

## Pending Doctor
- Email: `kamran@neurohistory.pk`
- Password: `Doctor@123`

## Data Collectors
| Name | Email | Password | Status |
|------|-------|----------|--------|
| Zara Iqbal | zara.dc@neurohistory.pk | Collector@123 | verified |
| Omar Sheikh | omar.dc@neurohistory.pk | Collector@123 | pending |

## Auth Endpoints
- POST /api/auth/register (doctor signup)
- POST /api/auth/register-data-collector (data collector signup)
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
"""
    with open(path, "w") as f:
        f.write(content)
