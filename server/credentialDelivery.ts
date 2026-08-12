import { createHash, randomBytes } from "node:crypto";

export type CredentialDeliveryInput = {
  recipient: string;
  displayName: string;
  identifier: string;
  roleLabel: string;
};

export type CredentialDeliveryResult = {
  status: "SENT" | "FAILED";
  temporaryPasswordHash: string;
  errorMessage?: string;
};

const hashTemporaryPassword = (temporaryPassword: string) =>
  createHash("sha256").update(temporaryPassword).digest("hex");

const generateTemporaryPassword = () =>
  randomBytes(9).toString("base64url").slice(0, 12);

/**
 * Sends an account credential email immediately after account creation.
 * The password exists only in memory for the duration of this request; the
 * database receives a one-way hash and the response only exposes delivery
 * status.
 */
export async function deliverCredentials(
  input: CredentialDeliveryInput,
): Promise<CredentialDeliveryResult> {
  const temporaryPassword = generateTemporaryPassword();
  const temporaryPasswordHash = hashTemporaryPassword(temporaryPassword);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      status: "FAILED",
      temporaryPasswordHash,
      errorMessage: "Credential email service is not configured.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.recipient],
      subject: "Your school account is ready",
      text: [
        `Hello ${input.displayName},`,
        "",
        "Your school management account has been created.",
        `Role: ${input.roleLabel}`,
        `Username / registration number: ${input.identifier}`,
        `Temporary password: ${temporaryPassword}`,
        "",
        "Please sign in and change your password immediately. Do not forward this email.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    return {
      status: "FAILED",
      temporaryPasswordHash,
      errorMessage: `Email provider rejected the message (${response.status})${errorBody ? `: ${errorBody.slice(0, 300)}` : ""}`,
    };
  }

  return { status: "SENT", temporaryPasswordHash };
}
