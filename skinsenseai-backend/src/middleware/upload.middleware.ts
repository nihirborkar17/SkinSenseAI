/* 
    UPLOAD MIDDLEWARE
    Handle image file uploads from the frontend
    multer - middleware for handling multipart/form-data (file uploads)
*/
import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';

/*
    STORAGE CONFIGURATION
    multer.memoryStorage() means: 
    files are stored in RAM as Buffer Object
    Temporary - deleted after request completes
*/ 
const storage = multer.memoryStorage();


/*
    FILE FILTER FUNCTION
    validate file type before acceptiong upload
*/
const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) : void => {
    const allowedTypes = (
        process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg'
    ).split(',');
    if(allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }else{
        cb(new Error(`Invalid File type. Allowed types: ${allowedTypes.join(', ')}`));
    }
};

/* 
    MULTER CONFIGURATION
    this is main multer instance with all settings
    Export this to use in routes
*/

export const upload = multer ({
    storage: storage,
    // File size limits
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
    },
    // File Type Validation function 
    fileFilter: fileFilter
});

/*
    USAGE IN ROUTES - for references
    import { upload } from './middleware/upload.middleware';

    //Single file upload with field name 'image'
    app.post('/upload', upload.single('image'), (req, res) => {
        console.log(req.file.buffer); // Image data as Buffer
    });
*/
