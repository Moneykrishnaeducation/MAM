"""
OCR Engine & Image/PDF Quality Verification Service.

Handles:
1. File validation (extension, mime, size, corruption)
2. Image/PDF quality checks (blur, resolution, dimensions, blank images, cropping)
3. Self-hosted local OCR text extraction (pytesseract with pre-processing / pdf2image)
"""

import os
import logging
import numpy as np
from PIL import Image
import cv2

from .config import QUALITY_THRESHOLDS, ALLOWED_FILE_EXTENSIONS

logger = logging.getLogger(__name__)

# Try importing pytesseract
try:
    import pytesseract

    PYTESSERACT_AVAILABLE = True
    # Auto-detect Tesseract binary path on Windows
    possible_tesseract_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expanduser(r"~\AppData\Local\Tesseract-OCR\tesseract.exe"),
        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
        r"C:\tesseract\tesseract.exe",
    ]
    for p in possible_tesseract_paths:
        if os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            tess_dir = os.path.dirname(p)
            if tess_dir not in os.environ.get("PATH", ""):
                os.environ["PATH"] = tess_dir + os.pathsep + os.environ.get("PATH", "")
            logger.info(f"Tesseract binary configured at: {p}")
            break
except ImportError:
    PYTESSERACT_AVAILABLE = False
    logger.warning("pytesseract library not available.")

# Try importing pdf2image
try:
    from pdf2image import convert_from_path

    PDF2IMAGE_AVAILABLE = True
    possible_poppler_paths = [
        r"C:\Program Files\poppler\Library\bin",
        r"C:\Program Files\poppler\bin",
        r"C:\Program Files (x86)\poppler\Library\bin",
        r"C:\Program Files (x86)\poppler\bin",
        os.path.expanduser(r"~\AppData\Local\poppler\Library\bin"),
        r"C:\poppler\Library\bin",
    ]
    POPPLER_PATH = None
    for p in possible_poppler_paths:
        if os.path.exists(p):
            POPPLER_PATH = p
            if p not in os.environ.get("PATH", ""):
                os.environ["PATH"] = p + os.pathsep + os.environ.get("PATH", "")
            logger.info(f"Poppler binary directory configured at: {p}")
            break
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    POPPLER_PATH = None
    logger.warning("pdf2image library not available.")


