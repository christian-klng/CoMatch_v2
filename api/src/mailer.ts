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

export type MailLocale = "de" | "en";

const templates: Record<
  MailLocale,
  { subject: string; text: (link: string) => string; html: (link: string) => string }
> = {
  de: {
    subject: "Dein CoMatch-Login-Link",
    text: (link) =>
      `Hier ist dein Login-Link für CoMatch:\n\n${link}\n\n` +
      `Der Link ist 15 Minuten gültig. Wenn du das nicht angefordert hast, ignoriere diese E-Mail.`,
    html: (link) =>
      `<p>Hier ist dein Login-Link für CoMatch:</p>` +
      `<p><a href="${link}">Bei CoMatch anmelden</a></p>` +
      `<p style="color:#666;font-size:13px">Der Link ist 15 Minuten gültig. ` +
      `Wenn du das nicht angefordert hast, ignoriere diese E-Mail.</p>`,
  },
  en: {
    subject: "Your CoMatch login link",
    text: (link) =>
      `Here is your login link for CoMatch:\n\n${link}\n\n` +
      `The link is valid for 15 minutes. If you didn't request this, just ignore this email.`,
    html: (link) =>
      `<p>Here is your login link for CoMatch:</p>` +
      `<p><a href="${link}">Sign in to CoMatch</a></p>` +
      `<p style="color:#666;font-size:13px">The link is valid for 15 minutes. ` +
      `If you didn't request this, just ignore this email.</p>`,
  },
};

export async function sendMagicLink(
  to: string,
  link: string,
  locale: MailLocale = "de",
): Promise<void> {
  if (!transport) {
    // Dev fallback: no SMTP configured → log the link so local testing works.
    console.log(`[mailer] SMTP not configured. Magic link for ${to}:\n${link}`);
    return;
  }

  const tpl = templates[locale];
  await transport.sendMail({
    from,
    to,
    subject: tpl.subject,
    text: tpl.text(link),
    html: tpl.html(link),
  });
}
