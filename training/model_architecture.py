"""3D Convolutional Neural Network (3D CNN) Architecture for MRI Biomarker Detection.

Designed for binary classification:
    DX_GROUP = 1 (Autism / ASD)
    DX_GROUP = 2 (Control / Non-autism)

Input volume: (128, 128, 128, 1) - Structural T1w MRI
"""
from typing import Tuple

try:
    import tensorflow as tf
    from tensorflow.keras import layers, models
    TF_AVAILABLE = True
except ImportError:
    tf = None
    models = None
    layers = None
    TF_AVAILABLE = False


def build_3d_cnn(input_shape: Tuple[int, int, int, int] = (128, 128, 128, 1)) -> "models.Model":
    """Construct a 3D Convolutional Neural Network for structural MRI classification.
    
    Architecture:
    - 4 Convolutional blocks (Conv3D + BatchNorm + ReLU + MaxPool3D)
    - Global Average Pooling 3D (reduces parameter count and prevents overfitting)
    - Dense projection layer with Dropout (0.4)
    - Single Sigmoid output unit for binary classification:
        Probability p in [0, 1] representing ASD (Class 1) vs Control (Class 0)
    """
    if not TF_AVAILABLE:
        raise ImportError(
            "TensorFlow is not installed in this environment. "
            "Please install tensorflow using 'pip install tensorflow' to build the model."
        )

    inputs = layers.Input(shape=input_shape, name="mri_structural_volume")

    # Block 1
    x = layers.Conv3D(32, kernel_size=3, padding="same", name="conv1")(inputs)
    x = layers.BatchNormalization(name="bn1")(x)
    x = layers.ReLU(name="relu1")(x)
    x = layers.MaxPooling3D(pool_size=2, name="pool1")(x)

    # Block 2
    x = layers.Conv3D(64, kernel_size=3, padding="same", name="conv2")(x)
    x = layers.BatchNormalization(name="bn2")(x)
    x = layers.ReLU(name="relu2")(x)
    x = layers.MaxPooling3D(pool_size=2, name="pool2")(x)

    # Block 3
    x = layers.Conv3D(128, kernel_size=3, padding="same", name="conv3")(x)
    x = layers.BatchNormalization(name="bn3")(x)
    x = layers.ReLU(name="relu3")(x)
    x = layers.MaxPooling3D(pool_size=2, name="pool3")(x)

    # Block 4
    x = layers.Conv3D(256, kernel_size=3, padding="same", name="conv4")(x)
    x = layers.BatchNormalization(name="bn4")(x)
    x = layers.ReLU(name="relu4")(x)
    x = layers.MaxPooling3D(pool_size=2, name="pool4")(x)

    # Classification Head
    x = layers.GlobalAveragePooling3D(name="gap3d")(x)
    x = layers.Dense(128, activation="relu", name="fc1")(x)
    x = layers.Dropout(0.4, name="dropout")(x)

    # Output: Binary probability of ASD (DX_GROUP = 1) vs Control (DX_GROUP = 2)
    outputs = layers.Dense(1, activation="sigmoid", name="asd_probability")(x)

    model = models.Model(inputs=inputs, outputs=outputs, name="NeuroBehavior_3D_CNN")
    return model
