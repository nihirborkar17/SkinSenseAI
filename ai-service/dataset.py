"""
HAM10000 Dataset Loader & Preprocessing
Handles class imbalance via weighted sampling + SMOTE-style augmentation.
"""

import os
import numpy as np
import pandas as pd
from PIL import Image
from pathlib import Path
from collections import Counter

import torch
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
import torchvision.transforms as T
import albumentations as A
from albumentations.pytorch import ToTensorV2


# ── Class definitions ──────────────────────────────────────────────────────────
CLASS_NAMES = ["MEL", "NV", "BCC", "AK", "BKL", "DF", "VASC"]

CLASS_INFO = {
    "MEL":  {"full": "Melanoma",              "severity": 4, "color": "#E24B4A"},
    "NV":   {"full": "Melanocytic Nevus",     "severity": 1, "color": "#1D9E75"},
    "BCC":  {"full": "Basal Cell Carcinoma",  "severity": 4, "color": "#D85A30"},
    "AK":   {"full": "Actinic Keratosis",     "severity": 3, "color": "#BA7517"},
    "BKL":  {"full": "Benign Keratosis",      "severity": 1, "color": "#378ADD"},
    "DF":   {"full": "Dermatofibroma",        "severity": 1, "color": "#639922"},
    "VASC": {"full": "Vascular Lesion",       "severity": 2, "color": "#7F77DD"},
}

SEVERITY_LABELS = {1: "Low", 2: "Moderate", 3: "High", 4: "Critical"}

LABEL_TO_IDX = {cls: i for i, cls in enumerate(CLASS_NAMES)}
IDX_TO_LABEL = {i: cls for i, cls in enumerate(CLASS_NAMES)}


