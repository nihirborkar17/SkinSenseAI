/*
    Response Types
*/

// AI team Response Types
export interface AIPrediction {
  condition: string;
  confidence: number;
  top_predictions?: Array<{
    label: string;
    confidence: number;
  }>;
  severity?: "mild" | "moderate" | "severe";
  characteristics_detected?: string[];
  processing_time?: number;
}
export interface AIAnalyzeResponse {
  success: boolean;
  prediction: AIPrediction;
  metadata?: {
    model_version?: string;
    processing_time?: number;
  };
}

export interface AIChatResponse {
  success: boolean;
  answer: string;
  sources?: string[];
  context?: string;
}

// Our Enhanced Response Types
export interface AnalysisResult {
  // From AI prediction
  condition: string;
  confidence: number;
  
  // Metadata (from our service)
  urgency_level: 'low' | 'medium' | 'high';
  requires_immediate_attention: boolean;
  chat_available: boolean;

  // Demo content (will be replaced by RAG)
  description: string;

  // Note for frontend
  note?: string;
}

export interface StandardResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
    details?: any;
  };
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

/*
 * AI Error Response Types
 * Define what error reponses from AI API might look like
 */
export interface AIErrorResponse {
  success: false;
  message?: string;
  error?: string;
  details?: any;
}

/*
 * Generic API Error Data
 * Fallback type when we dont know exact error structure
 */
export type APIErrorData = AIErrorResponse | any;
