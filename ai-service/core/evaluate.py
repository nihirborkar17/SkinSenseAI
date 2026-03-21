"""
evaluate.py — Full model evaluation report
Run this anytime to check your saved model's performance.

Usage:
    python evaluate.py --metadata_csv "Dataset/HAM10000_metadata.csv" 
                       --image_dirs "Dataset/HAM10000_images_part_1" "Dataset/HAM10000_images_part_2"
"""

import argparse
import numpy as np
import torch
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score,
    roc_auc_score, classification_report, confusion_matrix,
)
from dataset import build_loaders, CLASS_NAMES
from model import load_model


def evaluate(metadata_csv, image_dirs, checkpoint="checkpoints/best_model.pth",
             batch_size=16, img_size=224):

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\nDevice     : {device}")
    print(f"Checkpoint : {checkpoint}\n")

    # ── Load data (test split only) ────────────────────────────────────────────
    _, _, test_loader, _ = build_loaders(
        metadata_csv, image_dirs,
        batch_size=batch_size, img_size=img_size,
        num_workers=0, seed=42,
    )

    # ── Load model ─────────────────────────────────────────────────────────────
    model = load_model(checkpoint, device)
    model.eval()

    # ── Run inference ──────────────────────────────────────────────────────────
    all_labels, all_preds, all_probs = [], [], []
    print("Running inference on test set...")
    with torch.no_grad():
        for imgs, labels in test_loader:
            imgs = imgs.to(device)
            out  = model(imgs)
            all_labels.extend(labels.numpy())
            all_preds.extend(out["probs"].argmax(dim=1).cpu().numpy())
            all_probs.extend(out["probs"].detach().cpu().numpy())

    all_labels = np.array(all_labels)
    all_preds  = np.array(all_preds)
    all_probs  = np.array(all_probs)

    # ── Metrics ────────────────────────────────────────────────────────────────
    acc     = accuracy_score(all_labels, all_preds)
    bal_acc = balanced_accuracy_score(all_labels, all_preds)
    auc     = roc_auc_score(all_labels, all_probs, multi_class="ovr", average="macro")

    print("\n" + "="*55)
    print("  MODEL EVALUATION — TEST SET")
    print("="*55)
    print(f"  Overall Accuracy    : {acc*100:.2f}%  (target: 85%)")
    print(f"  Balanced Accuracy   : {bal_acc*100:.2f}%  (equal weight per class)")
    print(f"  Macro AUC-ROC       : {auc:.4f}  (target: 0.93+)")

    # Verdict
    print("\n  VERDICT:")
    if acc >= 0.85:
        print("  Overall accuracy >= 85% — TARGET MET")
    else:
        gap = (0.85 - acc) * 100
        print(f"  Overall accuracy {acc*100:.1f}% — {gap:.1f}pp below 85% target")
        print("  Run resume_train.py for more epochs to close the gap.")

    if bal_acc >= 0.80:
        print(f"  Balanced accuracy {bal_acc*100:.1f}% — STRONG (model handles rare classes well)")
    if auc >= 0.93:
        print(f"  AUC {auc:.3f} — EXCELLENT discrimination")

    # ── Per-class report ───────────────────────────────────────────────────────
    print("\n" + "="*55)
    print("  PER-CLASS BREAKDOWN")
    print("="*55)
    report = classification_report(
        all_labels, all_preds,
        target_names=CLASS_NAMES,
        digits=3,
        zero_division=0,
    )
    print(report)

    # ── Confusion matrix ───────────────────────────────────────────────────────
    cm = confusion_matrix(all_labels, all_preds)
    print("="*55)
    print("  CONFUSION MATRIX  (rows=actual, cols=predicted)")
    print("="*55)
    header = "        " + "  ".join(f"{c:>5}" for c in CLASS_NAMES)
    print(header)
    for i, row in enumerate(cm):
        row_str = "  ".join(f"{v:>5}" for v in row)
        print(f"  {CLASS_NAMES[i]:<5}   {row_str}")

    # ── What the numbers mean ──────────────────────────────────────────────────
    print("\n" + "="*55)
    print("  HOW TO READ THIS")
    print("="*55)
    print("  Precision : of all predictions for a class, how many were correct")
    print("  Recall    : of all actual cases, how many did the model find")
    print("  F1        : harmonic mean of precision and recall (0-1, higher=better)")
    print("  Support   : number of test samples for that class")
    print()
    print("  For a medical app, RECALL is most important —")
    print("  missing a real melanoma (low MEL recall) is worse than a false alarm.")
    print()

    # ── Per-class recall summary ───────────────────────────────────────────────
    from sklearn.metrics import recall_score
    recalls = recall_score(all_labels, all_preds, average=None, zero_division=0)
    print("  Per-class recall summary:")
    for i, cls in enumerate(CLASS_NAMES):
        bar_len = int(recalls[i] * 20)
        bar = "#" * bar_len + "-" * (20 - bar_len)
        flag = " <-- needs improvement" if recalls[i] < 0.70 else ""
        print(f"    {cls:<5}  [{bar}]  {recalls[i]*100:.1f}%{flag}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata_csv", required=True)
    parser.add_argument("--image_dirs", nargs="+", required=True)
    parser.add_argument("--checkpoint", default="checkpoints/best_model.pth")
    parser.add_argument("--batch_size", type=int, default=16)
    args = parser.parse_args()

    evaluate(
        metadata_csv=args.metadata_csv,
        image_dirs=args.image_dirs,
        checkpoint=args.checkpoint,
        batch_size=args.batch_size,
    )