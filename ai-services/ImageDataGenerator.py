import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.utils import class_weight
import os

# Suppress TensorFlow optimization logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

def dull_razor_and_normalize(image):
    # image is passed as a float32 array [0, 255] by ImageDataGenerator
    img = image.astype(np.uint8)
    
    # --- STEP 1: Dull Razor Hair Removal ---
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
    _, mask = cv2.threshold(blackhat, 10, 255, cv2.THRESH_BINARY)
    dst = cv2.inpaint(img, mask, 1, cv2.INPAINT_TELEA)
    
    # --- STEP 2: Normalization ---
    return dst.astype(np.float32) / 255.0

# --- STEP 3: The Data Pipelines ---
target_size = (224, 224)
batch_size = 32
data_path = r'AI Integration\Dataset\skin_data'

# Training Generator with Augmentation
train_datagen = ImageDataGenerator(
    preprocessing_function=dull_razor_and_normalize,
    rotation_range=90,
    width_shift_range=0.1,
    height_shift_range=0.1,
    horizontal_flip=True,
    vertical_flip=True,
    fill_mode='nearest',
    validation_split=0.2  # Sets aside 20% of data for testing
)

# Load Training Data
train_generator = train_datagen.flow_from_directory(
    data_path,
    target_size=target_size,
    batch_size=batch_size,
    class_mode='categorical',
    subset='training'
)

# Load Validation Data (No augmentation needed for validation, just preprocessing)
val_generator = train_datagen.flow_from_directory(
    data_path,
    target_size=target_size,
    batch_size=batch_size,
    class_mode='categorical',
    subset='validation'
)

# --- STEP 4: Calculate Class Weights ---
# 1. Get labels
labels = train_generator.classes

# 2. Compute weights using sklearn
# The 'balanced' parameter calculates weight = total_samples / (n_classes * class_samples)
raw_weights = class_weight.compute_class_weight(
    class_weight='balanced',
    classes=np.unique(labels),
    y=labels
)

# 3. Clean and format for TensorFlow
# dict(enumerate()) maps the weights to the correct class index (0-6)
dict_weights = {int(i): float(w) for i, w in enumerate(raw_weights)}

print("-" * 30)
print(f"Found {train_generator.samples} training images.")
print(f"Found {val_generator.samples} validation images.")
print("Class Indices:", train_generator.class_indices)
print("Cleaned Class Weights:", dict_weights)
print("-" * 30)