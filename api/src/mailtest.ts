// Standalone SMTP diagnostic. Run inside the API container:
//   node dist/mailtest.js you@example.com
// or locally: npm run mail:test -- you@example.com
//
// Prints the SMTP config (password masked), verifies the connection + auth,
// and — if a recipient is given — sends a test email.
import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM ?? "CoMatch <no-reply@comatch.app>";
const to = process.argv[2];

async function main() {
  console.log("SMTP config:");
  console.log(`  host: ${host ?? "(unset)"}`);
  console.log(`  port: ${port}  (secure/TLS: ${port === 465})`);
  console.log(`  user: ${user ?? "(unset)"}`);
  console.log(`  pass: ${pass ? `(set, ${pass.length} chars)` : "(unset)"}`);
  console.log(`  from: ${from}`);

  if (!host || !user || !pass) {
    console.error("\n✗ SMTP is not fully configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS.");
    process.exit(1);
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  console.log("\nVerifying connection + credentials…");
  await transport.verify();
  console.log("✓ SMTP connection + auth OK.");

  if (!to) {
    console.log("\n(No recipient given — pass an email as the first argument to send a test mail.)");
    return;
  }

  console.log(`\nSending test email to ${to}…`);
  const info = await transport.sendMail({
    from,
    to,
    subject: "CoMatch SMTP test",
    text: "If you can read this, CoMatch SMTP is working.",
  });
  console.log(`✓ Sent. messageId=${info.messageId}`);
  if (info.accepted?.length) console.log(`  accepted: ${info.accepted.join(", ")}`);
  if (info.rejected?.length) console.log(`  rejected: ${info.rejected.join(", ")}`);
}

main().catch((err) => {
  console.error("\n✗ SMTP test failed:");
  console.error(err);
  process.exit(1);
});
