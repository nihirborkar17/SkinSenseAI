import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConsent } from '../context/ConsentContext';
import { generateConsentId } from '../utils/consent.utils';
import type { ConsentState } from '../types/consent.types';

const ConsentPage = () => {
  // Hooks
  const navigate = useNavigate();
  const { setConsent } = useConsent();

  // State for checkbox values
  const [medicalDisclaimerChecked, setMedicalDisclaimerChecked] = useState(false);
  const [dataProcessingChecked, setDataProcessingChecked] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Check if user can proceed (both boxes must be checked)
  const canProceed = medicalDisclaimerChecked && dataProcessingChecked;

  const handleContinue = () => {
    if (!canProceed) return;

    // Create consent object
    const consent: ConsentState = {
      consentId: generateConsentId(),
      medicalDisclaimerAgreed: medicalDisclaimerChecked,
      dataProcessingAgreed: dataProcessingChecked,
      timestamp: new Date().toISOString()
    };

    setConsent(consent);

    // Navigate to Assessment Page
    // For now, go back to landing to test
    alert('Consent saved! Get ready for the assessment.');
    navigate('/');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          
          {/* Header */}
          <div className="bg-blue-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Before We Continue
                </h1>
                <p className="text-blue-50">
                  Please read and accept the following terms
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            
            {/* Disclaimer Content */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Navigating Your Skin Health
              </h2>
              
              {/* Support Box */}
              <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-xl mb-10 shadow-sm">
                <div className="flex">
                  <div className="shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-md font-bold text-blue-900 mb-1">
                      Our Commitment to Your Awareness
                    </h3>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      SkinSense AI is designed to empower you with knowledge and early awareness. 
                      While our AI identifies patterns and provides educational insights, it is a 
                      first step in your journey—not a clinical diagnosis. For specialized treatment 
                      and medical advice, always partner with a licensed healthcare professional.
                    </p>
                  </div>
                </div>
              </div>

              {/* Empowering Capabilities */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                    <span className="bg-blue-100 text-blue-700 p-1.5 rounded-md mr-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    How We Empower You:
                  </h3>
                  <ul className="space-y-3 text-sm text-gray-600 ml-1">
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></span>
                      Educational insights on common skin patterns
                    </li>
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></span>
                      Data-backed terminology to share with your doctor
                    </li>
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></span>
                      Clear indicators of when to seek professional care
                    </li>
                  </ul>
                </div>

                {/* Enhanced Privacy Section */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <h3 className="text-md font-bold text-gray-800 mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Foundation of Trust
                  </h3>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Your privacy is our priority. All images are processed securely for 
                    immediate analysis and are <strong>never permanently stored</strong>. 
                    Your data session is automatically cleared once you close the application.
                  </p>
                </div>
              </div>
            </div>

            {/* Consent Checkboxes */}
            <div className="space-y-4 mb-8">
              
              {/* Checkbox 1: Medical Disclaimer */}
              <label className="flex items-start cursor-pointer group">
                <div className="flex items-center h-6">
                  <input
                    type="checkbox"
                    checked={medicalDisclaimerChecked}
                    onChange={(e) => setMedicalDisclaimerChecked(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <div className="ml-3">
                  <span className="text-base text-gray-900 font-medium group-hover:text-blue-700 transition-colors">
                    I understand this is NOT a medical diagnosis
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    I acknowledge that this tool provides educational information only and is not a 
                    substitute for professional medical advice, diagnosis, or treatment.
                  </p>
                </div>
              </label>

              {/* Checkbox 2: Data Processing */}
              <label className="flex items-start cursor-pointer group">
                <div className="flex items-center h-6">
                  <input
                    type="checkbox"
                    checked={dataProcessingChecked}
                    onChange={(e) => setDataProcessingChecked(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <div className="ml-3">
                  <span className="text-base text-gray-900 font-medium group-hover:text-blue-700 transition-colors">
                    I consent to temporary data processing
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    I agree to the temporary processing of any images or data I provide for educational 
                    analysis purposes only.
                  </p>
                </div>
              </label>
            </div>

            {/* Privacy Policy Link */}
            <div className="mb-8 text-center">
              <button
                onClick={() => setShowPrivacyModal(true)}
                className="text-blue-600 hover:text-blue-800 underline text-sm font-medium transition-colors"
              >
                Read our Privacy Policy
              </button>
            </div>

            {/* Validation Message */}
            {!canProceed && (medicalDisclaimerChecked || dataProcessingChecked) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Please check both boxes to continue
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-full transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                disabled={!canProceed}
                className={`flex-1 font-semibold px-6 py-3 rounded-full transition-all duration-300 ${
                  canProceed
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue to Assessment
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-700">
            By continuing, you agree to our terms and acknowledge the limitations of this educational tool
          </p>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-blue-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Privacy Policy</h2>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-6 space-y-4 text-gray-700">
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Collection</h3>
                <p className="text-sm leading-relaxed">
                  We collect only the images and information you voluntarily provide for educational analysis. 
                  No personal identifying information is required or stored.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Usage</h3>
                <p className="text-sm leading-relaxed">
                  Your images are processed temporarily to provide educational information about skin health. 
                  Data is used solely for this purpose and is not shared with third parties.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Retention</h3>
                <p className="text-sm leading-relaxed">
                  All uploaded images and session data are automatically deleted when you close your browser 
                  or end your session. We do not maintain permanent storage of your information.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Rights</h3>
                <p className="text-sm leading-relaxed">
                  You may exit the application at any time. Your data will be immediately cleared when you 
                  close your browser session. You are not required to provide any personal information.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Security</h3>
                <p className="text-sm leading-relaxed">
                  We implement appropriate technical measures to protect your data during transmission and 
                  temporary processing. However, no method of transmission over the internet is 100% secure.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact</h3>
                <p className="text-sm leading-relaxed">
                  For questions about this privacy policy or our data practices, please contact us at 
                  privacy@skinsenseai.com
                </p>
              </section>
            </div>
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsentPage;