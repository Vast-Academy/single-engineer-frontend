import React from 'react';

/**
 * Reusable Skeleton Loader Components
 * Used across the app for consistent loading states
 */

// Base skeleton box
export const SkeletonBox = ({ width = 'full', height = '4', className = '' }) => (
    <div
        className={`bg-gray-200 rounded animate-pulse ${className}`}
        style={{
            width: width === 'full' ? '100%' : width,
            height: height === 'full' ? '100%' : `${height}px`
        }}
    />
);

// Card skeleton
export const SkeletonCard = ({ children, className = '' }) => (
    <div className={`bg-white rounded-lg p-3 shadow-sm border border-gray-100 ${className}`}>
        {children}
    </div>
);

// List item skeleton
export const SkeletonListItem = () => (
    <div className="p-3 flex items-center gap-3 border-b border-gray-100">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0 animate-pulse"></div>
        <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
    </div>
);

// Customer card skeleton
export const SkeletonCustomerCard = () => (
    <SkeletonCard>
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0 animate-pulse"></div>
            <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
        </div>
    </SkeletonCard>
);

// Inventory item skeleton
export const SkeletonInventoryItem = () => (
    <SkeletonCard>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded flex-shrink-0 animate-pulse"></div>
            <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-28 mb-1 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
    </SkeletonCard>
);

// Work order item skeleton
export const SkeletonWorkOrderItem = () => (
    <div className="p-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-gray-200 rounded-lg flex-shrink-0 animate-pulse"></div>
        <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded w-24 mb-1 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
    </div>
);

// Bill item skeleton
export const SkeletonBillItem = () => (
    <SkeletonCard>
        <div className="flex items-center justify-between">
            <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-28 mb-1 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-24 mb-1 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
            <div className="text-right">
                <div className="h-5 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
        </div>
    </SkeletonCard>
);

// Metric card skeleton (for dashboard)
export const SkeletonMetricCard = () => (
    <SkeletonCard>
        <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-20 mt-2 animate-pulse"></div>
    </SkeletonCard>
);

// Page skeleton wrapper
export const SkeletonPage = ({ children, className = '' }) => (
    <div className={`pb-20 animate-pulse ${className}`}>
        {children}
    </div>
);

// Table row skeleton
export const SkeletonTableRow = ({ columns = 4 }) => (
    <tr className="border-b border-gray-100">
        {[...Array(columns)].map((_, i) => (
            <td key={i} className="p-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </td>
        ))}
    </tr>
);

// Search bar skeleton
export const SkeletonSearchBar = () => (
    <div className="mb-4">
        <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
    </div>
);

// Header skeleton
export const SkeletonHeader = () => (
    <div className="mb-4">
        <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
    </div>
);

// Complete page skeletons for common layouts

export const SkeletonCustomersPage = () => (
    <SkeletonPage>
        <SkeletonSearchBar />
        <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
                <SkeletonCustomerCard key={i} />
            ))}
        </div>
    </SkeletonPage>
);

export const SkeletonInventoryPage = () => (
    <SkeletonPage>
        <SkeletonSearchBar />
        <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
                <SkeletonInventoryItem key={i} />
            ))}
        </div>
    </SkeletonPage>
);

export const SkeletonWorkOrdersPage = () => (
    <SkeletonPage>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100 mb-3">
            {[...Array(6)].map((_, i) => (
                <SkeletonWorkOrderItem key={i} />
            ))}
        </div>
    </SkeletonPage>
);

export const SkeletonCustomerDetailPage = () => (
    <SkeletonPage>
        {/* Header */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-3">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
            </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
            <SkeletonMetricCard />
            <SkeletonMetricCard />
        </div>

        {/* Bills */}
        <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
        <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
                <SkeletonBillItem key={i} />
            ))}
        </div>
    </SkeletonPage>
);

export const SkeletonBillsPage = () => (
    <SkeletonPage>
        <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
                <SkeletonBillItem key={i} />
            ))}
        </div>
    </SkeletonPage>
);

export const SkeletonBankAccountsPage = () => (
    <SkeletonPage>
        <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
                <SkeletonCard key={i}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                            <div className="h-5 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                        </div>
                        <div className="w-16 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    </div>
                </SkeletonCard>
            ))}
        </div>
    </SkeletonPage>
);

export default {
    Box: SkeletonBox,
    Card: SkeletonCard,
    ListItem: SkeletonListItem,
    CustomerCard: SkeletonCustomerCard,
    InventoryItem: SkeletonInventoryItem,
    WorkOrderItem: SkeletonWorkOrderItem,
    BillItem: SkeletonBillItem,
    MetricCard: SkeletonMetricCard,
    Page: SkeletonPage,
    TableRow: SkeletonTableRow,
    SearchBar: SkeletonSearchBar,
    Header: SkeletonHeader,
    // Full page skeletons
    CustomersPage: SkeletonCustomersPage,
    InventoryPage: SkeletonInventoryPage,
    WorkOrdersPage: SkeletonWorkOrdersPage,
    CustomerDetailPage: SkeletonCustomerDetailPage,
    BillsPage: SkeletonBillsPage
};
