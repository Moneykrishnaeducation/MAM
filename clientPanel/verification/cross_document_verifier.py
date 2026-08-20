import logging
import re

from .matching import compare_names, compare_dob

logger = logging.getLogger(__name__)


def verify_cross_documents(user):
    """
    Performs cross-document consistency checks between a user's uploaded
    Identity and Residence documents.

    Supports Aadhaar Front (Identity) + Aadhaar Back (Residence) cross-verification
    via document number matching and address-side relationship text detection.
    """
    from clientPanel.models import UserDocument

    result = {
        "is_consistent": True,
        "cross_match_score": 100.0,
        "identity_doc_id": None,
        "residence_doc_id": None,
        "name_similarity": 100.0,
        "dob_similarity": 100.0,
        "issues": [],
        "explanation": "Both documents belong to the same person.",
    }

    if not user:
        return result

    # Fetch latest identity and residence documents for user
    identity_doc = (
        UserDocument.objects.filter(user=user, document_type="identity")
        .order_by("-uploaded_at", "-id")
        .first()
    )
    residence_doc = (
        UserDocument.objects.filter(user=user, document_type="residence")
        .order_by("-uploaded_at", "-id")
        .first()
    )

    if not identity_doc or not residence_doc:
        result["explanation"] = (
            "Cross-document verification pending: Upload both Identity and Residence documents."
        )
        return result

    result["identity_doc_id"] = identity_doc.id
    result["residence_doc_id"] = residence_doc.id

    # 1. Check for Duplicate Same File Uploaded for Both Types
    if (
        identity_doc.file_hash
        and residence_doc.file_hash
        and identity_doc.file_hash == residence_doc.file_hash
    ):
        result["is_consistent"] = False
        result["cross_match_score"] = 0.0
        msg = "The exact same file was uploaded for both Identity and Residence proof."
        result["issues"].append(msg)
        result["explanation"] = msg
        return result

    # 2. Extract Data
    id_name = (identity_doc.extracted_data or {}).get("full_name")
    res_name = (residence_doc.extracted_data or {}).get("full_name")
    id_raw_text = (identity_doc.extracted_data or {}).get("raw_text", "") or ""
    res_raw_text = (
        (residence_doc.extracted_data or {}).get("raw_text", "")
        or (residence_doc.extracted_data or {}).get("extracted_address", "")
        or ""
    )

    id_doc_num = (identity_doc.extracted_data or {}).get("doc_number")
    res_doc_num = (residence_doc.extracted_data or {}).get("doc_number")

    user_profile_name = getattr(user, "name", "").strip()
    if not user_profile_name:
        user_profile_name = getattr(user, "email", "")

    target_name = id_name or user_profile_name

    # 3. Same Document Card Detection (International Passports, National IDs, Driver Licenses, Aadhaar)
    def extract_doc_numbers_from_text(txt):
        if not txt:
            return set()
        clean = re.sub(r"[\s\-]", "", txt)
        nums = set()
        # Find 12-digit numbers (Aadhaar / National IDs)
        nums.update(re.findall(r"\b\d{12}\b", clean))
        # Find 10-char PAN numbers
        nums.update(re.findall(r"\b[A-Z]{5}\d{4}[A-Z]\b", txt.upper()))
        # Find UAE Emirates IDs (15 digits)
        nums.update(re.findall(r"\b784\d{12}\b", clean))
        # Find Passports (1 letter + 7-8 digits or MRZ 9-char alphanumeric)
        nums.update(re.findall(r"\b[A-Z]\d{7,8}\b", txt.upper()))
        # Find Singapore NRIC / FIN
        nums.update(re.findall(r"\b[STFG]\d{7}[A-Z]\b", txt.upper()))
        # Find Saudi Iqama (10 digits starting with 1 or 2)
        nums.update(re.findall(r"\b[12]\d{9}\b", clean))
        return nums

    id_numbers = extract_doc_numbers_from_text(id_raw_text)
    if id_doc_num:
        clean_id_num = re.sub(r"[\s\-]", "", str(id_doc_num).upper())
        if clean_id_num:
            id_numbers.add(clean_id_num)

    res_numbers = extract_doc_numbers_from_text(res_raw_text)
    if res_doc_num:
        clean_res_num = re.sub(r"[\s\-]", "", str(res_doc_num).upper())
        if clean_res_num:
            res_numbers.add(clean_res_num)

    same_doc_card = False
    if id_numbers and res_numbers and (id_numbers & res_numbers):
        same_doc_card = True
    elif id_doc_num and res_doc_num:
        c1 = re.sub(r"[\s\-]", "", str(id_doc_num).upper())
        c2 = re.sub(r"[\s\-]", "", str(res_doc_num).upper())
        if c1 == c2 or (
            len(c1) >= 4 and len(c2) >= 4 and (c1[-4:] == c2[-4:] or c1 in c2 or c2 in c1)
        ):
            same_doc_card = True

    if same_doc_card:
        # Identity and Residence documents share the SAME document number (Front & Back of Aadhaar/ID)
        result["is_consistent"] = True
        result["cross_match_score"] = 100.0
        result["name_similarity"] = 100.0
        result["explanation"] = (
            "Cross-document verification successful: Both files belong to the exact same document (Document Number match)."
        )
        return result

    # 4. Check for Address-side / Relationship Line (S/O, D/O, W/O, C/O, Address:)
    res_lower = res_raw_text.lower()
    is_address_side_doc = any(
        kw in res_lower
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

    # Fallback to OCR text candidate extraction if res_name missing
    if not res_name and res_raw_text:
        try:
            from .identity_verifier import extract_identity_fields

            res_fields = extract_identity_fields(
                res_raw_text, user_profile_name=id_name or user_profile_name
            )
            res_name = res_fields.get("full_name")
        except Exception:
            pass

    # Compare Identity Name vs Residence Name
    if target_name and res_name:
        # Ignore government header titles
        if any(
            kw in res_name.lower()
            for kw in ["government of india", "government", "republic", "department", "authority"]
        ):
            res_name = None

    if target_name and res_name:
        name_sim = compare_names(target_name, res_name)
        result["name_similarity"] = round(float(name_sim), 1)

        # If name mismatch occurs, check if Residence document is an Address Side document (S/O father name)
        if name_sim < 65.0:
            if is_address_side_doc and compare_names(user_profile_name, target_name) >= 40.0:
                # Residence document is the address side with relationship line (S/O father name). Identity doc matches profile user.
                result["is_consistent"] = True
                result["cross_match_score"] = 90.0
                result["explanation"] = (
                    "Cross-document verification successful: Identity document matches profile user, and Residence document provides valid address proof."
                )
                return result

            result["is_consistent"] = False
            result["cross_match_score"] = min(
                result["cross_match_score"], round(float(name_sim), 1)
            )
            msg = f"Cross-document name mismatch: Name on Identity document ('{target_name}') does not match Name on Residence document ('{res_name}')."
            result["issues"].append(msg)
    elif target_name and res_raw_text:
        # Check if any significant token of target_name appears anywhere in residence raw text
        name_tokens = [t.lower() for t in target_name.split() if len(t) > 2]
        found_token = any(t in res_raw_text.lower() for t in name_tokens)
        if not found_token:
            if is_address_side_doc and compare_names(user_profile_name, target_name) >= 40.0:
                result["is_consistent"] = True
                result["cross_match_score"] = 90.0
                result["explanation"] = (
                    "Cross-document verification successful: Identity document matches profile user, and Residence document provides valid address proof."
                )
                return result

            result["is_consistent"] = False
            result["cross_match_score"] = 30.0
            result["name_similarity"] = 30.0
            msg = f"Cross-document name mismatch: Profile/Identity name ('{target_name}') does not appear on the uploaded Residence document."
            result["issues"].append(msg)

    # 3. Compare DOB if present on both
    id_dob = (identity_doc.extracted_data or {}).get("dob")
    res_dob = (residence_doc.extracted_data or {}).get("dob")

    if id_dob and res_dob:
        is_match, dob_score, dob_msg = compare_dob(id_dob, res_dob)
        result["dob_similarity"] = round(float(dob_score), 1)
        if not is_match:
            result["is_consistent"] = False
            result["cross_match_score"] = min(
                result["cross_match_score"], round(float(dob_score), 1)
            )
            msg = f"Cross-document DOB mismatch: DOB on Identity document ('{id_dob}') does not match DOB on Residence document ('{res_dob}')."
            result["issues"].append(msg)

    if not result["is_consistent"]:
        result["explanation"] = " ".join(result["issues"])

        # Identify which document failed profile name matching
        failing_ids = []
        if id_name and compare_names(user_profile_name, id_name) < 45.0:
            failing_ids.append((identity_doc.id, "identity", id_name))

        res_check_name = res_name
        if not res_check_name and res_raw_text:
            try:
                from .identity_verifier import extract_identity_fields

                res_fields = extract_identity_fields(
                    res_raw_text, user_profile_name=user_profile_name
                )
                res_check_name = res_fields.get("full_name")
            except Exception:
                res_check_name = None

        if res_check_name and any(
            kw in res_check_name.lower()
            for kw in ["government of india", "government", "republic", "department", "authority"]
        ):
            res_check_name = None

        if res_check_name:
            if compare_names(user_profile_name, res_check_name) < 65.0:
                failing_ids.append((residence_doc.id, "residence", res_check_name))
        elif res_raw_text:
            name_tokens = [t.lower() for t in user_profile_name.split() if len(t) > 2]
            if not any(t in res_raw_text.lower() for t in name_tokens):
                failing_ids.append((residence_doc.id, "residence", "Non-matching Document"))

        result["failing_docs"] = failing_ids
    else:
        result["explanation"] = (
            f"Cross-document verification successful: Both documents match (Name similarity {result['name_similarity']}%)."
        )

    return result
