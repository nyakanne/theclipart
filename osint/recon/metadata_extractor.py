#!/usr/bin/env python3
"""
File Metadata Extractor
Extracts EXIF, document properties, and hidden metadata from:
  Images (JPEG, PNG, TIFF, HEIC), PDFs, Word/DOCX, and generic files.

Metadata leaks are a key OSINT vector — authors, GPS coords, software versions,
org names, and timestamps often survive in files published to the web.
"""

import argparse
import json
import os
import struct
import zipfile
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET

from colorama import Fore, Style, init
from tabulate import tabulate

init(autoreset=True)


def section(title: str):
    print(f"\n{Fore.YELLOW}{'='*55}\n  {title}\n{'='*55}{Style.RESET_ALL}")


def dms_to_decimal(dms, ref: str) -> float:
    """Convert EXIF GPS degrees/minutes/seconds to decimal."""
    d, m, s = dms
    dec = float(d) + float(m) / 60 + float(s) / 3600
    if ref in ("S", "W"):
        dec = -dec
    return round(dec, 6)


# ── EXIF (Images) ─────────────────────────────────────────────────────────────

def extract_image_metadata(path: str) -> dict:
    section(f"Image EXIF — {os.path.basename(path)}")
    results = {}

    try:
        import exifread
        with open(path, "rb") as f:
            tags = exifread.process_file(f, details=True)

        if not tags:
            print("  No EXIF data found.")
            return results

        # Key fields
        interesting = [
            "Image Make", "Image Model", "Image Software",
            "EXIF DateTimeOriginal", "EXIF DateTimeDigitized",
            "Image DateTime", "Image Artist", "Image Copyright",
            "EXIF ExifImageWidth", "EXIF ExifImageLength",
            "EXIF Flash", "EXIF FocalLength",
            "GPS GPSLatitude", "GPS GPSLatitudeRef",
            "GPS GPSLongitude", "GPS GPSLongitudeRef",
            "GPS GPSAltitude", "GPS GPSDateStamp",
            "Image ImageDescription", "EXIF UserComment",
            "Image XPAuthor", "Image XPComment",
        ]

        rows = []
        for key in interesting:
            if key in tags:
                val = str(tags[key])
                rows.append([key, val])
                results[key] = val

        if rows:
            print(tabulate(rows, tablefmt="simple"))
        else:
            print("  No interesting EXIF fields found.")

        # GPS coordinates
        if "GPS GPSLatitude" in tags and "GPS GPSLongitude" in tags:
            try:
                lat_vals = tags["GPS GPSLatitude"].values
                lon_vals = tags["GPS GPSLongitude"].values
                lat_ref = str(tags.get("GPS GPSLatitudeRef", "N"))
                lon_ref = str(tags.get("GPS GPSLongitudeRef", "E"))

                lat = dms_to_decimal(lat_vals, lat_ref)
                lon = dms_to_decimal(lon_vals, lon_ref)
                maps_url = f"https://maps.google.com/?q={lat},{lon}"

                print(f"\n  {Fore.RED}[!] GPS COORDINATES FOUND:{Style.RESET_ALL}")
                print(f"      Lat: {lat}, Lon: {lon}")
                print(f"      Maps: {maps_url}")
                results["gps_decimal"] = {"lat": lat, "lon": lon, "maps_url": maps_url}
            except Exception as e:
                print(f"  GPS parse error: {e}")

    except ImportError:
        print(f"  {Fore.YELLOW}exifread not installed — run: pip install exifread{Style.RESET_ALL}")
    except Exception as e:
        print(f"  {Fore.RED}{e}{Style.RESET_ALL}")

    # Also check with Pillow for PNG/TIFF
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS

        with Image.open(path) as img:
            print(f"\n  Format: {img.format}  Mode: {img.mode}  Size: {img.size}")
            results["format"] = img.format
            results["mode"] = img.mode
            results["size"] = img.size

            exif_data = img._getexif() if hasattr(img, "_getexif") else None
            if exif_data:
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)
                    if tag not in results:
                        results[str(tag)] = str(value)

            # PNG tEXt / iTXt chunks
            info = img.info
            if info:
                print(f"\n  {Fore.GREEN}Image info chunks:{Style.RESET_ALL}")
                for k, v in info.items():
                    if isinstance(v, (str, int, float)):
                        print(f"    {k}: {str(v)[:120]}")
                        results[f"info_{k}"] = str(v)
    except ImportError:
        pass
    except Exception:
        pass

    return results


