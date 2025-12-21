const backendDomain = process.env.REACT_APP_BACKEND_URL

const SummaryApi = {
    // Auth APIs
    googleAuth: {
        url: `${backendDomain}/api/auth/google`,
        method: "post"
    },
    getCurrentUser: {
        url: `${backendDomain}/api/auth/me`,
        method: "get"
    },
    logout: {
        url: `${backendDomain}/api/auth/logout`,
        method: "post"
    },
    setPassword: {
        url: `${backendDomain}/api/auth/set-password`,
        method: "post"
    },
    verifyCurrentPassword: {
        url: `${backendDomain}/api/auth/verify-current-password`,
        method: "post"
    },
    emailPasswordLogin: {
        url: `${backendDomain}/api/auth/login`,
        method: "post"
    },
    // Forgot Password APIs
    sendPasswordResetOTP: {
        url: `${backendDomain}/api/auth/forgot-password/send-otp`,
        method: "post"
    },
    verifyPasswordResetOTP: {
        url: `${backendDomain}/api/auth/forgot-password/verify-otp`,
        method: "post"
    },
    resetPasswordWithOTP: {
        url: `${backendDomain}/api/auth/forgot-password/reset`,
        method: "post"
    },
    getBusinessProfile: {
        url: `${backendDomain}/api/business-profile`,
        method: "get"
    },
    updateBusinessProfile: {
        url: `${backendDomain}/api/business-profile`,
        method: "put"
    },

    // Health Check
    healthCheck: {
        url: `${backendDomain}/api/health`,
        method: "get"
    },

    // ==================== INVENTORY - SERIAL NUMBER ====================
    checkSerialNumber: {
        url: `${backendDomain}/api/inventory/check-serial`,
        method: "get"
    },

    // ==================== INVENTORY - ITEMS ====================
    addItem: {
        url: `${backendDomain}/api/inventory/item`,
        method: "post"
    },
    getAllItems: {
        url: `${backendDomain}/api/inventory/items`,
        method: "get"
    },
    getItem: {
        url: `${backendDomain}/api/inventory/item`,
        method: "get"
    },
    updateItem: {
        url: `${backendDomain}/api/inventory/item`,
        method: "put"
    },
    deleteItem: {
        url: `${backendDomain}/api/inventory/item`,
        method: "delete"
    },
    updateStock: {
        url: `${backendDomain}/api/inventory/item`,
        method: "post"
    },

    // ==================== INVENTORY - SERVICES ====================
    addService: {
        url: `${backendDomain}/api/inventory/service`,
        method: "post"
    },
    getAllServices: {
        url: `${backendDomain}/api/inventory/services`,
        method: "get"
    },
    updateService: {
        url: `${backendDomain}/api/inventory/service`,
        method: "put"
    },
    deleteService: {
        url: `${backendDomain}/api/inventory/service`,
        method: "delete"
    },

    // ==================== CUSTOMER ====================
    addCustomer: {
        url: `${backendDomain}/api/customer`,
        method: "post"
    },
    getAllCustomers: {
        url: `${backendDomain}/api/customers`,
        method: "get"
    },
    searchCustomers: {
        url: `${backendDomain}/api/customer/search`,
        method: "get"
    },
    getCustomer: {
        url: `${backendDomain}/api/customer`,
        method: "get"
    },
    updateCustomer: {
        url: `${backendDomain}/api/customer`,
        method: "put"
    },
    deleteCustomer: {
        url: `${backendDomain}/api/customer`,
        method: "delete"
    },

    // ==================== BILL ====================
    createBill: {
        url: `${backendDomain}/api/bill`,
        method: "post"
    },
    getAllBills: {
        url: `${backendDomain}/api/bills`,
        method: "get"
    },
    getBillsByCustomer: {
        url: `${backendDomain}/api/bills/customer`,
        method: "get"
    },
    getBill: {
        url: `${backendDomain}/api/bill`,
        method: "get"
    },
    updateBillPayment: {
        url: `${backendDomain}/api/bill`,
        method: "put"
    },
    payCustomerDue: {
        url: `${backendDomain}/api/bill/customer`,
        method: "put"
    },

    // ==================== BANK ACCOUNT ====================
    addBankAccount: {
        url: `${backendDomain}/api/bank-account`,
        method: "post"
    },
    getAllBankAccounts: {
        url: `${backendDomain}/api/bank-accounts`,
        method: "get"
    },
    updateBankAccount: {
        url: `${backendDomain}/api/bank-account`,
        method: "put"
    },
    deleteBankAccount: {
        url: `${backendDomain}/api/bank-account`,
        method: "delete"
    },
    setPrimaryBankAccount: {
        url: `${backendDomain}/api/bank-account`,
        method: "put"
    },

    // ==================== WORK ORDER ====================
    createWorkOrder: {
        url: `${backendDomain}/api/workorder`,
        method: "post"
    },
    getPendingWorkOrders: {
        url: `${backendDomain}/api/workorders/pending`,
        method: "get"
    },
    getCompletedWorkOrders: {
        url: `${backendDomain}/api/workorders/completed`,
        method: "get"
    },
    getWorkOrder: {
        url: `${backendDomain}/api/workorder`,
        method: "get"
    },
    updateWorkOrder: {
        url: `${backendDomain}/api/workorder`,
        method: "put"
    },
    markWorkOrderComplete: {
        url: `${backendDomain}/api/workorder`,
        method: "put"
    },
    deleteWorkOrder: {
        url: `${backendDomain}/api/workorder`,
        method: "delete"
    },
    getWorkOrdersByCustomer: {
        url: `${backendDomain}/api/workorders/customer`,
        method: "get"
    },
    linkWorkOrderBill: {
        url: `${backendDomain}/api/workorder/link-bill`,
        method: "put"
    },

    // ==================== NOTIFICATIONS ====================
    registerFcmToken: {
        url: `${backendDomain}/api/notification/register-token`,
        method: "post"
    },
    removeFcmToken: {
        url: `${backendDomain}/api/notification/remove-token`,
        method: "post"
    },

    // ==================== DASHBOARD ====================
    getDashboardMetrics: {
        url: `${backendDomain}/api/dashboard/metrics`,
        method: "get"
    }
}

export default SummaryApi;
