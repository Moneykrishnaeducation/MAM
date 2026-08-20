"""
Identity Document Verification Pipeline.

Processes Passport, Driver License, National ID, Aadhaar, Voter Card documents.
Extracts: Full Name, Date of Birth, Document Number, Expiry Date, Photo presence.
Compares extracted data against user Django profile (first_name, last_name, dob).
"""

import datetime
import logging
import os
import re

from .matching import compare_names, compare_dob, parse_date_string

logger = logging.getLogger(__name__)

# Expanded International & Regional Document Number Patterns
DOC_NUMBER_PATTERNS = [
    r"\b[A-Z]{5}[0-9]{4}[A-Z]\b",  # Indian PAN Card (e.g. ABCDE1234F)
    r"\b784[-.\s]?\d{4}[-.\s]?\d{7}[-.\s]?\d\b",  # UAE Emirates ID (784-YYYY-1234567-X)
    r"\b[12]\d{9}\b",  # Saudi Iqama / Residency ID
    r"\b[STFG]\d{7}[A-Z]\b",  # Singapore NRIC / FIN
    r"\b\d{6}[-.\s]?\d{2}[-.\s]?\d{4}\b",  # Malaysia MyKad
    r"\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b",  # US SSN
    r"\b[A-Z9]{5}\d{6}[A-Z9]{2}\d[A-Z]{2}\b",  # UK Driver License (16 chars)
    r"\b[A-Z][0-9]{7,8}\b",  # Global Passport Standard (e.g. A1234567)
    r"\b[A-Z]{2}[0-9]{2}[0-9]{4,11}\b",  # Driver License Generic (e.g. DL1420110012345)
    r"\b[2-9][0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b",  # Aadhaar 12-digit
    r"\b[A-Z]{3}[0-9]{7}\b",  # Voter ID (e.g. ABC1234567)
    r"\b(?=.*\d)[A-Z0-9]{6,15}\b",  # Generic National ID (must contain digits)
]

IGNORED_DOC_NUMBER_WORDS = {
    "DEPARTMENT",
    "GOVERNMENT",
    "PERMANENT",
    "NATIONAL",
    "REPUBLIC",
    "IDENTITY",
    "DOCUMENT",
    "PASSPORT",
    "LICENCE",
    "LICENSE",
    "CARD",
    "INDIA",
    "EMIRATES",
    "KINGDOM",
    "UNITED",
    "STATES",
    "AMERICA",
    "CANADA",
    "AUSTRALIA",
}


