import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

async function verifySmtp() {
  console.log('\n=============================================');
  console.log('   Apex LMS — Gmail SMTP Diagnostics Tool    ');
  console.log('=============================================\n');

  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || process.env.MAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || process.env.MAIL_PORT || '587', 10);
  const secure = (process.env.EMAIL_SECURE || process.env.SMTP_SECURE) === 'true' || port === 465;
  const user = process.env.EMAIL_USER || process.env.SMTP_USER || process.env.MAIL_USERNAME;
  const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || process.env.MAIL_PASSWORD;
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.MAIL_FROM_ADDRESS || user;

  console.log(`Host:     ${host}`);
  console.log(`Port:     ${port} (Secure/TLS: ${secure})`);
  console.log(`User:     ${user || '<NOT CONFIGURED>'}`);
  console.log(`Password: ${pass ? '******** (configured)' : '<NOT CONFIGURED>'}`);
  console.log(`From:     ${from || '<NOT CONFIGURED>'}\n`);

  if (!user || !pass || pass === 'your_gmail_app_password' || pass === 'abcdefghijklmnop') {
    console.error('❌ ERROR: Real Gmail credentials not found in .env!');
    console.log('Please set in your .env:');
    console.log('  EMAIL_USER=your_real_gmail@gmail.com');
    console.log('  EMAIL_PASSWORD=your_16_char_google_app_password');
    console.log('\nRefer to AUTHENTICATION_GMAIL_SETUP.md for instructions on generating a Google App Password.\n');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: user.trim(),
      pass: pass.replace(/\s+/g, '').trim(),
    },
    tls: {
      rejectUnauthorized: true,
    },
  });

  try {
    console.log('⏳ Connecting to Gmail SMTP server (smtp.gmail.com:587)...');
    await transporter.verify();
    console.log('✅ SUCCESS: Handshake verified! Credentials and connection are valid.');

    // If an argument --send is passed, send a real test email
    const recipient = process.argv[2];
    const sender = from || user || 'Apex LMS <no-reply@apex.local>';
    if (recipient && recipient.includes('@')) {
      console.log(`\n⏳ Sending test verification email to: ${recipient}...`);
      const info = await transporter.sendMail({
        from: sender.includes('<') ? sender : `Apex LMS <${sender}>`,
        to: recipient,
        subject: 'Test Email from Apex Loan Management System',
        html: '<div style="font-family:sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:8px;"><h2>Apex Loan Management System</h2><p>Your Gmail SMTP configuration is <strong>verified and working</strong>!</p></div>',
      });
      console.log(`✅ Test email delivered successfully! Message ID: ${info.messageId}`);
    } else {
      console.log('\n💡 To send an actual test email, run:');
      console.log(`  npx ts-node scripts/verify-smtp.ts ${user}\n`);
    }
  } catch (error: any) {
    console.error('\n❌ SMTP Verification Failed:');
    console.error(error.message || error);
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.log('\n👉 EAUTH 535 typically means:');
      console.log('  1. You used your standard Google account password instead of an App Password.');
      console.log('  2. 2-Step Verification is not enabled on your Google account.');
      console.log('  3. The 16-character App Password has a typo.');
    }
    process.exit(1);
  }
}

verifySmtp();
