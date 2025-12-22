import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import SummaryApi from '../common';

// Issues categorized by type
const ISSUE_CATEGORIES = {
  'Authentication & Account': [
    'Cannot login with email/password',
    'Password reset OTP not received',
    'OTP expired before verification',
    'Cannot complete business profile',
    'Google sign-in not working'
  ],
  'Work Orders': [
    'Push notifications not showing',
    'Scheduled reminders not triggering',
    'Cannot link work order to customer',
    'Work order not marking as completed',
    'Time zone issues with scheduling'
  ],
  'Billing & Payments': [
    'Bill calculation incorrect',
    'Payment history not updating',
    'Cannot apply discounts',
    'Partial payment issues',
    'Bill PDF not generating'
  ],
  'Inventory Management': [
    'Stock quantity not updating',
    'Serial number showing as duplicate',
    'Cannot delete items',
    'Stock history not tracking',
    'Item search not working'
  ],
  'Customer Management': [
    'Cannot add new customers',
    'Customer search not finding results',
    'Contact information not saving',
    'Cannot view customer bills history'
  ],
  'Bank Accounts': [
    'UPI ID validation failing',
    'IFSC code errors',
    'Cannot set primary account'
  ],
  'Dashboard & Reports': [
    'Metrics showing incorrect values',
    'Date range filter not working',
    'Profit/loss calculation wrong'
  ],
  'General Issues': [
    'App crashes frequently',
    'Slow performance on mobile',
    'Data not syncing',
    'Offline mode not working',
    'Other'
  ]
};

// FAQ data
const FAQ_DATA = [
  {
    category: 'Account & Profile',
    questions: [
      {
        q: 'How do I reset my password?',
        a: 'Go to Settings → Security → Set/Change Password. If you\'ve forgotten your password, use the "Forgot Password" option on the login screen. You\'ll receive an OTP via email to reset it.'
      },
      {
        q: 'Why do I need to complete my business profile?',
        a: 'Completing your business profile unlocks full functionality including bill generation with your business details, professional invoices, and better customer communication.'
      },
      {
        q: 'Can I change my email address?',
        a: 'Currently, email addresses cannot be changed as they\'re linked to your account. For assistance, please contact support.'
      }
    ]
  },
  {
    category: 'Work Orders',
    questions: [
      {
        q: 'How do I schedule a work order reminder?',
        a: 'When creating or editing a work order, enable the "Schedule" toggle and select your preferred date and time. You\'ll receive push notifications at the scheduled time and 30 minutes before.'
      },
      {
        q: 'Why am I not receiving work order notifications?',
        a: 'Ensure you\'ve granted notification permissions to the app. Go to Settings → Notifications and check if permissions are enabled. Also verify your device\'s notification settings.'
      },
      {
        q: 'Can I link multiple work orders to one customer?',
        a: 'Yes! When creating a work order, select the customer from your customer list. All work orders for that customer will be visible in their profile.'
      }
    ]
  },
  {
    category: 'Bills & Payments',
    questions: [
      {
        q: 'How do I generate a bill PDF?',
        a: 'After creating a bill, click the "Download" or "View Bill" button. The PDF will include your business details, items, pricing, and payment information.'
      },
      {
        q: 'Can I edit a bill after creation?',
        a: 'Currently, bills cannot be edited once created. If you need to make changes, please contact support or create a new bill.'
      },
      {
        q: 'How do partial payments work?',
        a: 'When creating a bill, you can specify a "Received Payment" amount that\'s less than the total. The remaining amount will be marked as "Due". You can process additional payments later.'
      },
      {
        q: 'How do I apply discounts?',
        a: 'While creating a bill, look for the discount field where you can enter a fixed amount or percentage to reduce the total.'
      }
    ]
  },
  {
    category: 'Inventory',
    questions: [
      {
        q: 'What\'s the difference between generic and serialized items?',
        a: 'Generic items are tracked by quantity (e.g., 50 screws). Serialized items are tracked individually by unique serial numbers (e.g., each TV has its own serial number). Use serialized for warranty tracking.'
      },
      {
        q: 'How do I add stock to an item?',
        a: 'Find the item in Inventory, click "+ Add Stock", enter the quantity (for generic items) or serial numbers (for serialized items), and submit.'
      },
      {
        q: 'Why can\'t I delete an item?',
        a: 'Items that have been sold, linked to bills, or have stock history cannot be deleted to maintain data integrity. You can mark them as inactive instead.'
      }
    ]
  },
  {
    category: 'Customers',
    questions: [
      {
        q: 'How do I search for a customer?',
        a: 'Use the search bar at the top of the Customers page. You can search by name or phone number.'
      },
      {
        q: 'Can I see all bills for a specific customer?',
        a: 'Yes! Click on any customer card to view their profile, which includes their complete bill history and work orders.'
      }
    ]
  },
  {
    category: 'General',
    questions: [
      {
        q: 'Does the app work offline?',
        a: 'The app has offline support for basic operations. Your data will sync automatically when you reconnect to the internet.'
      },
      {
        q: 'How do I backup my data?',
        a: 'Your data is automatically backed up to our secure cloud servers. Ensure you\'re logged in and have an internet connection for regular syncing.'
      },
      {
        q: 'What should I do if the app crashes?',
        a: 'Try clearing the app cache from Settings → Developer Tools → Clear All Cache. If issues persist, please contact support with details about when the crash occurs.'
      }
    ]
  }
];

