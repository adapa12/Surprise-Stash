'use strict'

const router = require('express').Router();
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Credit = require('../models/TransactionCredit')
const adminAuth = require('../middleware/auth.admin');
const auth = require('../middleware/auth.middleware')
const userAuth = require('../middleware/auth.user');

router.post('/', auth, async (req, res) => {
  try {
    const CreditSchema = Joi.object({
      user_uuid: Joi.string().required(),
      amount: Joi.string().required(),
      type: Joi.string().required(),
      paid_to: Joi.string().required(),
      paid_number: Joi.string().required(),
      utr: Joi.string().required(),
      image: Joi.string().required(),
    });

    const validData = await CreditSchema.validateAsync(req.body);


    if (req.user && req.user.role === 'management') {
      validData.approved_status = "Accepted";

      validData.admin_uuid = req.user.uuid

      let result = await Credit.create(validData);

      return res.status(200).send({
        status: true,
        message: " Credited Bill Added Sucessfully",
        data: result,
      });
    }
    else {

      let result = await Credit.create(validData);

      return res.status(200).send({
        status: true,
        message: " Credited Bill Added Sucessfully",
        data: result,
      });

    }

  } catch (error) {
    return res.status(400).send({
      status: false,
      message: error.message
    });
  }
});

router.put('/update/:uuid', auth, async (req, res) => {
  try {
    const UpdateSchema = Joi.object({
      user_uuid: Joi.string().required(),
      amount: Joi.string().required(),
      type: Joi.string().required(),
      paid_to: Joi.string().required(),
      paid_number: Joi.string().required(),
      utr: Joi.string().required(),
      image: Joi.string().required(),
      comments: Joi.string().allow("")
    });
    const validData = await UpdateSchema.validateAsync(req.body);

    if (req.user && req.user.role === 'management') {
      validData.approved_status = "Accepted";
    }

    if (req.user && req.user.role === 'user') {
      validData.approved_status = "Pending";
    }

    Credit.findOneAndUpdate({ uuid: req.params.uuid }, validData, { new: true })
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
    let result = await Credit.findOne({ uuid: uuid });
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

router.get('/user/list', userAuth, async (req, res) => {
  try {
    let { page, limit, search, user_uuid, fromdate, todate } = req.query;

    if (page == "" || page == undefined) page = 0;
    if (limit == "" || limit == undefined) limit = 10;

    let skip = Number(page) * Number(limit);

    let match = {
      user_uuid: user_uuid,
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


    if (user_uuid == "" || user_uuid == undefined) {
      return res.status(400).send({
        status: false,
        message: "User Uuid is required"
      });
    }

    let result = await Credit.aggregate([
      {
        $match: { ...match }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_uuid',
          foreignField: 'uuid',
          as: 'user'
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
        $match: {
          $or: [
            { "user.full_name": { $regex: `${search}`, $options: 'i' } },
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

    let results = await Credit.aggregate([
      {
        $match: { ...match }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_uuid',
          foreignField: 'uuid',
          as: 'user'
        }
      },
      {
        $match: {
          $or: [
            { "user.full_name": { $regex: `${search}`, $options: 'i' } },
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

router.get('/admin/list', adminAuth, async (req, res) => {
  try {

    let { page, limit, search, admin_uuid, fromdate, todate, user_uuid, approved_status } = req.query;

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

    if (user_uuid != "" && user_uuid != undefined) {
      match.user_uuid = user_uuid
    }

    if (approved_status != "" && approved_status != undefined) {
      match.approved_status = approved_status
    }

    if (admin_uuid != "" && admin_uuid != undefined) {
      match.admin_uuid = admin_uuid
    }

    let result = await Credit.aggregate([
      {
        $match: { ...match }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_uuid',
          foreignField: 'uuid',
          as: 'user'
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
        $match: {
          $or: [
            { "user.full_name": { $regex: `${search}`, $options: 'i' } },
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

    let results = await Credit.aggregate([
      {
        $match: { ...match }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_uuid',
          foreignField: 'uuid',
          as: 'user'
        }
      },
      {
        $match: {
          $or: [
            { "user.full_name": { $regex: `${search}`, $options: 'i' } },
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

router.put('/approved/status/:uuid', adminAuth, async (req, res) => {
  try {

    const ApprovedSchema = Joi.object({
      status: Joi.boolean().required(),
    })

    const body = req.body

    const uuid = req.params.uuid

    const validData = await ApprovedSchema.validateAsync(body);

    const result = await Credit.findOneAndUpdate({ uuid: uuid }, { is_approved: validData.status }, { new: true });

    return res.status(200).send({
      status: true,
      message: " Approved Sucessfully",
      data: result,
    });

  } catch (error) {
    return res.status(400).send({
      status: false,
      message: error.message
    })
  }

});

router.put('/status/update/:uuid', adminAuth, async (req, res) => {
  try {

    const uuid = req.params.uuid;

    let UpdateSchema = Joi.object({
      approved_status: Joi.string().valid('Pending', 'Accepted', 'Rejected').required(),
      comments: Joi.string().allow("")
    })

    let validData = await UpdateSchema.validateAsync(req.body);
    console.log(validData)

    await Credit.findOneAndUpdate({ uuid: uuid }, { approved_status: validData.approved_status, comments: validData.comments });
    return res.status(200).send({
      success: true,
      message: 'Successfully Updated.'
    });
  } catch (error) {
    return res.status(400).send(error.message);
  }
});

module.exports = router