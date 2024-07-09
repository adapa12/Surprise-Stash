'use strict'

const mongoose = require('mongoose');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { type } = require('os');
const { required } = require('joi');

const TransactionDebitSchema = new mongoose.Schema({
    uuid: {
        type: String,
        unique: true,
        required: false
    },
    purpose : {
        type : String,
        required : true
    },
    type : {
        type : String,
        required : true
    },
    amount : {
        type : String,
        required : true
    },
    bill :{
        type : String,
        required : true
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

TransactionDebitSchema.pre("save", function(next){
    if(this.uuid) return next();
    this.uuid = 'TDE-'+crypto.pseudoRandomBytes(4).toString('hex').toUpperCase();
    next();
});


module.exports = mongoose.model('transactiondebit',TransactionDebitSchema);