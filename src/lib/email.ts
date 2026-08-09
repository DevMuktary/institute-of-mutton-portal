import nodemailer from "nodemailer";

export const sendRegistrationEmail = async (
  email: string,
  fullName: string,
  programName: string,
  status: "PENDING" | "APPROVED",
  password?: string
) => {
  // 1. FAIL-SAFE: Abort immediately if SMTP credentials are not set in Railway yet.
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`⚠️ SMTP Credentials missing. Registration successful, but email to ${email} was skipped.`);
    return;
  }

  // 2. Transporter with strict timeouts so it NEVER hangs the server
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.zeptomail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 5000, // Give up after 5 seconds
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-railway-domain.com";
  const logoUrl = `${appUrl}/mutoon-logo.png`;

  const subject = status === "APPROVED" 
    ? "Welcome to Institute of Mutton - Registration Successful" 
    : "Registration Received - Pending Administrative Review";

  const passwordBlock = password 
    ? `<div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFB902;">
         <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
         <p style="margin: 5px 0 0 0;"><strong>Password:</strong> ${password}</p>
       </div>
       <p>You will be prompted to change this password upon your first login.</p>`
    : `<p>Please log in using your existing Student Portal credentials.</p>`;

  const statusMessage = status === "APPROVED"
    ? `<p style="color: #4CAF50; font-weight: bold;">Your registration for <strong>${programName}</strong> has been automatically approved.</p>
       ${passwordBlock}
       <a href="${appUrl}/login" style="display: inline-block; background-color: #FFB902; color: #001232; text-decoration: none; padding: 12px 25px; font-weight: bold; border-radius: 6px; margin-top: 10px;">Login to Portal</a>`
    : `<p style="color: #001232;">We have successfully received your application for <strong>${programName}</strong>.</p>
       <p>Because this program requires administrative approval, our team is currently reviewing your details. You will receive a follow-up email once your application is approved.</p>`;

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <table width="100%" max-width="600px" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; border-spacing: 0;">
        <tr>
          <td style="background-color: #001232; padding: 30px; text-align: center;">
            <img src="${logoUrl}" alt="Institute of Mutton" style="width: 80px; height: auto; background-color: white; padding: 10px; border-radius: 12px; margin-bottom: 15px;" />
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Institute of Mutton</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px; color: #3f3f46; line-height: 1.6;">
            <h2 style="color: #001232; margin-top: 0;">As-salamu alaykum, ${fullName}</h2>
            ${statusMessage}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Institute of Mutton" <${process.env.SMTP_FROM_EMAIL || 'noreply@yourdomain.com'}>`,
    to: email,
    subject,
    html: htmlTemplate,
  });
};