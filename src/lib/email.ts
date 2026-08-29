export const sendRegistrationEmail = async (
  email: string,
  fullName: string,
  programName: string,
  status: "PENDING" | "APPROVED",
  password?: string
) => {
  // 1. FAIL-SAFE: Abort immediately if credentials are not set
  if (!process.env.ZEPTOMAIL_API_KEY || !process.env.ZEPTOMAIL_SENDER_EMAIL) {
    console.warn(`⚠️ Email credentials missing. Registration successful, but email to ${email} was skipped.`);
    return;
  }

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

  try {
    // ZeptoMail API requires the token to start with 'Zoho-enczapikey '
    const token = process.env.ZEPTOMAIL_API_KEY;
    const apiKey = token.startsWith("Zoho-enczapikey") ? token : `Zoho-enczapikey ${token}`;

    // 2. Fetch API using standard HTTPS (Port 443 - Never Blocked)
    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": apiKey,
      },
      body: JSON.stringify({
        from: {
          address: process.env.ZEPTOMAIL_SENDER_EMAIL,
          name: "Institute of Mutton"
        },
        to: [
          {
            email_address: {
              address: email,
              name: fullName
            }
          }
        ],
        subject: subject,
        htmlbody: htmlTemplate
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ZeptoMail API Error:", errText);
    }
  } catch (error) {
    console.error("Failed to send email via ZeptoMail REST API:", error);
  }
};


export const sendPasswordResetEmail = async (email: string, fullName: string, resetLink: string) => {
  if (!process.env.ZEPTOMAIL_API_KEY || !process.env.ZEPTOMAIL_SENDER_EMAIL) {
    console.warn(`⚠️ Email credentials missing. Cannot send password reset to ${email}.`);
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-railway-domain.com";
  const logoUrl = `${appUrl}/mutoon-logo.png`;

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <table width="100%" max-width="600px" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; border-spacing: 0;">
        <tr>
          <td style="background-color: #001232; padding: 30px; text-align: center;">
            <img src="${logoUrl}" alt="Institute of Mutoon" style="width: 80px; height: auto; background-color: white; padding: 10px; border-radius: 12px; margin-bottom: 15px;" />
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Institute of Mutoon</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px; color: #3f3f46; line-height: 1.6; text-align: center;">
            <h2 style="color: #001232; margin-top: 0;">Password Reset Request</h2>
            <p>As-salamu alaykum, <strong>${fullName}</strong>.</p>
            <p>We received a request to reset your password. If you made this request, please click the button below to choose a new password. This link will expire in 15 minutes.</p>
            
            <a href="${resetLink}" style="display: inline-block; background-color: #FFB902; color: #001232; text-decoration: none; padding: 14px 30px; font-weight: bold; font-size: 16px; border-radius: 8px; margin: 25px 0;">Reset My Password</a>
            
            <p style="font-size: 12px; color: #71717a;">If you did not request this, you can safely ignore this email. Your password will remain unchanged.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const token = process.env.ZEPTOMAIL_API_KEY;
    const apiKey = token.startsWith("Zoho-enczapikey") ? token : `Zoho-enczapikey ${token}`;

    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": apiKey,
      },
      body: JSON.stringify({
        from: { address: process.env.ZEPTOMAIL_SENDER_EMAIL, name: "Institute of Mutoon" },
        to: [{ email_address: { address: email, name: fullName } }],
        subject: "Password Reset - Institute of Mutoon",
        htmlbody: htmlTemplate
      }),
    });

    if (!response.ok) {
      console.error("ZeptoMail API Error:", await response.text());
    }
  } catch (error) {
    console.error("Failed to send reset email:", error);
  }
};

