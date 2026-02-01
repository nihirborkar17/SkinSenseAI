/*
* Request Types
*/
import type { Multer } from 'multer';
import type { Express } from 'express';

export interface AnalyzeRequest {
    consentId: string;
    timestamp?: string;
}

export interface ChatRequest {
    disease: string;
    question: string;
    consentId?: string;
}

export interface FileUpload extends Express.Multer.File {};