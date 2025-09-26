'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { authState } = useAuth();
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      router.push('/account/billing');
      return;
    }

    const fetchSessionDetails = async () => {
      try {
        const response = await fetch(`/api/checkout/verify?session_id=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setSessionDetails(data);
        }
      } catch (error) {
        console.error('Error fetching session details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>

            <p className="text-gray-600 mb-6">
              Thank you for upgrading your subscription. Your account has been updated.
            </p>

            {sessionDetails && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Subscription Details</h3>
                <div className="text-left space-y-2">
                  <p><span className="font-medium">Plan:</span> {sessionDetails.planName}</p>
                  <p><span className="font-medium">Amount:</span> £{sessionDetails.amount}</p>
                  <p><span className="font-medium">Billing:</span> Monthly</p>
                  <p><span className="font-medium">Next billing date:</span> {sessionDetails.nextBilling}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <Link
                href="/account/billing"
                className="inline-block bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                View Billing Details
              </Link>

              <div className="text-center">
                <Link
                  href="/job-search"
                  className="text-teal-600 hover:text-teal-700 font-medium"
                >
                  Start Using Your New Features →
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4">
            <h4 className="font-semibold text-gray-900 mb-2">What's Next?</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Access to unlimited job searches</li>
              <li>• Enhanced AI resume optimization</li>
              <li>• Priority customer support</li>
              <li>• Manage your subscription anytime in billing settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}