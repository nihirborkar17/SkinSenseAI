import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConsent } from "../context/ConsentContext";
import { showToast } from "../utils/toast.utils";

interface ImageData {
  id: string;
  file: File;
  preview: string;
}

const AssessmentPage = () => {
  const navigate = useNavigate();
  const { consentData } = useConsent();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // New refs for camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State management
  const [images, setImages] = useState<ImageData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>("");

  const MAX_IMAGES = 1;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

  // Reset camera input after capture
  useEffect(() => {
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  }, [images]);

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_IMAGES - images.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    const newImages: ImageData[] = [];

    filesToAdd.forEach((file) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showToast.error(`${file.name} is not an image file`);
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        showToast.error(`${file.name} is too large. Max size is 10MB`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage: ImageData = {
          id: `${Date.now()}-${Math.random()}`,
          file: file,
          preview: reader.result as string,
        };
        newImages.push(newImage);
        
        // When all readers are done, update state
        if (newImages.length === filesToAdd.length) {
          setImages((prev) => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
    setShowUploadOptions(false);
  };

  // Start Camera Function
  const startCamera = async (facingMode: "user" | "environment" = "user") => {
    try {
      setCameraError("");
      
      // Stop any existing stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setCameraStream(stream);
      setShowCamera(true);
      
      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error: any) {
      console.error("Camera error:", error);
      setCameraError("Failed to access camera. Please check permissions.");
      
      // Fallback to file input if getUserMedia fails
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }
  };

  // Capture Photo from Camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to Blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create a File from Blob
        const file = new File([blob], `camera-photo-${Date.now()}.jpg`, {
          type: "image/jpeg"
        });
        
        // Create FileList-like object
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        // Handle the captured photo
        handleFileSelect(dataTransfer.files);
        
        // Close camera
        stopCamera();
      }
    }, "image/jpeg", 0.95);
  };

  // Stop Camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
    setCameraError("");
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input to allow selecting same files again
    if (e.target.files && e.target.files.length > 0) {
      e.target.value = "";
    }
  };

  // Handle camera capture
  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset camera input to allow capturing again
    if (e.target.files && e.target.files.length > 0) {
      e.target.value = "";
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Handle remove single image
  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Clear all images
  const handleClearAll = () => {
    setImages([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Handle image analysis submission
  const handleAnalyze = async () => {
    if (images.length === 0 || !consentData) return;
    setIsAnalyzing(true);
    const loadingToast = showToast.loading('Analyzing your image...');

    try {
      // Replace with backend API call
      const formData = new FormData();
      images.forEach((img, index) => {
        formData.append(`image_${index}`, img.file);
      });
      formData.append("consentId", consentData.consentId);
      formData.append("imageCount", images.length.toString());

      // Simulated API call later will be replaced by API endpoint
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Alert for Now
      showToast.dismiss(loadingToast);
      showToast.success('Analysis complete for your image!');

      // uncomment this when result page is ready
      // navigate('/results');
    } catch (error) {
      console.error("Analysis error:", error);
      showToast.dismiss(loadingToast);
      showToast.error('An error occurred during analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

    // Render Camera Modal
  const renderCameraModal = () => {
    if (!showCamera) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Take a Photo
              </h3>
              <button
                onClick={stopCamera}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {cameraError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700">{cameraError}</p>
              </div>
            ) : (
              <>
                <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-auto max-h-[60vh] object-contain"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => startCamera("user")}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors"
                  >
                    Front Camera
                  </button>
                  <button
                    onClick={() => startCamera("environment")}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors"
                  >
                    Rear Camera
                  </button>
                  <button
                    onClick={capturePhoto}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="3" strokeWidth={2} />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Capture Photo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const canAnalyze = images.length > 0 && images.length <= MAX_IMAGES;

return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
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
            <button
              onClick={() => navigate("/")}
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
            >
              Exit Assessment
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-4">
              {/* Step 1 - Completed */}
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Consent
                </span>
              </div>

              <div className="w-16 h-1 bg-blue-600"></div>

              {/* Step 2 - Current */}
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-blue-600">
                  Upload Images
                </span>
              </div>

              <div className="w-16 h-1 bg-gray-300"></div>

              {/* Step 3 - Pending */}
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold">
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-gray-400">
                  Results
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upload Your Skin Image
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Take or upload a clear, well-lit photo of the skin area
            you'd like to learn about.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-full">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">
              {images.length > 0 ? "Image uploaded" : "No image uploaded"}
            </span>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
          <div className="p-8">
            {images.length === 0 ? (
              /* Initial Upload Zone */
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                  dragActive
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center">
                  {/* Upload Icon */}
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                    <svg
                      className="w-10 h-10 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>

                  {/* Upload Text */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Upload or capture your image
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Supports: JPG, PNG, HEIC • Max size: 10MB
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    {/* Camera Button - Updated */}
                    <button
                      onClick={() => startCamera("user")}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-full transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Take Photo
                    </button>

                    {/* Browse Button */}
                    <button
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.click();
                        }
                      }}
                      className="bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 font-semibold px-6 py-3 rounded-full transition-all flex items-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Browse Files
                    </button>
                  </div>

                  {/* Hidden Inputs (for fallback) */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              /* Images Grid & Actions */
              <div className="space-y-6">
                {/* Images Grid */}
                <div className="flex justify-center">
                  {images.map((image) => (
                    <div key={image.id} className="relative group max-w-md w-full">
                      {/* Image Preview */}
                      <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-square">
                        <img
                          src={image.preview}
                          alt="Skin area"
                          className="w-full h-full object-cover"
                        />
                        {/* Remove Button Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                          <button
                            onClick={() => handleRemoveImage(image.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {/* Image Info */}
                      <div className="mt-2 text-center">
                        <p className="text-xs text-gray-500 truncate">
                          {image.file.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {(image.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleClearAll}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-3 rounded-full transition-colors"
                  >
                    Clear Image
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={!canAnalyze || isAnalyzing}
                    className={`flex-1 font-semibold px-6 py-3 rounded-full transition-all ${
                      !canAnalyze || isAnalyzing
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                    }`}
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Analyzing Image...
                      </span>
                    ) : (
                      "Analyze Image"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg
              className="w-6 h-6 text-blue-600 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Tips for Best Results
          </h3>
          <ul className="grid md:grid-cols-2 gap-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Use good lighting (natural light works best)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Keep the camera steady and in focus</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Fill the frame with the area of concern</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Avoid blurry or overly dark images</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Take photos from different angles if possible</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Include surrounding skin for context</span>
            </li>
          </ul>
        </div>
      </main>

      {/* Camera Modal */}
      {renderCameraModal()}
    </div>
  );
};

export default AssessmentPage;