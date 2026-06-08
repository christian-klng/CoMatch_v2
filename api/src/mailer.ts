import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM ?? "CoMatch <no-reply@comatch.app>";

const configured = Boolean(host && user && pass);

const transport = configured
  ? nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = implicit TLS; otherwise STARTTLS on 587
      auth: { user: user!, pass: pass! },
    })
  : null;

export async function sendMagicLink(to: string, link: string): Promise<void> {
  if (!transport) {
    // Dev fallback: no SMTP configured → log the link so local testing works.
    console.log(`[mailer] SMTP not configured. Magic link for ${to}:\n${link}`);
    return;
  }

  await transport.sendMail({
    from,
    to,
    subject: "Dein CoMatch-Login-Link",
    text:
      `Hier ist dein Login-Link für CoMatch:\n\n${link}\n\n` +
      `Der Link ist 15 Minuten gültig. Wenn du das nicht angefordert hast, ignoriere diese E-Mail.`,
    html:
      `<p>Hier ist dein Login-Link für CoMatch:</p>` +
      `<p><a href="${link}">Bei CoMatch anmelden</a></p>` +
      `<p style="color:#666;font-size:13px">Der Link ist 15 Minuten gültig. ` +
      `Wenn du das nicht angefordert hast, ignoriere diese E-Mail.</p>`,
  });
}
