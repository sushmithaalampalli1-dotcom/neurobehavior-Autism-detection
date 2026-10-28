"""Multi-Slice and Tri-Planar 2.5D MRI Extraction Utility for NeuroBehavior-ASD.

Extracts multi-slice and orthogonal tri-planar views from 3D NIfTI brain volumes:
1. Tri-Planar View: Axial (Z), Coronal (Y), and Sagittal (X) mid-slices stacked into a (224, 224, 3) 2.5D volume.
2. Multi-Slice Axial Stack: Equidistant parallel axial slices across subcortical and cortical structures.
3. Multi-Channel 2.5D Feature Representation:
   - Channel 1: Normalized structural slice
   - Channel 2: Spatial gradient magnitude (cortical boundary / sulcal morphology)
   - Channel 3: Adaptive local contrast (CLAHE, deep subcortical nuclei & corpus callosum)
"""
from pathlib import Path
from typing import Tuple, Optional
import numpy as np
from PIL import Image
from scipy.ndimage import sobel
import cv2

try:
    import nibabel as nib
    NIBABEL_AVAILABLE = True
except ImportError:
    nib = None
    NIBABEL_AVAILABLE = False


class MultiSlice25DExtractor:
    """Extracts and formats 2.5D multi-channel and multi-slice representations."""

    TARGET_SIZE = (224, 224)

    @classmethod
    def create_25d_feature_channels(cls, gray_image: Image.Image) -> np.ndarray:
        """Transform a 2D grayscale slice into a rich 3-channel 2.5D structural tensor.
        
        Channel 1: Normalized anatomical tissue intensity
        Channel 2: Spatial gradient magnitude (cortical boundary / gray-white matter interface)
        Channel 3: Contrast-Limited Adaptive Histogram Equalization (CLAHE, subcortical definition)
        
        Output shape: (224, 224, 3), float32 in [0.0, 1.0]
        """
        # Ensure grayscale and target dimension
        if gray_image.mode != "L":
            gray_image = gray_image.convert("L")
        if gray_image.size != cls.TARGET_SIZE:
            gray_image = gray_image.resize(cls.TARGET_SIZE, Image.Resampling.BILINEAR)

        arr_u8 = np.array(gray_image, dtype=np.uint8)
        arr_f32 = arr_u8.astype(np.float32) / 255.0

        # Channel 1: Raw intensity
        ch1 = arr_f32

        # Channel 2: Sobel spatial gradient magnitude
        dx = sobel(arr_f32, axis=0)
        dy = sobel(arr_f32, axis=1)
        grad = np.sqrt(dx**2 + dy**2)
        g_min, g_max = grad.min(), grad.max()
        ch2 = (grad - g_min) / (g_max - g_min + 1e-6)

        # Channel 3: CLAHE adaptive contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        ch3_u8 = clahe.apply(arr_u8)
        ch3 = ch3_u8.astype(np.float32) / 255.0

        # Stack into (224, 224, 3)
        tensor_25d = np.stack([ch1, ch2, ch3], axis=-1).astype(np.float32)
        return tensor_25d

    @classmethod
    def extract_triplanar_from_nifti(cls, nifti_path: Path) -> np.ndarray:
        """Extract orthogonal Tri-Planar views (Axial, Coronal, Sagittal) from a 3D NIfTI volume.
        
        Returns: (224, 224, 3) float32 tensor
        """
        if not NIBABEL_AVAILABLE:
            raise ImportError("NiBabel is required to extract slices from 3D NIfTI volumes.")

        img = nib.load(str(nifti_path))
        data = img.get_fdata()

        if data.ndim == 2:
            # Already 2D slice
            im = Image.fromarray(((data - data.min()) / (data.max() - data.min() + 1e-6) * 255).astype(np.uint8))
            return cls.create_25d_feature_channels(im)

        # 3D Volume: Extract mid-slices along each anatomical axis
        nx, ny, nz = data.shape[:3]
        mid_x = nx // 2  # Sagittal
        mid_y = ny // 2  # Coronal
        mid_z = nz // 2  # Axial

        sagittal = data[mid_x, :, :]
        coronal = data[:, mid_y, :]
        axial = data[:, :, mid_z]

        def normalize_and_resize(plane_data):
            p_min, p_max = plane_data.min(), plane_data.max()
            norm = ((plane_data - p_min) / (p_max - p_min + 1e-6) * 255).astype(np.uint8)
            im = Image.fromarray(norm).resize(cls.TARGET_SIZE, Image.Resampling.BILINEAR)
            return np.array(im, dtype=np.float32) / 255.0

        ch_axial = normalize_and_resize(axial)
        ch_coronal = normalize_and_resize(coronal)
        ch_sagittal = normalize_and_resize(sagittal)

        triplanar_tensor = np.stack([ch_axial, ch_coronal, ch_sagittal], axis=-1).astype(np.float32)
        return triplanar_tensor


def extract_25d_from_png(image_path: Path) -> np.ndarray:
    """Convenience helper to extract 2.5D multi-channel tensor from a PNG image."""
    with Image.open(image_path) as img:
        return MultiSlice25DExtractor.create_25d_feature_channels(img)

