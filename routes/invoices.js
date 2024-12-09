const express = require('express');
const Invoice = require('../models/invoice');
const auth = require('../middleware/auth');

const router = express.Router();
router.get('/', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user._id });
    const response = {
      invoices,
      email: req.user.email
    };
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});
router.get('/overdue', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({
      userId: req.user._id,
      dueDate: { $lte: new Date() },
      status: 'due'
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch overdue invoices' });
  }
});
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});
router.post('/', auth, async (req, res) => {
  try {
    const invoice = new Invoice({
      ...req.body,
      userId: req.user._id
    });
    await invoice.save();
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create invoice' });
  }
});
router.put('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { 
        _id: req.params.id,
        userId: req.user._id 
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update invoice' });
  }
});
router.put('/by-invoice-id/:invoiceId', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { 
        invoiceId: req.params.invoiceId,
        userId: req.user._id 
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update invoice' });
  }
});
router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

module.exports = router;
