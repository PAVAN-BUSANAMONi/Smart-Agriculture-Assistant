const express = require('express');
const nodemailer = require('nodemailer');
const localtunnel = require('localtunnel');
const fs = require('fs');

const app = express();
app.use(express.json());

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'peeterforsri@gmail.com',
    pass: 'qwerty@4231'
  }
});

app.post('/send-email', async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    await transporter.sendMail({
      from: 'peeterforsri@gmail.com',
      to,
      subject,
      html
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(9090, async () => {
  console.log('Proxy server running on port 9090');
  try {
    const tunnel = await localtunnel({ port: 9090 });
    console.log(`Tunnel URL: ${tunnel.url}`);
    fs.writeFileSync('proxy-url.txt', tunnel.url);
    
    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });
  } catch (err) {
    console.error('Tunnel error:', err);
  }
});
