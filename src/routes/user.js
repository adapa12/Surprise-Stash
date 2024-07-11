'use strict'

const router = require('express').Router();
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const adminAuth = require('../middleware/auth.admin');
const userAuth = require('../middleware/auth.user');
const Otp = require('../models/Otp')
const sendOTPtoResetPassword = require('../helper/otp.pass');
const Credit = require('../models/TransactionCredit')
const Debit = require('../models/TransactionDebit')

router.post('/register', adminAuth, async (req, res) => {
  try {
    const UserSchema = Joi.object({
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      email: Joi.string().email().required(),
      mobile: Joi.string().required(),
      role: Joi.string().valid("user").default('user').allow(""),
      profile_pic: Joi.string().allow('')
    });

    const validData = await UserSchema.validateAsync(req.body);

    validData.full_name = validData.first_name + ' ' + validData.last_name;
    let checkEmail = await User.findOne({ email: validData.email });
    if (checkEmail) return res.status(409).send({
      status: false,
      message: "Email Already Exists!"
    });
    let checkMobile = await User.findOne({ mobile: validData.mobile });
    if (checkMobile) return res.status(409).send({
      status: false,
      message: "Mobile Number Already Exists!"
    });
    validData.password = "surprise";
    validData.password = await bcrypt.hash(validData.password, 10);

    let user = await User.create(validData);
    sendOTPtoResetPassword(req.body.email);

    return res.status(200).send({
      status: true,
      message: "Registered Sucessfully",
      data: user,
    });
  } catch (error) {
    return res.status(400).send({
      status: false,
      message: error.message
    });
  }
});

router.put('/update/:uuid', async (req, res) => {
  try {
    const UpdateSchema = Joi.object({
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      email: Joi.string().email().required(),
      mobile: Joi.string().required(),
      role: Joi.string().valid("user").default('user').allow(""),
      profile_pic: Joi.string().allow('')
    });
    const validData = await UpdateSchema.validateAsync(req.body);

    validData.full_name = validData.first_name + ' ' + validData.last_name;

    User.findOneAndUpdate({ uuid: req.params.uuid }, validData, { new: true })
      .then(data => {
        if (!data) res.status(404).send({
          status: false,
          message: "Cannot Update"
        });
        else res.status(200).send({
          status: true,
          message: "User Updated Successfully",
          data: data
        });
      })
  } catch (error) {
    return res.status(400).send({
      status: false,
      message: error.message
    });
  }
});

router.put('/update/status/:uuid', adminAuth, async (req, res) => {
  try {
    let uuid = req.params.uuid;
    const UpdateSchema = Joi.object({
      status: Joi.boolean().required()
    })

    const validData = await UpdateSchema.validateAsync(req.body);

    await User.findOneAndUpdate({ uuid: uuid }, { is_active: validData.status }, { new: true });

    return res.status(200).send({
      status: true,
      message: "Successfully Updated"
    })

  } catch (error) {
    return res.status(400).send({
      status: false,
      message: error.message
    });
  }
});

router.get("/view/:uuid", async (req, res) => {
  try {
    let uuid = req.params.uuid;
    let result = await User.findOne({ uuid: uuid });
    if (result) {
      return res.status(200).send({
        status: true,
        data: result
      });
    } else {
      return res.status(404).send({
        status: false,
        message: "Not found"
      });
    }
  } catch (error) {
    res.status(400).send({
      status: false,
      message: error.message
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const LoginSchema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    });

    const validData = await LoginSchema.validateAsync(req.body);
    let email = validData.email;
    let user = await User.findOne({ email: email });

    if (!user) {
      return res.status(404).send({
        status: false,
        message: "Email id is not Registered with us",
      });
    }
    if (user.is_deleted === true) {
      return res.status(400).send({
        status: false,
        message: "User Does Not Exists",
      });
    }
    if (user.is_active === false) {
      return res.status(400).send({
        status: false,
        message: "Your account is blocked. Please contact Admin",
      });
    }
    const password = validData.password;
    const cmp = await bcrypt.compare(validData.password, user.password);
    if (user && password) {
      if (cmp) {
        if (validData.password == 'surprise') {
          user.is_change = false
        } else {
          user.is_change = true
        }
        res.status(200).send({
          status: true,
          message: "Login Successfully!",
          data: user,
          token: user.generateToken()
        });
      } else {
        res.status(401).send({
          status: false,
          message: "Incorrect Password"
        });
      }
    } else {
      res.status(400).send("Email Id and Password Must be Entered");
    }
  } catch (error) {
    return res.status(400).send({
      status: false,
      message: error.message
    });
  }
});


