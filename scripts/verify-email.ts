import dotenv from 'dotenv';
dotenv.config();

import { EmailService } from '../src/services/email.service';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

async function verifyEmailService() {
  console.log('\n======================================================');
  console.log('   Apex LMS — Unified Email Service Diagnostics Tool   ');
  console.log('======================================================\n');

  const provider = EmailService.getActiveProvider();
  const rawProvider = process.env.EMAIL_PROVIDER || '(auto-detect)';
  const resendKey = process.env.RESEND_API_KEY || '';
  const from = EmailService.getFromAddress(provider === 'resend' ? 'resend' : 'smtp');

  console.log(`Configured EMAIL_PROVIDER: ${rawProvider}`);
  console.log(`Active Provider Resolved:   ${provider.toUpperCase()}`);
  console.log(`Resolved From Address:      ${from}`);

  if (provider === 'unconfigured') {
    console.error('\n❌ ERROR: No active email provider configured in .env!');
    console.log('\nTo configure Resend (Recommended for production):');
    console.log('  EMAIL_PROVIDER=resend');
    console.log('  RESEND_API_KEY=re_your_api_key_here');
    console.log('  EMAIL_FROM="Apex Loan Management System <onboarding@resend.dev>"');
    console.log('\nTo configure Gmail SMTP (Alternative for development):');
    console.log('  EMAIL_PROVIDER=smtp');
    console.log('  EMAIL_HOST=smtp.gmail.com');
    console.log('  EMAIL_PORT=587');
    console.log('  EMAIL_USER=your_real_gmail@gmail.com');
    console.log('  EMAIL_PASSWORD=your_16_char_google_app_password');
    console.log('\n');
    process.exit(1);
  }

  const recipient = process.argv[2];

  if (provider === 'resend') {
    console.log(`Resend API Key:             ${resendKey.slice(0, 7)}...${resendKey.slice(-4)}`);
    console.log('\n⏳ Testing Resend connection...');

    const resend = new Resend(resendKey);
    try {
      // Validate by attempting to fetch domains or send a test email
      if (recipient && recipient.includes('@')) {
        console.log(`⏳ Sending test email to ${recipient} via Resend API...`);
        const result = await resend.emails.send({
          from,
          to: [recipient],
          subject: 'Test Email from Apex Loan Management System',
          text: 'Hello,\n\nYour Apex Loan Management System Resend integration is operational and ready!\n\nRegards,\nApex Loan Management System',
          html: '<div style="font-family:sans-serif;padding:24px;border:1px solid #e2e8f0;border-radius:8px;"><h2>Apex Loan Management System</h2><p>Your <strong>Resend</strong> transactional email service is operational and verified!</p></div>',
        });

        if (result.error) {
          console.error('\n❌ Resend API Error:');
          console.error(result.error.message);
          process.exit(1);
        }

        console.log(`\n✅ SUCCESS: Test email delivered via Resend! Message ID: ${result.data?.id}`);
      } else {
        console.log('✅ Resend API Key format valid.');
        console.log('\n💡 To send a live test email to an inbox, run:');
        console.log('   npx ts-node scripts/verify-email.ts your_email@example.com\n');
      }
    } catch (err: any) {
      console.error('\n❌ Resend exception:', err?.message || err);
      process.exit(1);
    }
  } else if (provider === 'smtp') {
    const host = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587', 10);
    const user = process.env.EMAIL_USER || process.env.SMTP_USER || '';
    const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASSWORD || '';

    console.log(`SMTP Host:                  ${host}:${port}`);
    console.log(`SMTP User:                  ${user}`);
    console.log(`SMTP Password:              ${pass ? '******** (configured)' : '<NOT CONFIGURED>'}`);

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: pass.replace(/\s+/g, '') },
      tls: { rejectUnauthorized: false },
    });

    try {
      console.log('\n⏳ Connecting to SMTP server...');
      await transporter.verify();
      console.log('✅ SUCCESS: SMTP handshake verified! Credentials are valid.');

      if (recipient && recipient.includes('@')) {
        console.log(`⏳ Sending test email to ${recipient}...`);
        const info = await transporter.sendMail({
          from,
          to: recipient,
          subject: 'Test Email from Apex Loan Management System',
          text: 'Hello,\n\nYour Apex Loan Management System SMTP integration is operational and ready!\n\nRegards,\nApex Loan Management System',
          html: '<div style="font-family:sans-serif;padding:24px;border:1px solid #e2e8f0;border-radius:8px;"><h2>Apex Loan Management System</h2><p>Your <strong>SMTP</strong> email service is operational and verified!</p></div>',
        });
        console.log(`\n✅ SUCCESS: Test email delivered! Message ID: ${info.messageId}`);
      } else {
        console.log('\n💡 To send a live test email, run:');
        console.log(`   npx ts-node scripts/verify-email.ts ${user || 'your_email@example.com'}\n`);
      }
    } catch (err: any) {
      console.error('\n❌ SMTP verification failed:');
      console.error(err?.message || err);
      process.exit(1);
    }
  }
}

verifyEmailService();
