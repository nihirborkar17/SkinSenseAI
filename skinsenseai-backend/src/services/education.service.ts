/*
 * EDUCATION SERVICE (For RAG Integration)
 *  What this service does:
 * - Maps disease → urgency level
 * - Determines if immediate medical attention needed
 * - Enables/disables chat based on condition
 * - Provides demo descriptions for testing
 * 
 * What AI team's RAG will do LATER:
 * - Detailed descriptions
 * - Treatment recommendations
 * - Answer user questions dynamically
 * - Provide sources and citations
 */

import fs from "fs";
import path from "path";
import { AnalysisResult } from "../types/response.types.js";
import { logger } from "../utils/logger.utils.js";
import { fileURLToPath } from "url"; 

/*
  Disease Information Interface
  metadata only
*/
interface DiseaseMetadata {
  condition: string;
  urgencyLevel: "low" | "medium" | "high";
  requiresImmediateAttention: boolean;
  chatEnabled: boolean;
  demoDescription: string; // Temporary - will be removed when RAG is ready
}

/*
 * Disease Database Type
 * Maps disease keys to their educational content
 */
type DiseaseDatabase = Record<string, DiseaseMetadata>;

// Educational Service Class
class EducationService {
  
  // Disease database loaded from JSON file
  private diseaseDatabase: DiseaseDatabase;

  // Constructor - Loads disease information from JSON file on initialization
  constructor() {
    
    // Load diseases.json file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dataPath = path.join(__dirname, "../data/diseases.json");
    
    try {
      /*
        Read and parse JSON file
        fs.readFileSync:
        - Synchronous read (blocks until complete)
        - 'utf-8' encoding converst Buffer to string
        JSON.parse:
        - Converts JSON String to JavaScript object
      */

      const fileContent = fs.readFileSync(dataPath, "utf-8");
      this.diseaseDatabase = JSON.parse(fileContent) as DiseaseDatabase;

      logger.info("Education Service initialized (Minimal Mode)");
      logger.debug(
        `Loaded ${Object.keys(this.diseaseDatabase).length} disease profiles`,
      );
    } catch (error) {
      /*
        FALLBACK if file cannot be loaded
        This shouldn't happen in production, but prevents crashes
        If JSON file is missing or malformed, use empty database
      */
      logger.error("Failed to load disease database", error);
      this.diseaseDatabase = {};
    }
  }

  /*
    ENRICH PREDICTION
    - adds metadata to AI prediction

    @param condition - Disease name from AI
    @param confidenve - AI confidence score
    @return Complete analysis result with metadata
  */
  enrichPrediction(
    condition: string, 
    confidence: number
  ): AnalysisResult {
    /* NORMALIZE CONDITION NAME 
      - JSON keys are lowercase: 'eczema', 'psoriasis', etc
      - Need consistent matching
    */
    const normalizedCondition = this.normalizeConditionName(condition);
    const metadata = this.getDiseaseMetadata(normalizedCondition);

    /* Determines if chat should be available
      - Disease is in our database
      - Confidence is above threshold (AI is reasonably sure)
    */
    const chatAvailable = 
    metadata.chatEnabled && 
    confidence >= 0.5 &&
    !metadata.requiresImmediateAttention;

    // BUILD ANALYSIS RESULT 
    const result : AnalysisResult = {
      // from AI prediction
      condition: metadata.condition,
      confidence: confidence,

      // Metadata
      urgency_level: metadata.urgencyLevel,
      requires_immediate_attention: metadata.requiresImmediateAttention,
      chat_available: chatAvailable,

      // Demo content (temporary remove after RAG integration)
      description: metadata.demoDescription,

      // Note for frontend
      note: chatAvailable 
        ? 'Chat enabled - Use /api/chat endpoint for RAG-powered Q&A'
          : metadata.requiresImmediateAttention 
            ? 'URGENT: Seek immediate medical attention' 
            : 'Confidence too low for chat - consult healthcare professional',
    };

    logger.debug(`Enriched prediction for ${condition}`, {
      normalizedCondition,
      confidence,
      urgencyLevel: result.urgency_level,
      chatAvailable,
      requiresAttention: result.requires_immediate_attention,
    });

    return result;
  }
  
