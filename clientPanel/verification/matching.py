"""
Intelligent Name, Address, and Date Matching Service.

Handles:
- Case, punctuation, whitespace, title honorific normalization
- Token-sort & fuzzy string similarity for Names
- Intelligent Address Matching (city, state, zip, street component overlap & abbreviation lookup)
- Flexible Date Parsing & Comparison
"""

import re
import datetime
import logging
from .config import ADDRESS_ABBREVIATIONS, NAME_TITLES

logger = logging.getLogger(__name__)

# Try importing rapidfuzz for fast fuzzy matching
try:
    from rapidfuzz import fuzz

    RAPIDFUZZ_AVAILABLE = True
except ImportError:
    RAPIDFUZZ_AVAILABLE = False
    logger.warning("rapidfuzz not installed. Falling back to difflib matching.")


def normalize_name(name_str):
    """
    Normalizes a name string:
    - Lowercase
    - Strip punctuation and extra spaces
    - Remove title honorifics (mr, mrs, dr, etc.)
    """
    if not name_str:
        return ""
    text = name_str.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    tokens = text.split()
    # Filter honorific titles
    filtered = [t for t in tokens if t not in NAME_TITLES]
    return " ".join(filtered)


def compare_names(profile_name, document_name):
    """
    Compares profile name against extracted document name.

    Supports:
    - Name order variation (e.g. 'Tamizharasan V' vs 'V Tamizharasan')
    - Single letter initials (e.g. 'V' matching 'Velusamy' or 'V')
    - Partial token matching

    Returns similarity score float (0.0 to 100.0).
    """
    n1 = normalize_name(profile_name)
    n2 = normalize_name(document_name)

    if not n1 or not n2:
        return 0.0

    if n1 == n2:
        return 100.0

    # Token sets
    tokens1 = set(n1.split())
    tokens2 = set(n2.split())

    # Exact token overlap
    intersection = tokens1.intersection(tokens2)
    if intersection and (len(intersection) == len(tokens1) or len(intersection) == len(tokens2)):
        return 95.0

    # Check main non-initial token overlap (length >= 3)
    main_tokens1 = [t for t in tokens1 if len(t) >= 3]
    main_tokens2 = [t for t in tokens2 if len(t) >= 3]

    main_overlap = any(
        t1 == t2 or (RAPIDFUZZ_AVAILABLE and fuzz.ratio(t1, t2) >= 60.0)
        for t1 in main_tokens1
        for t2 in main_tokens2
    )

    if main_tokens1 and main_tokens2 and not main_overlap:
        return 0.0

    # Rapidfuzz Token Sort Ratio
    if RAPIDFUZZ_AVAILABLE:
        token_sort_score = float(fuzz.token_sort_ratio(n1, n2))
        token_set_score = float(fuzz.token_set_ratio(n1, n2))
        partial_score = float(fuzz.partial_ratio(n1, n2))

        # Prevent short random substrings from forcing a high partial match
        if len(n1) <= 6 or len(n2) <= 6:
            partial_score = 0.0

        weighted_score = max(token_sort_score, token_set_score, partial_score * 0.9)
    else:
        # Fallback using difflib
        import difflib

        ratio = difflib.SequenceMatcher(None, n1, n2).ratio() * 100.0
        sorted_n1 = " ".join(sorted(tokens1))
        sorted_n2 = " ".join(sorted(tokens2))
        sorted_ratio = difflib.SequenceMatcher(None, sorted_n1, sorted_n2).ratio() * 100.0
        weighted_score = max(ratio, sorted_ratio)

    if main_overlap:
        single_initials1 = [t for t in tokens1 if len(t) == 1]
        single_initials2 = [t for t in tokens2 if len(t) == 1]

        if single_initials1 or single_initials2:
            # Check if full tokens match the initial
            for init in single_initials1:
                for t2 in tokens2:
                    if t2.startswith(init) and len(t2) > 1:
                        weighted_score = max(weighted_score, 90.0)
            for init in single_initials2:
                for t1 in tokens1:
                    if t1.startswith(init) and len(t1) > 1:
                        weighted_score = max(weighted_score, 90.0)

    return min(100.0, round(weighted_score, 2))


def normalize_address(address_str):
    """
    Normalizes address text:
    - Lowercase & punctuation removal
    - Abbreviation replacement (st -> street, rd -> road, tn -> tamil nadu, etc.)
    - Clean whitespace
    """
    if not address_str:
        return ""
    text = address_str.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    tokens = text.split()

    normalized_tokens = []
    for token in tokens:
        expanded = ADDRESS_ABBREVIATIONS.get(token, token)
        normalized_tokens.append(expanded)

    return " ".join(normalized_tokens)