router.put('/change/password/:uuid', async (req, res) => {
  try {
    const ChangePasswordSchema = Joi.object({
      oldPassword: Joi.string().required(),
      newPassword: Joi.string().required(),
    })
    let uuid = req.params.uuid;
    const validData = await ChangePasswordSchema.validateAsync(req.body);
    const change = await User.findOne({ uuid: uuid });
    const oldPass = validData.oldPassword;
    const cp = await bcrypt.compare(oldPass, change.password);

    if (cp === true) {
      const newPass = validData.newPassword;
      const hashedPwd = await bcrypt.hash(newPass, 10);
      await User.updateOne({ uuid: uuid }, { $set: { password: hashedPwd } });
      return res.status(200).send({
        status: true,
        message: "Password Changed Successfully"
      });
    }
    else {
      return res.status(400).send({
        status: false,
        message: "Incorrect Old Password"
      });
    }
  } catch (error) {
    return res.status(400).send({
      status: false,
      message: error.message
    })
  }
});

router.post('/forgot/password', async (req, res) => {
  try {
    console.log("dtcfguhjn")
    const ForgotPasswordSchema = Joi.object({
      email: Joi.string().required()
    });

    const validData = await ForgotPasswordSchema.validateAsync(req.body);

    console.log(validData)

    let user = await User.findOne({ email: validData.email });
    if (!user)
      return res.status(400).send({
        status: false,
        message: "Email ID Not Register With Us"
      });
    validData.otp = generateOTP()
    console.log(validData.otp)
    let result = await Otp.create(validData);

    return res.status(200).send({
      status: true,
      message: "Otp sent Successfully"
    });
  } catch (error) {
    return res.status(400).send({
      status: false,
      message: error.message
    })
  }
})

router.post('/reset/password', async (req, res) => {

  try {

    const ResetPasswordschema = Joi.object({
      email: Joi.string().required(),
      otp: Joi.string().required(),
      new_password: Joi.string().required()
    })
    const validData = await ResetPasswordschema.validateAsync(req.body);

    if (req.body.email == "" || req.body.email == undefined || req.body.otp == "" || req.body.otp == undefined) {
      return res.status(400).send({
        status: false,
        message: "Please Enter Email and OTP"
      });
    }

    if (req.body.new_password == "" || req.body.new_password == undefined) {
      return res.status(400).send({
        status: false,
        message: "Please Enter New Password"
      });
    }

    const email = validData.email;
    const otp = validData.otp;

    const OTPverificationRecords = await Otp.find({
      email,
    }).limit(1).sort({ createdAt: -1 });
    if (OTPverificationRecords.length <= 0) {
      return res.status(400).send({
        status: false,
        message: "Please Request Again"
      });
    }
    else {
      const { expiresAt } = OTPverificationRecords[0];
      const hashedOtp = OTPverificationRecords[0].otp;
      if (expiresAt < Date.now()) {
        await Otp.deleteMany({ User });
        return res.status(400).send({
          status: false,
          message: "Code has expired. Please Request again"
        });
      } else {
        if (hashedOtp != otp) {
          return res.status(400).send({
            status: false,
            message: "Invalid OTP. Enter Correct OTP"
          });
        } else {
          if (validData.new_password) {
            const newPass = validData.new_password;
            const hashedPwd = await bcrypt.hash(newPass, 10);
            await User.updateOne({ email: req.body.email }, { $set: { password: hashedPwd } });
            await Otp.deleteMany({ email });
            return res.status(200).send({
              status: true,
              message: "Password Changed Successfully"
            })
          }
        }
      }
    }

  } catch (error) {
    return res.status(400).send({
      status: false,
      message: error.message
    })
  }
})

