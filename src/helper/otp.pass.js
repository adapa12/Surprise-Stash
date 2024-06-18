'use strict'

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const OTP = require('../models/Otp');
var sendOTPtoResetPassword;

const transporter = nodemailer.createTransport({
    service: 'outlook',
    auth: {
      user: 'anveshsciens@outlook.com',
      pass: 'Anvesh@2024'
    }
  });

function generateOTP() {
    var digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 4; i++ ) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}

module.exports =
sendOTPtoResetPassword = async(email) =>{
    try {
    const otp = generateOTP();
    //   const otp = 1234;
      var mailOptions = {
        from: 'anveshsciens@outlook.com',
        to: email,
        subject: 'Sending OTP for Forgot Password',
        html : `<p>Enter <b>${otp}</b> in your app and reset password and complete the process</P>
                <p>OTP Expires in <b>30 Minutes</b></p> `
      }
      // const hashedOtp = await bcrypt.hash(otp,10);
  
      const newOtp = new OTP({
        email: email,
        otp: otp,
        createdAt: Date.now(),
        expiresAt: Date.now() + 1800000,
      });
  
      await newOtp.save();
  
      await transporter.sendMail(mailOptions);
      console.log(`Email sent success for ${"dfgh"} to - ${email}`);
      return true;

    } catch (error) {
        console.log(`Error sending email for ${"ghjkl"} - ${error}`);
      return false;
    }
}