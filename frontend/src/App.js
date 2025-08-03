import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, FileText, CheckCircle, AlertTriangle, Clock, Shield } from 'lucide-react';

// --- MOCK DATA ---
// In a real application, this data would come from your Django backend API.
const mockClaims = [
  { id: 'C-2024-7A6B', submitted: '2024-07-20', procedure: 'Annual Check-up', amount: 250.00, status: 'Approved', aiConfidence: 0.98, fraudRisk: 'Low' },
  { id: 'C-2024-8C3D', submitted: '2024-07-18', procedure: 'Dental Cleaning', amount: 150.00, status: 'Processing', aiConfidence: null, fraudRisk: null },
  { id: 'C-2024-9F2E', submitted: '2024-07-15', procedure: 'MRI Scan - Knee', amount: 1800.00, status: 'Flagged', aiConfidence: 0.72, fraudRisk: 'High' },
  { id: 'C-2024-5G1H', submitted: '2024-07-12', procedure: 'Prescription Refill', amount: 85.50, status: 'Approved', aiConfidence: 0.99, fraudRisk: 'Low' },
  { id: 'C-2024-4B9A', submitted: '2024-07-10', procedure: 'Physical Therapy Session', amount: 350.00, status: 'Rejected', aiConfidence: 0.91, fraudRisk: 'Medium' },
];

const mockChartData = [
  { name: 'Jan', Approved: 40, Rejected: 2, Flagged: 5 },
  { name: 'Feb', Approved: 35, Rejected: 5, Flagged: 3 },
  { name: 'Mar', Approved: 52, Rejected: 3, Flagged: 8 },
  { name: 'Apr', Approved: 48, Rejected: 4, Flagged: 4 },
  { name: 'May', Approved: 60, Rejected: 1, Flagged: 6 },
  { name: 'Jun', Approved: 55, Rejected: 2, Flagged: 7 },
];

// --- UI COMPONENTS ---

const Header = ({ setPage, userType, setUserType }) => (
  <header className="bg-white shadow-md sticky top-0 z-50">
    <div className="container mx-auto px-6 py-4 flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <Shield className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800">Arif Systems | Skill Sync</h1>
      </div>
      <div className="flex items-center space-x-4">
         <span className="text-sm text-gray-500">Viewing as:</span>
         <select value={userType} onChange={(e) => setUserType(e.target.value)} className="p-2 rounded-md border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-blue-500">
             <option value="policyholder">Policyholder</option>
             <option value="insurer">Insurer</option>
         </select>
         <button onClick={() => setPage('dashboard')} className="text-gray-600 hover:text-blue-600">Dashboard</button>
         <button onClick={() => setPage('submit')} className="text-gray-600 hover:text-blue-600">Submit Claim</button>
      </div>
    </div>
  </header>
);

const Footer = () => (
  <footer className="bg-gray-100 mt-auto">
    <div className="container mx-auto px-6 py-4 text-center text-gray-600 text-sm">
      &copy; {new Date().getFullYear()} Arif Systems & Skill Sync. AI-Powered Health Insurance Claim Processing. All Rights Reserved.
    </div>
  </footer>
);

const StatusBadge = ({ status }) => {
  const baseClasses = "px-3 py-1 text-sm font-medium rounded-full inline-flex items-center space-x-2";
  switch (status) {
    case 'Approved':
      return <span className={`${baseClasses} bg-green-100 text-green-800`}><CheckCircle className="w-4 h-4" /><span>{status}</span></span>;
    case 'Processing':
      return <span className={`${baseClasses} bg-blue-100 text-blue-800`}><Clock className="w-4 h-4" /><span>{status}</span></span>;
    case 'Flagged':
      return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}><AlertTriangle className="w-4 h-4" /><span>{status}</span></span>;
    case 'Rejected':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}><AlertTriangle className="w-4 h-4" /><span>{status}</span></span>;
    default:
      return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
  }
};

const RiskIndicator = ({ risk }) => {
    const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full";
    switch (risk) {
      case 'Low':
        return <span className={`${baseClasses} bg-green-200 text-green-900`}>Low Risk</span>;
      case 'Medium':
        return <span className={`${baseClasses} bg-yellow-200 text-yellow-900`}>Medium Risk</span>;
      case 'High':
        return <span className={`${baseClasses} bg-red-200 text-red-900`}>High Risk</span>;
      default:
        return <span className={`${baseClasses} bg-gray-200 text-gray-700`}>N/A</span>;
    }
};


// --- PAGES ---

