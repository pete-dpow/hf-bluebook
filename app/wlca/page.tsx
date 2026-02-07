"use client";

import { useState, useEffect } from "react";

export default function WLCALanding() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    appInterest: "dpow.wlca", // Pre-selected to wlca
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState<string>("");
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  // Mouse tracking for gradient
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Countdown timer after success
  useEffect(() => {
    if (submitSuccess && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (submitSuccess && countdown === 0) {
      window.location.href = "https://www.dpow.ai";
    }
  }, [submitSuccess, countdown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!formData.name || !formData.email || !formData.company || !formData.role) {
      setError("Please fill in all fields");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/waitlist/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          role: formData.role,
          app_interest: formData.appInterest,
        }),
      });

      if (!response.ok) throw new Error('Submission failed');
      setSubmitSuccess(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  const apps = [
    "dpow.chat",
    "dpow.report",
    "dpow.scope",
    "dpow.TIDP",
    "dpow.list",
    "dpow.procure",
    "dpow.wlca",
    "dpow.assign",
  ];

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" 
      style={{ background: '#FCFCFA' }}
    >
      {/* Animated gradient - Yellow sustainability theme */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(234, 179, 8, 0.15), transparent 75%)`,
        }}
      />

      <div className="w-full max-w-2xl relative z-10">
        {!submitSuccess ? (
          <>
            {/* Header */}
            <div className="text-center mb-12">
              <h1 
                className="text-6xl md:text-7xl mb-3" 
                style={{ 
                  fontFamily: 'var(--font-cormorant)', 
                  fontWeight: 500, 
                  letterSpacing: '0.01em', 
                  color: '#2A2A2A' 
                }}
              >
                dpow.wlca
              </h1>
              <p 
                className="text-lg" 
                style={{ 
                  fontFamily: 'var(--font-ibm-plex)', 
                  color: '#4B4B4B', 
                  letterSpacing: '-0.01em' 
                }}
              >
                Whole Life Carbon Assessment and Sustainability Intelligence
              </p>
              
              {/* Description section */}
              <div className="mt-6 mb-8 text-center max-w-xl mx-auto">
                <p 
                  className="text-base"
                  style={{ 
                    fontFamily: 'var(--font-ibm-plex)', 
                    color: '#4B4B4B',
                    lineHeight: '1.6',
                    letterSpacing: '-0.01em'
                  }}
                >
                  Calculates embodied carbon across all materials listed in the TIDP by linking products to their EPDs and transport data. Produces live carbon summaries and compliance-ready reports, updating automatically as materials change.
                </p>
              </div>
            </div>

            {/* Form Card - TWO SECTION STRUCTURE */}
            <form onSubmit={handleSubmit}>
              <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden transition-all hover:shadow-md">
                {/* TOP SECTION - White background with form fields */}
                <div className="p-6 border-b border-[#E5E7EB]">
                  {/* Name */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#EAB308] transition-colors"
                      style={{ fontFamily: 'var(--font-ibm-plex)', color: '#2A2A2A' }}
                    />
                  </div>

                  {/* Email */}
                  <div className="mb-4">
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#EAB308] transition-colors"
                      style={{ fontFamily: 'var(--font-ibm-plex)', color: '#2A2A2A' }}
                    />
                  </div>

                  {/* Company */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      className="w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#EAB308] transition-colors"
                      style={{ fontFamily: 'var(--font-ibm-plex)', color: '#2A2A2A' }}
                    />
                  </div>

                  {/* Role */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Job Title / Role"
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#EAB308] transition-colors"
                      style={{ fontFamily: 'var(--font-ibm-plex)', color: '#2A2A2A' }}
                    />
                  </div>

                  {/* App Interest - Simple Dropdown */}
                  <div className="mb-0">
                    <label 
                      className="block text-xs mb-2" 
                      style={{ 
                        fontFamily: 'var(--font-ibm-plex)', 
                        color: '#6B7280' 
                      }}
                    >
                      Which apps interest you? (Ctrl/Cmd + click for multiple)
                    </label>
                    <select
                      value={formData.appInterest}
                      onChange={(e) => setFormData({...formData, appInterest: e.target.value})}
                      className="w-full px-4 py-3 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#EAB308] transition-colors"
                      style={{ fontFamily: 'var(--font-ibm-plex)', color: '#2A2A2A' }}
                    >
                      {apps.map((app) => (
                        <option key={app} value={app}>
                          {app}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* BOTTOM SECTION - Beige background with button */}
                <div className="px-6 py-4 bg-[#FCFCFA] flex flex-col items-center">
                  {/* Error Message */}
                  {error && (
                    <div 
                      className="w-full mb-4 p-4 rounded-lg" 
                      style={{ 
                        background: '#FEF2F2', 
                        border: '1px solid #FCA5A5'
                      }}
                    >
                      <p 
                        className="text-sm font-medium" 
                        style={{ 
                          fontFamily: 'var(--font-ibm-plex)', 
                          color: '#991B1B' 
                        }}
                      >
                        {error}
                      </p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: '#EAB308',
                      color: 'white',
                      padding: '0.75rem 1.75rem',
                      borderRadius: '0.5rem',
                      fontFamily: 'var(--font-ibm-plex)',
                      fontSize: '15px',
                      fontWeight: 500,
                      border: 'none',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? "Joining..." : "Join Waitlist"}
                  </button>
                </div>
              </div>
            </form>

            {/* Help Text */}
            <div 
              className="mt-8 text-center space-y-3" 
              style={{ fontFamily: 'var(--font-ibm-plex)' }}
            >
              <p className="text-sm" style={{ color: '#4B4B4B' }}>
                We&apos;ll notify you as soon as dpow.wlca launches
              </p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Part of the DPoW.ai ecosystem • 8 integrated apps for project delivery
              </p>
            </div>
          </>
        ) : (
          /* Success State */
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-12 text-center">
            <div className="mb-6 flex justify-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(234, 179, 8, 0.1)' }}
              >
                <svg 
                  className="w-8 h-8" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="#EAB308"
                  strokeWidth={2}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
            </div>
            <h2 
              className="text-3xl mb-3" 
              style={{ 
                fontFamily: 'var(--font-cormorant)', 
                fontWeight: 500,
                color: '#2A2A2A' 
              }}
            >
              You&apos;re on the list!
            </h2>
            <p 
              className="text-base mb-6" 
              style={{ 
                fontFamily: 'var(--font-ibm-plex)', 
                color: '#4B4B4B' 
              }}
            >
              We&apos;ll notify you as soon as dpow.wlca launches.
            </p>
            <p 
              className="text-sm" 
              style={{ 
                fontFamily: 'var(--font-ibm-plex)', 
                color: '#6B7280' 
              }}
            >
              Redirecting to dpow.ai in {countdown} seconds...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
