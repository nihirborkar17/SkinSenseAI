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

// Add HAM10000 disease mappings
const HAM10000_CONDITIONS: Record<
  string,
  {
    fullName: string;
    severity: "low" | "medium" | "high";
    chatEnabled: boolean;
    description: string;
  }
> = {
  melanoma: {
    fullName: "Melanoma",
    severity: "high",
    chatEnabled: true,
    description:
      "Melanoma is a serious form of skin cancer that develops in melanocytes (pigment-producing cells). Early detection is critical. Characterized by asymmetric moles with irregular borders, multiple colors, and diameter larger than 6mm. Requires immediate medical evaluation and often surgical removal.",
  },
  "melanocytic nevus": {
    fullName: "Melanocytic Nevus",
    severity: "low",
    chatEnabled: true,
    description:
      "A melanocytic nevus (commonly known as a mole) is a benign growth of melanocytes. Most are harmless, but monitoring for changes is important. Regular self-examination can help detect any suspicious changes that may require medical attention.",
  },
  "melanocytic nevi": {
    fullName: "Melanocytic Nevus",
    severity: "low",
    chatEnabled: true,
    description:
      "A melanocytic nevus (commonly known as a mole) is a benign growth of melanocytes. Most are harmless, but monitoring for changes is important. Regular self-examination can help detect any suspicious changes that may require medical attention.",
  },
  "basal cell carcinoma": {
    fullName: "Basal Cell Carcinoma",
    severity: "medium",
    chatEnabled: true,
    description:
      "Basal cell carcinoma is the most common type of skin cancer. It rarely spreads but can be locally invasive. Appears as a pearly or waxy bump, flat flesh-colored or brown scar-like lesion. Treatment is highly effective when caught early, usually involving surgical removal or topical treatments.",
  },
  "actinic keratosis": {
    fullName: "Actinic Keratosis",
    severity: "medium",
    chatEnabled: true,
    description:
      "Actinic keratosis (also called solar keratosis) is a precancerous skin lesion caused by sun damage. Appears as rough, scaly patches on sun-exposed areas. While not cancer itself, it can develop into squamous cell carcinoma if left untreated. Treatment options include cryotherapy, topical medications, or photodynamic therapy.",
  },
  "actinic keratoses": {
    fullName: "Actinic Keratosis",
    severity: "medium",
    chatEnabled: true,
    description:
      "Actinic keratosis (also called solar keratosis) is a precancerous skin lesion caused by sun damage. Appears as rough, scaly patches on sun-exposed areas. While not cancer itself, it can develop into squamous cell carcinoma if left untreated. Treatment options include cryotherapy, topical medications, or photodynamic therapy.",
  },
  "benign keratosis": {
    fullName: "Benign Keratosis",
    severity: "low",
    chatEnabled: true,
    description:
      "Benign keratosis (seborrheic keratosis) is a non-cancerous skin growth that appears with age. Often looks like a wart or stuck-on appearance. No treatment is necessary unless for cosmetic reasons or if it becomes irritated. Common in adults over 50.",
  },
  "benign keratosis-like lesions": {
    fullName: "Benign Keratosis",
    severity: "low",
    chatEnabled: true,
    description:
      "Benign keratosis (seborrheic keratosis) is a non-cancerous skin growth that appears with age. Often looks like a wart or stuck-on appearance. No treatment is necessary unless for cosmetic reasons or if it becomes irritated. Common in adults over 50.",
  },
  dermatofibroma: {
    fullName: "Dermatofibroma",
    severity: "low",
    chatEnabled: true,
    description:
      "Dermatofibroma is a common benign fibrous nodule of the skin. Usually appears as a small, firm, raised bump that may be reddish-brown. Often found on the legs. Harmless and rarely requires treatment unless bothersome or for cosmetic reasons.",
  },
  "vascular lesion": {
    fullName: "Vascular Lesion",
    severity: "low",
    chatEnabled: true,
    description:
      "Vascular lesions are abnormalities of blood vessels in the skin, including hemangiomas, angiomas, and telangiectasias. Most are benign. Appearance varies from red or purple spots to raised bumps. Treatment depends on type, location, and symptoms, ranging from observation to laser therapy.",
  },
  "vascular lesions": {
    fullName: "Vascular Lesion",
    severity: "low",
    chatEnabled: true,
    description:
      "Vascular lesions are abnormalities of blood vessels in the skin, including hemangiomas, angiomas, and telangiectasias. Most are benign. Appearance varies from red or purple spots to raised bumps. Treatment depends on type, location, and symptoms, ranging from observation to laser therapy.",
  },
}; // Educational Service Class
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
  enrichPrediction(condition: string, confidence: number): AnalysisResult {
    /* NORMALIZE CONDITION NAME 
    - JSON keys are lowercase: 'eczema', 'psoriasis', etc
    - Need consistent matching
  */
    const normalizedCondition = condition.toLowerCase().trim();

    // Check HAM10000 conditions FIRST
    const ham10000Match = HAM10000_CONDITIONS[normalizedCondition];

    let metadata;

    if (ham10000Match) {
      // ✅ USE HAM10000 METADATA
      logger.info(`Matched HAM10000 condition: ${normalizedCondition}`);
      metadata = {
        condition: ham10000Match.fullName,
        urgencyLevel: ham10000Match.severity,
        requiresImmediateAttention: ham10000Match.severity === "high",
        demoDescription: ham10000Match.description,
      };
    } else {
      // ✅ FALLBACK to old disease metadata
      logger.info(`Using legacy disease metadata for: ${normalizedCondition}`);
      metadata = this.getDiseaseMetadata(normalizedCondition);
    }

    /* Determines if chat should be available
    - Disease is in our database
    - Confidence is above threshold (AI is reasonably sure)
  */
    const chatAvailable = true;

    // BUILD ANALYSIS RESULT
    const result: AnalysisResult = {
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
        ? "Chat enabled - Use /api/chat endpoint for RAG-powered Q&A"
        : metadata.requiresImmediateAttention
          ? "URGENT: Seek immediate medical attention"
          : "Confidence too low for chat - consult healthcare professional",
    };

    logger.debug(`Enriched prediction for ${condition}`, {
      normalizedCondition,
      confidence,
      urgencyLevel: result.urgency_level,
      chatAvailable,
      requiresAttention: result.requires_immediate_attention,
    });

    return result;
  } // Normalize condition-name - Converts AI output to our database keys
  private normalizeConditionName(condition: string): string {
    // Step 1: Convert to lowercase
    let normalized = condition.toLowerCase();

    // Step 2: Handle special cases / aliases
    const aliases: Record<string, string> = {
      "atopic dermatitis": "eczema",
      atopic_dermatitis: "eczema",
      "contact dermatitis": "dermatitis",
      contact_dermatitis: "dermatitis",
      "acne vulgaris": "acne",
      acne_vulgaris: "acne",
      "fungal infection": "fungal_infection",
      ringworm: "fungal_infection",
      "athlete's foot": "fungal_infection",
      tinea: "fungal_infection",
    };

    if (aliases[normalized]) {
      normalized = aliases[normalized];
    }

    // Step 3: Replace spaces with underscores
    normalized = normalized.replace(/\\s+/g, "_");

    // Step 4: Remove special characters
    normalized = normalized.replace(/[^a-z0-9_]/g, "");

    return normalized;
  }

  // Get disease metadata
  private getDiseaseMetadata(normalizeCondition: string): DiseaseMetadata {
    // Try to get disease info from database
    const metadata = this.diseaseDatabase[normalizeCondition];
    if (metadata) {
      return metadata;
    }

    // Fallback to unknown
    const unknownMetadata = this.diseaseDatabase["unknown"];
    if (unknownMetadata) {
      logger.warn(
        `Disease not found: ${normalizeCondition}, using 'unknown' profile`,
      );
      return unknownMetadata;
    }

    // Last Resort: Hardcoded fallback -> this should never happen if diseases.json is correct
    logger.error(`Critical: No metadata found for ${normalizeCondition}`);
    return {
      condition: "Unknown Condition",
      urgencyLevel: "high",
      requiresImmediateAttention: false,
      chatEnabled: false,
      demoDescription:
        "Unable to identify condition. Please consult a healthcare professional.",
    };
  }

  // Get demo RAG response (Replace this with actual RAG API call when ready!)
  getDemoRAGResponse(disease: string, question: string): string {
    const response: Record<string, string> = {
      eczema: `**Demo RAG Response for Eczema:**
      Based on medical documentation, here's what you should know:

      ${
        question.toLowerCase().includes("treat")
          ? "**Treatment:** Keep skin moisturized with fragrance-free lotions. Avoid harsh soaps and hot water. Use topical corticosteroids as prescribed by your doctor. Consider antihistamines for severe itching."
          : question.toLowerCase().includes("cause")
            ? "**Causes:** Eczema is caused by a combination of genetic factors and environmental triggers including allergens, irritants, stress, and climate changes."
            : "**General Info:** Eczema is a chronic inflammatory skin condition. Consult a dermatologist for personalized treatment."
      }

      *Note: This is demo data. Real RAG will provide comprehensive, sourced medical information.*`,

      fungal_infection: `**Demo RAG Response for Fungal Infection:**

      ${
        question.toLowerCase().includes("treat")
          ? "**Treatment:** Apply antifungal cream (clotrimazole, miconazole) twice daily for 2-4 weeks. Keep area clean and dry. Wear breathable clothing. Complete full treatment course even if symptoms improve."
          : "**General Info:** Fungal infections are contagious. Avoid sharing personal items. If OTC treatments don't work after 2 weeks, see a doctor."
      }

      *Note: Demo response - Real RAG will provide detailed, evidence-based answers with sources.*`,
    };
    const normalizedDisease = this.normalizeConditionName(disease);

    return (
      response[normalizedDisease] ||
      `**Demo RAG Response:**\n\nThis is a simulated response for "${disease}".\n\nQuestion: ${question}\n\n*Real RAG integration coming soon - will provide comprehensive medical information from official documentation.*`
    );
  }

  // Get all supported conditions - Returns list of all conditions
  getSupportedConditions(): string[] {
    return Object.keys(this.diseaseDatabase)
      .filter((key) => key !== "unknown")
      .map((key) => this.diseaseDatabase[key].condition);
  }
  // Check if condition suppports chat
  isChatEnabled(condition: string): boolean {
    const normalized = this.normalizeConditionName(condition);
    const metadata = this.diseaseDatabase[normalized];
    return true;
  }
}

// EXPORT SINGLETON INSTANCE - Single instance used throughout the app
export const educationService = new EducationService();
