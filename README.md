# SkinSenseAI  
**AI-Assisted Skin Health Risk Assessment with Explainable Retrieval-Augmented Intelligence**

---

## Overview

SkinSenseAI is a modular AI system designed to assist in early risk awareness of common dermatological conditions through multimodal analysis and explainable retrieval-augmented generation (RAG).

The platform combines:

- Computer vision–based image classification  
- Structured metadata processing  
- Optional prescription parsing  
- Context-aware medical document retrieval  

to generate interpretable outputs that prioritize education, transparency, and safety.

⚠️ **Important:** SkinSenseAI is not a diagnostic system. It is strictly an educational support tool and does not replace licensed medical consultation.

---

## System Objectives

SkinSenseAI is engineered to:

- Detect probable skin condition categories from user-submitted images
- Provide medically grounded educational explanations
- Estimate a severity index to guide urgency awareness
- Reduce uncertainty through adaptive follow-up questioning
- Maintain explainability using source-backed retrieval

---

## Core Features

### 📸 CNN-Based Skin Image Classification
Deep learning inference pipeline built with TensorFlow/Keras for condition category prediction.

### 🧾 Prescription Parsing (Optional)
OCR-driven extraction of prescription data for contextual analysis and explanation.

### 🧠 Retrieval-Augmented Explanations (RAG)
Medical knowledge retrieval using vector similarity search with FAISS and LangChain, ensuring outputs are grounded in curated clinical documents.

### 📊 Severity Scoring Engine
Heuristic + model-confidence-based scoring mechanism to communicate potential urgency.

### 💬 Adaptive AI Questionnaire
Dynamic follow-up questioning to reduce ambiguity and improve interpretability.

### 🔍 Explainable Outputs
Citations from retrieved medical sources included in responses to enhance trust and transparency.

### 🔐 Privacy-First Architecture
User-controlled data lifecycle with secure inter-service communication.

---

## Architecture Overview

SkinSenseAI follows a decoupled, multi-service architecture:

- **Frontend**: User interaction, validation, result visualization  
- **Backend API Layer**: Request orchestration, validation, rate limiting  
- **AI Service Layer**: Model inference, vector retrieval, OCR processing  

This separation ensures scalability, maintainability, and clear responsibility boundaries.

---

## Technology Stack

### Frontend
- React  
- TypeScript (strict mode)  
- Vite  
- TanStack Query  
- Zod (runtime schema validation)

### Backend
- Node.js  
- Express  
- RESTful API design  
- Rate limiting & validation middleware  

### AI & Machine Learning
- Python  
- TensorFlow / Keras  
- CNN-based image classification  
- LangChain  
- FAISS vector store  
- OCR pipeline for prescription parsing  

---

## Repository Structure
SkinSenseAI/<br>
├── SkinSenseAI-frontend/ # React + TypeScript client<br>
├── skinsenseai-backend/ # Node.js + Express API<br>
├── ai-services/ # Python ML & RAG services<br>
├── docs/ # Architecture, research & documentation<br>
├── LICENSE<br>
└── README.md<br>

---

## Safety, Ethics & Responsible AI

SkinSenseAI integrates safety principles aligned with responsible AI-assisted healthcare systems:

- Explicit consent and disclaimer gate  
- Confidence-aware predictions (uncertainty handling)  
- No definitive diagnosis or treatment recommendation  
- Escalation prompts for high-risk outputs  
- Awareness of model bias across diverse skin tones  
- Transparent retrieval citations  

---

## Data Privacy & Security

- Images processed ephemerally unless explicit consent is provided  
- No persistent storage without user approval  
- User-initiated deletion supported  
- Secure service-to-service communication  
- Minimal data retention policy  

---

## Intended Use

SkinSenseAI is designed for:

- Educational awareness  
- Risk understanding  
- Research demonstration  
- AI system experimentation in medical support contexts  

It is not intended for clinical deployment.

---

## License

Licensed under the MIT License.  
See the `LICENSE` file for details.

---

## Disclaimer

SkinSenseAI does not provide medical diagnoses, prescriptions, or treatment plans.  
Always consult a qualified healthcare professional for medical concerns.

---

## Contributors

SkinSenseAI Team 
Nihir Borkar | Sakshi Khangar | Sanika Kharat