router.get('/list', async (req, res) => {
  try {
    let { page, limit, search } = req.query;

    if (page == "" || page == undefined) page = 0;
    if (limit == "" || limit == undefined) limit = 10;

    let skip = Number(page) * Number(limit);

    let result = await User.aggregate([
      {
        $match: {
          role: "user",
          is_deleted: false,
          $or: [
            { "first_name": { $regex: `${search}`, $options: 'i' } },
            { "last_name": { $regex: `${search}`, $options: 'i' } },
            { "full_name": { $regex: `${search}`, $options: 'i' } },
            { "email": { $regex: `${search}`, $options: 'i' } },
            { "mobile": { $regex: `${search}`, $options: 'i' } },
          ]
        }
      },
      {
        "$set": {
          "profile_pic": {
            $cond: {
              if: {
                $ne: ["$profile_pic", ""]
              },
              then: {
                "$concat": [
                  process.env.IMAGE_URL,
                  "$profile_pic"
                ]
              },
              else: {
                "$concat": [
                  ''
                ]
              }
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: Number(limit)
      }
    ]);

    let results = await User.aggregate([
      {
        $match: {
          role: "user",
          is_deleted: false,
          $or: [
            { "first_name": { $regex: `${search}`, $options: 'i' } },
            { "last_name": { $regex: `${search}`, $options: 'i' } },
            { "full_name": { $regex: `${search}`, $options: 'i' } },
            { "email": { $regex: `${search}`, $options: 'i' } },
            { "mobile": { $regex: `${search}`, $options: 'i' } },
          ]
        }
      }
    ]);

    return res.status(200).send({
      status: true,
      message: "Data Fetched Successfully",
      count: results.length,
      data: result
    });

  } catch (error) {
    return res.status(400).send({
      status: 'error',
      message: error.message
    });
  }
});

router.get('/profile/:uuid', async (req, res) => {
  try {
    let uuid = req.params.uuid;

    let result = await User.aggregate([
      {
        $match: {
          uuid: uuid
        }
      },
      {
        "$set": {
          "profile_pic": {
            $cond: {
              if: {
                $ne: ["$profile_pic", ""]
              },
              then: {
                "$concat": [
                  process.env.IMAGE_URL,
                  "$profile_pic"
                ]
              },
              else: {
                "$concat": [
                  ''
                ]
              }
            }
          }
        }
      },
    ]);

    if (result) return res.status(200).send({
      status: true,
      data: result
    });
    else return res.status(404).send({
      status: false,
      message: "Not Found"
    });
  } catch (error) {
    return res.status(400).send({
      status: false,
      message: error.message
    });
  }
});

router.get('/dropdown/list', async (req, res) => {
  try {
    let result = await User.aggregate([
      {
        $match: {
          is_active: true,
          is_deleted: false,
          role: "user"
        }
      },
    ]);

    return res.status(200).send({
      status: true,
      message: "Data Fetched Successfully",
      data: result
    });

  } catch (error) {
    return res.status(400).send({
      status: false,
      message: error.message
    });
  }
});

router.get('/dashboard', async (req, res) => {
  try {

    let active_users = await User.countDocuments({ role: "user", is_active: true });
    let inactive_users = await User.countDocuments({ role: "user", is_active: false });
    let users = await User.countDocuments({ role: "user" });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);


    const result = await Credit.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: {
              $convert: {
                input: "$amount",
                to: "double",
                onError: 0,
                onNull: 0
              }
            }
          }
        }
      }
    ]);
    const result1 = await Credit.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startOfToday,
          $lte: endOfToday
        }
      }
    },
    {
      $group: {
        _id: null,
        todayAmount: {
          $sum: {
            $convert: {
              input: "$amount",
              to: "double",
              onError: 0,
              onNull: 0
            }
          }
        }
      }
    }
  ])

    const totalCreditAmount = result.length > 0 ? result[0].totalAmount : 0;
    const todayCreditAmount = result1.length > 0 ? result1[0].todayAmount : 0;

    const debitResult = await Debit.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: {
            $sum: {
              $convert: {
                input: "$amount",
                to: "double",
                onError: 0,
                onNull: 0
              }
            }
          }
        }
      }
    ]);
    const todaydebitResult = await Debit.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfToday,
            $lte: endOfToday
          }
        }
      },
      {
        $group: {
          _id: null,
          todayAmount: {
            $sum: {
              $convert: {
                input: "$amount",
                to: "double",
                onError: 0,
                onNull: 0
              }
            }
          }
        }
      }
    ])

    const totalDebitAmount = debitResult.length > 0 ? debitResult[0].totalAmount : 0;
    const todayDebitAmount = todaydebitResult.length > 0 ? todaydebitResult[0].todayAmount : 0;
    
    const totalCreditDebitAmount = totalCreditAmount + totalDebitAmount

    return res.status(200).send({
      status: true,
      message: "dashboard data",
      totalCreditAmount: totalCreditAmount,
      todayCreditAmount : todayCreditAmount,
      totalDebitAmount: totalDebitAmount,
      todayDebitAmount : todayDebitAmount,
      totalCreditDebitAmount: totalCreditDebitAmount,
      total_users : users,
      active_users: active_users,
      inactive_users: inactive_users

    });
  } catch (error) {
    console.error("Error:", error); // Log the error for debugging
    return res.status(400).send({
      status: false,
      message: error.message
    });
  }
});

function generateOTP() {
  var digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < 4; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

module.exports = router