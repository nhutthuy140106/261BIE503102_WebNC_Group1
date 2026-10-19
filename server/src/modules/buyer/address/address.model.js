const { Schema, model } = require('mongoose');

const addressSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, match: [/^\d{10}$/, 'Số điện thoại gồm 10 số'] },
  block: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
  unit: { type: String, default: '' },
  note: { type: String, default: '' },
  label: { type: String, enum: ['home', 'family', 'other'], default: 'home' },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = model('Address', addressSchema);
