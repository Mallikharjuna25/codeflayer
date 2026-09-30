import re
import io
import ipaddress
import socket
import logging
from urllib.parse import urlparse
from typing import List, Dict, Any, Tuple
import httpx
from pypdf import PdfReader

logger = logging.getLogger("code_storm_backend.policy_parser")

def parse_pdf(file_bytes: bytes) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Extracts text page-by-page from a PDF, preserving page references.
    Returns: (full_text, list_of_page_chunks)
    """
    reader = PdfReader(io.BytesIO(file_bytes))
    full_text_parts = []
    chunks = []

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        page_text = page.extract_text() or ""
        cleaned = page_text.strip()
        if cleaned:
            full_text_parts.append(f"--- Page {page_num} ---\n{cleaned}")
            chunks.append({
                "page_or_section": f"Page {page_num}",
                "text": cleaned
            })

    full_text = "\n\n".join(full_text_parts)
    return full_text, chunks

def parse_markdown_or_text(raw_text: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Extracts sections from Markdown or plain text based on headings or numbered sections.
    """
    clean_text = raw_text.strip()
    if not clean_text:
        return "", []

    lines = clean_text.splitlines()
    sections = []
    current_title = "Introduction / Overview"
    current_lines = []

    header_pattern = re.compile(r"^(#{1,4}\s+|Section\s+\d+:?\s*|[0-9]+\.[0-9]*\s+)(.+)$", re.IGNORECASE)

    for line in lines:
        match = header_pattern.match(line.strip())
        if match:
            if current_lines:
                sec_text = "\n".join(current_lines).strip()
                if sec_text:
                    sections.append({
                        "page_or_section": current_title,
                        "text": sec_text
                    })
                current_lines = []
            current_title = line.strip()
        current_lines.append(line)

    if current_lines:
        sec_text = "\n".join(current_lines).strip()
        if sec_text:
            sections.append({
                "page_or_section": current_title,
                "text": sec_text
            })

    if not sections:
        sections.append({
            "page_or_section": "Document Content",
            "text": clean_text
        })

    return clean_text, sections

def _is_safe_url(url: str) -> Tuple[bool, str]:
    """Ensures URL is https and does not resolve to private or loopback IP (prevents SSRF)."""
    parsed = urlparse(url)
    if parsed.scheme.lower() != "https":
        return False, "Only secure HTTPS policy URLs are permitted."

    hostname = parsed.hostname
    if not hostname:
        return False, "Invalid URL hostname."

    if hostname.lower() in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
        return False, "Access to localhost or loopback destinations is forbidden."

    try:
        ip = socket.gethostbyname(hostname)
        ip_obj = ipaddress.ip_address(ip)
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
            return False, f"Access to internal/private IP network ({ip}) is strictly forbidden."
    except Exception as e:
        return False, f"DNS resolution failed for hostname '{hostname}': {e}"

    return True, ""

def fetch_and_parse_url(url: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Safely fetches a remote policy web page and extracts structured text.
    """
    is_safe, err_msg = _is_safe_url(url)
    if not is_safe:
        raise ValueError(err_msg)

    with httpx.Client(timeout=12.0, follow_redirects=True) as client:
        resp = client.get(url, headers={"User-Agent": "Halo-Policy-Extractor/1.0"})
        resp.raise_for_status()
        raw_html = resp.text

    # Simple HTML tag stripping
    text_no_tags = re.sub(r"<script.*?</script>", "", raw_html, flags=re.DOTALL | re.IGNORECASE)
    text_no_tags = re.sub(r"<style.*?</style>", "", text_no_tags, flags=re.DOTALL | re.IGNORECASE)
    text_no_tags = re.sub(r"<[^>]+>", " ", text_no_tags)
    cleaned = re.sub(r"\s+", " ", text_no_tags).strip()

    return parse_markdown_or_text(cleaned)
