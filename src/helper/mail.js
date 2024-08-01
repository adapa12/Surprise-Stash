const path = require('path');
const ejs = require('ejs');
const nodemailer = require('nodemailer');

module.exports = sendEmail = async (data) => {
  try {
    ejs.renderFile(path.join(__dirname, '../html', data.fileName), data.mailData, async (err, html) => {
      if (err) {
        console.log(err);
        return;
      }
      console.log("======Here=====");
      const mailOptions = {
        from: data.from_email,
        to: data.email,
        subject: data.subject,
        html,
      };
      if (data.attachments) {
        mailOptions.attachments = data.attachments;
      }

      try {
        const transporter = nodemailer.createTransport({
          service: "outlook",
          auth: {
            user: data.from_email,
            pass: data.password,
          }
        });

        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully for ${data.fileName} to - ${data.email}`);
      } catch (error) {
        console.log(`Error sending email for ${data.fileName} - ${error}`);
      }
    });
  } catch (error) {
    console.log(error.message);
  }
}