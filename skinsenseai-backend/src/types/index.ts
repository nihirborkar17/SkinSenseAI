/*
    Central export for all types
*/

export * from './request.types';
export * from './response.types';

// Express Request extensions
import type { Request } from 'express';
import type { AnalyzeRequest, ChatRequest } from './request.types';

export interface AnalyzeRequestBody extends Request {
    body: AnalyzeRequest;
}

export interface ChatRequestBody extends Request {
    body: ChatRequest;
}