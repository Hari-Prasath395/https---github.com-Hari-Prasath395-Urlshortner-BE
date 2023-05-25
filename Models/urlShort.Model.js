const mongoose = require('mongoose');
const shortid = require('shortid');

const urlSchema = new mongoose.Schema({
  longUrl: {
    type: String,
    required: true,
  },
  shortUrl: {
    type: String,
    unique: true,
    default: shortid.generate,
  },
  clickCount: {
    type: Number,
    default: 0,
  },
  
},{timestamps:true});

const urlModel = mongoose.model('urlshort', urlSchema);

module.exports = urlModel;
