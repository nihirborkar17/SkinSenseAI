"""
inference.py — SkinNet inference engine
Supports:
  - Single model inference with TTA (5-view averaging)
  - Ensemble of multiple checkpoints
  - Grad-CAM saliency heatmaps for explainability
  - Compatible with updated dataset.py (Albumentations >= 1.4)
"""

import io
import numpy as np
from PIL import Image

import torch
import torch.nn.functional as F

from dataset import (
    get_val_transforms, get_tta_transforms,
    CLASS_NAMES, CLASS_INFO, IDX_TO_LABEL, SEVERITY_LABELS,
)
from model import load_model, SEVERITY_WEIGHTS


# ── Image preprocessing ────────────────────────────────────────────────────────
def preprocess_image(image_input, img_size: int = 224) -> torch.Tensor:
    """
    Accepts: PIL.Image | bytes | file-like object
    Returns: (1, 3, H, W) float32 tensor, ImageNet-normalised
    """
    if isinstance(image_input, bytes):
        image_input = io.BytesIO(image_input)
    if not isinstance(image_input, Image.Image):
        image_input = Image.open(image_input)
    pil = image_input.convert("RGB")
    img_np = np.array(pil)
    tensor = get_val_transforms(img_size)(image=img_np)["image"].unsqueeze(0)
    return tensor


# ── TTA inference ──────────────────────────────────────────────────────────────
def tta_predict(model, image: Image.Image, device: str, img_size: int = 224) -> np.ndarray:
    """Averages softmax probabilities over 5 augmented views. Returns (1, 7) array."""
    img_np = np.array(image.convert("RGB"))
    probs_list = []
    model.eval()
    with torch.no_grad():
        for t in get_tta_transforms(img_size):
            tensor = t(image=img_np)["image"].unsqueeze(0).to(device)
            probs_list.append(model(tensor)["probs"].detach().cpu().numpy())
    return np.mean(probs_list, axis=0)


# ── Result builder ─────────────────────────────────────────────────────────────
def build_prediction_result(probs_np: np.ndarray) -> dict:
    """
    Converts raw (1,7) or (7,) probability array into a structured result dict.
    Severity is the probability-weighted sum of per-class risk levels (1–4).
    """
    p = probs_np.flatten()

    sev_weights   = SEVERITY_WEIGHTS.numpy()
    severity_score = float(np.dot(p, sev_weights))
    sev_bucket    = min(4, max(1, round(severity_score)))

    top_idx   = int(np.argmax(p))
    top_class = IDX_TO_LABEL[top_idx]

    ranked = [
        {
            "class":       CLASS_NAMES[i],
            "full_name":   CLASS_INFO[CLASS_NAMES[i]]["full"],
            "probability": round(float(p[i]) * 100, 2),
            "color":       CLASS_INFO[CLASS_NAMES[i]]["color"],
        }
        for i in np.argsort(p)[::-1]
    ]

    return {
        "top_class":       top_class,
        "top_class_full":  CLASS_INFO[top_class]["full"],
        "confidence":      round(float(p[top_idx]) * 100, 2),
        "all_classes":     ranked,
        "severity_score":  round(severity_score, 2),
        "severity_label":  SEVERITY_LABELS[sev_bucket],
        "severity_level":  sev_bucket,
        "severity_color":  {1: "green", 2: "yellow", 3: "orange", 4: "red"}[sev_bucket],
        "disclaimer": (
            "This AI analysis is for informational purposes only and does not "
            "constitute medical advice. Please consult a qualified dermatologist."
        ),
    }