# ── PDF ───────────────────────────────────────────────────────────────────────

def extract_pdf_metadata(path: str) -> dict:
    section(f"PDF Metadata — {os.path.basename(path)}")
    results = {}

    try:
        import PyPDF2

        with open(path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            meta = reader.metadata or {}

        rows = []
        for key, val in meta.items():
            clean_key = key.lstrip("/")
            rows.append([clean_key, str(val)[:120]])
            results[clean_key] = str(val)

            if clean_key == "Author" and val:
                print(f"\n  {Fore.RED}[!] Author leaked: {val}{Style.RESET_ALL}")
            if clean_key == "Creator" and val:
                print(f"  Creator (software): {val}")

        if rows:
            print(tabulate(rows, tablefmt="simple"))
        else:
            print("  No metadata fields found.")

        print(f"\n  Pages: {len(reader.pages)}")
        print(f"  Encrypted: {reader.is_encrypted}")
        results["page_count"] = len(reader.pages)
        results["encrypted"] = reader.is_encrypted

    except ImportError:
        print(f"  {Fore.YELLOW}PyPDF2 not installed — run: pip install PyPDF2{Style.RESET_ALL}")
    except Exception as e:
        print(f"  {Fore.RED}{e}{Style.RESET_ALL}")

    return results


# ── DOCX / Office Open XML ───────────────────────────────────────────────────

def extract_docx_metadata(path: str) -> dict:
    section(f"DOCX/XLSX/PPTX Metadata — {os.path.basename(path)}")
    results = {}

    try:
        with zipfile.ZipFile(path) as z:
            namelist = z.namelist()

            # Core properties
            if "docProps/core.xml" in namelist:
                with z.open("docProps/core.xml") as f:
                    tree = ET.parse(f)
                    root = tree.getroot()

                ns = {
                    "cp": "http://schemas.openxmlformats.org/package/2006/metadata/core-properties",
                    "dc": "http://purl.org/dc/elements/1.1/",
                    "dcterms": "http://purl.org/dc/terms/",
                }
                fields = {
                    "Title":          root.find("dc:title", ns),
                    "Subject":        root.find("dc:subject", ns),
                    "Creator":        root.find("dc:creator", ns),
                    "Keywords":       root.find("cp:keywords", ns),
                    "Description":    root.find("dc:description", ns),
                    "Last Modified By": root.find("cp:lastModifiedBy", ns),
                    "Created":        root.find("dcterms:created", ns),
                    "Modified":       root.find("dcterms:modified", ns),
                    "Revision":       root.find("cp:revision", ns),
                }
                rows = []
                for label, elem in fields.items():
                    if elem is not None and elem.text:
                        rows.append([label, elem.text])
                        results[label] = elem.text
                        if label in ("Creator", "Last Modified By"):
                            print(f"\n  {Fore.RED}[!] {label}: {elem.text}{Style.RESET_ALL}")
                if rows:
                    print(tabulate(rows, tablefmt="simple"))

            # App properties (software)
            if "docProps/app.xml" in namelist:
                with z.open("docProps/app.xml") as f:
                    tree = ET.parse(f)
                    root = tree.getroot()
                ns2 = {"ep": "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"}
                app = root.find("ep:Application", ns2)
                ver = root.find("ep:AppVersion", ns2)
                company = root.find("ep:Company", ns2)
                if app is not None:
                    print(f"\n  Application: {app.text}")
                    results["Application"] = app.text
                if ver is not None:
                    results["AppVersion"] = ver.text
                if company is not None and company.text:
                    print(f"  {Fore.RED}[!] Company: {company.text}{Style.RESET_ALL}")
                    results["Company"] = company.text

            # List embedded objects
            embedded = [n for n in namelist if n.startswith("word/embeddings/") or "embeddings" in n]
            if embedded:
                print(f"\n  {Fore.YELLOW}Embedded objects: {embedded}{Style.RESET_ALL}")
                results["embedded_objects"] = embedded

    except zipfile.BadZipFile:
        print(f"  {Fore.RED}Not a valid ZIP/Office document{Style.RESET_ALL}")
    except Exception as e:
        print(f"  {Fore.RED}{e}{Style.RESET_ALL}")

    return results


# ── Generic file ──────────────────────────────────────────────────────────────

def generic_metadata(path: str) -> dict:
    section(f"File System Metadata — {os.path.basename(path)}")
    stat = os.stat(path)
    results = {
        "size_bytes": stat.st_size,
        "created":    datetime.fromtimestamp(stat.st_ctime).isoformat(),
        "modified":   datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "accessed":   datetime.fromtimestamp(stat.st_atime).isoformat(),
    }
    rows = [
        ["Size",     f"{stat.st_size:,} bytes"],
        ["Created",  results["created"]],
        ["Modified", results["modified"]],
        ["Accessed", results["accessed"]],
    ]
    print(tabulate(rows, tablefmt="simple"))

    # Detect file type by magic bytes
    with open(path, "rb") as f:
        magic = f.read(16)
    signatures = {
        b"\xff\xd8\xff":         "JPEG image",
        b"\x89PNG\r\n\x1a\n":   "PNG image",
        b"GIF87a":               "GIF image",
        b"GIF89a":               "GIF image",
        b"%PDF":                 "PDF document",
        b"PK\x03\x04":          "ZIP / Office Open XML",
        b"\xd0\xcf\x11\xe0":    "OLE2 / Legacy Office (DOC/XLS/PPT)",
        b"\x49\x49\x2a\x00":    "TIFF image (little-endian)",
        b"\x4d\x4d\x00\x2a":    "TIFF image (big-endian)",
    }
    for sig, desc in signatures.items():
        if magic.startswith(sig):
            print(f"  Magic bytes: {desc}")
            results["file_type"] = desc
            break

    return results


def main():
    parser = argparse.ArgumentParser(description="Metadata Extractor (OSINT)")
    parser.add_argument("-f", "--file", required=True, help="File to analyse")
    parser.add_argument("-o", "--output", help="Save results to JSON")
    args = parser.parse_args()

    path = args.file
    if not os.path.exists(path):
        print(f"{Fore.RED}File not found: {path}{Style.RESET_ALL}")
        return

    ext = Path(path).suffix.lower()
    print(f"\n{Fore.CYAN}  Metadata Extractor — {os.path.basename(path)}{Style.RESET_ALL}  |  {datetime.utcnow().isoformat()}Z")

    results = {}
    results["filesystem"] = generic_metadata(path)

    if ext in (".jpg", ".jpeg", ".tif", ".tiff", ".png", ".heic", ".webp"):
        results["image"] = extract_image_metadata(path)
    elif ext == ".pdf":
        results["pdf"] = extract_pdf_metadata(path)
    elif ext in (".docx", ".xlsx", ".pptx", ".odt", ".ods"):
        results["office"] = extract_docx_metadata(path)
    else:
        print(f"\n  {Fore.YELLOW}Unknown extension '{ext}' — attempting image EXIF anyway.{Style.RESET_ALL}")
        results["image"] = extract_image_metadata(path)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n{Fore.GREEN}Saved to {args.output}{Style.RESET_ALL}")


if __name__ == "__main__":
    main()
