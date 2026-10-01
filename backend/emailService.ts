import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

try {
  dotenv.config({ override: true, quiet: true });
} catch {}

export function getSmtpConfig() {
  try {
    dotenv.config({ override: true, quiet: true });
  } catch {}

  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPassword = process.env.SMTP_PASSWORD?.replace(/\s+/g, '');
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const isSecure =
    process.env.SMTP_SECURE === 'true' ||
    (process.env.SMTP_SECURE !== 'false' && smtpPort === 465);

  const isConfigured = Boolean(
    smtpHost &&
    smtpUser &&
    smtpPassword &&
    !smtpHost.includes('example.com') &&
    !smtpUser.includes('example.com')
  );

  return {
    host: smtpHost,
    port: smtpPort,
    secure: isSecure,
    user: smtpUser,
    pass: smtpPassword,
    from: process.env.SMTP_FROM || `"BLGF Region II DTS" <${smtpUser}>`,
    isConfigured,
  };
}

export function createTransporter() {
  const config = getSmtpConfig();
  if (!config.isConfigured || !config.host || !config.user || !config.pass) {
    return null;
  }

  const isGmail = config.host.includes('gmail.com');
  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    },
  });
}

export interface UserEmailTarget {
  id?: string;
  fullName: string;
  username: string;
  email?: string;
  role?: string;
}

