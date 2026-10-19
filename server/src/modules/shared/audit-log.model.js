const { Schema, model } = require('mongoose');

// Mọi hành động của admin đều ghi lại: ai, làm gì, với đối tượng nào, lúc nào
const auditSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true },          // vd user.lock, post.hide, report.resolved
  targetType: { type: String, required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  note: { type: String, default: '' },
}, { timestamps: { createdAt: 'at', updatedAt: false } });

const AuditLog = model('AuditLog', auditSchema);

const audit = (actor, action, targetType, targetId, note = '') =>
  AuditLog.create({ actor: actor._id || actor, action, targetType, targetId, note });

module.exports = { AuditLog, audit };
