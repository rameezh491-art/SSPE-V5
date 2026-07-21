"""Pydantic models and enum lists for NeuroHistory PK."""
from datetime import datetime, timezone
from typing import Optional, List, Any, Annotated
from pydantic import BaseModel, Field, EmailStr, BeforeValidator, ConfigDict
from bson import ObjectId
import uuid


def _to_str_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    return str(v)


PyObjectId = Annotated[str, BeforeValidator(_to_str_id)]


# ---------- Enums (as literal lists so frontend & backend agree) ----------
PROVINCES = ["Punjab", "Sindh", "KPK", "Balochistan", "Gilgit-Baltistan", "AJK", "Islamabad Capital Territory"]
ETHNICITIES = ["Sindhi", "Punjabi", "Saraiki", "Pothohari", "Pushtoon", "Kashmiri", "Hazara", "Muhajir", "Balochi", "Gilgit Baltistani", "Afghani", "Other"]
GENDERS = ["Male", "Female", "Other"]
PARENTAL_STATUS = ["Single", "Married", "Divorced", "Separated", "One deceased", "Both deceased"]
LIVES_WITH = ["Both biological parents", "Mother only", "Father only", "Stepparent(s)", "Adoptive parent(s)", "Legal guardian(s)", "Grandparent(s)", "Other relative(s)"]
EDUCATION_LEVELS = ["None", "Primary", "Middle", "Matric", "Intermediate", "Bachelor's", "Master's+"]
EMPLOYMENT_STATUS = ["Full-time", "Part-time", "Unemployed", "Homemaker", "Retired", "Student"]
HEALTHCARE_ACCESS = ["Private", "Government-funded insurance", "Company insurance", "Other"]
YES_NO_UNK = ["Yes", "No", "Unknown"]

SYMPTOMS = [
    "Confusion", "Dizziness", "Hallucinations", "Headache", "Lethargy",
    "Memory problems", "Personality change", "Speech difficulty",
    "Trouble falling asleep", "Frequent awakenings", "Night terrors", "Sleep walking",
    "Clumsiness", "Facial numbness/tingling",
    "Numbness–Arms", "Numbness–Legs",
    "Poor balance", "Poor coordination", "Abnormal movements", "Stiffness", "Trouble walking",
    "Weakness–Arms", "Weakness–Legs",
    "Difficulty swallowing", "Difficulty chewing", "Difficulty tasting", "Drooling", "Hoarseness",
    "Incontinence–bowel", "Incontinence–bladder", "Nausea", "Pain",
    "Decreased hearing", "Tics", "Fainting spells", "Ringing in the ears", "Trouble with smell",
    "Head size (change)", "Cognitive decline", "Behavioral changes", "Regression", "Seizures", "Others"
]
LATERALITY_SYMPTOMS = ["Numbness–Arms", "Numbness–Legs", "Weakness–Arms", "Weakness–Legs"]

SPECIALTIES = ["Neurology", "Pediatric Neurology", "Neurosurgery", "Neurophysiology", "Neuro-Oncology", "General Medicine", "Other"]


# ---------- Auth ----------
class DoctorRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    cnic_or_pmdc: str
    specialty: str
    hospital: str
    city: str
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str  # 'admin' | 'doctor'
    status: Optional[str] = None  # doctor: pending | verified | suspended
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    city: Optional[str] = None
    cnic_or_pmdc: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[str] = None


# ---------- Patient Sections ----------
class Section1Facility(BaseModel):
    doctor_name: str
    hospital: str


class Section2Patient(BaseModel):
    full_name: str
    father_name: Optional[str] = ""
    mother_name: Optional[str] = ""
    patient_cnic: Optional[str] = ""
    father_cnic: Optional[str] = ""
    mother_cnic: Optional[str] = ""
    age: int
    gender: str
    area: Optional[str] = ""
    city: str
    province: str
    ethnicity: str
    contact: Optional[str] = ""


