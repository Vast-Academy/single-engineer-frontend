import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const normalizeBill = (bill) => {
    const items = (bill?.items || []).map(item => ({
        itemName: item.itemName || item.item_name || item.name || 'Item',
        serialNumber: item.serialNumber || item.serial_number || '',
        qty: item.qty || item.quantity || 1,
        price: item.price || item.salePrice || item.sale_price || 0,
        amount: item.amount || item.total || 0
    }));

    return {
        billNumber: bill?.billNumber || bill?.bill_number || '',
        subtotal: bill?.subtotal || bill?.sub_total || 0,
        discount: bill?.discount || 0,
        totalAmount: bill?.totalAmount || bill?.total_amount || 0,
        receivedPayment: bill?.receivedPayment || bill?.received_payment || 0,
        dueAmount: bill?.dueAmount || bill?.due_amount || 0,
        status: bill?.status || 'pending',
        createdAt: bill?.createdAt || bill?.created_at || new Date().toISOString(),
        items
    };
};

const buildShareText = (bill, customer) => {
    const total = bill.totalAmount || 0;
    const due = bill.dueAmount || 0;
    return `Invoice ${bill.billNumber} - ${customer?.customerName || 'Customer'}\nTotal: Rs ${total}${due > 0 ? `\nDue: Rs ${due}` : '\nFully Paid'}`;
};

export const generateBillPdfDoc = ({ bill, customer, businessProfile }) => {
    const normalized = normalizeBill(bill);
    const doc = new jsPDF();
    const items = normalized.items || [];
    let yPos = 20;

    // Header - Business Details
    if (businessProfile && businessProfile.isComplete) {
        // Business Name - Bold and Large
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(businessProfile.businessName, 105, yPos, { align: 'center' });
        yPos += 6;

        // Address Line
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const addressLine = `${businessProfile.address}, ${businessProfile.city}, ${businessProfile.state} - ${businessProfile.pincode}`;
        doc.text(addressLine, 105, yPos, { align: 'center' });
        yPos += 5;

        // Phone Number
        if (businessProfile.phone) {
            doc.text(`Phone: ${businessProfile.phone}`, 105, yPos, { align: 'center' });
            yPos += 5;
        }

        yPos += 3;
    } else {
        // Fallback to placeholder if business profile not set up
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Your Business Name', 105, yPos, { align: 'center' });
        yPos += 10;
    }

    // TAX INVOICE Title
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
    doc.text(normalized.billNumber, 140, yPos);

    yPos += 5;
    doc.setFontSize(10);
    if (customer?.phoneNumber) {
        doc.text(customer.phoneNumber, 20, yPos);
    }
    doc.text(formatDate(normalized.createdAt), 140, yPos);

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Status: ${normalized.status.toUpperCase()}`, 140, yPos);

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
        doc.text(`?${item.price}`, 145, yPos, { align: 'right' });
        doc.text(`?${item.amount}`, 180, yPos, { align: 'right' });

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
    doc.text(`?${normalized.subtotal}`, 180, yPos, { align: 'right' });
    yPos += 6;

    // Discount if any
    if (normalized.discount > 0) {
        doc.text('Discount:', totalsX, yPos);
        doc.text(`-?${normalized.discount}`, 180, yPos, { align: 'right' });
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
    doc.text(`?${normalized.totalAmount}`, 180, yPos, { align: 'right' });
    yPos += 8;

    // Paid
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 150, 0); // Green
    doc.text('Paid:', totalsX, yPos);
    doc.text(`?${normalized.receivedPayment}`, 180, yPos, { align: 'right' });
    yPos += 6;

    // Due if any
    if (normalized.dueAmount > 0) {
        doc.setTextColor(220, 38, 38); // Red
        doc.setFont('helvetica', 'bold');
        doc.text('Balance Due:', totalsX, yPos);
        doc.text(`?${normalized.dueAmount}`, 180, yPos, { align: 'right' });
    }

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Signature Section (if business profile exists)
    if (businessProfile && businessProfile.isComplete) {
        yPos += 10;

        // Left side - Authorized signature text and owner name box
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Authorized signature for ${businessProfile.businessName}`, 20, yPos);
        yPos += 8;

        // Owner name box
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.rect(20, yPos, 60, 10); // x, y, width, height

        // Owner name centered in box
        doc.setFont('helvetica', 'normal');
        doc.text(businessProfile.ownerName, 50, yPos + 6, { align: 'center' });
    }

    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your business!', 105, 280, { align: 'center' });

    return doc;
};

export const buildPdfBlob = ({ bill, customer, businessProfile }) => {
    const doc = generateBillPdfDoc({ bill, customer, businessProfile });
    return doc.output('blob');
};

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

export const savePdfNative = async ({ bill, customer, businessProfile, fileName }) => {
    const blob = buildPdfBlob({ bill, customer, businessProfile });
    const base64 = await blobToBase64(blob);

    const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents
    });

    return result?.uri;
};

export const downloadBillPdf = async ({ bill, customer, businessProfile, onSaved } = {}) => {
    const normalized = normalizeBill(bill);
    const fileName = `Invoice-${normalized.billNumber || 'invoice'}.pdf`;

    if (Capacitor.isNativePlatform()) {
        const uri = await savePdfNative({ bill, customer, businessProfile, fileName });
        if (onSaved) {
            onSaved(uri, fileName);
        } else {
            alert(`PDF saved to device storage: ${uri || fileName}`);
        }
        return;
    }

    const doc = generateBillPdfDoc({ bill, customer, businessProfile });
    doc.save(fileName);
};

export const shareBillPdf = async ({ bill, customer, businessProfile } = {}) => {
    const normalized = normalizeBill(bill);
    const fileName = `Invoice-${normalized.billNumber || 'invoice'}.pdf`;
    const shareText = buildShareText(normalized, customer);

    if (Capacitor.isNativePlatform()) {
        const uri = await savePdfNative({ bill, customer, businessProfile, fileName });
        await Share.share({
            title: `Invoice - ${normalized.billNumber}`,
            text: shareText,
            url: uri,
            files: uri ? [uri] : undefined,
            dialogTitle: 'Share Invoice PDF'
        });
        return;
    }

    const blob = buildPdfBlob({ bill, customer, businessProfile });
    const file = new File([blob], fileName, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
            title: `Invoice - ${normalized.billNumber}`,
            text: shareText,
            files: [file]
        });
    } else if (navigator.share) {
        const doc = generateBillPdfDoc({ bill, customer, businessProfile });
        doc.save(fileName);
        await navigator.share({
            title: `Invoice - ${normalized.billNumber}`,
            text: `${shareText}\n\nPDF downloaded separately.`
        });
    } else {
        const doc = generateBillPdfDoc({ bill, customer, businessProfile });
        doc.save(fileName);
        alert('PDF downloaded. You can share it manually from your Downloads folder.');
    }
};

export const viewBillPdf = async ({ bill, customer, businessProfile } = {}) => {
    const normalized = normalizeBill(bill);
    const fileName = `Invoice-${normalized.billNumber || 'invoice'}.pdf`;

    if (Capacitor.isNativePlatform()) {
        const uri = await savePdfNative({ bill, customer, businessProfile, fileName });
        if (uri) {
            const opened = window.open(uri, '_system') || window.open(uri, '_blank');
            if (!opened) {
                alert(`PDF saved to device storage: ${uri || fileName}`);
            }
            return;
        }
        alert('Unable to open the PDF viewer right now.');
        return;
    }

    const blob = buildPdfBlob({ bill, customer, businessProfile });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
};