def extract_identity_fields(ocr_text, user_profile_name=None):
    """
    Regex, MRZ, and pattern extraction for Identity Documents worldwide.

    Extracts:
    - Extracted Name candidates (ranked by similarity if user_profile_name provided)
    - DOB string
    - Expiry Date string
    - Document Number
    - Document Subtype (passport, driver_license, aadhaar, pan_card, national_id, emirates_id)
    """
    extracted = {
        'full_name': None,
        'dob': None,
        'doc_number': None,
        'doc_subtype': 'identity_document',
        'expiry_date': None,
        'is_expired': False,
        'raw_text_length': len(ocr_text) if ocr_text else 0,
    }

    if not ocr_text:
        return extracted

    text_upper = ocr_text.upper()
    text_lower = ocr_text.lower()

    # 1. ICAO Doc 9303 MRZ Machine Readable Zone Parsing for International Passports & ID Cards
    mrz_p1 = re.search(r"\b(P[A-Z0-9<]{1,3})([A-Z<]{3})([A-Z<]{30,39})\b", text_upper)
    mrz_p2 = re.search(r"\b([A-Z0-9<]{9})\d([A-Z<]{3})(\d{6})\d([MF<])(\d{6})\d\b", text_upper)

    if mrz_p1 and mrz_p2:
        extracted["doc_subtype"] = "passport"
        # Passport Number from MRZ Line 2
        raw_pass_num = mrz_p2.group(1).replace("<", "").strip()
        if len(raw_pass_num) >= 6:
            extracted["doc_number"] = raw_pass_num

        # Full Name from MRZ Line 1 (Surname << Given Names)
        name_str = mrz_p1.group(3)
        parts = [
            p.replace("<", " ").strip() for p in name_str.split("<<") if p.replace("<", " ").strip()
        ]
        if parts:
            if len(parts) >= 2:
                extracted['full_name'] = f"{parts[1]} {parts[0]}".title()
            else:
                extracted['full_name'] = parts[0].title()

        # DOB from MRZ Line 2 (YYMMDD)
        dob_raw = mrz_p2.group(3)
        if len(dob_raw) == 6 and dob_raw.isdigit():
            yy, mm, dd = int(dob_raw[:2]), dob_raw[2:4], dob_raw[4:6]
            year = 1900 + yy if yy > 25 else 2000 + yy
            extracted["dob"] = f"{year}-{mm}-{dd}"

        # Expiry from MRZ Line 2 (YYMMDD)
        exp_raw = mrz_p2.group(5)
        if len(exp_raw) == 6 and exp_raw.isdigit():
            yy, mm, dd = int(exp_raw[:2]), exp_raw[2:4], exp_raw[4:6]
            year = 2000 + yy
            extracted["expiry_date"] = f"{year}-{mm}-{dd}"
            try:
                if datetime.date(year, int(mm), int(dd)) < datetime.date.today():
                    extracted["is_expired"] = True
            except Exception:
                pass

    # 2. Determine Subtype if not MRZ
    if extracted["doc_subtype"] == "identity_document":
        if (
            "passport" in text_lower
            or "passeport" in text_lower
            or "pasaporte" in text_lower
            or "reise pass" in text_lower
        ):
            extracted["doc_subtype"] = "passport"
        elif any(
            kw in text_lower
            for kw in [
                "driver",
                "driving",
                "licence",
                "license",
                "permis",
                "permiso",
                "führerschein",
            ]
        ):
            extracted["doc_subtype"] = "driver_license"
        elif "emirates" in text_lower or "784-" in text_lower:
            extracted["doc_subtype"] = "emirates_id"
        elif (
            "iqama" in text_lower or "residence permit" in text_lower or "green card" in text_lower
        ):
            extracted["doc_subtype"] = "residence_permit"
        elif "aadhaar" in text_lower or "uidai" in text_lower:
            extracted["doc_subtype"] = "aadhaar"
        elif re.search(r"\bpan\b", text_lower) or "permanent account" in text_lower or "income tax" in text_lower:
            extracted["doc_subtype"] = "pan_card"
        elif "voter" in text_lower or "election" in text_lower:
            extracted["doc_subtype"] = "voter_id"
        elif (
            "national" in text_lower
            or "republic" in text_lower
            or "republique" in text_lower
            or "state id" in text_lower
        ):
            extracted["doc_subtype"] = "national_id"

    # Date of Birth (DOB) Extraction if not set by MRZ
    if not extracted["dob"]:
        dob_match = re.search(
            r"(?:dob|date of birth|birth date|bday|born|date de naissance|fecha de nacimiento)[:\s]*([0-9]{1,4}[-/.\s][0-9]{1,2}[-/.\s][0-9]{2,4}|[0-9]{1,2}\s+[a-z]{3,9}\s+[0-9]{4})",
            text_lower,
        )
        if dob_match:
            extracted["dob"] = dob_match.group(1).strip()
        else:
            dates_ymd = re.findall(
                r"\b(19\d\d|20[0-2]\d)[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b", ocr_text
            )
            dates_dmy = re.findall(
                r"\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](19\d\d|20[0-2]\d)\b", ocr_text
            )
            if dates_ymd:
                extracted["dob"] = f"{dates_ymd[0][0]}-{dates_ymd[0][1]}-{dates_ymd[0][2]}"
            elif dates_dmy:
                extracted["dob"] = f"{dates_dmy[0][2]}-{dates_dmy[0][1]}-{dates_dmy[0][0]}"

    # Expiry Date Extraction if not set by MRZ
    if not extracted["expiry_date"]:
        exp_match = re.search(
            r"(?:exp|expiry|valid till|valid until|expires|exp date|date d\'expiration)[:\s]*([0-9]{2,4}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[0-9]{1,2}\s+[a-z]{3,9}\s+[0-9]{4})",
            text_lower,
        )
        if exp_match:
            exp_str = exp_match.group(1).strip()
            extracted["expiry_date"] = exp_str
            parsed_exp = parse_date_string(exp_str)
            if parsed_exp and parsed_exp < datetime.date.today():
                extracted["is_expired"] = True

    # Document Number Extraction if not set by MRZ
    if not extracted["doc_number"]:
        for pattern in DOC_NUMBER_PATTERNS:
            matches = re.findall(pattern, ocr_text)
            for m in matches:
                clean_m = m.replace(" ", "").replace("-", "").upper()
                if (
                    not clean_m.startswith("19")
                    and not clean_m.startswith("20")
                    and len(clean_m) >= 6
                ):
                    if clean_m not in IGNORED_DOC_NUMBER_WORDS and any(
                        char.isdigit() for char in clean_m
                    ):
                        extracted["doc_number"] = clean_m
                        # Refine subtype based on exact pattern match
                        if re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", clean_m):
                            extracted["doc_subtype"] = "pan_card"
                        elif re.fullmatch(r"\d{12}", clean_m):
                            extracted["doc_subtype"] = "aadhaar"
                        break
            if extracted["doc_number"]:
                break

    # Name Extraction - Collect candidates
    extracted_name = None

    # 1. First, if we know the user profile name, try to find the line that matches it best directly
    # This bypasses strict digit/keyword filters which often drop OCR-flawed actual names.
    if user_profile_name:
        all_lines = [line.strip() for line in ocr_text.split("\n") if len(line.strip()) >= 3]
        best_line = None
        best_score = 0.0
        for raw_line in all_lines:
            # Clean non-alphabet chars just for comparison, but keep digits in case OCR misread (e.g., O -> 0)
            clean_l = re.sub(r"[^a-zA-Z0-9\s\.]", "", raw_line).strip()
            # Also remove common prefix prefixes
            clean_l = re.sub(
                r"^(name|full name|given name|father name)[:\s]+", "", clean_l, flags=re.IGNORECASE
            )

            if len(clean_l) >= 3:
                score = compare_names(user_profile_name, clean_l)
                if score > best_score:
                    best_score = score
                    best_line = clean_l

        # If we found a strong match, use it.
        if best_score >= 60.0 and best_line:
            # Re-clean to remove digits for the final output string, just in case
            extracted_name = re.sub(r"[^a-zA-Z\s\.]", "", best_line).strip()

    # 2. Fallback to generic candidate extraction if no strong profile match
    if not extracted_name:
        candidates = []
        ignore_keywords = [
            "republic",
            "government",
            "passport",
            "license",
            "licence",
            "dob",
            "birth",
            "date",
            "department",
            "income tax",
            "permanent account",
            "number",
            "govt",
            "india",
            "signature",
            "father",
            "card",
            "state",
            "private",
            "limited",
            "male",
            "female",
            "gender",
            "address",
            "year",
            "pin",
            "code",
            "district",
            "pan",
            "aadhaar",
            "uidai",
            "blood",
            "group",
            "emergency",
        ]

        # Regex matches first
        name_matches = re.findall(
            r"(?:name|full name|given name)[:\s]*([a-zA-Z\s\.]{3,40})", ocr_text, re.IGNORECASE
        )
        for nm in name_matches:
            clean_nm = nm.strip()
            if len(clean_nm) >= 3 and not any(kw in clean_nm.lower() for kw in ignore_keywords):
                candidates.append(clean_nm)

        # Line candidates
        lines = [line.strip() for line in ocr_text.split("\n") if len(line.strip()) >= 3]
        for line in lines:
            l_lower = line.lower()
            if not any(kw in l_lower for kw in ignore_keywords):
                # If the original line has digits, it's likely an address, ID, or date, not a pure name.
                if not any(char.isdigit() for char in line):
                    clean_line = re.sub(r"[^a-zA-Z\s\.]", "", line).strip()
                    if len(clean_line) >= 4:
                        candidates.append(clean_line)

        if candidates:
            if user_profile_name:
                # Filter candidates that have at least some overlap, or just take the best
                scored_candidates = [(c, compare_names(user_profile_name, c)) for c in candidates]
                best_c, c_score = max(scored_candidates, key=lambda x: x[1])
                extracted_name = best_c
            else:
                extracted_name = candidates[0]

    extracted['full_name'] = extracted_name

    return extracted


