# SkinSenseAI 
AI-Assisted Skin Health Assessment with Explainable RAG Support

Overview

SkinSenseAI is an AI-powered skin health assistant designed to support awareness and early risk assessment of common skin conditions using computer vision and retrieval-augmented generation (RAG).

The system analyzes user-provided skin images along with structured metadata and optional prescriptions to:

Identify possible skin conditions

Provide educational explanations using trusted medical sources

Generate a severity score to guide next steps

Assist users in understanding prescriptions through a questionnaire-based AI chat

⚠️ Important: SkinSenseAI is not a medical diagnostic tool. It is intended strictly for educational and informational purposes and does not replace professional medical advice.

Key Features

📸 Image-based skin condition detection (CNN-based inference)

🧾 Optional prescription parsing for contextual understanding

🧠 RAG-powered explanations using curated medical documents

📊 Severity scoring system to assess urgency

💬 Adaptive questionnaire to reduce uncertainty

🔍 Explainable outputs with source citations

🔐 Privacy-aware design with user-controlled data deletion

Tech Stack
Frontend

React 

TypeScript (strict mode)

Vite

TanStack Query

Zod (runtime validation)

Backend

Node.js

Express

REST APIs

Rate limiting & validation middleware

AI & ML

Python

TensorFlow / Keras

CNN-based image classification

LangChain

FAISS vector store

OCR for prescription parsing

Project Structure
SkinSenseAI/
├── skinsenseai-frontend/       # React + TypeScript
├── skinsenseai-backend/        # Node.js + Express API
├── ai-services/    # Python AI & RAG services
├── docs/           # Architecture & reports
├── LICENSE
└── README.md

Medical Safety & Ethics

Explicit user consent & disclaimer gate

Confidence-aware outputs (model uncertainty handling)

No definitive diagnosis or treatment prescriptions

Emergency escalation suggestions for high-risk cases

Bias awareness toward skin tone diversity

Data Privacy

Images processed temporarily

No long-term storage without consent

User-initiated data deletion supported

Secure API communication between services

License

This project is licensed under the MIT License.
See the LICENSE file for details.

Disclaimer

SkinSenseAI does not provide medical diagnoses, prescriptions, or treatment plans.
Always consult a qualified medical professional for health-related concerns.

Contributors

SkinSenseAI Team