'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/components/RouteGuard';
import AccountDropdown from '@/components/AccountDropdown';

function HelpPageContent() {
  const { state: authState } = useAuth();
  const [activeCategory, setActiveCategory] = useState<'getting-started' | 'account' | 'billing' | 'features' | 'troubleshooting'>('getting-started');
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
    { id: 'account', label: 'Account & Settings', icon: '⚙️' },
    { id: 'billing', label: 'Billing & Plans', icon: '💳' },
    { id: 'features', label: 'Features & Tools', icon: '🛠️' },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: '🔧' }
  ] as const;

  const faqData = {
    'getting-started': [
      {
        question: 'How do I create my first resume?',
        answer: 'Start by navigating to the Profile Builder section. Fill in your personal information, work experience, education, and skills. Once complete, go to Templates to generate a tailored resume based on job descriptions.'
      },
      {
        question: 'What makes ResuMed different from other resume builders?',
        answer: 'ResuMed uses clinical precision AI to analyze job descriptions and match them with your profile. We aggregate job searches from multiple providers and offer medical-themed terminology that resonates with healthcare professionals.'
      },
      {
        question: 'How do I search for jobs?',
        answer: 'Use the Job Search feature to search across multiple job boards simultaneously. You can filter by location, salary, job type, and select specific providers like Reed, Adzuna, and Indeed.'
      }
    ],
    'account': [
      {
        question: 'How do I change my password?',
        answer: 'Go to Account Settings > Security tab. Enter your current password and choose a new one. Make sure your new password is at least 8 characters long and includes a mix of letters, numbers, and symbols.'
      },
      {
        question: 'How do I update my email preferences?',
        answer: 'Navigate to Account Settings > Notifications. Here you can control email notifications, marketing emails, job alerts, and weekly digest preferences.'
      },
      {
        question: 'Can I delete my account?',
        answer: 'Yes, you can delete your account from Account Settings > Security > Danger Zone. Please note that this action is permanent and will delete all your data.'
      }
    ],
    'billing': [
      {
        question: 'What subscription plans are available?',
        answer: 'We offer Free (basic features), Pro (£7.99/month with unlimited job searches), and Professional (£15.99/month with unlimited everything). Each plan includes different usage limits and features.'
      },
      {
        question: 'How do I upgrade my plan?',
        answer: 'Click on your account dropdown and select "Billing & Payments", then choose your desired plan and follow the checkout process. Upgrades take effect immediately.'
      },
      {
        question: 'Can I cancel my subscription?',
        answer: 'Yes, you can cancel anytime from the Billing & Payments page. Your subscription will remain active until the end of your current billing period.'
      }
    ],
    'features': [
      {
        question: 'How does the AI job matching work?',
        answer: 'Our AI analyzes job descriptions to identify key requirements and skills, then matches them against your profile to create tailored resumes and cover letters that highlight your most relevant experience.'
      },
      {
        question: 'Can I export my resume in different formats?',
        answer: 'Yes, you can export your resume as PDF or DOCX format. The export feature is available in the Templates section after generating your resume.'
      },
      {
        question: 'How many job search providers do you support?',
        answer: 'We integrate with 7 major job boards: Reed, Adzuna, Indeed, JSearch, Jooble, The Muse, and RemoteOK, providing comprehensive coverage of the UK job market.'
      }
    ],
    'troubleshooting': [
      {
        question: 'Why isn\'t my job search returning results?',
        answer: 'Check your search filters - they might be too restrictive. Try broadening your location search, increasing salary range, or selecting more job providers. Also ensure you have an active internet connection.'
      },
      {
        question: 'My resume export is not working',
        answer: 'Ensure you have completed your profile with at least basic information. Try refreshing the page and attempting the export again. If the issue persists, try a different browser.'
      },
      {
        question: 'I\'m not receiving email notifications',
        answer: 'Check your spam folder and ensure notifications are enabled in Account Settings > Notifications. Add noreply@resumed.com to your email whitelist to ensure delivery.'
      }
    ]
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Your message has been sent! We\'ll get back to you within 24 hours.');
      setContactForm({ subject: '', message: '', priority: 'medium' });
    } catch (error) {
      alert('Failed to send message. Please try again or email us directly at john@resu-med.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b-2 border-teal-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4" />
                  <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                  ResuMed
                </h1>
                <p className="text-xs text-teal-600 -mt-1">Clinical Resume Care</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-8">
              {authState.isAuthenticated && (
                <>
                  <Link href="/profile" className="text-gray-600 hover:text-teal-600 font-medium transition-colors">
                    Profile Builder
                  </Link>
                  <Link href="/job-search" className="text-gray-600 hover:text-teal-600 font-medium transition-colors">
                    Job Search
                  </Link>
                  <Link href="/templates" className="text-gray-600 hover:text-teal-600 font-medium transition-colors">
                    Templates
                  </Link>
                </>
              )}
              <button className="text-gray-600 hover:text-teal-600 font-medium transition-colors">
                About
              </button>

              {authState.isAuthenticated ? (
                <AccountDropdown />
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    href="/auth"
                    className="text-gray-600 hover:text-teal-600 font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth?mode=signup"
                    className="bg-gradient-to-r from-teal-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-teal-700 hover:to-blue-700 transition-all shadow-md"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        {authState.isAuthenticated && (
          <div className="mb-6">
            <nav className="flex items-center space-x-2 text-sm text-gray-500">
              <Link href="/profile" className="hover:text-teal-600">Account</Link>
              <span>/</span>
              <span className="text-gray-900">Help & Support</span>
            </nav>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-gradient-to-br from-teal-500 to-blue-600 p-3 rounded-xl shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-700 to-blue-700 bg-clip-text text-transparent">
                Help & Support
              </h1>
              <p className="text-teal-600 font-medium">Get help with ResuMed features and account management</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-teal-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Help Categories</h3>
              <nav className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-all ${
                      activeCategory === category.id
                        ? 'bg-gradient-to-r from-teal-50 to-blue-50 text-teal-700 border border-teal-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{category.icon}</span>
                    <span className="font-medium text-sm">{category.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Quick Contact */}
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-teal-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Contact</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email Support</p>
                    <p className="text-xs text-gray-500">john@resu-med.com</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Response Time</p>
                    <p className="text-xs text-gray-500">Within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* FAQ Section */}
            <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-teal-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  {categories.find(c => c.id === activeCategory)?.label} - Frequently Asked Questions
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {faqData[activeCategory].map((faq, index) => (
                    <div key={index} className="border-b border-gray-100 last:border-b-0 pb-6 last:pb-0">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">{faq.question}</h3>
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-teal-100">
                <h2 className="text-xl font-semibold text-gray-900">Contact Support</h2>
                <p className="text-sm text-gray-600 mt-1">Can't find what you're looking for? Send us a message.</p>
              </div>
              <div className="p-6">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        required
                        value={contactForm.subject}
                        onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                        placeholder="Brief description of your issue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <select
                        value={contactForm.priority}
                        onChange={(e) => setContactForm(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={contactForm.message}
                      onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                      placeholder="Please describe your issue in detail..."
                    />
                  </div>

                  {authState.isAuthenticated && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Account Information:</strong> We'll automatically include your account details ({authState.user?.email}) to help us assist you better.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg font-medium hover:from-teal-700 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span>Send Message</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <RouteGuard requireAuth={false}>
      <HelpPageContent />
    </RouteGuard>
  );
}