const DashboardPage = ({ setPage, userType }) => {
  // --- NEW: State to hold claims from the API ---
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- NEW: useEffect to fetch data from your backend ---
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        // This is the API call to your Flask backend
        const response = await fetch('http://localhost:5001/api/claims');
        const data = await response.json();
        setClaims(data); // Store the fetched claims in state
      } catch (error) {
        console.error("Failed to fetch claims:", error);
        // Handle error, e.g., show an error message
      } finally {
        setLoading(false); // Stop showing the loading message
      }
    };

    fetchClaims();
  }, []); // The empty array [] means this runs once when the component loads

  // --- NEW: Show a loading message while data is being fetched ---
  if (loading) {
    return <div className="text-center p-8">Loading claims data...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">Welcome, {userType === 'policyholder' ? 'Policyholder' : 'Insurer'}!</h2>
        <p className="mt-2 text-gray-600">Here's a summary of your insurance claims activity.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Claims</p>
              {/* UPDATED: Use the length of the new 'claims' state */}
              <p className="text-2xl font-bold text-gray-800">{claims.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Approved</p>
               {/* UPDATED: Use the new 'claims' state */}
              <p className="text-2xl font-bold text-gray-800">{claims.filter(c => c.status === 'Approved').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Pending/Flagged</p>
              {/* UPDATED: Use the new 'claims' state */}
              <p className="text-2xl font-bold text-gray-800">{claims.filter(c => c.status === 'Processing' || c.status === 'Flagged').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Claims Summary Chart (This still uses mock data, you can update it later) */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Monthly Claim Volume</h3>
          <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                  <BarChart data={mockChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Approved" fill="#4ade80" />
                      <Bar dataKey="Rejected" fill="#f87171" />
                      <Bar dataKey="Flagged" fill="#facc15" />
                  </BarChart>
              </ResponsiveContainer>
          </div>
      </div>

      {/* Recent Claims Table */}
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Claims</h3>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claim ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Procedure</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  {userType === 'insurer' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fraud Risk</th>}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* --- THIS IS THE MOST IMPORTANT CHANGE --- */}
                {/* It now maps over the 'claims' from your API instead of 'mockClaims' */}
                {claims.map(claim => (
                  <tr key={claim.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{claim.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{claim.procedure}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${claim.amount ? claim.amount.toFixed(2) : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={claim.status} /></td>
                    {userType === 'insurer' && <td className="px-6 py-4 whitespace-nowrap text-sm"><RiskIndicator risk={claim.fraudRisk} /></td>}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => setPage(userType === 'insurer' ? 'adminView' : 'claimStatus')} className="text-blue-600 hover:text-blue-800">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const SubmitClaimPage = ({ setPage }) => {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setUploadSuccess(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!file) return;
        setIsUploading(true);
        // Simulate API call
        setTimeout(() => {
            setIsUploading(false);
            setUploadSuccess(true);
            setFile(null);
        }, 2000);
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 max-w-2xl mx-auto">
            <div className="flex items-center space-x-4 mb-6">
                <Upload className="w-8 h-8 text-blue-600"/>
                <h2 className="text-3xl font-bold text-gray-800">Submit a New Claim</h2>
            </div>
            <p className="text-gray-600 mb-8">
                Please upload your claim documents (e.g., medical receipts, doctor's notes) in PDF, PNG, or JPG format. Our AI will automatically extract the necessary information.
            </p>

            <form onSubmit={handleSubmit}>
                <div className="mb-6">
                    <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">Claim Document</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <FileText className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                    <span>Upload a file</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                        </div>
                    </div>
                    {file && <p className="mt-2 text-sm text-gray-500">Selected file: {file.name}</p>}
                </div>

                {uploadSuccess && (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md" role="alert">
                        <p className="font-bold">Success!</p>
                        <p>Your claim has been submitted. You can track its status on the dashboard.</p>
                    </div>
                )}

                <div>
                    <button 
                        type="submit" 
                        disabled={!file || isUploading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        {isUploading ? 'Processing...' : 'Submit Claim'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const ClaimStatusPage = ({ setPage }) => {
    const claim = mockClaims[0]; // Using a mock claim for display

    return (
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 max-w-4xl mx-auto">
             <h2 className="text-3xl font-bold text-gray-800 mb-2">Claim Details</h2>
             <p className="text-gray-500 font-mono text-sm mb-6">Claim ID: {claim.id}</p>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Submitted On</p>
                    <p className="text-lg font-semibold text-gray-800">{claim.submitted}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Procedure</p>
                    <p className="text-lg font-semibold text-gray-800">{claim.procedure}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="text-lg font-semibold text-gray-800">${claim.amount.toFixed(2)}</p>
                </div>
             </div>

             <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Processing Status</h3>
                <div className="flex items-center space-x-4">
                    <StatusBadge status={claim.status} />
                    <p className="text-gray-700">Your claim has been successfully {claim.status.toLowerCase()}.</p>
                </div>
             </div>
             
             <div>
                <button onClick={() => setPage('dashboard')} className="text-blue-600 hover:text-blue-800">&larr; Back to Dashboard</button>
             </div>
        </div>
    );
};

const AdminViewPage = ({ setPage }) => {
    const claim = mockClaims[2]; // Using the flagged claim for this view

    return (
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 max-w-5xl mx-auto">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Insurer Review</h2>
                    <p className="text-gray-500 font-mono text-sm">Claim ID: {claim.id}</p>
                </div>
                <StatusBadge status={claim.status} />
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Claim & AI Details */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Claim Info */}
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Claim Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <p><span className="font-medium text-gray-500">Policyholder:</span> John Doe</p>
                            <p><span className="font-medium text-gray-500">Policy ID:</span> POL-98765</p>
                            <p><span className="font-medium text-gray-500">Submitted:</span> {claim.submitted}</p>
                            <p><span className="font-medium text-gray-500">Procedure:</span> {claim.procedure}</p>
                            <p><span className="font-medium text-gray-500">Amount:</span> ${claim.amount.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* AI Analysis */}
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">AI Analysis & Fraud Detection</h3>
                        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                             <div className="flex justify-between items-center">
                                <p className="font-medium text-gray-600">AI Recommendation</p>
                                <span className="font-bold text-yellow-600">Manual Review</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <p className="font-medium text-gray-600">AI Confidence Score</p>
                                <span className="font-mono text-gray-800">{claim.aiConfidence * 100}%</span>
                             </div>
                             <div className="flex justify-between items-center">
                                <p className="font-medium text-gray-600">Fraud Risk Assessment</p>
                                <RiskIndicator risk={claim.fraudRisk} />
                             </div>
                             <div className="pt-4 border-t mt-4">
                                <p className="font-medium text-gray-600 mb-2">Risk Factors Identified:</p>
                                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                                    <li>Unusually high cost for the specified procedure.</li>
                                    <li>Provider has been flagged in 2 previous suspicious claims.</li>
                                    <li>Claim submitted from a different geographical location than the policyholder's address.</li>
                                </ul>
                             </div>
                        </div>
                    </div>
                     {/* Blockchain Record */}
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Blockchain Record</h3>
                        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 font-mono">
                            <p><span className="font-semibold text-gray-800">Status:</span> Not yet recorded</p>
                            <p><span className="font-semibold text-gray-800">Tx Hash:</span> N/A</p>
                            <p className="mt-2 text-xs text-gray-500">Once a final decision is made, the result will be immutably recorded on the Hyperledger Fabric blockchain.</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Actions & Document */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Actions</h3>
                        <div className="flex flex-col space-y-3">
                            <button className="w-full text-white bg-green-600 hover:bg-green-700 py-2 px-4 rounded-md font-medium">Approve Claim</button>
                            <button className="w-full text-white bg-red-600 hover:bg-red-700 py-2 px-4 rounded-md font-medium">Reject Claim</button>
                            <button className="w-full text-gray-700 bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded-md font-medium">Request More Information</button>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Original Document</h3>
                        <div className="border rounded-lg p-4 text-center bg-gray-50">
                            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-700">medical_receipt.pdf</p>
                            <a href="#!" className="text-blue-600 hover:underline text-sm font-medium mt-2 block">Download Document</a>
                        </div>
                    </div>
                </div>
            </div>
             <div className="mt-8 pt-6 border-t">
                <button onClick={() => setPage('dashboard')} className="text-blue-600 hover:text-blue-800">&larr; Back to Dashboard</button>
             </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---

export default function App() {
  const [page, setPage] = useState('dashboard'); // 'dashboard', 'submit', 'claimStatus', 'adminView'
  const [userType, setUserType] = useState('policyholder'); // 'policyholder', 'insurer'

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage setPage={setPage} userType={userType} />;
      case 'submit':
        return <SubmitClaimPage setPage={setPage} />;
      case 'claimStatus':
        return <ClaimStatusPage setPage={setPage} />;
      case 'adminView':
        return <AdminViewPage setPage={setPage} />;
      default:
        return <DashboardPage setPage={setPage} userType={userType} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header setPage={setPage} userType={userType} setUserType={setUserType} />
      <main className="flex-grow container mx-auto px-6 py-8">
        {renderPage()}
      </main>
      <Footer />
    </div>
  );
}
