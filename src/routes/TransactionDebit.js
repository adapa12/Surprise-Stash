'use strict'

const router = require('express').Router();
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Debit = require('../models/TransactionDebit')
const adminAuth = require('../middleware/auth.admin');
const userAuth = require('../middleware/auth.user');
const auth = require('../middleware/auth.middleware')


router.post('/', adminAuth, async (req, res) => {
  try {
    const DebitSchema = Joi.object({
      purpose: Joi.string().required(),
      type: Joi.string().required(),
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

router.put('/update/:uuid', adminAuth, async (req, res) => {
  try {
    const UpdateSchema = Joi.object({
      purpose: Joi.string().required(),
      type: Joi.string().required(),
      amount: Joi.string().required(),
      bill: Joi.string().required()
    });
    const validData = await UpdateSchema.validateAsync(req.body);

    Debit.findOneAndUpdate({ uuid: req.params.uuid }, validData, { new: true })
      .then(data => {
        if (!data) res.status(404).send({
          status: false,
          message: "Cannot Update"
        });
        else res.status(200).send({
          status: true,
          message: "Updated Successfully",
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

router.get('/list',auth, async (req, res) => {
  try {
    let { page, limit, search, fromdate, todate } = req.query;

    if (page == "" || page == undefined) page = 0;
    if (limit == "" || limit == undefined) limit = 10;

    let skip = Number(page) * Number(limit);

    
    let match = {
      is_deleted: false,
    }

    if ((fromdate != "" && fromdate != undefined) && (todate != "" && todate != undefined)) {
      const d = new Date(fromdate);
      let de = d.getTime();
      const e = new Date(todate);
      let a = e.getTime();
      if (de === a) {
        console.log("====1====")
        const startOfDay = new Date(d);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(d);
        endOfDay.setHours(23, 59, 59, 999);

        match.createdAt = ({ $gte: startOfDay, $lt: endOfDay });
      } else {
        console.log("====2====");
        todate = new Date(todate);
        todate.setDate(todate.getDate() + 1);
        match.createdAt = { $gte: new Date(`${fromdate}`), $lt: new Date(`${todate}`) }
      }
    }


    let result = await Debit.aggregate([
      {
        $match: { ...match }
      },
      {
        "$set": {
          "bill": {
            $cond: {
              if: {
                $ne: ["$bill", ""]
              },
              then: {
                "$concat": [
                  process.env.IMAGE_URL,
                  "$bill"
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
        $match: {
          $or: [
            { "amount": { $regex: `${search}`, $options: 'i' } }
          ]
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
        $match: { ...match }
      },
      {
        $match: {
          $or: [
            { "amount": { $regex: `${search}`, $options: 'i' } }
          ]
        }
      },
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