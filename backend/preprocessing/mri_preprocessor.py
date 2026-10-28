"""MRI Preprocessing module using NiBabel for NIfTI image handling.

Designed for structural T1-weighted MRI volumes from ABIDE I and ABIDE II datasets.
Target classification:
    DX_GROUP = 1 (Autism / ASD)
    DX_GROUP = 2 (Control / Typical Development)
"""
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np

# Optional import of nibabel for environments where it is being installed
try:
    import nibabel as nib
    NIBABEL_AVAILABLE = True
except ImportError:
    nib = None
    NIBABEL_AVAILABLE = False


class MRIPreprocessor:
    """Preprocessor for 3D structural brain MRI scans in NIfTI format."""

    ALLOWED_EXTENSIONS = {".nii", ".nii.gz", ".png"}
    STANDARD_SHAPE = (224, 224)  # Target input for 2D CNN

    @classmethod
    def is_valid_mri_filename(cls, filename: str) -> bool:
        """Check if file extension matches valid MRI formats (NIfTI or 2D PNG)."""
        lower = filename.lower()
        return lower.endswith(".nii") or lower.endswith(".nii.gz") or lower.endswith(".png")

    @classmethod
    def inspect_mri_file(cls, file_path: Path) -> Dict[str, Any]:
        """Inspect and validate MRI file attributes (NIfTI or 2D PNG)."""
        if not file_path.exists():
            raise FileNotFoundError(f"MRI file not found at: {file_path}")

        if not cls.is_valid_mri_filename(file_path.name):
            raise ValueError("Invalid file format. Supported formats: .nii, .nii.gz, .png")

        # Handle 2D PNG images
        if file_path.name.lower().endswith(".png"):
            from PIL import Image
            try:
                with Image.open(file_path) as img:
                    w, h = img.size
                    mode = img.mode
                return {
                    "file_name": file_path.name,
                    "file_size_bytes": file_path.stat().st_size,
                    "dimensions": [w, h],
                    "data_type": mode,
                    "is_2d_slice": True,
                    "validation_status": "Passed 2D PNG brain MRI inspection",
                }
            except Exception as exc:
                return {
                    "file_name": file_path.name,
                    "validation_status": f"Corrupted PNG image: {str(exc)}",
                    "error": True,
                }

        # Handle NIfTI files
        if not NIBABEL_AVAILABLE:
            return {
                "nibabel_installed": False,
                "file_name": file_path.name,
                "file_size_bytes": file_path.stat().st_size,
                "status": "NiBabel library pending installation. Header metadata inspection deferred.",
            }

        try:
            img = nib.load(str(file_path))
            header = img.header
            shape = list(img.shape)
            zooms = [float(z) for z in header.get_zooms()]
            data_type = str(header.get_data_dtype())

            return {
                "nibabel_installed": True,
                "file_name": file_path.name,
                "file_size_bytes": file_path.stat().st_size,
                "dimensions": shape,
                "voxel_sizes_mm": zooms,
                "data_type": data_type,
                "is_3d_volume": len(shape) >= 3,
                "affine_shape": list(img.affine.shape),
                "validation_status": "Passed NIfTI format inspection",
            }
        except Exception as exc:
            return {
                "nibabel_installed": True,
                "file_name": file_path.name,
                "validation_status": f"Corrupted or invalid NIfTI file: {str(exc)}",
                "error": True,
            }

    @classmethod
    def normalize_intensity(cls, volume: np.ndarray) -> np.ndarray:
        """Apply min-max or z-score normalization to 3D volume.
        
        Placeholder for preprocessing pipeline before future model inference.
        """
        # Exclude background zero-voxels if calculating z-score
        mask = volume > 0
        if not np.any(mask):
            return volume

        mean = np.mean(volume[mask])
        std = np.std(volume[mask])
        if std > 0:
            normalized = np.zeros_like(volume, dtype=np.float32)
            normalized[mask] = (volume[mask] - mean) / std
            return normalized
        return volume.astype(np.float32)