# ── Grad-CAM ───────────────────────────────────────────────────────────────────
class GradCAM:
    """
    Class Activation Mapping for EfficientNetB4.
    Hooks into the last convolutional block ('features') to produce
    a spatial heatmap highlighting which image regions drove the prediction.
    """

    def __init__(self, model, target_layer: str = "features"):
        self.model      = model
        self.gradients  = None
        self.activations = None
        self._hook(target_layer)

    def _hook(self, layer_name: str):
        target = dict(self.model.backbone.named_modules())[layer_name]

        def fwd(module, inp, out):
            self.activations = out.detach()

        def bwd(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        target.register_forward_hook(fwd)
        target.register_full_backward_hook(bwd)

    def generate(self, tensor: torch.Tensor, class_idx: int = None) -> np.ndarray:
        """Returns (H, W) heatmap, values 0–1."""
        self.model.eval()
        tensor = tensor.clone().requires_grad_(True)

        out = self.model(tensor)
        if class_idx is None:
            class_idx = out["logits"].argmax(dim=1).item()

        self.model.zero_grad()
        out["logits"][0, class_idx].backward()

        # Global average pool gradients → spatial weights
        weights = self.gradients.mean(dim=(2, 3), keepdim=True)
        cam     = F.relu((weights * self.activations).sum(dim=1).squeeze())
        cam     = cam.cpu().numpy().astype(np.float32)

        if cam.max() > 0:
            cam = (cam - cam.min()) / (cam.max() - cam.min())
        return cam


# ── SkinAnalyzer — main API class ─────────────────────────────────────────────
class SkinAnalyzer:
    """
    Drop-in inference class loaded by FastAPI at startup.

    Usage:
        analyzer = SkinAnalyzer(
            checkpoint_paths=["checkpoints/best_model.pth"],
            device="cuda",
            use_tta=True,
        )
        result = analyzer.analyze(pil_image_or_bytes)

    Result keys:
        top_class, top_class_full, confidence, all_classes,
        severity_score, severity_label, severity_level, severity_color,
        grad_cam (list of lists, resizable heatmap), disclaimer
    """

    def __init__(
        self,
        checkpoint_paths: list,
        device:    str  = "cpu",
        use_tta:   bool = True,
        img_size:  int  = 224,
    ):
        self.device    = device
        self.use_tta   = use_tta
        self.img_size  = img_size

        print(f"  [SkinAnalyzer] Loading {len(checkpoint_paths)} model(s) on {device}...")
        self.models = [load_model(ckpt, device) for ckpt in checkpoint_paths]
        for m in self.models:
            m.eval()

        # Grad-CAM uses first model only (lightweight)
        self.grad_cam = GradCAM(self.models[0])
        print(f"  [SkinAnalyzer] Ready. TTA={'on' if use_tta else 'off'}")

    def analyze(self, image_input) -> dict:
        """
        Accepts: PIL.Image | bytes | BytesIO
        Returns: structured prediction dict (see class docstring)
        """
        # Normalise input to PIL
        if isinstance(image_input, bytes):
            image_input = io.BytesIO(image_input)
        if not isinstance(image_input, Image.Image):
            image_input = Image.open(image_input)
        pil = image_input.convert("RGB")

        # Run inference (TTA + optional ensemble)
        all_probs = []
        for model in self.models:
            if self.use_tta:
                p = tta_predict(model, pil, self.device, self.img_size)
            else:
                tensor = preprocess_image(pil, self.img_size).to(self.device)
                with torch.no_grad():
                    p = model(tensor)["probs"].detach().cpu().numpy()
            all_probs.append(p)

        avg_probs = np.mean(all_probs, axis=0)
        result    = build_prediction_result(avg_probs)

        # Grad-CAM heatmap for top predicted class
        try:
            tensor    = preprocess_image(pil, self.img_size).to(self.device)
            top_idx   = CLASS_NAMES.index(result["top_class"])
            heatmap   = self.grad_cam.generate(tensor, class_idx=top_idx)
            result["grad_cam"] = heatmap.tolist()
        except Exception as e:
            print(f"  [GradCAM] Warning: {e}")
            result["grad_cam"] = None

        return result

    def analyze_bytes(self, image_bytes: bytes) -> dict:
        """Convenience wrapper for raw bytes (e.g. from FastAPI UploadFile.read())."""
        return self.analyze(io.BytesIO(image_bytes))