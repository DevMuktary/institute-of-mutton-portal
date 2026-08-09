import nodemailer from "nodemailer";

// Configure standard SMTP (Works perfectly for ZeptoMail)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.zeptomail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendRegistrationEmail = async (
  email: string,
  fullName: string,
  programName: string,
  status: "PENDING" | "APPROVED",
  password?: string
) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-railway-domain.com"; // Update in Railway vars
  const logoUrl = `${appUrl}/mutoon-logo.png`;

  const subject = status === "APPROVED" 
    ? "Welcome to Institute of Mutton - Registration Successful" 
    : "Registration Received - Pending Administrative Review";

  const statusMessage = status === "APPROVED"
    ? `<p style="color: #4CAF50; font-weight: bold;">Your registration for <strong>${programName}</strong> has been automatically approved.</p>
       <p>Below are your secure login credentials to access the Student Portal. You will be prompted to change this password upon your first login.</p>
       <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FFB902;">
         <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
         <p style="margin: 5px 0 0 0;"><strong>Password:</strong> ${password}</p>
       </div>
       <a href="${appUrl}/login" style="display: inline-block; background-color: #FFB902; color: #001232; text-decoration: none; padding: 12px 25px; font-weight: bold; border-radius: 6px;">Login to Portal</a>`
    : `<p style="color: #001232;">We have successfully received your application for <strong>${programName}</strong>.</p>
       <p>Because this program requires administrative approval, our team is currently reviewing your details. You will receive a follow-up email with your login credentials once your application is approved.</p>`;

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <table width="100%" max-width="600px" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; border-spacing: 0;">
        <!-- Header -->
        <tr>
          <td style="background-color: #001232; padding: 30px; text-align: center;">
            <img src="${logoUrl}" alt="Institute of Mutton" style="width: 80px; height: auto; background-color: white; padding: 10px; border-radius: 12px; margin-bottom: 15px;" />
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Institute of Mutton</h1>
            <p style="color: #FFB902; margin: 5px 0 0 0; font-size: 14px; text-transform: uppercase; font-weight: bold;">Student Admissions</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding: 40px 30px; color: #3f3f46; line-height: 1.6;">
            <h2 style="color: #001232; margin-top: 0;">As-salamu alaykum, ${fullName}</h2>
            ${statusMessage}
            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;" />
            <p style="font-size: 13px; color: #71717a; margin: 0;">
              If you have any questions, please reply to this email or contact our support team.<br/>
              &copy; ${new Date().getFullYear()} Institute of Mutton. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Institute of Mutton" <${process.env.SMTP_FROM_EMAIL}>`,
    to: email,
    subject,
    html: htmlTemplate,
  });
};