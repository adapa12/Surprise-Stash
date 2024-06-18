'use strict'

const router = require('express').Router();
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
// const adminAuth = require('../middleware/auth.admin');

router.post('/register', async(req,res)=>{
    try {
        const UserSchema = Joi.object({
            first_name : Joi.string().required(),
            last_name : Joi.string().required(),
            email : Joi.string().email().required(),
            mobile : Joi.string().required(),
            role : Joi.string().valid("user").default('user').allow(""),
            profile_pic : Joi.string().allow('')
        });

        const validData = await UserSchema.validateAsync(req.body);

        validData.full_name = validData.first_name +' '+validData.last_name;
        let checkEmail = await User.findOne({ email : validData.email });
        if(checkEmail) return res.status(409).send({
          status : false,
          message : "Email Already Exists!"
        }); 
        let checkMobile = await User.findOne({mobile : validData.mobile});
        if(checkMobile) return res.status(409).send({
          status : false,
          message : "Mobile Number Already Exists!"
        });
        validData.password = "surprise";
        validData.password = await bcrypt.hash(validData.password, 10);

        let user = await User.create(validData);

        return res.status(200).send({
            status : true,
            message : "Registered Sucessfully",
            data : user,
        });
    } catch (error) {
        return res.status(400).send({
          status : false,
          message : error.message
        });
    }
});


router.post('/login',async(req,res)=>{
    try {
        const LoginSchema = Joi.object({
            email : Joi.string().email().required(),
            password : Joi.string().required()
          });

          const validData = await LoginSchema.validateAsync(req.body);
          let email = validData.email;
          let user = await User.findOne({ email : email });

          if(!user){
            return res.status(404).send({
              status :  false,
              message : "Email id is not Registered with us",
            });
          }
          if(user.is_deleted === true){
            return res.status(400).send({
              status :  false,
              message : "User Does Not Exists",
            });
          }
          if(user.is_active === false){
            return res.status(400).send({
              status :  false,
              message : "Your account is blocked. Please contact Admin",
            });
          }
          const password = validData.password;
          const cmp = await bcrypt.compare(validData.password, user.password);
          if (user && password) {
            if (cmp) {
              if(validData.password == 'surprise'){
                  user.is_change = false
              }else{
                  user.is_change = true
              }
              res.status(200).send({
                  status :  true,
                  message : "Login Successfully!",
                  data : user,
                  token : user.generateToken()
              });
            } else {
              res.status(401).send({
                status : false,
                message : "Incorrect Password"
              });
            }
          } else {
            res.status(400).send("Email Id and Password Must be Entered");
          }
    } catch (error) {
        return res.status(400).send({
          status : false,
          message : error.message
        });
    }
});

module.exports = router