def detect_photo_presence(file_path):
    """
    Checks if a facial photograph is present on the document image
    using OpenCV Haar Cascade face detector.

    Returns (has_photo: bool, face_count: int)
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return True, 1  # Assume photo present for PDFs or skip check

    try:
        import cv2

        cv_img = cv2.imread(file_path)
        if cv_img is None:
            return False, 0

        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)

        # Load OpenCV default frontal face cascade
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        if os.path.exists(cascade_path):
            face_cascade = cv2.CascadeClassifier(cascade_path)
            faces = face_cascade.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30)
            )
            if len(faces) > 0:
                return True, len(faces)
    except Exception as e:
        logger.warning(f"Face detection failed: {e}")

    return False, 0


def verify_identity_document(user, document_instance, file_path, ocr_text, quality_metrics):
    """
    Full verification evaluation for an Identity document against user profile.

    Returns tuple:
    (matching_scores: dict, extracted_data: dict, verification_warnings: list)
    """
    warnings = []
    profile_full_name = getattr(user, 'name', '').strip()
    if not profile_full_name:
        profile_full_name = getattr(user, 'email', '')

    extracted = extract_identity_fields(ocr_text, user_profile_name=profile_full_name)

    # Detect photo
    has_photo, face_count = detect_photo_presence(file_path)
    extracted["photo_detected"] = has_photo
    extracted["face_count"] = face_count

    # 1. Compare Full Name against User Profile
    doc_name = extracted.get('full_name') or ocr_text  # Fallback to full OCR text if structured name extract missing
    name_score = compare_names(profile_full_name, doc_name)

    if name_score < 50.0:
        warnings.append(f"Name mismatch: Profile '{profile_full_name}' vs Document Name.")

    # 2. Compare Date of Birth (DOB)
    profile_dob = getattr(user, 'date_of_birth', None)
    dob_score = 50.0  # Default neutral score if DOB not on profile or document

    if profile_dob and extracted.get("dob"):
        is_match, dob_score, dob_detail = compare_dob(profile_dob, extracted["dob"])
        if not is_match:
            warnings.append(dob_detail)
    elif profile_dob and not extracted.get("dob"):
        dob_score = 60.0  # Partial score if DOB not required/found on document
        warnings.append("Date of birth missing in document text.")
    elif not profile_dob:
        dob_score = 80.0  # If user profile lacks DOB, don't severely punish

    # 3. Document Number Format Score
    doc_number_score = 100.0 if extracted.get("doc_number") else 60.0

    # 4. Check Expiry
    if extracted.get("is_expired"):
        warnings.append(f"Document has expired (Expiry: {extracted.get('expiry_date')}).")

    matching_scores = {
        "name_match_score": name_score,
        "dob_match_score": dob_score,
        "doc_number_score": doc_number_score,
        "doc_type_score": 90.0,
        "quality_score": 100.0 if quality_metrics.get("is_quality_sufficient") else 40.0,
    }

    return matching_scores, extracted, warnings