export async function sendTemporaryPasswordEmail(
  user: UserEmailTarget,
  temporaryPassword: string,
  expiresInMinutes = 15,
): Promise<{ success: boolean; error?: string }> {
  const email = user.email?.trim();
  if (!email) {
    return { success: false, error: `User "${user.username}" does not have an email address.` };
  }

  const config = getSmtpConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      error: 'SMTP email delivery is not configured. Please verify SMTP_USER and SMTP_PASSWORD in .env.',
    };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { success: false, error: 'Could not initialize email transporter.' };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>BLGF DTS - Account Recovery</title>
    </head>
    <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <tr>
          <td style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 28px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 17px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">
              Bureau of Local Government Finance
            </h1>
            <p style="margin: 6px 0 0; color: #bfdbfe; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;">
              Regional Office No. II &bull; Document Tracking System
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 24px; color: #1e293b;">
            <p style="margin: 0 0 16px; font-size: 15px; font-weight: 700; color: #0f172a;">
              Dear ${user.fullName},
            </p>
            <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.55; color: #475569;">
              A temporary password was requested for your account (<strong>${user.username}</strong>). Use the recovery password below to sign in to the BLGF DTS portal:
            </p>
            
            <div style="background: #f8fafc; border: 2px dashed #2563eb; border-radius: 10px; padding: 20px; text-align: center; margin: 22px 0;">
              <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 6px;">
                Temporary Recovery Password
              </span>
              <span style="display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 26px; font-weight: 800; color: #1d4ed8; letter-spacing: 0.12em; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 18px;">
                ${temporaryPassword}
              </span>
              <span style="display: block; margin-top: 10px; font-size: 12px; font-weight: 700; color: #dc2626;">
                &bull; Expires in ${expiresInMinutes} minutes &bull;
              </span>
            </div>

            <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.55; color: #334155;">
              <strong>Next Steps:</strong> Sign in with your username (<code>${user.username}</code>) and this temporary password, then immediately update your password under User Settings.
            </p>
            
            <div style="margin: 20px 0 0; padding: 12px 14px; background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 0 6px 6px 0; font-size: 12px; color: #991b1b; line-height: 1.5;">
              If you did not request this recovery, please review your account immediately or notify your system administrator.
            </div>
          </td>
        </tr>
        <tr>
          <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.4;">
            This is an automated notification from BLGF Regional Office No. II Document Tracking System.<br>
            Delivered directly to your official email: ${email}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: config.from,
      to: email,
      subject: 'BLGF DTS - Temporary Account Recovery Password',
      text: [
        'BUREAU OF LOCAL GOVERNMENT FINANCE - REGIONAL OFFICE NO. II',
        'Document Tracking System (DTS)',
        '',
        `Hello ${user.fullName},`,
        '',
        `A temporary recovery password was requested for your account (${user.username}).`,
        '',
        `Temporary Password: ${temporaryPassword}`,
        `Validity: ${expiresInMinutes} minutes only`,
        '',
        'Please sign in immediately using this temporary password and update your password under User Settings.',
        'If you did not request this recovery, please check your account immediately.',
      ].join('\n'),
      html: htmlContent,
    });
    return { success: true };
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send temporary password email to ${email}:`, err);
    return { success: false, error: err?.message || 'Failed to dispatch email' };
  }
}

export async function sendPasswordUpdatedEmail(
  user: UserEmailTarget,
  newPassword?: string,
  changedByAdmin = false,
): Promise<{ success: boolean; error?: string }> {
  const email = user.email?.trim();
  if (!email) return { success: false, error: 'User has no email' };

  const config = getSmtpConfig();
  if (!config.isConfigured) return { success: false, error: 'SMTP unconfigured' };

  const transporter = createTransporter();
  if (!transporter) return { success: false, error: 'No transporter' };

  const subject = changedByAdmin
    ? 'BLGF DTS - Account Password Updated by Administrator'
    : 'BLGF DTS - Account Password Successfully Changed';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <tr>
          <td style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 28px 24px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 17px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">
              Bureau of Local Government Finance
            </h1>
            <p style="margin: 6px 0 0; color: #bfdbfe; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;">
              Regional Office No. II &bull; Document Tracking System
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 28px 24px; color: #1e293b;">
            <p style="margin: 0 0 16px; font-size: 15px; font-weight: 700; color: #0f172a;">
              Dear ${user.fullName},
            </p>
            <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.55; color: #475569;">
              ${
                changedByAdmin
                  ? `Your login password for BLGF DTS (<strong>${user.username}</strong>) has been updated by the system administrator.`
                  : `Your login password for BLGF DTS (<strong>${user.username}</strong>) was successfully changed on <strong>${new Date().toLocaleString()}</strong>.`
              }
            </p>
            
            ${
              changedByAdmin && newPassword
                ? `
                <div style="background: #f8fafc; border: 2px dashed #2563eb; border-radius: 10px; padding: 20px; text-align: center; margin: 22px 0;">
                  <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 6px;">
                    Your New Login Password
                  </span>
                  <span style="display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 22px; font-weight: 800; color: #1d4ed8; letter-spacing: 0.08em; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 18px;">
                    ${newPassword}
                  </span>
                </div>
                <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.55; color: #334155;">
                  Please sign in with this password and update it to your personal preference under User Settings.
                </p>
                `
                : ''
            }

            <div style="margin: 20px 0 0; padding: 12px 14px; background: #f0fdf4; border-left: 3px solid #22c55e; border-radius: 0 6px 6px 0; font-size: 12px; color: #166534; line-height: 1.5;">
              If you did not authorize or expect this password update, please contact the BLGF DTS Administrator immediately.
            </div>
          </td>
        </tr>
        <tr>
          <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.4;">
            This is an automated notification from BLGF Regional Office No. II Document Tracking System.<br>
            Delivered directly to: ${email}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: config.from,
      to: email,
      subject,
      text: [
        'BUREAU OF LOCAL GOVERNMENT FINANCE - REGIONAL OFFICE NO. II',
        'Document Tracking System (DTS)',
        '',
        `Hello ${user.fullName},`,
        '',
        changedByAdmin
          ? `Your BLGF DTS password (${user.username}) was updated by the administrator.${newPassword ? ` New Password: ${newPassword}` : ''}`
          : `Your BLGF DTS password (${user.username}) was successfully changed.`,
        '',
        'If you did not authorize this, please contact administration immediately.',
      ].join('\n'),
      html: htmlContent,
    });
    return { success: true };
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send password update email to ${email}:`, err);
    return { success: false, error: err?.message };
  }
}
