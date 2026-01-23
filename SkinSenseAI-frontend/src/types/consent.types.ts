export interface ConsentState{
    consentId : string;
    medicalDisclaimerAgreed: boolean;
    dataProcessingAgreed: boolean;
    timestamp: string;
}

export interface ConsentContextType{
    consentData : ConsentState | null;
    setConsent : (data : ConsentState) => void;
    clearConsent : () => void;
    hasValidConsent : boolean;
}