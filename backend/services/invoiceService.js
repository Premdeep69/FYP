import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure invoices directory exists
const invoicesDir = path.join(__dirname, '../invoices');
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

export const generateInvoice = async (invoiceData) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        invoiceNumber,
        date,
        dueDate,
        customer,
        items,
        subtotal,
        tax,
        total,
        paymentMethod,
        transactionId,
        status,
        notes
      } = invoiceData;

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      const filename = `invoice-${invoiceNumber}.pdf`;
      const filepath = path.join(invoicesDir, filename);

      // Pipe to file
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Header
      doc
        .fontSize(20)
        .text('INVOICE', 50, 50, { align: 'right' })
        .fontSize(10)
        .text(`Invoice #: ${invoiceNumber}`, 50, 80, { align: 'right' })
        .text(`Date: ${new Date(date).toLocaleDateString()}`, 50, 95, { align: 'right' })
        .text(`Due Date: ${new Date(dueDate).toLocaleDateString()}`, 50, 110, { align: 'right' });

      // Company Info (Left side)
      doc
        .fontSize(16)
        .text('Smart Gym Fitness', 50, 50)
        .fontSize(10)
        .text('123 Fitness Street', 50, 75)
        .text('Gym City, GC 12345', 50, 90)
        .text('contact@smartgym.com', 50, 105)
        .text('Phone: (555) 123-4567', 50, 120);

      // Customer Info
      doc
        .fontSize(12)
        .text('Bill To:', 50, 160)
        .fontSize(10)
        .text(customer.name, 50, 180)
        .text(customer.email, 50, 195);

      if (customer.address) {
        doc.text(customer.address, 50, 210);
      }

      // Status Badge
      const statusColor = status === 'paid' ? '#10b981' : status === 'pending' ? '#f59e0b' : '#ef4444';
      doc
        .fontSize(12)
        .fillColor(statusColor)
        .text(status.toUpperCase(), 400, 160, { align: 'right' })
        .fillColor('#000000');

      // Line items table
      const tableTop = 260;
      const itemCodeX = 50;
      const descriptionX = 150;
      const quantityX = 350;
      const priceX = 420;
      const amountX = 490;

      // Table header
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Item', itemCodeX, tableTop)
        .text('Description', descriptionX, tableTop)
        .text('Qty', quantityX, tableTop)
        .text('Price', priceX, tableTop)
        .text('Amount', amountX, tableTop);

      // Draw line under header
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      // Table rows
      doc.font('Helvetica');
      let yPosition = tableTop + 25;

      items.forEach((item, index) => {
        doc
          .fontSize(9)
          .text(index + 1, itemCodeX, yPosition)
          .text(item.description, descriptionX, yPosition, { width: 180 })
          .text(item.quantity || 1, quantityX, yPosition)
          .text(`$${(item.price / 100).toFixed(2)}`, priceX, yPosition)
          .text(`$${(item.amount / 100).toFixed(2)}`, amountX, yPosition);

        yPosition += 25;
      });

      // Draw line before totals
      doc
        .moveTo(50, yPosition)
        .lineTo(550, yPosition)
        .stroke();

      yPosition += 15;

      // Totals
      doc
        .fontSize(10)
        .text('Subtotal:', 400, yPosition)
        .text(`$${(subtotal / 100).toFixed(2)}`, 490, yPosition, { align: 'right' });

      yPosition += 20;

      if (tax > 0) {
        doc
          .text('Tax:', 400, yPosition)
          .text(`$${(tax / 100).toFixed(2)}`, 490, yPosition, { align: 'right' });
        yPosition += 20;
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Total:', 400, yPosition)
        .text(`$${(total / 100).toFixed(2)}`, 490, yPosition, { align: 'right' });

      // Payment Information
      yPosition += 40;
      doc
        .font('Helvetica')
        .fontSize(10)
        .text('Payment Information:', 50, yPosition);

      yPosition += 20;
      doc
        .fontSize(9)
        .text(`Payment Method: ${paymentMethod}`, 50, yPosition)
        .text(`Transaction ID: ${transactionId}`, 50, yPosition + 15);

      // Notes
      if (notes) {
        yPosition += 50;
        doc
          .fontSize(10)
          .text('Notes:', 50, yPosition)
          .fontSize(9)
          .text(notes, 50, yPosition + 15, { width: 500 });
      }

      // Footer
      const footerY = 700;
      doc
        .fontSize(8)
        .fillColor('#666666')
        .text('Thank you for your business!', 50, footerY, { align: 'center', width: 500 })
        .text('For questions about this invoice, please contact support@smartgym.com', 50, footerY + 15, { align: 'center', width: 500 });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve({
          filename,
          filepath,
          url: `/invoices/${filename}`
        });
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

export const generatePaymentReceipt = async (payment) => {
  const invoiceData = {
    invoiceNumber: payment._id.toString().slice(-8).toUpperCase(),
    date: payment.createdAt,
    dueDate: payment.createdAt,
    customer: {
      name: payment.userId.name,
      email: payment.userId.email,
      address: payment.userId.address || ''
    },
    items: [
      {
        description: payment.description || 'Service Payment',
        quantity: 1,
        price: payment.amount,
        amount: payment.amount
      }
    ],
    subtotal: payment.amount,
    tax: 0,
    total: payment.amount,
    paymentMethod: payment.paymentMethod || 'Credit Card',
    transactionId: payment.stripePaymentIntentId || payment._id.toString(),
    status: payment.status,
    notes: payment.metadata?.notes || 'Thank you for your payment.'
  };

  return await generateInvoice(invoiceData);
};

export const generateSubscriptionInvoice = async (subscription, payment) => {
  const invoiceData = {
    invoiceNumber: `SUB-${subscription._id.toString().slice(-8).toUpperCase()}`,
    date: payment.createdAt,
    dueDate: subscription.currentPeriodEnd,
    customer: {
      name: subscription.userId.name,
      email: subscription.userId.email,
      address: subscription.userId.address || ''
    },
    items: [
      {
        description: `${subscription.plan.name} Subscription - ${subscription.plan.interval}ly`,
        quantity: 1,
        price: subscription.plan.price,
        amount: subscription.plan.price
      }
    ],
    subtotal: subscription.plan.price,
    tax: 0,
    total: subscription.plan.price,
    paymentMethod: 'Credit Card',
    transactionId: payment.stripePaymentIntentId || payment._id.toString(),
    status: payment.status,
    notes: `Subscription period: ${new Date(subscription.currentPeriodStart).toLocaleDateString()} - ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
  };

  return await generateInvoice(invoiceData);
};

export default {
  generateInvoice,
  generatePaymentReceipt,
  generateSubscriptionInvoice
};
