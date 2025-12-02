import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import Workorders from './pages/Workorders';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Settings from './pages/Settings';
import BankAccounts from './pages/BankAccounts';
import CustomerBills from './pages/CustomerBills';
import BillDetail from './pages/BillDetail';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Public Route */}
                    <Route path="/" element={<Login />} />

                    {/* Protected Routes with Layout */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Home />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/inventory"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Inventory />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/workorders"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Workorders />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customers"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Customers />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customer/:customerId"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <CustomerDetail />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/customer/:customerId/bills"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <CustomerBills />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute>
                                <Settings />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/bank-accounts"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <BankAccounts />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/bill/:billId"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <BillDetail />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
