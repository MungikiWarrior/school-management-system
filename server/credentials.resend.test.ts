import { describe, expect, it } from "vitest";

describe("Resend credentials", () => {
  it("recognizes the configured API key", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey, "RESEND_API_KEY must be configured").toBeTruthy();

    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = await response.text();

    // Resend send-only keys are intentionally denied read access to /domains.
    // That 401 response still proves the key is recognized; an invalid key
    // returns a different validation_error response.
    const recognizedSendOnlyKey = response.status === 401 && body.includes("restricted_api_key");
    expect(response.ok || recognizedSendOnlyKey, body).toBe(true);
  }, 15_000);
});
