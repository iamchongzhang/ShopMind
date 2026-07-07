"""File upload validation and sanitization utilities."""

import re
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

ALLOWED_MIME_TYPES: dict[str, str] = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "text/csv": "csv",
    "text/markdown": "md",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/html": "html",
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def validate_and_sanitize_file(file: UploadFile) -> tuple[str, str]:
    """
    Validate a file upload and return (safe_filename, file_extension).

    Raises HTTPException on validation failure.
    """
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. "
                   f"Allowed types: {', '.join(ALLOWED_MIME_TYPES.keys())}",
        )

    # Sanitize filename — strip path, replace dangerous characters
    original_name = Path(file.filename).name if file.filename else "unnamed"
    safe_name = re.sub(r"[^\w\-.]", "_", original_name)

    if not safe_name or safe_name.startswith("."):
        safe_name = "unnamed"

    file_ext = ALLOWED_MIME_TYPES[file.content_type]
    return safe_name, file_ext


async def save_upload(file: UploadFile, upload_dir: Path, filename: str) -> Path:
    """
    Save an uploaded file to disk and validate size limit.

    Returns the path relative to the upload directory.
    """
    # Read content to validate size
    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds the maximum of {MAX_FILE_SIZE // (1024 * 1024)} MB.",
        )

    file_path = upload_dir / filename
    file_path.write_bytes(content)

    return file_path
