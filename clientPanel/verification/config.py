"""
Document Verification System Configuration.

Centralized settings for confidence scoring weights, decision thresholds,
quality parameters, and normalization lookup tables.
"""

# Configurable Weights for Identity Verification (Sum = 1.0)
IDENTITY_WEIGHTS = {
    'name': 0.40,
    'dob': 0.30,
    'doc_number': 0.15,
    'doc_type': 0.10,
    'quality': 0.05,
}

# Configurable Weights for Residence Verification (Sum = 1.0)
RESIDENCE_WEIGHTS = {
    'name': 0.35,
    'address': 0.45,
    'doc_type': 0.10,
    'date_validity': 0.10,
}

# Configurable Decision Thresholds (0-100)
DECISION_THRESHOLDS = {
    'APPROVED': 90,
    'MANUAL_REVIEW': 60,
    # Below 60 -> REJECTED
}

# Quality Check Thresholds
QUALITY_THRESHOLDS = {
    'MIN_WIDTH': 300,
    'MIN_HEIGHT': 300,
    'MIN_TOTAL_PIXELS': 400 * 400,
    'BLUR_LAPLACIAN_VAR_MIN': 40.0,
    'MAX_FILE_SIZE_BYTES': 10 * 1024 * 1024,  # 10 MB
    'MIN_COLOR_VARIANCE': 5.0,  # Below this, image is considered blank/monochrome
}

ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/tiff',
    'application/pdf',
]

ALLOWED_FILE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.pdf']

# Address normalization abbreviations mapping
ADDRESS_ABBREVIATIONS = {
    'st': 'street',
    'st.': 'street',
    'str': 'street',
    'rd': 'road',
    'rd.': 'road',
    'ave': 'avenue',
    'ave.': 'avenue',
    'blvd': 'boulevard',
    'blvd.': 'boulevard',
    'dr': 'drive',
    'dr.': 'drive',
    'ln': 'lane',
    'ln.': 'lane',
    'apt': 'apartment',
    'apt.': 'apartment',
    'ste': 'suite',
    'ste.': 'suite',
    'pkwy': 'parkway',
    'hwy': 'highway',
    'no': 'number',
    'no.': 'number',
    'flr': 'floor',
    'fl': 'floor',
    'bldg': 'building',
    'dist': 'district',
    'tn': 'tamil nadu',
    'ka': 'karnataka',
    'mh': 'maharashtra',
    'dl': 'delhi',
    'ny': 'new york',
    'ca': 'california',
    'tx': 'texas',
    'uk': 'united kingdom',
    'usa': 'united states of america',
    'us': 'united states',
    'in': 'india',
    'ind': 'india',
}

NAME_TITLES = ['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'sir', 'madam', 'shri', 'smt', 'kumar', 'kumari']
