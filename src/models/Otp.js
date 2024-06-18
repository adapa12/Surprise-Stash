'use strict'

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');


const OtpSchema = new mongoose.Schema({
    email : {
        type : String,
        required : false
    },
    mobile : {
        type : String,
        required : false
    },
    otp : {
        type : String,
        required : true
    },
    createdAt :{
        type : Date,
        expires : 600,
        default :  Date.now,
   }
})

module.exports = mongoose.model('otp', OtpSchema);