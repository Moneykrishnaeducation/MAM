"""
Residence / Address Document Verification Pipeline.

Processes Utility Bills, Bank Statements, Telco Bills, Tax Receipts.
Extracts: Full Name, Address, Statement Date, Account/Document Number.
Compares extracted data against user Django profile address (address, city, state, zip_code, country).
"""

import datetime
import logging
import re

from .matching import compare_names, compare_addresses, parse_date_string

logger = logging.getLogger(__name__)


def extract_residence_fields(ocr_text):
    """
    Regex and pattern extraction for Proof of Residence documents.
    """
    extracted = {
        'full_name': None,
        "extracted_address": None,
        "statement_date": None,
        "doc_number": None,
        "doc_subtype": "residence_document",
        "is_recent_statement": True,
        "raw_text_length": len(ocr_text) if ocr_text else 0,
        "raw_text": ocr_text[:4000] if ocr_text else "",
    }

    if not ocr_text:
        return extracted

    text_lower = ocr_text.lower()

    # Determine Subtype
    if "bank" in text_lower or "statement of account" in text_lower:
        extracted["doc_subtype"] = "bank_statement"
    elif "electricity" in text_lower or "power" in text_lower:
        extracted["doc_subtype"] = "electricity_bill"
    elif "water" in text_lower:
        extracted["doc_subtype"] = "water_bill"
    elif "gas" in text_lower:
        extracted["doc_subtype"] = "gas_bill"
    elif "telephone" in text_lower or "mobile" in text_lower or "broadband" in text_lower:
        extracted["doc_subtype"] = "telecom_bill"

    # Statement / Bill Date Extraction
    date_match = re.search(
        r"(?:statement date|bill date|date of issue|issued date|date)[:\s]*([0-9]{2,4}[-/.][0-9]{1,2}[-/.][0-9]{2,4}|[0-9]{1,2}\s+[a-z]{3,9}\s+[0-9]{4})",
        text_lower,
    )
    if date_match:
        extracted["statement_date"] = date_match.group(1).strip()
        parsed_dt = parse_date_string(extracted["statement_date"])
        if parsed_dt:
            # Statement date should ideally be within the last 180 days
            age_days = (datetime.date.today() - parsed_dt).days
            if age_days > 180 or age_days < -5:
                extracted["is_recent_statement"] = False
    else:
        # Fallback date search
        dates = re.findall(
            r"\b(202[0-9])[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b", ocr_text
        )
        if dates:
            extracted["statement_date"] = f"{dates[0][0]}-{dates[0][1]}-{dates[0][2]}"

    # Account / Aadhaar / Document Number
    aadhaar_match = re.search(r"\b(\d{4})[\s\-_]*(\d{4})[\s\-_]*(\d{4})\b", ocr_text)
    pan_match = re.search(r"\b([a-z]{5}\d{4}[a-z])\b", text_lower)
    acc_match = re.search(
        r"(?:account no|account number|a/c no|bill no|invoice no|statement no)[:\s]*([a-z0-9\-]{5,20})",
        text_lower,
    )

    if aadhaar_match:
        extracted["doc_number"] = (
            f"{aadhaar_match.group(1)}{aadhaar_match.group(2)}{aadhaar_match.group(3)}"
        )
    elif pan_match:
        extracted["doc_number"] = pan_match.group(1).upper()
    elif acc_match:
        extracted["doc_number"] = acc_match.group(1).strip()

    # Name Extraction near 'Customer Name', 'Billed To', 'Account Holder'
    name_match = re.search(
        r"(?:customer name|name|billed to|account holder|holder)[:\s]*([a-zA-Z\s]{3,40})",
        ocr_text,
        re.IGNORECASE,
    )
    if name_match:
        extracted['full_name'] = name_match.group(1).strip()

    # Address Extraction (look for lines containing numbers + street keywords or postal codes, ignoring government headers)
    lines = [line.strip() for line in ocr_text.split("\n") if len(line.strip()) > 8]
    address_lines = []
    header_kws = [
        "identification",
        "authority",
        "government of india",
        "help@uidai",
        "print date",
        "www.uidai",
    ]
    for line in lines:
        l_low = line.lower()
        if not any(h_kw in l_low for h_kw in header_kws):
            if any(
                kw in l_low
                for kw in [
                    "street",
                    "road",
                    "avenue",
                    "block",
                    "lane",
                    "nagar",
                    "city",
                    "state",
                    "pincode",
                    "zip",
                    "post",
                    "flat",
                    "apt",
                    "address:",
                ]
            ):
                address_lines.append(line)

    if address_lines:
        extracted["extracted_address"] = ", ".join(address_lines[:3])
    else:
        extracted["extracted_address"] = ocr_text[:200]

    return extracted