export const sendApplicationApprovedEmail = async (
  email: string,
  fullName: string,
  programName: string,
  isNewUser: boolean,
  temporaryPassword?: string
) => {
  if (!process.env.ZEPTOMAIL_API_KEY || !process.env.ZEPTOMAIL_SENDER_EMAIL) {
    console.warn(`⚠️ Email credentials missing. Approval email to ${email} skipped.`);
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-railway-domain.com";
  const logoUrl = `${appUrl}/mutoon-logo.png`;

  const credentialsSection = temporaryPassword
    ? `<div style="background-color: #f8fafc; padding: 18px; border-radius: 10px; margin: 24px 0; border-left: 4px solid #FFB902; text-align: left;">
         <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #64748b; text-transform: uppercase;">Your Portal Login Credentials</p>
         <p style="margin: 4px 0; color: #001232;"><strong>Email / Username:</strong> ${email}</p>
         <p style="margin: 4px 0; color: #001232;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 15px; color: #0f172a;">${temporaryPassword}</code></p>
       </div>
       <p style="font-size: 13px; color: #64748b;">You will be prompted to choose a permanent secure password upon first login.</p>`
    : `<p style="color: #334155; margin: 16px 0;">You can log in to access this program immediately using your existing Student Portal credentials.</p>`;

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <table width="100%" max-width="600px" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-spacing: 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <tr>
          <td style="background-color: #001232; padding: 32px 24px; text-align: center;">
            <img src="${logoUrl}" alt="Institute of Mutoon" style="width: 72px; height: auto; background-color: white; padding: 8px; border-radius: 12px; margin-bottom: 12px;" />
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold; letter-spacing: -0.5px;">Institute of Mutoon</h1>
            <p style="color: #FFB902; margin: 4px 0 0 0; font-size: 13px; font-weight: 600;">Admissions & Enrollment Office</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 36px 28px; color: #334155; line-height: 1.6;">
            <div style="display: inline-block; background-color: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px;">
              Application Approved
            </div>
            <h2 style="color: #001232; margin-top: 0; font-size: 20px;">As-salamu alaykum, ${fullName}</h2>
            <p>We are pleased to inform you that your application for <strong>${programName}</strong> has been officially approved!</p>
            ${credentialsSection}
            <div style="text-align: center; margin: 28px 0 16px 0;">
              <a href="${appUrl}/login" style="display: inline-block; background-color: #001232; color: #FFB902; text-decoration: none; padding: 14px 32px; font-weight: bold; font-size: 15px; border-radius: 10px; border: 1px solid #FFB902;">Access Student Portal</a>
            </div>
            <p style="font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 18px; margin-top: 24px;">
              May Allah bless your journey in memorizing and understanding the texts of knowledge.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const token = process.env.ZEPTOMAIL_API_KEY;
    const apiKey = token.startsWith("Zoho-enczapikey") ? token : `Zoho-enczapikey ${token}`;

    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": apiKey,
      },
      body: JSON.stringify({
        from: { address: process.env.ZEPTOMAIL_SENDER_EMAIL, name: "Institute of Mutoon" },
        to: [{ email_address: { address: email, name: fullName } }],
        subject: `Application Approved: ${programName} - Institute of Mutoon`,
        htmlbody: htmlTemplate
      }),
    });

    if (!response.ok) {
      console.error("ZeptoMail Approval Email Error:", await response.text());
    }
  } catch (error) {
    console.error("Failed to send approval email:", error);
  }
};

export const sendApplicationRejectedEmail = async (
  email: string,
  fullName: string,
  programName: string,
  reason?: string
) => {
  if (!process.env.ZEPTOMAIL_API_KEY || !process.env.ZEPTOMAIL_SENDER_EMAIL) {
    console.warn(`⚠️ Email credentials missing. Rejection email to ${email} skipped.`);
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-railway-domain.com";
  const logoUrl = `${appUrl}/mutoon-logo.png`;

  const reasonBlock = reason
    ? `<div style="background-color: #fef2f2; padding: 14px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ef4444;">
         <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Administrative Note:</strong> ${reason}</p>
       </div>`
    : "";

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <table width="100%" max-width="600px" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-spacing: 0;">
        <tr>
          <td style="background-color: #001232; padding: 32px 24px; text-align: center;">
            <img src="${logoUrl}" alt="Institute of Mutoon" style="width: 72px; height: auto; background-color: white; padding: 8px; border-radius: 12px; margin-bottom: 12px;" />
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold;">Institute of Mutoon</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 36px 28px; color: #334155; line-height: 1.6;">
            <h2 style="color: #001232; margin-top: 0;">As-salamu alaykum, ${fullName}</h2>
            <p>Thank you for your interest in <strong>${programName}</strong> at the Institute of Mutoon.</p>
            <p>After careful review by the admissions committee, we regret to inform you that we are unable to accept your application for this specific program cohort at this time.</p>
            ${reasonBlock}
            <p>You are welcome to apply for future cohorts or explore other available programs at our institute.</p>
            <div style="margin-top: 24px;">
              <a href="${appUrl}" style="display: inline-block; background-color: #001232; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; font-size: 14px; border-radius: 8px;">Explore Other Programs</a>
            </div>
            <p style="font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 18px; margin-top: 28px;">
              We wish you the very best in your pursuit of Islamic knowledge.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const token = process.env.ZEPTOMAIL_API_KEY;
    const apiKey = token.startsWith("Zoho-enczapikey") ? token : `Zoho-enczapikey ${token}`;

    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": apiKey,
      },
      body: JSON.stringify({
        from: { address: process.env.ZEPTOMAIL_SENDER_EMAIL, name: "Institute of Mutoon" },
        to: [{ email_address: { address: email, name: fullName } }],
        subject: `Application Update: ${programName} - Institute of Mutoon`,
        htmlbody: htmlTemplate
      }),
    });

    if (!response.ok) {
      console.error("ZeptoMail Rejection Email Error:", await response.text());
    }
  } catch (error) {
    console.error("Failed to send rejection email:", error);
  }
};

