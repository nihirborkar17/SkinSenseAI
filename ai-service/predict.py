"""
predict.py — Standalone image prediction script.
Use this to test the model directly on any image without starting the API.

Usage:
    python predict.py --image path/to/skin_image.jpg
    python predict.py --image path/to/skin_image.jpg --checkpoint checkpoints/best_model.pth
    python predict.py --image path/to/skin_image.jpg --no-tta
"""

import argparse
import json
from pathlib import Path

import torch
from PIL import Image

from core.inference import SkinAnalyzer
from core.dataset import CLASS_INFO, SEVERITY_LABELS


def predict(image_path: str, checkpoint: str, use_tta: bool, device: str):

    # ── Load image ─────────────────────────────────────────────────────────────
    path = Path(image_path)
    if not path.exists():
        print(f"ERROR: Image not found: {image_path}")
        return

    print(f"\n{'='*52}")
    print(f"  SkinAI Prediction")
    print(f"{'='*52}")
    print(f"  Image      : {path.name}")
    print(f"  Checkpoint : {checkpoint}")
    print(f"  Device     : {device}")
    print(f"  TTA        : {'on (5-view averaging)' if use_tta else 'off'}")
    print(f"{'='*52}\n")

    pil_image = Image.open(image_path).convert("RGB")
    print(f"  Image size : {pil_image.width} x {pil_image.height} px")

    # ── Load model + run inference ─────────────────────────────────────────────
    print("\n  Loading model...")
    analyzer = SkinAnalyzer(
        checkpoint_paths=[checkpoint],
        device=device,
        use_tta=use_tta,
    )

    print("  Running inference...\n")
    result = analyzer.analyze(pil_image)

    # ── Print results ──────────────────────────────────────────────────────────
    sev_color = {
        "Low":      "green",
        "Moderate": "yellow",
        "High":     "orange",
        "Critical": "red",
    }

    print(f"{'='*52}")
    print(f"  PREDICTION RESULT")
    print(f"{'='*52}")
    print(f"  Condition  : {result['top_class_full']} ({result['top_class']})")
    print(f"  Confidence : {result['confidence']}%")
    print(f"  Severity   : {result['severity_label']} (level {result['severity_level']}/4)")
    print(f"  Sev. score : {result['severity_score']:.2f}")
    print()

    # Confidence bar chart
    print("  All class probabilities:")
    print("  " + "-"*44)
    for c in result["all_classes"]:
        bar_len = int(c["probability"] / 2.5)   # scale to 40 chars
        bar     = "#" * bar_len + "-" * (40 - bar_len)
        marker  = " <-- TOP" if c["class"] == result["top_class"] else ""
        print(f"  {c['class']:<5}  [{bar}]  {c['probability']:>5.1f}%{marker}")

    print()
    print(f"  {result['disclaimer']}")
    print(f"{'='*52}\n")

    # ── Return as dict (useful when imported as a module) ──────────────────────
    return result


def predict_for_api(
    image_input,
    checkpoint: str = "checkpoints/best_model.pth",
    use_tta:    bool = True,
    device:     str  = None,
) -> dict:
    """
    Programmatic interface — called by main.py / ai.service.ts flow.

    Args:
        image_input : PIL.Image | bytes | file path string
        checkpoint  : path to best_model.pth
        use_tta     : whether to use test-time augmentation
        device      : "cuda" | "cpu" | None (auto-detect)

    Returns dict with keys:
        success, prediction (condition, confidence, severity_label,
        severity_level, severity_color, severity_score, top_class,
        top_predictions, disclaimer)
    """
    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"

    if isinstance(image_input, str):
        image_input = Image.open(image_input).convert("RGB")

    analyzer = SkinAnalyzer(
        checkpoint_paths=[checkpoint],
        device=device,
        use_tta=use_tta,
    )
    result = analyzer.analyze(image_input)

    return {
        "success": True,
        "prediction": {
            "condition":      result["top_class_full"],
            "confidence":     round(result["confidence"] / 100, 4),
            "severity_label": result["severity_label"],
            "severity_level": result["severity_level"],
            "severity_color": result["severity_color"],
            "severity_score": result["severity_score"],
            "top_class":      result["top_class"],
            "top_predictions": [
                {
                    "condition":  c["full_name"],
                    "class_code": c["class"],
                    "confidence": round(c["probability"] / 100, 4),
                    "color":      c["color"],
                }
                for c in result["all_classes"]
            ],
            "disclaimer": result["disclaimer"],
        },
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Predict skin condition from image")
    parser.add_argument(
        "--image", required=True,
        help="Path to skin lesion image (JPEG or PNG)"
    )
    parser.add_argument(
        "--checkpoint", default="checkpoints/best_model.pth",
        help="Path to model checkpoint (default: checkpoints/best_model.pth)"
    )
    parser.add_argument(
        "--no-tta", action="store_true",
        help="Disable test-time augmentation (faster but less accurate)"
    )
    parser.add_argument(
        "--device", default=None,
        help="Device to run on: cuda | cpu (default: auto-detect)"
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Output raw JSON result instead of formatted text"
    )
    args = parser.parse_args()

    device = args.device or ("cuda" if torch.cuda.is_available() else "cpu")
    result = predict(
        image_path  = args.image,
        checkpoint  = args.checkpoint,
        use_tta     = not args.no_tta,
        device      = device,
    )

    if args.json and result:
        result_clean = {k: v for k, v in result.items() if k != "grad_cam"}
        print(json.dumps(result_clean, indent=2))