# ── Augmentation pipelines ─────────────────────────────────────────────────────
def get_train_transforms(img_size: int = 224):
    sz = (img_size, img_size)
    return A.Compose([
        A.RandomResizedCrop(size=sz, scale=(0.7, 1.0)),
        A.HorizontalFlip(p=0.5),
        A.VerticalFlip(p=0.3),
        A.ShiftScaleRotate(shift_limit=0.1, scale_limit=0.15, rotate_limit=30, p=0.6),
        A.OneOf([
            A.ElasticTransform(alpha=80, sigma=8, p=1.0),
            A.GridDistortion(p=1.0),
            A.OpticalDistortion(p=1.0),
        ], p=0.3),
        A.OneOf([
            A.GaussNoise(p=1.0),
            A.ISONoise(p=1.0),
        ], p=0.2),
        A.OneOf([
            A.MotionBlur(blur_limit=5, p=1.0),
            A.MedianBlur(blur_limit=5, p=1.0),
            A.GaussianBlur(blur_limit=5, p=1.0),
        ], p=0.2),
        A.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1, p=0.5),
        A.HueSaturationValue(hue_shift_limit=15, sat_shift_limit=25, val_shift_limit=15, p=0.4),
        A.CoarseDropout(
            num_holes_range=(1, 8),
            hole_height_range=(1, img_size // 10),
            hole_width_range=(1, img_size // 10),
            p=0.3
        ),
        A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ToTensorV2(),
    ])


def get_val_transforms(img_size: int = 224):
    return A.Compose([
        A.Resize(img_size, img_size, p=1.0),
        A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ToTensorV2(),
    ])


def get_tta_transforms(img_size: int = 224):
    """Test-Time Augmentation — 5 crops/flips averaged at inference."""
    transforms = [
        A.Compose([A.Resize(img_size, img_size, p=1.0),
                   A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                   ToTensorV2()]),
        A.Compose([A.Resize(img_size, img_size, p=1.0), A.HorizontalFlip(p=1.0),
                   A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                   ToTensorV2()]),
        A.Compose([A.Resize(img_size, img_size, p=1.0), A.VerticalFlip(p=1.0),
                   A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                   ToTensorV2()]),
        A.Compose([A.Resize(img_size, img_size, p=1.0), A.Rotate(limit=(90, 90), p=1.0),
                   A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                   ToTensorV2()]),
        A.Compose([A.Resize(img_size, img_size, p=1.0), A.Rotate(limit=(270, 270), p=1.0),
                   A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                   ToTensorV2()]),
    ]
    return transforms


# ── Dataset ────────────────────────────────────────────────────────────────────
class HAM10000Dataset(Dataset):
    """
    Expects:
        metadata_csv : path to HAM10000_metadata.csv
        image_dirs   : list of directories containing the JPEG images
    """

    def __init__(
        self,
        metadata_csv: str,
        image_dirs: list,
        split: str = "train",          # "train" | "val" | "test"
        transform=None,
        img_size: int = 224,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
        seed: int = 42,
    ):
        self.transform = transform
        self.img_size = img_size

        df = pd.read_csv(metadata_csv)

        # ── Diagnostics: show what's in the CSV ───────────────────────────────
        print(f"  CSV rows: {len(df)}")
        print(f"  CSV columns: {list(df.columns)}")
        print(f"  'dx' unique values: {sorted(df['dx'].unique())}")

        dx_map = {"mel":0,"nv":1,"bcc":2,"akiec":3,"ak":3,"bkl":4,"df":5,"vasc":6}
        df["label_idx"] = df["dx"].str.lower().map(dx_map)
        dropped = df["label_idx"].isna().sum()
        if dropped:
            print(f"  WARNING: {dropped} rows with unrecognized dx values dropped")
        df = df.dropna(subset=["label_idx"])
        df["label_idx"] = df["label_idx"].astype(int)

        # Build image path lookup
        self.img_lookup: dict[str, str] = {}
        for d in image_dirs:
            found = list(Path(d).glob("*.jpg"))
            print(f"  Found {len(found)} .jpg files in {d}")
            for p in found:
                self.img_lookup[p.stem] = str(p)

        # Filter rows that have an actual image file
        before = len(df)
        df = df[df["image_id"].isin(self.img_lookup)].reset_index(drop=True)
        print(f"  Matched {len(df)}/{before} metadata rows to image files")

        # Stratified split
        from sklearn.model_selection import train_test_split
        train_df, tmp_df = train_test_split(
            df, test_size=(val_ratio + test_ratio),
            stratify=df["label_idx"], random_state=seed
        )
        relative_val = val_ratio / (val_ratio + test_ratio)
        val_df, test_df = train_test_split(
            tmp_df, test_size=(1 - relative_val),
            stratify=tmp_df["label_idx"], random_state=seed
        )

        split_map = {"train": train_df, "val": val_df, "test": test_df}
        self.df = split_map[split].reset_index(drop=True)

        self.labels = self.df["label_idx"].values

    # ── Weighted sampler helper ────────────────────────────────────────────────
    def get_sampler(self) -> WeightedRandomSampler:
        counts = Counter(self.labels)
        total = sum(counts.values())
        class_weights = {cls: total / (len(counts) * cnt) for cls, cnt in counts.items()}
        sample_weights = [class_weights[lbl] for lbl in self.labels]
        return WeightedRandomSampler(
            weights=sample_weights,
            num_samples=len(sample_weights),
            replacement=True,
        )

    def get_class_weights(self) -> torch.Tensor:
        counts = Counter(self.labels)
        total = sum(counts.values())
        n_classes = len(CLASS_NAMES)
        # Use 1 as fallback count for any class missing from this split
        weights = [
            total / (n_classes * counts[i]) if counts[i] > 0 else 1.0
            for i in range(n_classes)
        ]
        print(f"  Class counts in split: { {CLASS_NAMES[i]: counts[i] for i in range(n_classes)} }")
        return torch.tensor(weights, dtype=torch.float32)

    # ── Core ───────────────────────────────────────────────────────────────────
    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_path = self.img_lookup[row["image_id"]]
        image = np.array(Image.open(img_path).convert("RGB"))

        if self.transform:
            augmented = self.transform(image=image)
            image = augmented["image"]
        else:
            image = T.ToTensor()(Image.fromarray(image))

        label = torch.tensor(row["label_idx"], dtype=torch.long)
        return image, label


# ── DataLoader factory ─────────────────────────────────────────────────────────
def build_loaders(
    metadata_csv: str,
    image_dirs: list,
    batch_size: int = 32,
    img_size: int = 224,
    num_workers: int = 4,
    seed: int = 42,
):
    train_ds = HAM10000Dataset(
        metadata_csv, image_dirs, split="train",
        transform=get_train_transforms(img_size), img_size=img_size, seed=seed
    )
    val_ds = HAM10000Dataset(
        metadata_csv, image_dirs, split="val",
        transform=get_val_transforms(img_size), img_size=img_size, seed=seed
    )
    test_ds = HAM10000Dataset(
        metadata_csv, image_dirs, split="test",
        transform=get_val_transforms(img_size), img_size=img_size, seed=seed
    )

    train_loader = DataLoader(
        train_ds, batch_size=batch_size, sampler=train_ds.get_sampler(),
        num_workers=num_workers, pin_memory=True, drop_last=True,
    )
    val_loader = DataLoader(
        val_ds, batch_size=batch_size, shuffle=False,
        num_workers=num_workers, pin_memory=True,
    )
    test_loader = DataLoader(
        test_ds, batch_size=batch_size, shuffle=False,
        num_workers=num_workers, pin_memory=True,
    )

    class_weights = train_ds.get_class_weights()
    return train_loader, val_loader, test_loader, class_weights