def verify_residence_document(user, document_instance, file_path, ocr_text, quality_metrics):
    """
    Full verification evaluation for a Residence document against user profile.

    Returns tuple:
    (matching_scores: dict, extracted_data: dict, verification_warnings: list)
    """
    warnings = []
    extracted = extract_residence_fields(ocr_text)

    # 1. Compare Full Name
    profile_full_name = getattr(user, 'name', '').strip()
    if not profile_full_name:
        profile_full_name = getattr(user, 'email', '')

    # Check if doc_number matches an approved Identity Document for this user or raw text contains ID doc_number
    doc_number_matched_id_proof = False
    if user:
        try:
            from clientPanel.models import UserDocument

            id_docs = UserDocument.objects.filter(user=user, document_type="identity")
            for id_doc in id_docs:
                id_num = (id_doc.extracted_data or {}).get("doc_number")
                if id_num:
                    clean_id_num = re.sub(r"[\s\-]", "", str(id_num).upper())
                    clean_res_num = re.sub(
                        r"[\s\-]", "", str(extracted.get("doc_number") or "").upper()
                    )
                    clean_raw_text = re.sub(r"[\s\-]", "", str(ocr_text).upper())
                    if clean_id_num and (
                        clean_id_num == clean_res_num
                        or clean_id_num in clean_raw_text
                        or (len(clean_id_num) >= 4 and clean_id_num[-4:] in clean_raw_text)
                    ):
                        doc_number_matched_id_proof = True
                        if not extracted.get("doc_number"):
                            extracted["doc_number"] = id_num
                        break
        except Exception:
            pass

    doc_name = extracted.get('full_name')
    if doc_name and any(
        kw in doc_name.lower()
        for kw in ["psa", "s/o", "d/o", "w/o", "c/o", "government", "authority", "india"]
    ):
        doc_name = None
        extracted['full_name'] = None

    if not doc_name and ocr_text:
        try:
            from .identity_verifier import extract_identity_fields

            id_fields = extract_identity_fields(ocr_text, user_profile_name=profile_full_name)
            candidate_name = id_fields.get('full_name')
            if candidate_name and not any(kw in candidate_name.lower() for kw in ['psa', 's/o', 'd/o', 'w/o', 'c/o', 'government', 'authority']):
                doc_name = candidate_name
                extracted['full_name'] = doc_name
        except Exception:
            doc_name = None

    text_lower = ocr_text.lower() if ocr_text else ""
    is_relationship_addr = any(
        kw in text_lower
        for kw in [
            "s/o",
            "d/o",
            "w/o",
            "c/o",
            "son of",
            "daughter of",
            "wife of",
            "care of",
            "address:",
        ]
    )

    if doc_number_matched_id_proof:
        name_score = 95.0
    elif is_relationship_addr:
        name_score = 85.0
        # If it happens to match anyway, boost it
        if doc_name and compare_names(profile_full_name, doc_name) >= 60.0:
            name_score = 100.0
    elif doc_name:
        name_score = compare_names(profile_full_name, doc_name)
        if name_score < 45.0:
            warnings.append(
                f"Name mismatch on residence proof: Profile '{profile_full_name}' vs Document Name ('{doc_name}')."
            )
    else:
        name_score = 30.0

    # 2. Intelligent Address Matching
    profile_address_dict = {
        "address": getattr(user, "address", ""),
        "city": getattr(user, "city", ""),
        "state": getattr(user, "state", ""),
        "zip_code": getattr(user, "zip_code", ""),
        "country": getattr(user, "country", ""),
    }

    profile_address_parts = [
        str(v).strip() for v in profile_address_dict.values() if v and str(v).strip()
    ]
    profile_address_str = ", ".join(profile_address_parts)

    if not profile_address_parts:
        address_score = 60.0
        warnings.append(
            "Registered profile address is incomplete. Please update your profile address."
        )
    else:
        address_score, addr_details = compare_addresses(profile_address_dict, ocr_text)
        extracted["matched_address_components"] = addr_details.get("matched_components", [])

        if address_score < 40.0:
            warnings.append(
                f"Address mismatch on residence proof: Profile address ('{profile_address_str}') does not match the uploaded document."
            )

    # 3. Statement Date / Validity Score
    date_validity_score = 90.0
    if not extracted.get("is_recent_statement"):
        date_validity_score = 40.0
        warnings.append(
            f"Statement date ({extracted.get('statement_date')}) appears older than 180 days."
        )

    matching_scores = {
        "name_match_score": name_score,
        "address_match_score": address_score,
        "doc_type_score": 90.0,
        "date_validity_score": date_validity_score,
        "quality_score": 100.0 if quality_metrics.get("is_quality_sufficient") else 40.0,
    }

    return matching_scores, extracted, warnings
