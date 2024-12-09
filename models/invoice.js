const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  recipient: { type: String, required: true },
  status: { 
    type: String, 
    required: true,
    enum: ['draft', 'sent', 'due', 'paid', 'overdue'],
    default: 'draft'
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
