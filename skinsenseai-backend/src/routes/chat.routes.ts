/*
    Chat Routes
    - This file handles chat/Q&A functionality
    - User ask questions about their diagnosed condition
    - RAG model provides answer based on medical documentation
*/ 

import { Router } from "express";
import { validateChatRequest } from '../middleware/validation.middleware.js';
import { chatWithRAG, getChatHistory } from "../controllers/chat.controller.js";

// Create router instance
const router = Router();

/* POST /api/chat
- Main endpoint for RAG-powered chat
Request body:
  {
   disease: "eczema",          // Required - diagnosed condition
   question: "How to treat?",  // Required - user's question
   consentId: "uuid"           // Optional - for tracking
   }

Success response (200):
  {
    success: true,
    message: "Answer generated successfully",
    data: {
      question: "How to treat?",
      answer: "Based on medical documentation...",
      disease: "eczema",
      sources: [],
      isDemoResponse: true
    }
  }

  Error responses:
 - 400: Missing/invalid disease or question
 - 403: Chat disabled for this condition (e.g., melanoma)
 - 503: RAG service unavailable
 - 500: Server error
*/ 

router.post('/', // Path: /api/chat/
    validateChatRequest,
    chatWithRAG
);

// GET /api/chat/history -> Get user's chat history
router.get('/history', 
    // Auth middleware (going to work on this soon.),
    getChatHistory
);

export default router;