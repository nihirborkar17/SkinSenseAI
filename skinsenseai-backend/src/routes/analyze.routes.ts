/*
    Analyze Routes
    1. Creates an Express Router
    2. Defines URL paths
    3. Applies middleware in correct order
    4. Connects to controller functions

    Middleware execution order (important): 
     => Request -> upload.single() -> validateImageUpload 
    -> analyzeImage controller -> Response     
*/ 

import { Router } from "express";
import { upload } from "../middleware/upload.middleware.js";
import { validateImageUpload } from "../middleware/validation.middleware.js";
import { analyzeImage, getAnalysisStatus } from "../controllers/analyze.controller.js";

// Create router instance
// Router is like an mini Express app

const router = Router();

/* POST /api/analyze
  - Main endpoint for image analysis
 */
router.post('/', 
    upload.single('image'),
    validateImageUpload,
    analyzeImage
);

// GET /api/analyze/status/:id
router.get(
    '/status/:id',
    getAnalysisStatus
);

export default router;
