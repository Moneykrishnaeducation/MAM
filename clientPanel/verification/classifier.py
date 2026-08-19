"""
Document Classification & Type Detection Service.

Validates whether an uploaded document actually matches its declared document_type
('identity' vs 'residence') and detects invalid documents (educational certificates,
invoices, CVs, or unrelated images).
"""

import re
import logging

logger = logging.getLogger(__name__)

# Keywords associated with Identity Documents worldwide
IDENTITY_KEYWORDS = [
    'passport', 'passeport', 'pasaporte', 'reise pass', 'driver license', 'driving licence', 'driving license',
    'permis de conduire', 'führerschein', 'national id', 'state id', 'voter id', 'voter card', 'aadhaar', 'uidai',
    'pan card', 'permanent account number', 'income tax department', 'identity card', 'id card', 'carte d\'identite',
    'tarjeta de identidad', 'emirates id', 'iqama', 'residence permit', 'green card', 'social security', 'ssn',
    'nric', 'mykad', 'republic of', 'kingdom of', 'united states', 'united kingdom', 'date of birth', 'dob',
    'birth date', 'date de naissance', 'fecha de nacimiento', 'sex', 'gender', 'expiry date', 'date of expiry',
    'issue date', 'place of birth', 'nationality', 'surname', 'given name', 'mrz'
]

# Keywords associated with Residence / Address Documents worldwide
RESIDENCE_KEYWORDS = [
    'utility bill', 'bank statement', 'revolut', 'wise', 'chase', 'barclays', 'hsbc', 'citi', 'santander',
    'bank of america', 'wells fargo', 'emirates nbd', 'dbs bank', 'electricity bill', 'water bill', 'gas bill',
    'energy bill', 'hydro bill', 'statement of account', 'billing address', 'residential address', 'account statement', 
    'telephone bill', 'broadband bill', 'mobile bill', 'council tax', 'tenancy agreement', 'lease agreement',
    'bank of', 'account number', 'statement date', 'opening balance', 'closing balance', 'credit card statement',
    'property tax', 'residency certificate', 'address', 'street', 'road', 'avenue', 'boulevard', 'drive', 'lane',
    'city', 'state', 'zip', 'postcode', 'postal code', 'c/o', 's/o', 'w/o', 'd/o', 'po box'
]

# Keywords associated with Unrelated / Invalid Documents
INVALID_DOC_KEYWORDS = [
    'academic transcript', 'degree certificate', 'diploma', 'certificate of achievement',
    'course completion', 'curriculum vitae', 'resume', 'tax invoice', 'purchase order',
    'receipt #', 'quotation', 'commercial invoice', 'shipping manifest', 'bill of lading',
    'employment contract', 'offer letter', 'payslip', 'salary slip'
]


def classify_document(ocr_text, expected_doc_type):
    """
    Analyzes OCR text to verify document type authenticity.
    
    Returns tuple:
    (is_valid_type: bool, detected_type: str, confidence: float, mismatch_reason: str)
    """
    if not ocr_text or not ocr_text.strip():
        # If no text extracted, cannot verify document type with certainty
        return False, 'unknown', 30.0, "Unable to extract text to confirm document type."

    text_lower = ocr_text.lower()

    # Count keyword matches
    identity_score = sum(1 for kw in IDENTITY_KEYWORDS if kw in text_lower)
    residence_score = sum(1 for kw in RESIDENCE_KEYWORDS if kw in text_lower)
    invalid_score = sum(1 for kw in INVALID_DOC_KEYWORDS if kw in text_lower)

    logger.info(f"Document classification scores for expected '{expected_doc_type}': identity={identity_score}, residence={residence_score}, invalid={invalid_score}")

    # Check for explicitly invalid document types (e.g. degree certificates, invoices)
    if invalid_score >= 2 and identity_score < 2 and residence_score < 2:
        return False, 'unrelated_document', 85.0, "Uploaded document appears to be an invoice, academic certificate, or unrelated file."

    # Determine primary detected type
    if identity_score > residence_score and identity_score >= 1:
        detected_type = 'identity'
        confidence = min(95.0, 50.0 + (identity_score * 10))
    elif residence_score > identity_score and residence_score >= 1:
        detected_type = 'residence'
        confidence = min(95.0, 50.0 + (residence_score * 10))
    else:
        detected_type = 'generic_document'
        confidence = 50.0

    # Validate against expected_doc_type
    expected = (expected_doc_type or '').lower()

    if expected == 'identity':
        if detected_type == 'residence' and residence_score >= 2 and identity_score == 0:
            return False, 'residence', confidence, "Document uploaded as Identity appears to be a Proof of Residence / Bank Statement."
        if invalid_score >= 2:
            return False, 'invalid', confidence, "Document uploaded as Identity is not a valid government identity proof."
        if identity_score >= 1 or detected_type == 'generic_document':
            return True, 'identity', max(confidence, 65.0), ""
        return False, detected_type, 40.0, f"Uploaded document text does not match expected '{expected}' document format."

    elif expected == 'residence':
        # Aadhaar cards, Driver Licenses, Voter IDs, and National IDs containing address text are dual-purpose (Identity + Residence)
        is_dual_purpose_id = any(kw in text_lower for kw in ['aadhaar', 'uidai', 'c/o', 's/o', 'w/o', 'd/o', 'address', 'nagar', 'street', 'pincode', 'pin'])
        if is_dual_purpose_id:
            return True, 'residence', max(confidence, 75.0), ""

        if detected_type == 'identity' and identity_score >= 2 and residence_score == 0:
            return False, 'identity', confidence, "Document uploaded as Residence appears to be an Identity card / Passport."
        if invalid_score >= 2:
            return False, 'invalid', confidence, "Document uploaded as Residence is not a valid utility bill / bank statement proof."
        if residence_score >= 1 or detected_type == 'generic_document':
            return True, 'residence', max(confidence, 65.0), ""
        return False, detected_type, 40.0, f"Uploaded document text does not match expected '{expected}' document format."

    return True, detected_type, confidence, ""
