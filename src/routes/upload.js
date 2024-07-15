'use strict'

const fs = require('fs');
const router = require('express').Router();
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      fs.mkdir('', (err) => {
          cb(null, __dirname + '../../my-images');
      });
  },
  filename: (req, file, cb) => {

      cb(null, new Date().getTime() + "-" + file.originalname);
  }
});
const upload = multer({ storage: storage });

router.post('/image', upload.single('file'), async(req, res)=>{
    try{
        if (!req.file) {
            console.log("No file received");
            return res.send({
                success: false
            });
          } else {
            req.file.image_url = `${process.env.IMAGE_URL}${req.file.filename}`;
            console.log( req.file.image_url )
            const image = req.file;
            console.log('file received');
            return res.send({
                success: true,
                image: image
            });
          }
    }catch(error){
        return res.status(400).send({
            status : false,
            message : error.message
        });
    }
});

module.exports = router;