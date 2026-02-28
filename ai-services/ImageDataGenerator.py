import os
import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.utils import class_weight

# --- 1. ENHANCED MEDICAL PREPROCESSING ---
def skin_sense_preprocessor(image):
    # Ensure image is in uint8 for OpenCV operations
    img = image.astype(np.uint8)
    
    # A. Dull Razor (Hair Removal)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)
    _, mask = cv2.threshold(blackhat, 10, 255, cv2.THRESH_BINARY)
    img = cv2.inpaint(img, mask, 1, cv2.INPAINT_TELEA)
    
    # B. CLAHE (Contrast Limited Adaptive Histogram Equalization)
    # This solves the lighting issues that often confuse 'nv' with 'mel'
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    img = cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
    
    # C. Higher Resolution Resize
    # 448x448 allows ResNet50 to see much finer lesion details
    img = cv2.resize(img, (448, 448), interpolation=cv2.INTER_CUBIC)
    
    # D. Normalization (HAM10000 Specific)
    mu = np.array([0.763, 0.546, 0.570]) 
    sigma = np.array([0.141, 0.153, 0.170])
    return (img / 255.0 - mu) / sigma

# --- 2. BALANCED GENERATOR CLASS ---
class BalancedDataGenerator(tf.keras.utils.Sequence):
    def __init__(self, directory, batch_size=7): # Adjusted for 448x448 memory usage
        self.directory = directory
        self.batch_size = batch_size
        self.classes = sorted(os.listdir(directory))
        self.class_indices = {cls: i for i, cls in enumerate(self.classes)}
        self.files_by_class = {
            cls: [os.path.join(directory, cls, f) for f in os.listdir(os.path.join(directory, cls))]
            for cls in self.classes
        }
        # Augmentation specifically for medical skin lesions
        self.datagen = ImageDataGenerator(
            horizontal_flip=True, 
            vertical_flip=True, 
            rotation_range=90,
            zoom_range=0.1
        )

    def __len__(self):
        return int(np.ceil(max(len(v) for v in self.files_by_class.values()) / self.batch_size))

    def __getitem__(self, idx):
        batch_x, batch_y = [], []
        # Ensures every batch has an equal representation of all 7 classes
        samples_per_class = max(1, self.batch_size // len(self.classes))
        
        for cls_name, files in self.files_by_class.items():
            selected = np.random.choice(files, samples_per_class)
            for f in selected:
                img = cv2.imread(f)
                if img is None: continue
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                img = skin_sense_preprocessor(img)
                batch_x.append(img)
                batch_y.append(self.class_indices[cls_name])
                
        return np.array(batch_x), tf.keras.utils.to_categorical(batch_y, 7)

# --- 3. EXPORT VARIABLES ---
data_path = r'E:\Projects\SkinSenseAI\ai-services\Dataset\skin_data'
# Note: Low batch size recommended for 448x448 resolution to avoid OOM errors
train_generator = BalancedDataGenerator(data_path, batch_size=7)
val_generator = BalancedDataGenerator(data_path, batch_size=7)

# Calculate Weights (Still useful for Focal Loss)
all_labels = []
for cls in os.listdir(data_path):
    all_labels.extend([cls] * len(os.listdir(os.path.join(data_path, cls))))
weights = class_weight.compute_class_weight('balanced', classes=np.unique(all_labels), y=all_labels)
dict_weights = {i: w for i, w in enumerate(weights)}