def compare_addresses(profile_address_dict, ocr_text):
    """
    Intelligent address matching algorithm.

    Checks if profile address components (street, city, state, zip_code, country)
    match or appear inside extracted document text.

    Example:
    Profile: city="Chennai"
    Document: "123 Main St, Chennai, Tamil Nadu 600001"
    Returns high match score!

    Returns tuple: (score: float 0-100, match_details: dict)
    """
    if not profile_address_dict or not ocr_text:
        return 0.0, {"matched_components": [], "score": 0.0}

    ocr_norm = normalize_address(ocr_text)

    components = {
        "street": profile_address_dict.get("address", ""),
        "city": profile_address_dict.get("city", ""),
        "state": profile_address_dict.get("state", ""),
        "postal_code": profile_address_dict.get("postal_code", ""),
        "country": profile_address_dict.get("country", ""),
    }

    matched_components = []
    component_scores = []
    total_weights = 0.0
    gained_weights = 0.0

    weights = {
        "street": 0.35,
        "city": 0.30,
        "state": 0.15,
        "postal_code": 0.15,
        "country": 0.05,
    }

    for comp_key, comp_val in components.items():
        if not comp_val or not str(comp_val).strip():
            continue

        comp_norm = normalize_address(str(comp_val))
        weight = weights.get(comp_key, 0.1)
        total_weights += weight

        if comp_norm in ocr_norm:
            matched_components.append(comp_key)
            gained_weights += weight * 1.0
            component_scores.append((comp_key, 100.0))
        else:
            # Check fuzzy / token overlap for component
            comp_tokens = comp_norm.split()
            tokens_in_ocr = sum(1 for t in comp_tokens if t in ocr_norm)
            if comp_tokens and tokens_in_ocr > 0:
                fraction = tokens_in_ocr / len(comp_tokens)
                if fraction >= 0.5:
                    matched_components.append(f"{comp_key}_partial")
                    gained_weights += weight * fraction
                    component_scores.append((comp_key, fraction * 100.0))
                else:
                    component_scores.append((comp_key, 0.0))
            else:
                component_scores.append((comp_key, 0.0))

    if total_weights == 0.0:
        # Fallback to full string similarity if profile address fields were single string
        combined_profile = " ".join([str(v) for v in components.values() if v])
        norm_prof = normalize_address(combined_profile)
        if RAPIDFUZZ_AVAILABLE:
            score = float(fuzz.partial_ratio(norm_prof, ocr_norm))
        else:
            score = 70.0 if norm_prof in ocr_norm else 40.0
        return round(score, 2), {"matched_components": ["fallback_similarity"], "score": score}

    final_score = (gained_weights / total_weights) * 100.0

    return min(100.0, round(final_score, 2)), {
        "matched_components": matched_components,
        "component_scores": component_scores,
        "score": round(final_score, 2),
    }


def parse_date_string(date_str):
    """
    Parses various date string formats into datetime.date object.
    Supports YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MMM-YYYY, etc.
    """
    if not date_str:
        return None

    if isinstance(date_str, (datetime.date, datetime.datetime)):
        return date_str if isinstance(date_str, datetime.date) else date_str.date()

    cleaned = str(date_str).strip()

    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d-%m-%Y",
        "%Y/%m/%d",
        "%d %b %Y",
        "%d %B %Y",
        "%b %d, %Y",
        "%B %d, %Y",
        "%d-%b-%Y",
    ]

    for fmt in formats:
        try:
            dt = datetime.datetime.strptime(cleaned, fmt)
            return dt.date()
        except ValueError:
            continue

    # Regex search for ISO YYYY-MM-DD
    match = re.search(r"\b(19\d\d|20\d\d)[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b", cleaned)
    if match:
        try:
            return datetime.date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
        except ValueError:
            pass

    return None


def compare_dob(profile_dob, extracted_dob_str):
    """
    Compares profile date of birth against extracted DOB from document.

    Returns tuple: (is_match: bool, score: float 0-100, details: str)
    """
    if not profile_dob or not extracted_dob_str:
        return False, 0.0, "Date of birth missing in profile or document text."

    prof_date = parse_date_string(profile_dob)
    ext_date = parse_date_string(extracted_dob_str)

    if prof_date and ext_date:
        if prof_date == ext_date:
            return True, 100.0, f"Exact DOB match ({prof_date.isoformat()})."
        elif (
            prof_date.year == ext_date.year
            and prof_date.month == ext_date.day
            and prof_date.day == ext_date.month
        ):
            return (
                True,
                90.0,
                f"DOB match with swapped day/month ({prof_date.isoformat()} vs {ext_date.isoformat()}).",
            )
        elif (
            prof_date.year == ext_date.year
            and prof_date.month == ext_date.month
            and abs(prof_date.day - ext_date.day) <= 1
        ):
            return True, 80.0, "DOB match with minor day variation."
        else:
            return (
                False,
                0.0,
                f"DOB mismatch: Profile ({prof_date.isoformat()}) vs Document ({ext_date.isoformat()}).",
            )

    # String comparison fallback if parsing failed
    str_prof = str(profile_dob).lower().strip()
    str_ext = str(extracted_dob_str).lower().strip()

    if str_prof in str_ext:
        return True, 90.0, "DOB string match."

    return False, 0.0, "Could not match date of birth."