class Section3Family(BaseModel):
    parental_status: Optional[str] = ""
    lives_with: List[str] = []
    lives_with_other: Optional[str] = ""
    mother_education: Optional[str] = ""
    father_education: Optional[str] = ""
    mother_occupation: Optional[str] = ""
    mother_employment: Optional[str] = ""
    father_occupation: Optional[str] = ""
    father_employment: Optional[str] = ""
    monthly_income: Optional[float] = None
    household_size: Optional[int] = None
    siblings_biological: Optional[int] = 0
    siblings_step: Optional[int] = 0
    siblings_half: Optional[int] = 0
    siblings_adopted: Optional[int] = 0
    sibling_ages: List[int] = []
    healthcare_access: Optional[str] = ""
    healthcare_access_other: Optional[str] = ""


class Section4Vaccination(BaseModel):
    measles_vaccine_received: str = "Unknown"  # Yes/No/Unknown
    doses: int = 0  # 0, 1, 2
    dose_ages: List[float] = []
    measles_infection_age: Optional[float] = None
    siblings_measles_history: Optional[str] = ""
    siblings_vaccination_status: Optional[str] = ""
    family_sspe_history: str = "No"  # Yes/No


class LateralitySymptom(BaseModel):
    name: str
    side: str  # L / R / Both


class Section5Symptoms(BaseModel):
    symptoms: List[str] = []
    laterality: List[LateralitySymptom] = []
    other_symptom: Optional[str] = ""
    duration_measles_to_symptoms_months: Optional[float] = None
    first_symptom: Optional[str] = ""
    previous_consultation: str = "No"  # Yes/No
    previous_treatments: Optional[str] = ""


class DiagnosticTest(BaseModel):
    performed: bool = False
    findings: Optional[str] = ""
    file_id: Optional[str] = None  # references files collection


class Section6DiagnosticTests(BaseModel):
    eeg: DiagnosticTest = Field(default_factory=DiagnosticTest)
    csf_analysis: DiagnosticTest = Field(default_factory=DiagnosticTest)
    serum_analysis: DiagnosticTest = Field(default_factory=DiagnosticTest)
    mri: DiagnosticTest = Field(default_factory=DiagnosticTest)
    ct_scan: DiagnosticTest = Field(default_factory=DiagnosticTest)
    fundoscopy: DiagnosticTest = Field(default_factory=DiagnosticTest)
    vep: DiagnosticTest = Field(default_factory=DiagnosticTest)
    ssep: DiagnosticTest = Field(default_factory=DiagnosticTest)
    metabolic_blood_tests: DiagnosticTest = Field(default_factory=DiagnosticTest)
    infectious_panel: DiagnosticTest = Field(default_factory=DiagnosticTest)
    autoimmune_encephalitis_panel: DiagnosticTest = Field(default_factory=DiagnosticTest)


class Section7Dykens(BaseModel):
    clinical_presentation: bool = False
    eeg_findings: bool = False
    elevated_measles_antibody: bool = False
    histopathology: bool = False
    mri_findings: bool = False

    @property
    def score(self) -> int:
        return sum([self.clinical_presentation, self.eeg_findings, self.elevated_measles_antibody, self.histopathology, self.mri_findings])


class Section8Perception(BaseModel):
    vaccination_views: Optional[str] = ""
    barriers: List[str] = []
    barriers_other: Optional[str] = ""
    other_observations: Optional[str] = ""


class PatientCreate(BaseModel):
    section1: Section1Facility
    section2: Section2Patient
    section3: Section3Family = Field(default_factory=Section3Family)
    section4: Section4Vaccination = Field(default_factory=Section4Vaccination)
    section5: Section5Symptoms = Field(default_factory=Section5Symptoms)
    section6: Section6DiagnosticTests = Field(default_factory=Section6DiagnosticTests)
    section7: Section7Dykens = Field(default_factory=Section7Dykens)
    section8: Section8Perception = Field(default_factory=Section8Perception)


class EditRequestCreate(BaseModel):
    patient_id: str
    message: Optional[str] = ""


class ResearchQuery(BaseModel):
    province: Optional[str] = None
    city: Optional[str] = None
    ethnicity: Optional[str] = None
    gender: Optional[str] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    symptoms_any: List[str] = []
    dykens_min: Optional[int] = None
    dykens_max: Optional[int] = None
    measles_vaccine_received: Optional[str] = None
    created_from: Optional[str] = None
    created_to: Optional[str] = None
