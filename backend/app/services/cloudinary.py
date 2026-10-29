# app/services/cloudinary_service.py
import cloudinary.uploader
from fastapi import UploadFile, HTTPException

def upload_contract_to_cloudinary(file: UploadFile) -> dict:
    """Uploads a PDF/DOCX to Cloudinary and returns the URL and public_id."""
    try:
        # Cloudinary expects the file to be read as bytes or a stream
        upload_result = cloudinary.uploader.upload(
            file.file,
            resource_type="auto", # Automatically detects PDF/DOCX
            folder="contract_reviewer", # Keeps your Cloudinary dashboard organized
            use_filename=True
        )
        return {
            "url": upload_result.get("secure_url"),
            "public_id": upload_result.get("public_id")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {str(e)}")