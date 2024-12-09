const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');
const auth = require('../middleware/auth');
const Invoice = require('../models/invoice');

const router = express.Router();
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Utility Function to Send Email
async function sendEmail(to, subject, html) {
  if (!to || typeof to !== 'string' || !/\S+@\S+\.\S+/.test(to)) {
    throw new Error('No recipient defined or invalid recipient');
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  };

  return transporter.sendMail(mailOptions);
}

// Trigger Overdue Notifications
router.post('/trigger-overdue', auth, async (req, res) => {
  try {
    const overdueInvoices = await Invoice.find({
      userId: req.user._id,
      dueDate: { $lte: new Date() },
      status: 'due',
    });

    if (overdueInvoices.length === 0) {
      return res.json({ message: 'No overdue invoices found' });
    }

    const notifications = await Promise.all(
      overdueInvoices.map(async (invoice) => {
        const recipientEmail = req.body.email;

        if (!recipientEmail || typeof recipientEmail !== 'string') {
          console.error(`No recipient defined for invoice ${invoice.invoiceId}`);
          return null; // Skip processing this invoice
        }

        await sendEmail(
          recipientEmail,
          'Invoice Overdue Notice',
          `
            <h1>Invoice Overdue Notice</h1>
            <p>Dear ${recipientEmail},</p>
            <p>This is a reminder that invoice ${invoice.invoiceId} for amount $${invoice.amount} is overdue.</p>
            <p>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            <p>Please process the payment as soon as possible.</p>
            <br>
            <p>Best regards,</p>
            <p>${req.user.name}</p>
          `
        );

        if (process.env.ZAPIER_WEBHOOK_URL) {
          await axios.post(process.env.ZAPIER_WEBHOOK_URL, {
            type: 'INVOICE_OVERDUE',
            invoiceId: invoice.invoiceId,
            amount: invoice.amount,
            recipient: recipientEmail,
            dueDate: invoice.dueDate,
            daysOverdue: Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)),
            userId: req.user._id,
            userEmail: req.user.email,
            userName: req.user.name,
          });
        }

        await Invoice.findByIdAndUpdate(invoice._id, { status: 'overdue' });
        return invoice.invoiceId;
      })
    );

    const notifiedInvoices = notifications.filter(Boolean);

    res.json({
      message: 'Overdue notifications sent successfully',
      notifiedInvoices,
    });
  } catch (err) {
    console.error('Automation error:', err);
    res.status(500).json({ error: 'Failed to send overdue notifications' });
  }
});
router.post('/trigger-reminder', auth, async (req, res) => {
  try {
    const { invoiceId } = req.body;
    const invoice = await Invoice.findOne({
      invoiceId,
      userId: req.user._id,
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const recipientEmail = req.body.email;

    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return res.status(400).json({ error: 'Recipient email is missing or invalid for the selected invoice' });
    }

    // Send Reminder Email
    await sendEmail(
      recipientEmail,
      'Payment Reminder',
      `
        <h1>Payment Reminder</h1>
        <p>Dear ${recipientEmail},</p>
        <p>This is a friendly reminder about invoice ${invoice.invoiceId} for amount $${invoice.amount}.</p>
        <p>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
        <p>Please process the payment before the due date.</p>
        <br>
        <p>Best regards,</p>
        <p>${req.user.name}</p>
      `
    );
    if (process.env.ZAPIER_WEBHOOK_URL) {
      await axios.post(process.env.ZAPIER_WEBHOOK_URL, {
        type: 'PAYMENT_REMINDER',
        invoiceId: invoice.invoiceId,
        amount: invoice.amount,
        recipient: recipientEmail,
        dueDate: invoice.dueDate,
        status: invoice.status,
        userId: req.user._id,
        userEmail: req.user.email,
        userName: req.user.name,
      });
    }

    res.json({
      message: 'Payment reminder sent successfully',
      invoice: invoice.invoiceId,
    });
  } catch (err) {
    console.error('Automation error:', err);
    res.status(500).json({ error: 'Failed to send payment reminder' });
  }
});

module.exports = router;
