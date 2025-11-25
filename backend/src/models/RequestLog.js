const mongoose = require('mongoose');

const RequestLogSchema = new mongoose.Schema(
  {
    url: String,
    method: String,
    headers: Object,
    referer: String,
    ip: String,
    policySnapshot: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('RequestLog', RequestLogSchema);