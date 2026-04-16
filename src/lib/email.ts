import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

interface SendInviteEmailParams {
  to: string;
  inviteCode: string;
  role: string;
  invitedByName: string;
  appUrl: string;
}

export async function sendInviteEmail({
  to,
  inviteCode,
  role,
  invitedByName,
  appUrl,
}: SendInviteEmailParams): Promise<{ error?: string }> {
  const signupUrl = `${appUrl}/signup?code=${inviteCode}`;
  const roleName = role.replace("_", " ");

  const { error } = await resend.emails.send({
    from: `PIA Web App <${FROM_EMAIL}>`,
    to,
    subject: `You've been invited to join PIA`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 600; color: #111; margin-bottom: 8px;">
          You're invited to PIA
        </h1>
        <p style="font-size: 16px; color: #555; line-height: 1.6; margin-bottom: 24px;">
          ${invitedByName} has invited you to join their organisation's Privacy Impact Assessment workspace as a <strong>${roleName}</strong>.
        </p>
        <a href="${signupUrl}" style="display: inline-block; background-color: #111; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
          Accept invite &amp; create account
        </a>
        <p style="font-size: 13px; color: #888; margin-top: 24px; line-height: 1.5;">
          Or copy this link into your browser:<br />
          <a href="${signupUrl}" style="color: #555; word-break: break-all;">${signupUrl}</a>
        </p>
        <p style="font-size: 13px; color: #888; margin-top: 16px;">
          This invite expires in 7 days. If you didn't expect this email, you can safely ignore it.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />
        <p style="font-size: 12px; color: #aaa;">
          PIA &mdash; Privacy Impact Assessment Tool
        </p>
      </div>
    `,
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}
