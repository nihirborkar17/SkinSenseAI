// This file creates a React Context that manages consent state across the app.
// REACT CONTEXT - A way to share data between components without passing props.

import { createContext, useContext, useState, useEffect} from 'react';
import type { ReactNode } from 'react';
import type { ConsentState, ConsentContextType } from '../types/consent.types';
import {
    getConsentFromSession,
    saveConsentToSession,
    clearConsentFromSession,
    validateConsent
} from '../utils/consent.utils';

// Create the Context
// This creates the actual Context object.
const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

// Consent Provider Component ( make data, state, or services available )
// This component wraps your app and provides consent state to all children.
export const ConsentProvider = ({ children } : { children: ReactNode}) => {
    
    const [consentData, setConsentData] = useState<ConsentState | null>(null);

    // EFFECT - Load Consent from the sessionStorage on Mount
    // This runs ONCE when the component first renders. User might refresh the page and consent could be lost.
    useEffect(() => {
        const stored = getConsentFromSession();
        if(stored && validateConsent(stored)){
            setConsentData(stored);
        }
    }, []);

    // Function: setConsent 
    // Saves new consent data to BOTH state and sessionStorage.
    const setConsent = (data: ConsentState) => {
        // This triggers re-render of components using useConsent()
        setConsentData(data);

        // This ensure data survives page refresh
        saveConsentToSession(data);
    };

    // FUNCTION: clearConsent 
    //  Removes consent data from BOTH states and sessionStorage.
    const clearConsent = () => {
        setConsentData(null);
        clearConsentFromSession();
    };

    // COMPUTED VALUE: hasValidConsent
    // A boolean flag that tells us if current consent is valid.
    // Why Computed? -> we don't store this in state. Its calculated from consentData everytime.
    const hasValidConsent = validateConsent(consentData);

    // Context Value Object
    // This object is what components get when they call useConsent().
    const value : ConsentContextType = {
        consentData,
        setConsent,
        clearConsent,
        hasValidConsent
    };
    
    // Return: Context Provider
    // wraps children with ConsentContext.Provider.
    return (
        <ConsentContext.Provider value={value}>
            {children}
        </ConsentContext.Provider>
    );
};

// CUSTOM HOOK: useConsent
// A convenience hook to access the consent context.
export const useConsent = () : ConsentContextType => {
    const context = useContext(ConsentContext);
    // if context is undefined, we are outside the Provider
    if(!context) {
        throw new Error('useConsent must be used within ConsentProvider');
    }
    // Typescript knows this is ConsentContextType (not undefined)
    return context;
}
