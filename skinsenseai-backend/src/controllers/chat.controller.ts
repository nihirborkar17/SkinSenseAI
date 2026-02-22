/* Chat Controller
  - Handles chat request to RAG model

  What this controller does : 
  1. Receives question about a diagnosed disease
  2. Forwards to AI team's RAG endpoint 
  3. Returns AI-generated Answer

  flow: 
  frontend -> Express Route -> current Controller 
  -> AI Service (RAG) -> Response
*/ 

import type { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai.service.js';
import { educationService } from '../services/education.service.js';
import { successResponse } from '../utils/response.utils.js';
import { logger } from '../utils/logger.utils.js';
import { AppError } from '../middleware/error.middleware.js';
import { sourceMapsEnabled } from 'node:process';
import { isDeepStrictEqual } from 'node:util';

/* Chat with RAG controller
    Handles POST /api/chat request
    
    Request Format:
    - Content-Type: application/json
    - Body: 
        {
            disease: "eczema",
            question: "How to treat?",
            consentId: "uuid"
        }   
    Response Format:
    {
        success: true,
        message: "Answer generated successfully",
        data: {
            question : "How to treat?",
            answer: "Based on medical documentation...",
            disease: "eczema",
            sources: [...],      // From RAG
            isDemoResponse: true // Indicates this is demo data
        }
    }
*/ 
export const chatWithRAG = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try{
        // Step 1. Extract Request Data
        const { disease, question, consentId } = req.body;

        // Log the request
        logger.info('Chat request received', {
            disease, 
            questionLength: question.length,
            consentId,
        });

        // Step 2: Check if chat is enabled for this disease
        const chatEnabled = educationService.isChatEnabled(disease);

        if(!chatEnabled) {
            throw new AppError(
                'Chat is not available for this condition. Please consult a healthcare professional!',
                403, 
                { disease, reason: "Chat disabled for this condition"}
            );
        }

        // Step 3: Call RAG Service
        // TODO: Must replace with RAG API call when AI team is ready
        // For now, Using Demo response for testing
        // Later, we will call the aiService.chatWithRAG() call
        logger.info('Generating demo RAG Response...');

        const demoAnswer = educationService.getDemoRAGResponse(disease, question);

        const chatResponse = {
            question: question,
            answer: demoAnswer,
            disease: disease,
            source: [],
            isDemoResponse: true,
            note: 'This is demo response. Real RAG integration is in process.',
        };

        // // RAG API 
        // logger.info('Forwarding to RAG service...');

        // const ragResponse = await aiService.chatWithRAG(
        //     disease,
        //     question,
        //     consentId
        // );
        // if(!ragResponse.success || !.ragResponse.answer) {
        //     throw new AppError(
        //         'Invalid response from RAG server',
        //         500,
        //         { ragResponse }
        //     );
        // }

        // const chatResponse = {
        //     question: question,
        //     answer: ragResponse.answer,
        //     disease: disease,
        //     source: ragResponse.sources || [],
        //     context: ragResponse.context,
        //     isDemoResponse: false,
        // };

        // Step 4: Log success
        logger.info('Chat response generated', {
            disease, 
            answerLength: chatResponse.answer.length,
            isDemoResponse: chatResponse.isDemoResponse,
        });

        // Step 5: Send Response
        res.status(200).json(
            successResponse(
                chatResponse,
                'Answer generated successfully'
            )
        );

    }
    catch (error) {
        // ERROR HANDLING
        logger.error('Chat request failed', error);
        next(error);
    }
};

/* GET CHAT HISTORY

could store chat history in database, allowing users to review previous Q&A

Requires:
 - Database to store conversation
 - User authentication
 - Session management
*/ 

export const getChatHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try{
        // placeHolder for future code implementation
        res.status(200).json(
            successResponse(
                { history: [] },
                'Chat history endpoint - not implemented yet'
            )
        );
    }
    catch (error) {
        next(error);
    }
};