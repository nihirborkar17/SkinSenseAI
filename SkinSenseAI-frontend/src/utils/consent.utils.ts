import type { ConsentState } from '../types/consent.types';

// Creates a unique identifier for this consent session.

export const generateConsentId = () : string => {
    return crypto.randomUUID(); // Generates Random UUID
};

// - Save Consent to session storage
// - Saves to sessionStorage with key 'skinSenseConsent'

export const saveConsentToSession = (consent : ConsentState) : void => {
    sessionStorage.setItem('skinSenseConsent', JSON.stringify(consent));
};

// Get Consent from session storage
// Retrieves previously saved consent data from sessionStorage

export const getConsentFromSession = () : ConsentState | null => {

    const stored = sessionStorage.getItem('skinSenseConsent');
    if(!stored) return null;
    try {
        return JSON.parse(stored);
    }catch{
        return null;
    }
};

// Clear consent from session storage
// Remove consent data from sessionStorage.
// Deletes the 'skinSenseConsent' key from sessionStorage, 
// like hitting 'reset' btn.
export const clearConsentFromSession = () : void => {
    sessionStorage.removeItem('skinSenseConsent');
};

// Validate Consent
// Checks if consent data is comlete and valid.
// Verifies ALL required fields exist and are truthy.
export const validateConsent = (consent : ConsentState | null) : boolean => {
    if(!consent) return false;

    return (
        consent.consentId &&
        consent.medicalDisclaimerAgreed &&
        consent.dataProcessingAgreed &&
        consent.timestamp
    ) as boolean;
};