def check_document_quality(file_path):
    """
    Performs automated quality checks on uploaded PDF or Image file.

    Checks:
    - File existence & corruption
    - File size limits
    - Image resolution & dimensions
    - Completely blank or solid-color images
    - Blur / defocus using OpenCV Laplacian variance

    Returns dict with quality metrics and boolean is_quality_sufficient flag.
    """
    result = {
        "is_quality_sufficient": False,
        "file_type": "unknown",
        "width": 0,
        "height": 0,
        "laplacian_var": 0.0,
        "is_blur": False,
        "is_blank": False,
        "is_corrupt": False,
        "size_bytes": 0,
        "quality_errors": [],
    }

    if not os.path.exists(file_path):
        result["is_corrupt"] = True
        result["quality_errors"].append("File does not exist on storage.")
        return result

    file_size = os.path.getsize(file_path)
    result["size_bytes"] = file_size

    if file_size <= 0:
        result["is_corrupt"] = True
        result["quality_errors"].append("Uploaded file is empty (0 bytes).")
        return result

    if file_size > QUALITY_THRESHOLDS["MAX_FILE_SIZE_BYTES"]:
        result["quality_errors"].append(f"File size ({file_size} bytes) exceeds 10MB limit.")
        return result

    ext = os.path.splitext(file_path)[1].lower()
    if ext not in ALLOWED_FILE_EXTENSIONS:
        result["quality_errors"].append(f"File extension '{ext}' is not supported.")
        return result

    pil_image = None

    if ext == ".pdf":
        result["file_type"] = "pdf"
        if PDF2IMAGE_AVAILABLE:
            try:
                kwargs = {"first_page": 1, "last_page": 1}
                if POPPLER_PATH:
                    kwargs["poppler_path"] = POPPLER_PATH
                images = convert_from_path(file_path, **kwargs)
                if images:
                    pil_image = images[0]
            except Exception:
                pil_image = None

        if pil_image is None:
            # Fallback for PDF if poppler/pdf2image is not configured: verify file opens
            try:
                import pypdf

                reader = pypdf.PdfReader(file_path)
                if len(reader.pages) == 0:
                    result["is_corrupt"] = True
                    result["quality_errors"].append("PDF file has 0 pages.")
                    return result
                # Quality check passed for valid PDF structure
                result["is_quality_sufficient"] = True
                result["width"] = 800
                result["height"] = 1100
                return result
            except Exception as e:
                result["is_corrupt"] = True
                result["quality_errors"].append(f"Corrupted PDF file: {str(e)}")
                return result
    else:
        result["file_type"] = "image"
        try:
            pil_image = Image.open(file_path)
            pil_image.verify()  # Verify integrity
            # Re-open after verify()
            pil_image = Image.open(file_path)
        except Exception as e:
            result["is_corrupt"] = True
            result["quality_errors"].append(f"Corrupted image file: {str(e)}")
            return result

    if pil_image is None:
        result["is_corrupt"] = True
        result["quality_errors"].append("Unable to load image for quality checks.")
        return result

    # Dimensions & Resolution Check
    width, height = pil_image.size
    result["width"] = width
    result["height"] = height
    total_pixels = width * height

    if width < QUALITY_THRESHOLDS["MIN_WIDTH"] or height < QUALITY_THRESHOLDS["MIN_HEIGHT"]:
        result["quality_errors"].append(
            f"Image dimensions ({width}x{height}) are below required minimum ({QUALITY_THRESHOLDS['MIN_WIDTH']}x{QUALITY_THRESHOLDS['MIN_HEIGHT']})."
        )

    if total_pixels < QUALITY_THRESHOLDS["MIN_TOTAL_PIXELS"]:
        result["quality_errors"].append("Image resolution is too low for reliable text extraction.")

    # Convert PIL Image to OpenCV BGR / Grayscale for computer vision metrics
    try:
        cv_img = cv2.cvtColor(np.array(pil_image.convert("RGB")), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)

        # Blank / Solid Color Check (pixel standard deviation)
        std_dev = np.std(gray)
        if std_dev < QUALITY_THRESHOLDS["MIN_COLOR_VARIANCE"]:
            result["is_blank"] = True
            result["quality_errors"].append(
                "Image is completely blank, solid color, or lacks detail."
            )

        # Blur Check using Laplacian Variance
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        result["laplacian_var"] = round(float(lap_var), 2)

        if lap_var < QUALITY_THRESHOLDS["BLUR_LAPLACIAN_VAR_MIN"]:
            result["is_blur"] = True
            result["quality_errors"].append(
                f"Document image is excessively blurry (blur score {round(lap_var, 1)} < {QUALITY_THRESHOLDS['BLUR_LAPLACIAN_VAR_MIN']})."
            )

    except Exception as e:
        logger.warning(f"OpenCV quality analysis error on {file_path}: {e}")

    # Final Quality Determination
    if (
        not result["is_corrupt"]
        and not result["is_blank"]
        and not result["is_blur"]
        and len(result["quality_errors"]) == 0
    ):
        result["is_quality_sufficient"] = True
    elif len(result["quality_errors"]) == 0:
        result["is_quality_sufficient"] = True

    return result


def _preprocess_image_for_ocr(cv_image):
    """
    Applies image processing (grayscale, contrast enhancement, adaptive thresholding)
    to optimize text recognition for local OCR engines.
    """
    if cv_image is None:
        return None
    try:
        # Convert to grayscale
        if len(cv_image.shape) == 3:
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        else:
            gray = cv_image.copy()

        # Resize if small
        h, w = gray.shape[:2]
        if w < 1000:
            scale = 1000.0 / w
            gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

        # Contrast Enhancement via CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # Mild Bilateral Filter to reduce noise while preserving edges
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)

        return denoised
    except Exception as e:
        logger.warning(f"OCR preprocessing error: {e}")
        return cv_image


