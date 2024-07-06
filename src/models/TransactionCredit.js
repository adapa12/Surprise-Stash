'use strict'

const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { type } = require('os');
const { required } = require('joi');

const TransactionCreditSchema = new mongoose.Schema({
    uuid: {
        type: String,
        unique: true,
        required: false
    },
    user_uuid : {
        type : String,
        required : true
    },
    amount : {
        type : String,
        required : true
    },
    utr : {
        type : String,
        required : true
    },
    image :{
        type : String,
        required : true
    },
    is_approved : {
        type : Boolean,
        require : false,
        default : false
    },
    is_active : {
        type : Boolean,
        default : true
    },
    is_deleted : {
        type : Boolean,
        default : false
    }
},{
    timestamps : true,
    strict : false
});

TransactionCreditSchema.pre("save", function(next){
    if(this.uuid) return next();
    this.uuid = 'TCR-'+crypto.pseudoRandomBytes(4).toString('hex').toUpperCase();
    next();
});


module.exports = mongoose.model('transactioncredit',TransactionCreditSchema);