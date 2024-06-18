'use strict'

const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');

const user = require('./routes/user');

require('dotenv').config();

let port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then((data) => {
  console.log("DB Connected Successfully !");
}).catch((error) => {
  console.log(error.message);
});

app.use('/images/', express.static(__dirname + '/my-images'));

app.use('/api/v1/user',user);

app.listen(port, () => {
    console.log(`Server Listining On port : ${port}`)
});