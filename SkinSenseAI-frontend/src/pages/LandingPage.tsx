import { useNavigate } from 'react-router-dom';
import { useConsent } from '../context/ConsentContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const { hasValidConsent } = useConsent();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/SkinSenseAI-Logo.png" 
                alt="SkinSense AI Logo" 
                className="w-10 h-10"
              />
              <span className="text-2xl font-bold text-gray-900">
                SkinSense AI
              </span>
            </div>

            {/* Nav Links (Optional) */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                How It Works
              </a>
              <a href="#about" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                About
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-linear-to-b from-blue-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Educational Skin Health Assistant
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Learn about common skin concerns with AI-powered educational support. 
                This tool provides information, not medical diagnosis.
              </p>
              
              {/* CTA Button */}
              <button
                onClick={() => navigate('/consent')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-10 py-4 rounded-full text-lg transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
              >
                Start Assessment
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Trust Indicators */}
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Private & Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Educational Only</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>Instant Results</span>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80"
                  alt="Skin health care"
                  className="w-full h-auto"
                />
              </div>
              {/* Floating Card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">AI-Powered</div>
                    <div className="text-sm text-gray-500">Educational Insights</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What We Provide
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Clear, educational information to help you understand your skin health
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* What We Can Do */}
            <div className="bg-blue-50 rounded-2xl p-8 border-2 border-blue-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  How We Empower You
                </h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-gray-700">
                  
                  <span><strong>Educational Insights:</strong> Access clear information about common skin conditions and wellness.</span>
                </li>
                <li className="flex items-start gap-3 text-gray-700">
                  
                  <span><strong>Early Awareness:</strong> Identify potential concerns and understand when to prioritize a professional visit.</span>
                </li>
              </ul>
            </div>

            {/* What We Cannot Do */}
            <div className="bg-gray-50 rounded-2xl p-8 border-2 border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                  <svg 
                    className="w-6 h-6 text-blue-100" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M10 2L4 5v2c0 4 3 6 6 9 3-3 6-5 6-9V5l-6-3z" 
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Your Safety & Guidelines
                </h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-gray-700">
                  <span><strong>Consultation Aid:</strong> Designed to support, not replace, the clinical judgment of a healthcare provider.</span>
                </li>
                <li className="flex items-start gap-3 text-gray-700">
                  <span><strong>Educational Screening:</strong> Our AI identifies patterns for awareness; final diagnoses are made only by medical experts.</span>
                </li>

              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Important Notice
          </h2>
          <p className="text-xl text-blue-100 leading-relaxed">
            This is an educational tool only. If you have any concerns about your skin health, 
            please consult with a qualified healthcare professional or dermatologist.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-linear-to-b from-white to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Learn About Your Skin?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Start your educational assessment today
          </p>
          <button
            onClick={() => navigate('/consent')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-10 py-4 rounded-full text-lg transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
          >
            Start Assessment
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/SkinSenseAI-Logo.png" alt="Logo" className="w-8 h-8" />
                <span className="text-lg font-bold text-gray-900">SkinSense AI</span>
              </div>
              <p className="text-sm text-gray-600">
                Educational skin health insights powered by AI technology.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Important</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Not a medical diagnosis tool</li>
                <li>Educational purposes only</li>
                <li>Consult healthcare professionals</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><button className="text-gray-600 hover:text-blue-600">Privacy Policy</button></li>
                <li><button className="text-gray-600 hover:text-blue-600">Terms of Service</button></li>
                <li><button className="text-gray-600 hover:text-blue-600">Contact Us</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
            <p>© 2026 SkinSense AI - Educational Purposes Only</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;