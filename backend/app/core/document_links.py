import hashlib
import hmac
import os
from pathlib import Path

from app.models.document import Document


def _backend_public_url() -> str:
    return os.getenv("BACKEND_PUBLIC_URL", "http://127.0.0.1:8000").rstrip("/")


def document_view_key(document: Document) -> str:
    secret = os.getenv("SECRET_KEY", "massar-dev-document-key")
    source = f"{document.id}|{document.supabase_path or ''}|{document.filename or ''}"
    return hmac.new(secret.encode("utf-8"), source.encode("utf-8"), hashlib.sha256).hexdigest()[:24]


def document_view_url(document: Document | None) -> str | None:
    if not document or not document.id:
        return None
    return f"{_backend_public_url()}/knowledge/documents/{document.id}/view?key={document_view_key(document)}"


def document_local_path(document: Document | None) -> Path | None:
    if not document or not document.supabase_path:
        return None
    filename = Path(document.supabase_path).name
    if not filename:
        return None
    return Path(__file__).resolve().parents[2] / "uploads" / filename
