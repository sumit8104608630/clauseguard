import os
import cloudinary
from dotenv import load_dotenv
load_dotenv()

CLOUDINARY_API_KEY = os.getenv("cloudinary_api_key")
CLOUDINARY_API_SECRET = os.getenv("cloudinary_api_secret")
CLOUDINARY_CLOUD_NAME = os.getenv("cloudinary_cloud_name")
cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True,
)

