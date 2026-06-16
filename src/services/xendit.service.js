const XENDIT_API_BASE_URL = process.env.XENDIT_API_BASE_URL || "https://api.xendit.co";

const getAuthHeader = () => {
  const secretKey = process.env.XENDIT_SECRET_KEY;
  if (!secretKey) {
    throw new Error("XENDIT_SECRET_KEY belum diatur");
  }

  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
};

export const createXenditInvoice = async ({
  externalId,
  amount,
  description,
  customer,
  items,
  successRedirectUrl,
  failureRedirectUrl,
}) => {
  const response = await fetch(`${XENDIT_API_BASE_URL}/v2/invoices`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: externalId,
      amount,
      description,
      invoice_duration: 86400,
      customer,
      success_redirect_url: successRedirectUrl,
      failure_redirect_url: failureRedirectUrl,
      currency: "IDR",
      items,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || data?.error_message || "Gagal membuat invoice Xendit");
  }

  return data;
};

export const isXenditWebhookAuthorized = (req) => {
  const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!expectedToken) return true;

  const receivedToken = req.headers["x-callback-token"];
  return String(receivedToken || "") === String(expectedToken);
};