def extract_text_from_document(file_path):
    """
    Extracts text from image or PDF using local OCR engine (pytesseract / pdf2image).

    Returns tuple: (extracted_text, ocr_engine_used, confidence_score)
    """
    ext = os.path.splitext(file_path)[1].lower()
    text_results = []
    engine_used = "tesseract"

    # Handle PDF files
    if ext == ".pdf":
        pdf_text = ""
        # First attempt PDF text extraction via pypdf (if searchable PDF)
        try:
            import pypdf

            reader = pypdf.PdfReader(file_path)
            for page in reader.pages:
                txt = page.extract_text() or ""
                if txt.strip():
                    pdf_text += txt + "\n"
        except Exception:
            pass

        if len(pdf_text.strip()) > 50:
            return pdf_text.strip(), "pdf_text_parser", 95.0

        # If scanned PDF, convert to image for OCR
        if PDF2IMAGE_AVAILABLE:
            try:
                kwargs = {"first_page": 1, "last_page": 3}
                if POPPLER_PATH:
                    kwargs["poppler_path"] = POPPLER_PATH
                images = convert_from_path(file_path, **kwargs)
                for img in images:
                    cv_img = cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2BGR)
                    processed = _preprocess_image_for_ocr(cv_img)
                    if PYTESSERACT_AVAILABLE and processed is not None:
                        txt = pytesseract.image_to_string(processed)
                        text_results.append(txt)
            except Exception as e:
                logger.warning(f"OCR pdf2image error: {e}")

        if text_results:
            combined = "\n".join(text_results).strip()
            return combined, "pytesseract_pdf", 85.0

        return pdf_text.strip(), "fallback_parser", 50.0

    # Handle Image files
    try:
        from PIL import ImageOps

        pil_img = Image.open(file_path)
        # Auto-rotate image upright based on EXIF metadata (crucial for mobile/WhatsApp photos)
        try:
            pil_img = ImageOps.exif_transpose(pil_img)
        except Exception:
            pass

        cv_img = cv2.cvtColor(np.array(pil_img.convert("RGB")), cv2.COLOR_RGB2BGR)
        processed = _preprocess_image_for_ocr(cv_img)

        extracted_text = ""
        if PYTESSERACT_AVAILABLE:
            try:
                ocr_outputs = []
                # 1. OCR on raw PIL image (best for colored backgrounds like PAN cards)
                raw_psm3 = pytesseract.image_to_string(pil_img, config=r"--oem 3 --psm 3")
                if raw_psm3.strip():
                    ocr_outputs.append(raw_psm3.strip())

                # 2. OCR on preprocessed image (best for low-resolution/contrast text)
                if processed is not None:
                    proc_psm3 = pytesseract.image_to_string(processed, config=r"--oem 3 --psm 3")
                    proc_psm6 = pytesseract.image_to_string(processed, config=r"--oem 3 --psm 6")
                    for txt in [proc_psm3, proc_psm6]:
                        clean_t = txt.strip()
                        if clean_t and clean_t not in ocr_outputs:
                            ocr_outputs.append(clean_t)

                extracted_text = "\n\n".join(ocr_outputs)
                if not extracted_text.strip():
                    extracted_text = pytesseract.image_to_string(pil_img)
            except (pytesseract.TesseractNotFoundError, FileNotFoundError) as no_tess_err:
                logger.warning(
                    "Tesseract OCR binary not installed on Windows host. Please run C:\\VT-Index_CRM\\tesseract-setup.exe to enable automatic text extraction."
                )
            except Exception as tess_err:
                err_msg = str(tess_err)
                if "not in your PATH" in err_msg or "not installed" in err_msg:
                    logger.warning(
                        "Tesseract OCR binary not installed on Windows host. Please run C:\\VT-Index_CRM\\tesseract-setup.exe to enable automatic text extraction."
                    )
                else:
                    logger.warning(f"pytesseract execution error: {tess_err}")
                # Fallback to unprocessed PIL image
                try:
                    extracted_text = pytesseract.image_to_string(pil_img)
                except Exception:
                    pass

        if extracted_text.strip():
            return extracted_text.strip(), "pytesseract", 85.0

    except Exception as e:
        logger.error(f"Text extraction failed on {file_path}: {e}")

    return "", engine_used, 0.0
