const { Schema, model } = require('mongoose');

const Counter = model('Counter', new Schema({ _id: String, seq: { type: Number, default: 0 } }));

// Sinh mã hiển thị: nextCode('order', 'AG-O') -> AG-O1001
async function nextCode(key, prefix, start = 1000) {
  const c = await Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return `${prefix}${start + c.seq}`;
}

module.exports = { Counter, nextCode };
