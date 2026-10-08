import { formatLongDate } from "@/lib/text";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Hanken+Grotesk:wght@400;500&family=Geist+Mono:wght@400;500&display=swap";

export function emailDocument(body: string): string {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="${FONT_HREF}" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#0E0F11;">
${body}
</body>
</html>`;
}

export function magicLinkEmail(url: string, now = new Date()): { subject: string; html: string } {
  const date = formatLongDate(now);
  const html = emailDocument(`
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E0F11;color:#F2F1EC;">
    <tr>
      <td style="padding:48px 32px 64px;background:#0E0F11;background-image:radial-gradient(ellipse 60% 50% at 70% 110%, rgba(255,107,91,.14), transparent 70%);">
        <p style="margin:0 0 48px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(242,241,236,.55);">Private · Privacy search</p>
        <p style="margin:0;font-family:'Bricolage Grotesque',Georgia,sans-serif;font-weight:700;font-size:64px;line-height:.9;letter-spacing:-.03em;color:#F2F1EC;">nigelsninja<span style="color:#FF6B5B;">.</span></p>
        <p style="margin:28px 0 0;max-width:38em;font-family:'Hanken Grotesk',Georgia,sans-serif;font-size:20px;line-height:1.45;color:rgba(242,241,236,.72);">Your privacy roles from LinkedIn, with a letter when one is worth sending.</p>
        <p style="margin:36px 0 0;">
          <a href="${escapeHtml(url)}" style="display:inline-block;background:#FF6B5B;color:#0E0F11;text-decoration:none;border-radius:999px;padding:16px 28px;font-family:'Hanken Grotesk',Georgia,sans-serif;font-size:17px;">Continue <span style="font-family:'Geist Mono',ui-monospace,monospace;font-size:14px;">→</span></a>
        </p>
        <p style="margin:48px 0 0;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.08em;color:rgba(242,241,236,.4);">${escapeHtml(date)}</p>
      </td>
    </tr>
  </table>`);
  return { subject: "Sign in to nigelsninja", html };
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
