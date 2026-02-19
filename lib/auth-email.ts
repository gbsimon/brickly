// Branded magic-link email for Brickly
// Used by the Nodemailer provider in auth.ts

import { createTransport } from "nodemailer"
import type { NodemailerConfig } from "next-auth/providers/nodemailer"

export async function sendBricklyVerificationRequest(params: {
	identifier: string
	url: string
	provider: NodemailerConfig
}) {
	const { identifier: email, url, provider } = params
	const { host } = new URL(url)

	const transport = createTransport(provider.server as string)
	const result = await transport.sendMail({
		to: email,
		from: provider.from,
		subject: `Your sign-in link for Brickly`,
		text: text({ url, host }),
		html: html({ url, host }),
	})

	const rejected = result.rejected ?? []
	if (rejected.length > 0) {
		throw new Error(`Email could not be sent to ${rejected.join(", ")}`)
	}
}

function html({ url, host }: { url: string; host: string }) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sign in to Brickly</title>
</head>
<body style="margin:0;padding:0;background-color:#f2f2f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f7;padding:40px 20px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

<!-- Header with brick accent -->
<tr>
<td style="background:linear-gradient(135deg,#0a84ff 0%,#007aff 100%);padding:32px 32px 24px;text-align:center;">
  <div style="font-size:40px;line-height:1;margin-bottom:12px;">🧱</div>
  <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Brickly</h1>
  <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);font-weight:400;">Rebuild your LEGO</p>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:32px 32px 12px;">
  <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#1c1c1e;">Ready to build?</h2>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#48484a;">
    Tap the button below to sign in. No password needed — just click and you're in.
  </p>

  <!-- CTA Button -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:4px 0 24px;">
    <a href="${url}" target="_blank"
       style="display:inline-block;background:#0a84ff;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.2px;">
      Sign in to Brickly
    </a>
  </td></tr>
  </table>

  <p style="margin:0 0 4px;font-size:13px;line-height:1.5;color:#8e8e93;">
    This link expires in 24 hours and can only be used once.
  </p>
  <p style="margin:0;font-size:13px;line-height:1.5;color:#8e8e93;">
    If you didn't request this, you can safely ignore this email.
  </p>
</td>
</tr>

<!-- Divider -->
<tr>
<td style="padding:0 32px;">
  <div style="border-top:1px solid #e5e5ea;margin:20px 0;"></div>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:0 32px 28px;text-align:center;">
  <p style="margin:0 0 4px;font-size:12px;color:#aeaeb2;">
    Sent from <strong style="color:#8e8e93;">Brickly</strong> · ${host}
  </p>
  <p style="margin:0;font-size:12px;color:#c7c7cc;">
    Tap, track, done. 🧱
  </p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

function text({ url, host }: { url: string; host: string }) {
	return `Sign in to Brickly\n\nReady to build? Use this link to sign in:\n${url}\n\nThis link expires in 24 hours and can only be used once.\nIf you didn't request this, you can safely ignore this email.\n\n— Brickly · ${host}`
}