  // Normalize condition-name - Converts AI output to our database keys 
  private normalizeConditionName(condition: string): string {

    // Step 1: Convert to lowercase
    let normalized = condition.toLowerCase();

    // Step 2: Handle special cases / aliases
    const aliases: Record<string, string> = {
      'atopic dermatitis':'eczema',
      'atopic_dermatitis':'eczema',
      'contact dermatitis':'dermatitis',
      'contact_dermatitis':'dermatitis',
      'acne vulgaris':'acne',
      'acne_vulgaris':'acne',
      'fungal infection':'fungal_infection',
      'ringworm':'fungal_infection',
      'athlete\'s foot':'fungal_infection',
      'tinea':'fungal_infection',
    };

    if(aliases[normalized]){
      normalized = aliases[normalized];
    }

    // Step 3: Replace spaces with underscores
    normalized = normalized.replace(/\\s+/g, '_');

    // Step 4: Remove special characters
    normalized = normalized.replace(/[^a-z0-9_]/g, '');

    return normalized;
  }

  // Get disease metadata
  private getDiseaseMetadata(normalizeCondition: string) : DiseaseMetadata {
    // Try to get disease info from database
    const metadata = this.diseaseDatabase[normalizeCondition];
    if(metadata) {
      return metadata;
    }

    // Fallback to unknown
    const unknownMetadata = this.diseaseDatabase['unknown'];
    if(unknownMetadata) {
      logger.warn(`Disease not found: ${normalizeCondition}, using 'unknown' profile`);
      return unknownMetadata;
    }

    // Last Resort: Hardcoded fallback -> this should never happen if diseases.json is correct
    logger.error(`Critical: No metadata found for ${normalizeCondition}`);
    return {
      condition: 'Unknown Condition',
      urgencyLevel: 'high',
      requiresImmediateAttention: false,
      chatEnabled: false,
      demoDescription: 'Unable to identify condition. Please consult a healthcare professional.',
    };
  }

  // Get demo RAG response (Replace this with actual RAG API call when ready!)
  getDemoRAGResponse(disease: string, question : string): string {
    const response: Record<string, string> = {
      'eczema': `**Demo RAG Response for Eczema:**
      Based on medical documentation, here's what you should know:

      ${question.toLowerCase().includes('treat') ? 
        '**Treatment:** Keep skin moisturized with fragrance-free lotions. Avoid harsh soaps and hot water. Use topical corticosteroids as prescribed by your doctor. Consider antihistamines for severe itching.' :
        question.toLowerCase().includes('cause') ?
        '**Causes:** Eczema is caused by a combination of genetic factors and environmental triggers including allergens, irritants, stress, and climate changes.' :
        '**General Info:** Eczema is a chronic inflammatory skin condition. Consult a dermatologist for personalized treatment.'
      }

      *Note: This is demo data. Real RAG will provide comprehensive, sourced medical information.*`,

      'fungal_infection': `**Demo RAG Response for Fungal Infection:**

      ${question.toLowerCase().includes('treat') ?
        '**Treatment:** Apply antifungal cream (clotrimazole, miconazole) twice daily for 2-4 weeks. Keep area clean and dry. Wear breathable clothing. Complete full treatment course even if symptoms improve.' :
        '**General Info:** Fungal infections are contagious. Avoid sharing personal items. If OTC treatments don\'t work after 2 weeks, see a doctor.'
      }

      *Note: Demo response - Real RAG will provide detailed, evidence-based answers with sources.*`,
      };
      const normalizedDisease = this.normalizeConditionName(disease);

      return response[normalizedDisease] || 
        `**Demo RAG Response:**\n\nThis is a simulated response for "${disease}".\n\nQuestion: ${question}\n\n*Real RAG integration coming soon - will provide comprehensive medical information from official documentation.*`;
    }
  
  // Get all supported conditions - Returns list of all conditions 
  getSupportedConditions(): string[]{
    return Object.keys(this.diseaseDatabase)
      .filter(key => key !== 'unknown')
      .map(key=> this.diseaseDatabase[key].condition);
  }
  // Check if condition suppports chat
  isChatEnabled(condition: string) : boolean{
    const normalized = this.normalizeConditionName(condition);
    const metadata = this.diseaseDatabase[normalized];
    return metadata?.chatEnabled || false;
  }
}

// EXPORT SINGLETON INSTANCE - Single instance used throughout the app
export const educationService = new EducationService();
