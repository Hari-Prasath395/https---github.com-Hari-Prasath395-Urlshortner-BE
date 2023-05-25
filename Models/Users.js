const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name:String,
    email:String,
    password:String,
    dateOfBirth: Date,
    verified:Boolean

});

const User = mongoose.model('User',userSchema);

module.exports = User;