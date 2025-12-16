import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, Printer, Download, Share2, Clock, CheckCircle, AlertCircle, User, Phone, Calendar, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import PayDueModal from '../components/bill/PayDueModal';
import { pushBills } from '../storage/sync/pushBills';
import { useSync } from '../context/SyncContext';
import { ensureBillsPulled, pullBillsFromBackend } from '../storage/sync/billsSync';
import { getBillsDao } from '../storage/dao/billsDao';

const BillDetail = () => {
    const navigate = useNavigate();
    const { billId } = useParams();
    const location = useLocation();
    const printRef = useRef(null);

    const [bill, setBill] = useState(null);
    const [customer, setCustomer] = useState(location.state?.customer || null);
    const [loading, setLoading] = useState(true);
    const [showPayDue, setShowPayDue] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const { notifyLocalSave } = useSync();

    // Smart back navigation - go to customer bills or just go back
    const handleBack = () => {
        // If we have customer info, navigate to their bills page
        if (customer?._id) {
            navigate(`/customer/${customer._id}/bills`, {
                state: { customer },
                replace: true
            });
        } else if (bill?.customer?._id) {
            navigate(`/customer/${bill.customer._id}/bills`, {
                replace: true
            });
        } else {
            // Fallback to customers page
            navigate('/customers', { replace: true });
        }
    };

    // Always fetch bill from DB to ensure items and payment history are loaded
    useEffect(() => {
        if (billId) {
            fetchBillLocal();
        }
    }, [billId]);

    const fetchBillLocal = async () => {
        setLoading(true);
        try {
            await ensureBillsPulled();
            const dao = await getBillsDao();
            const localBill = await dao.getById(billId);
            if (localBill) {
                setBill({
                    _id: localBill.id,
                    billNumber: localBill.bill_number,
                    subtotal: localBill.subtotal,
                    discount: localBill.discount,
                    totalAmount: localBill.total_amount,
                    receivedPayment: localBill.received_payment,
                    dueAmount: localBill.due_amount,
                    paymentMethod: localBill.payment_method,
                    status: localBill.status,
                    createdAt: localBill.created_at,
                    customer: localBill.customer_id ? { _id: localBill.customer_id } : null,
                    items: (localBill.items || []).map(it => ({
                        itemType: it.item_type,
                        itemId: it.item_id,
                        itemName: it.item_name,
                        serialNumber: it.serial_number,
                        qty: it.qty,
                        price: it.price,
                        amount: it.amount,
                        purchasePrice: it.purchase_price
                    })),
                    paymentHistory: (localBill.paymentHistory || []).map(p => ({
                        _id: p.id,
                        amount: p.amount,
                        paidAt: p.paid_at,
                        note: p.note,
                        pending_sync: p.pending_sync,
                        sync_error: p.sync_error
                    }))
                });

                // If we don't have customer info in state, fetch and set it
                if (!customer && localBill.customer_id) {
                    setCustomer({ _id: localBill.customer_id });
                }
            }
        } catch (error) {
            console.error('Fetch bill error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setLoading(true);
        try {
            await pullBillsFromBackend();
            await fetchBillLocal();
        } catch (err) {
            console.error('Refresh bill error:', err);
            setLoading(false);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Format time
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Format full date time
    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Get status info
    const getStatusInfo = (status) => {
        switch (status) {
            case 'paid':
                return { icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' };
            case 'partial':
                return { icon: Clock, bg: 'bg-orange-100', text: 'text-orange-700', label: 'Partial' };
            default:
                return { icon: AlertCircle, bg: 'bg-red-100', text: 'text-red-700', label: 'Pending' };
        }
    };

    // Handle payment success
    const handlePaymentSuccess = (updatedBill) => {
        // Guard: if no server id, warn and skip attempting payment
        if (bill && (bill._id?.startsWith('bill-') || bill._id?.startsWith('client-'))) {
            alert('This bill has not synced yet. Please go online to sync before taking payments.');
            return;
        }

        setBill(updatedBill);
        notifyLocalSave();
        pushBills().catch(() => {});
    };

    // Generate Bill PDF using jsPDF
    const generateBillPDF = () => {
        const doc = new jsPDF();
        const items = bill.items || [];
        let yPos = 20;

        // Header - Company Name
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Your Business Name', 105, yPos, { align: 'center' });

        yPos += 8;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text('TAX INVOICE', 105, yPos, { align: 'center' });

        // Horizontal line
        yPos += 5;
        doc.setLineWidth(0.5);
        doc.line(20, yPos, 190, yPos);
        yPos += 10;

        // Bill Info Section
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('BILL TO', 20, yPos);

        doc.setFont('helvetica', 'normal');
        doc.text('INVOICE DETAILS', 140, yPos);

        yPos += 6;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(customer?.customerName || 'Customer', 20, yPos);

        doc.setFont('helvetica', 'normal');
        doc.text(bill.billNumber, 140, yPos);

        yPos += 5;
        doc.setFontSize(10);
        if (customer?.phoneNumber) {
            doc.text(customer.phoneNumber, 20, yPos);
        }
        doc.text(formatDate(bill.createdAt), 140, yPos);

        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(`Status: ${bill.status.toUpperCase()}`, 140, yPos);

        yPos += 10;

        // Items Table Header
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos - 5, 170, 8, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('#', 22, yPos);
        doc.text('Description', 35, yPos);
        doc.text('Qty', 120, yPos, { align: 'center' });
        doc.text('Rate', 145, yPos, { align: 'right' });
        doc.text('Amount', 180, yPos, { align: 'right' });

        yPos += 3;
        doc.setLineWidth(0.3);
        doc.line(20, yPos, 190, yPos);
        yPos += 6;

        // Items
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        items.forEach((item, index) => {
            // Check if we need a new page
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }

            doc.text(`${index + 1}`, 22, yPos);

            // Item name with wrapping if too long
            const itemText = item.itemName + (item.serialNumber ? ` (S/N: ${item.serialNumber})` : '');
            const splitText = doc.splitTextToSize(itemText, 75);
            doc.text(splitText, 35, yPos);

            doc.text(`${item.qty}`, 120, yPos, { align: 'center' });
            doc.text(`₹${item.price}`, 145, yPos, { align: 'right' });
            doc.text(`₹${item.amount}`, 180, yPos, { align: 'right' });

            yPos += 6 * splitText.length;

            // Light separator line
            doc.setDrawColor(230, 230, 230);
            doc.line(20, yPos, 190, yPos);
            yPos += 4;
        });

        yPos += 5;

        // Totals Section
        const totalsX = 130;
        doc.setFontSize(10);

        // Subtotal
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', totalsX, yPos);
        doc.text(`₹${bill.subtotal}`, 180, yPos, { align: 'right' });
        yPos += 6;

        // Discount if any
        if (bill.discount > 0) {
            doc.text('Discount:', totalsX, yPos);
            doc.text(`-₹${bill.discount}`, 180, yPos, { align: 'right' });
            yPos += 6;
        }

        // Total line
        doc.setLineWidth(0.5);
        doc.line(totalsX, yPos, 180, yPos);
        yPos += 6;

        // Total
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Total:', totalsX, yPos);
        doc.text(`₹${bill.totalAmount}`, 180, yPos, { align: 'right' });
        yPos += 8;

        // Paid
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 150, 0); // Green
        doc.text('Paid:', totalsX, yPos);
        doc.text(`₹${bill.receivedPayment}`, 180, yPos, { align: 'right' });
        yPos += 6;

        // Due if any
        if (bill.dueAmount > 0) {
            doc.setTextColor(220, 38, 38); // Red
            doc.setFont('helvetica', 'bold');
            doc.text('Balance Due:', totalsX, yPos);
            doc.text(`₹${bill.dueAmount}`, 180, yPos, { align: 'right' });
        }

        // Reset text color
        doc.setTextColor(0, 0, 0);

        // Footer
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Thank you for your business!', 105, 280, { align: 'center' });

        return doc;
    };

    // Generate PDF blob for reuse across download/share flows
    const buildPdfBlob = () => {
        const doc = generateBillPDF();
        return doc.output('blob');
    };

    // Convert blob to base64 string for Capacitor Filesystem
    const blobToBase64 = async (blob) => {
        const buffer = await blob.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i += 1) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    // Save PDF on native (Android) and return file URI
    const savePdfNative = async (fileName) => {
        const blob = buildPdfBlob();
        const base64 = await blobToBase64(blob);

        const result = await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Documents
        });

        return result?.uri;
    };

    // Handle Print
    const handlePrint = () => {
        const printContent = printRef.current;
        const printWindow = window.open('', '_blank');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice - ${bill.billNumber}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; font-size: 14px; }
                    .invoice { max-width: 800px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #333; }
                    .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
                    .invoice-title { font-size: 18px; color: #666; }
                    .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .info-block h4 { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
                    .info-block p { margin: 4px 0; }
                    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    .items-table th { background: #f5f5f5; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-size: 12px; text-transform: uppercase; }
                    .items-table td { padding: 12px; border-bottom: 1px solid #eee; }
                    .items-table .amount { text-align: right; }
                    .items-table .qty { text-align: center; }
                    .totals { margin-left: auto; width: 250px; }
                    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .totals-row.total { border-top: 2px solid #333; border-bottom: none; font-weight: bold; font-size: 16px; margin-top: 10px; padding-top: 15px; }
                    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
                    .status-paid { background: #d1fae5; color: #065f46; }
                    .status-partial { background: #ffedd5; color: #c2410c; }
                    .status-pending { background: #fee2e2; color: #dc2626; }
                    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
                    .serial { color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="invoice">
                    <div class="header">
                        <div class="company-name">Your Business Name</div>
                        <div class="invoice-title">TAX INVOICE</div>
                    </div>

                    <div class="info-section">
                        <div class="info-block">
                            <h4>Bill To</h4>
                            <p><strong>${customer?.customerName || 'Customer'}</strong></p>
                            ${customer?.phoneNumber ? `<p>${customer.phoneNumber}</p>` : ''}
                        </div>
                        <div class="info-block" style="text-align: right;">
                            <h4>Invoice Details</h4>
                            <p><strong>${bill.billNumber}</strong></p>
                            <p>${formatDate(bill.createdAt)}</p>
                            <p><span class="status status-${bill.status}">${bill.status.toUpperCase()}</span></p>
                        </div>
                    </div>

                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Description</th>
                                <th class="qty">Qty</th>
                                <th class="amount">Rate</th>
                                <th class="amount">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map((item, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>
                                        ${item.itemName}
                                        ${item.serialNumber ? `<div class="serial">S/N: ${item.serialNumber}</div>` : ''}
                                    </td>
                                    <td class="qty">${item.qty}</td>
                                    <td class="amount">₹${item.price}</td>
                                    <td class="amount">₹${item.amount}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="totals">
                        <div class="totals-row">
                            <span>Subtotal</span>
                            <span>₹${bill.subtotal}</span>
                        </div>
                        ${bill.discount > 0 ? `
                            <div class="totals-row">
                                <span>Discount</span>
                                <span>-₹${bill.discount}</span>
                            </div>
                        ` : ''}
                        <div class="totals-row total">
                            <span>Total</span>
                            <span>₹${bill.totalAmount}</span>
                        </div>
                        <div class="totals-row">
                            <span>Paid</span>
                            <span style="color: green;">₹${bill.receivedPayment}</span>
                        </div>
                        ${bill.dueAmount > 0 ? `
                            <div class="totals-row">
                                <span>Balance Due</span>
                                <span style="color: red;">₹${bill.dueAmount}</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="footer">
                        <p>Thank you for your business!</p>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() { window.close(); }
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Handle Download - platform-aware
    const handleDownload = async () => {
        const fileName = `Invoice-${bill.billNumber}.pdf`;
        try {
            setDownloading(true);

            if (Capacitor.isNativePlatform()) {
                const uri = await savePdfNative(fileName);
                alert(`PDF saved to device storage: ${uri || fileName}`);
            } else {
                const doc = generateBillPDF();
                doc.save(fileName);
            }
        } catch (error) {
            console.error('Download PDF error:', error);
            alert('Failed to download PDF. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    // Handle Share - platform-aware
    const handleShare = async () => {
        const fileName = `Invoice-${bill.billNumber}.pdf`;
        try {
            setSharing(true);

            // Prepare share text
            const shareText = `Invoice ${bill.billNumber} - ${customer?.customerName || 'Customer'}\nTotal: Rs ${bill.totalAmount}${bill.dueAmount > 0 ? `\nDue: Rs ${bill.dueAmount}` : '\nFully Paid'}`;

            if (Capacitor.isNativePlatform()) {
                // Save PDF to device then share using native share sheet
                const uri = await savePdfNative(fileName);
                await Share.share({
                    title: `Invoice - ${bill.billNumber}`,
                    text: shareText,
                    url: uri,
                    files: uri ? [uri] : undefined,
                    dialogTitle: 'Share Invoice PDF'
                });
                return;
            }

            // Web / PWA path
            const blob = buildPdfBlob();
            const file = new File([blob], fileName, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Invoice - ${bill.billNumber}`,
                    text: shareText,
                    files: [file]
                });
            } else if (navigator.share) {
                // Fallback: trigger download then share text only
                const doc = generateBillPDF();
                doc.save(fileName);
                await navigator.share({
                    title: `Invoice - ${bill.billNumber}`,
                    text: `${shareText}

PDF downloaded separately.`
                });
            } else {
                // Last resort: just download
                const doc = generateBillPDF();
                doc.save(fileName);
                alert('PDF downloaded. You can share it manually from your Downloads folder.');
            }
        } catch (error) {
            console.error('Share PDF error:', error);
            alert('Unable to share right now. The PDF has been prepared/downloaded.');
        } finally {
            setSharing(false);
        }
    };

    if (loading) {
        return (
            <div className="py-4 flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!bill) {
        return (
            <div className="p-4">
                <button
                    onClick={handleBack}
                    className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back
                </button>
                <div className="bg-white p-6 rounded-2xl shadow-sm border text-center space-y-3">
                    <p className="text-gray-700 font-semibold">Bill not found locally.</p>
                    <p className="text-gray-500 text-sm">If recently created, sync may still be pending.</p>
                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm font-semibold"
                    >
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Refresh from server
                    </button>
                </div>
            </div>
        );
    }

    const items = bill.items || [];
    const paymentHistory = bill.paymentHistory || [];
    const statusInfo = getStatusInfo(bill.status);
    const StatusIcon = statusInfo.icon;

    return (
        <div className="py-4 pb-40">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <button
                    onClick={handleBack}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-800">Invoice</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-gray-500 text-sm">{bill.billNumber}</p>
                        {(bill.pendingSync || bill.syncError) && (
                            <span className={`px-2 py-0.5 text-[11px] rounded-full font-semibold ${bill.syncError ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {bill.syncError ? '!' : 'Sync'}
                            </span>
                        )}
                    </div>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${statusInfo.bg}`}>
                    <StatusIcon className={`w-4 h-4 ${statusInfo.text}`} />
                    <span className={`text-sm font-medium ${statusInfo.text}`}>{statusInfo.label}</span>
                </div>
            </div>

            {/* Invoice Card */}
            <div ref={printRef} className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
                {/* Invoice Header */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-primary-100 text-xs uppercase tracking-wide">Invoice Amount</p>
                            <p className="text-3xl font-bold mt-1">₹{bill.totalAmount}</p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-primary-100">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm">{formatDate(bill.createdAt)}</span>
                            </div>
                            <p className="text-xs text-primary-200 mt-1">{formatTime(bill.createdAt)}</p>
                        </div>
                    </div>
                </div>

                {/* Customer Info */}
                <div className="p-4 border-b border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Bill To</p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800">{customer?.customerName || 'Customer'}</p>
                            {customer?.phoneNumber && (
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {customer.phoneNumber}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Items</p>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{item.itemName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                            {item.itemType === 'service' ? 'Service' : item.itemType === 'serialized' ? 'Serialized' : 'Generic'}
                                        </span>
                                        {item.serialNumber && (
                                            <span className="text-xs text-gray-500">S/N: {item.serialNumber}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-800">₹{item.amount}</p>
                                    <p className="text-xs text-gray-500">{item.qty} × ₹{item.price}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals */}
                <div className="bg-gray-50 p-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="text-gray-800">₹{bill.subtotal}</span>
                        </div>
                        {bill.discount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Discount</span>
                                <span className="text-green-600">-₹{bill.discount}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200">
                            <span className="text-gray-800">Total</span>
                            <span className="text-gray-800">₹{bill.totalAmount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Paid</span>
                            <span className="text-green-600">₹{bill.receivedPayment}</span>
                        </div>
                        {bill.dueAmount > 0 && (
                            <div className="flex justify-between font-semibold">
                                <span className="text-red-600">Due</span>
                                <span className="text-red-600">₹{bill.dueAmount}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment History */}
            {paymentHistory.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Payment History</p>
                    <div className="space-y-3">
                        {paymentHistory.map((payment, index) => {
                            // Parse payment note to extract method and remark
                            const isUPI = payment.note?.startsWith('[UPI]');
                            const isCash = payment.note?.startsWith('[Cash]');
                            let remark = '';
                            let txnId = '';

                            if (isUPI && payment.note) {
                                const withoutPrefix = payment.note.replace('[UPI] ', '');
                                if (withoutPrefix.includes(' | ')) {
                                    const parts = withoutPrefix.split(' | ');
                                    txnId = parts[0];
                                    remark = parts[1];
                                } else {
                                    txnId = withoutPrefix;
                                }
                            } else if (isCash && payment.note) {
                                remark = payment.note.replace('[Cash]', '').trim();
                            } else if (payment.note) {
                                remark = payment.note;
                            }

                            return (
                                <div key={index} className="py-3 border-b border-gray-100 last:border-0">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-800 font-medium flex items-center gap-2">
                                                {formatDateTime(payment.paidAt)}
                                                {(payment.pending_sync === 1 || payment.sync_error) && (
                                                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${payment.sync_error ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {payment.sync_error ? '!' : 'Sync'}
                                                    </span>
                                                )}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                                    isUPI
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {isUPI ? 'UPI' : 'Cash'}
                                                </span>
                                                {txnId && (
                                                    <span className="text-xs text-gray-500">{txnId}</span>
                                                )}
                                            </div>
                                            {remark && (
                                                <p className="text-xs text-gray-500 mt-1">{remark}</p>
                                            )}
                                        </div>
                                        <p className="font-semibold text-green-600 ml-3">+₹{payment.amount}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Action Buttons - Fixed at bottom */}
            <div className="fixed bottom-[70px] left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
                <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto">
                    {/* Pay Due */}
                    {bill.dueAmount > 0 ? (
                        <button
                            onClick={() => setShowPayDue(true)}
                            className="flex flex-col items-center gap-1 py-3 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
                        >
                            <CreditCard className="w-6 h-6 text-primary-600" />
                            <span className="text-xs font-medium text-primary-700">Pay Due</span>
                        </button>
                    ) : (
                        <div className="flex flex-col items-center gap-1 py-3 bg-green-50 rounded-xl">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                            <span className="text-xs font-medium text-green-700">Paid</span>
                        </div>
                    )}

                    {/* Print */}
                    <button
                        onClick={handlePrint}
                        className="flex flex-col items-center gap-1 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <Printer className="w-6 h-6 text-gray-600" />
                        <span className="text-xs font-medium text-gray-700">Print</span>
                    </button>

                    {/* Download */}
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex flex-col items-center gap-1 py-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {downloading ? (
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        ) : (
                            <Download className="w-6 h-6 text-blue-600" />
                        )}
                        <span className="text-xs font-medium text-blue-700">
                            {downloading ? 'Downloading...' : 'Download'}
                        </span>
                    </button>

                    {/* Share */}
                    <button
                        onClick={handleShare}
                        disabled={sharing}
                        className="flex flex-col items-center gap-1 py-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sharing ? (
                            <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
                        ) : (
                            <Share2 className="w-6 h-6 text-green-600" />
                        )}
                        <span className="text-xs font-medium text-green-700">
                            {sharing ? 'Sharing...' : 'Share'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Pay Due Modal */}
            <PayDueModal
                isOpen={showPayDue}
                onClose={() => setShowPayDue(false)}
                bill={bill}
                onSuccess={handlePaymentSuccess}
            />
        </div>
    );
};

export default BillDetail;







