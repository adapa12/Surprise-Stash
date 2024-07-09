'use strict'

const router = require('express').Router();
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Debit = require('../models/TransactionDebit')
const adminAuth = require('../middleware/auth.admin');
const userAuth = require('../middleware/auth.user');


router.post('/', async (req, res) => {
    try {
      const DebitSchema = Joi.object({
        purpose : Joi.string().required(),
        type : Joi.string().required(),
        amount: Joi.string().required(),
        bill: Joi.string().required()
      });
  
      const validData = await DebitSchema.validateAsync(req.body);

      let result = await Debit.create(validData);
  
      return res.status(200).send({
        status: true,
        message: " Debited Bill Added Sucessfully",
        data: result,
      });
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
      let result = await Debit.findOne({ uuid: uuid });
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

  router.get('/list', async (req, res) => {
    try {
      let { page, limit, search } = req.query;
  
      if (page == "" || page == undefined) page = 0;
      if (limit == "" || limit == undefined) limit = 10;
  
      let skip = Number(page) * Number(limit);
  
      let result = await Debit.aggregate([
        {
          $match: {
            is_deleted: false,
            $or: [
              { "amount": { $regex: `${search}`, $options: 'i' } },
            ]
          }
        },
        {
          "$set": {
            "image": {
              $cond: {
                if: {
                  $ne: ["$image", ""]
                },
                then: {
                  "$concat": [
                    process.env.IMAGE_URL,
                    "$image"
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
  
      let results = await Debit.aggregate([
        {
          $match: {
            is_deleted: false,
            $or: [
              { "amount": { $regex: `${search}`, $options: 'i' } }
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

  
  module.exports = router