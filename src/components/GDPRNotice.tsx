'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function GDPRNotice() {
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('resumed_gdpr_accepted');
    if (!hasAccepted) {
      setShowNotice(true);
    }
  }, []);

  const acceptGDPR = () => {
    localStorage.setItem('resumed_gdpr_accepted', 'true');
    setShowNotice(false);
  };

  if (!showNotice) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg z-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">🔒 Privacy & Data Protection</h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            We use cookies and store personal data to provide our resume services. Your data is processed securely and in compliance with GDPR.
            We never sell your information and you can request deletion at any time.
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs">
            <Link href="/privacy" className="text-teal-400 hover:text-teal-300 underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-teal-400 hover:text-teal-300 underline">
              Terms of Service
            </Link>
            <Link href="/account/preferences" className="text-teal-400 hover:text-teal-300 underline">
              Data Management
            </Link>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={acceptGDPR}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}