const HelpSupport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [alternateEmail, setAlternateEmail] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [selectedIssues, setSelectedIssues] = useState([]);
  const [customReason, setCustomReason] = useState('');
  const [showIssuesDropdown, setShowIssuesDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  // FAQ state
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  const handleIssueToggle = (issue) => {
    setSelectedIssues(prev =>
      prev.includes(issue)
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedIssues.length === 0) {
      setError('Please select at least one issue');
      return;
    }

    if (selectedIssues.includes('Other') && !customReason.trim()) {
      setError('Please provide details for "Other" issue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient(SummaryApi.submitSupportTicket.url, {
        method: SummaryApi.submitSupportTicket.method,
        body: JSON.stringify({
          ownerName: user.businessProfile?.ownerName || user.displayName,
          email: user.email,
          phone: user.businessProfile?.phone || '',
          alternateEmail,
          alternatePhone,
          selectedIssues,
          customReason
        })
      });

      const data = await response.json();

      if (data.success) {
        setTicketNumber(data.ticketNumber);
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to submit ticket');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your support ticket has been created successfully.
          </p>
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-600">Ticket Number</p>
            <p className="text-xl font-bold text-primary-600">{ticketNumber}</p>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            We've sent a confirmation email. Our team will respond within 5 minutes.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="w-full py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600"
          >
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/settings')}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Help & Support</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Information (Read-only) */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Your Information</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Owner Name</label>
                <p className="font-medium">{user.businessProfile?.ownerName || user.displayName}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <p className="font-medium">{user.businessProfile?.phone || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Alternate Contacts */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Alternate Contact (Optional)</h2>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Alternate Email"
                value={alternateEmail}
                onChange={(e) => setAlternateEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-primary-500"
              />
              <input
                type="tel"
                placeholder="Alternate Phone"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Issues Selection */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Select Issues</h2>

            {/* Issues Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowIssuesDropdown(!showIssuesDropdown)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl flex items-center justify-between focus:outline-none focus:border-primary-500"
              >
                <span>{selectedIssues.length > 0 ? `${selectedIssues.length} issue(s) selected` : 'Select issues'}</span>
                {showIssuesDropdown ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showIssuesDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-96 overflow-y-auto z-20">
                  {Object.entries(ISSUE_CATEGORIES).map(([category, issues]) => (
                    <div key={category} className="border-b last:border-b-0">
                      <div className="bg-gray-50 px-4 py-2 font-semibold text-sm sticky top-0">{category}</div>
                      {issues.map(issue => (
                        <label key={issue} className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedIssues.includes(issue)}
                            onChange={() => handleIssueToggle(issue)}
                            className="w-4 h-4 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
                          />
                          <span className="ml-3 text-sm">{issue}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Issues Display */}
            {selectedIssues.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Issues:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedIssues.map(issue => (
                    <span key={issue} className="px-3 py-1 bg-white rounded-full text-sm border border-blue-200">
                      {issue}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Reason (if "Other" selected) */}
            {selectedIssues.includes('Other') && (
              <textarea
                placeholder="Please describe your issue..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={4}
                className="w-full mt-4 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-primary-500 resize-none"
              />
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Submitting...' : 'Request Submit'}
          </button>
        </form>

        {/* FAQ Section */}
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setExpandedFAQ(expandedFAQ === null ? 0 : null)}
            className="w-full bg-white rounded-xl p-6 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-lg font-bold">FAQ - Frequently Asked Questions</h2>
            {expandedFAQ === null ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>

          {expandedFAQ !== null && (
            <div className="mt-4 bg-white rounded-xl p-6 shadow-sm space-y-6">
              {FAQ_DATA.map((category, catIdx) => (
                <div key={catIdx}>
                  <h3 className="font-bold text-gray-800 mb-3">{category.category}</h3>
                  <div className="space-y-3">
                    {category.questions.map((faq, qIdx) => (
                      <div key={qIdx} className="border-b last:border-b-0 pb-3">
                        <button
                          type="button"
                          onClick={() => setExpandedQuestion(expandedQuestion === `${catIdx}-${qIdx}` ? null : `${catIdx}-${qIdx}`)}
                          className="w-full text-left flex items-start justify-between gap-2 hover:text-primary-600 transition-colors"
                        >
                          <p className="font-medium text-gray-800">{faq.q}</p>
                          {expandedQuestion === `${catIdx}-${qIdx}` ?
                            <ChevronUp className="flex-shrink-0 mt-1 w-5 h-5" /> :
                            <ChevronDown className="flex-shrink-0 mt-1 w-5 h-5" />
                          }
                        </button>
                        {expandedQuestion === `${catIdx}-${qIdx}` && (
                          <p className="mt-2 text-gray-600 text-sm">{faq.a}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
