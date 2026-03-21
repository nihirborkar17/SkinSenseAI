"""
SkinNet — EfficientNetB4 backbone with a custom multi-class head.
Outputs 7-class softmax probabilities + severity score.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models
from dataset import CLASS_NAMES, CLASS_INFO, SEVERITY_LABELS, IDX_TO_LABEL


# ── Severity weights per class (0–4 scale) ────────────────────────────────────
SEVERITY_WEIGHTS = torch.tensor(
    [CLASS_INFO[c]["severity"] for c in CLASS_NAMES], dtype=torch.float32
)


# ── Classifier head ────────────────────────────────────────────────────────────
class ClassifierHead(nn.Module):
    def __init__(self, in_features: int, num_classes: int = 7, dropout: float = 0.4):
        super().__init__()
        self.head = nn.Sequential(
            nn.Linear(in_features, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(512, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout * 0.75),
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        return self.head(x)


# ── Main model ─────────────────────────────────────────────────────────────────
class SkinNet(nn.Module):
    """
    EfficientNetB4 pretrained on ImageNet, fine-tuned for HAM10000.
    Supports staged unfreezing for transfer learning.
    """

    def __init__(
        self,
        num_classes: int = 7,
        pretrained: bool = True,
        dropout: float = 0.4,
        freeze_backbone: bool = True,
    ):
        super().__init__()

        weights = models.EfficientNet_B4_Weights.IMAGENET1K_V1 if pretrained else None
        backbone = models.efficientnet_b4(weights=weights)

        # Remove the original classifier
        in_features = backbone.classifier[1].in_features
        backbone.classifier = nn.Identity()
        self.backbone = backbone

        self.head = ClassifierHead(in_features, num_classes, dropout)
        self.num_classes = num_classes

        if freeze_backbone:
            self._freeze_backbone()

    # ── Freeze/unfreeze helpers ────────────────────────────────────────────────
    def _freeze_backbone(self):
        for p in self.backbone.parameters():
            p.requires_grad = False

    def unfreeze_top_n_blocks(self, n: int):
        """Progressively unfreeze last N MBConv blocks for fine-tuning."""
        blocks = list(self.backbone.features.children())
        for block in blocks[-n:]:
            for p in block.parameters():
                p.requires_grad = True

    def unfreeze_all(self):
        for p in self.backbone.parameters():
            p.requires_grad = True

    # ── Forward ───────────────────────────────────────────────────────────────
    def forward(self, x: torch.Tensor) -> dict:
        features = self.backbone(x)
        logits = self.head(features)
        probs = F.softmax(logits, dim=1)
        return {"logits": logits, "probs": probs}

    # ── Inference helper ───────────────────────────────────────────────────────
    @torch.no_grad()
    def predict(self, x: torch.Tensor, device: str = "cpu") -> list[dict]:
        """
        Returns a list of per-image prediction dicts.
        Each dict contains:
            top_class, confidence, all_probs, severity_score, severity_label
        """
        self.eval()
        x = x.to(device)
        out = self.forward(x)
        probs = out["probs"].cpu()

        sev_w = SEVERITY_WEIGHTS.to(probs.device)
        severity_scores = (probs * sev_w).sum(dim=1)  # weighted expected severity

        results = []
        for i in range(probs.shape[0]):
            p = probs[i]
            top_idx = p.argmax().item()
            top_class = IDX_TO_LABEL[top_idx]
            confidence = p[top_idx].item()

            raw_severity = severity_scores[i].item()         # 1.0 – 4.0 range
            sev_bucket = min(4, max(1, round(raw_severity)))

            results.append({
                "top_class": top_class,
                "top_class_full": CLASS_INFO[top_class]["full"],
                "confidence": round(confidence * 100, 2),    # percentage
                "all_probs": {
                    CLASS_NAMES[j]: round(p[j].item() * 100, 2)
                    for j in range(len(CLASS_NAMES))
                },
                "severity_score": round(raw_severity, 2),
                "severity_label": SEVERITY_LABELS[sev_bucket],
                "severity_color": {1: "green", 2: "yellow", 3: "orange", 4: "red"}[sev_bucket],
            })
        return results


# ── Label-smoothing loss ───────────────────────────────────────────────────────
class LabelSmoothingCrossEntropy(nn.Module):
    def __init__(self, smoothing: float = 0.1, weight: torch.Tensor = None):
        super().__init__()
        self.smoothing = smoothing
        self.weight = weight

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        n_classes = logits.size(-1)
        log_probs = F.log_softmax(logits, dim=-1)

        # Smooth targets
        with torch.no_grad():
            smooth_targets = torch.full_like(log_probs, self.smoothing / (n_classes - 1))
            smooth_targets.scatter_(1, targets.unsqueeze(1), 1.0 - self.smoothing)

        loss = -(smooth_targets * log_probs)

        if self.weight is not None:
            w = self.weight.to(logits.device)
            loss = loss * w[targets].unsqueeze(1)

        return loss.sum(dim=-1).mean()


# ── Model factory ──────────────────────────────────────────────────────────────
def build_model(
    num_classes: int = 7,
    pretrained: bool = True,
    dropout: float = 0.4,
    freeze_backbone: bool = True,
) -> SkinNet:
    return SkinNet(num_classes, pretrained, dropout, freeze_backbone)


def load_model(checkpoint_path: str, device: str = "cpu") -> SkinNet:
    model = build_model(freeze_backbone=False)
    ckpt = torch.load(checkpoint_path, map_location=device)
    state = ckpt.get("model_state_dict", ckpt)
    model.load_state_dict(state)
    model.to(device)
    model.eval()
    return model