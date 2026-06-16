import https from "node:https";

const XENDIT_API_BASE_URL = process.env.XENDIT_API_BASE_URL || "https://api.xendit.co";
const ALLOW_INSECURE_TLS = process.env.XENDIT_ALLOW_INSECURE_TLS !== "false" && process.env.NODE_ENV !== "production";

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
  const payload = JSON.stringify({
    external_id: externalId,
    amount,
    description,
    invoice_duration: 86400,
    customer,
    success_redirect_url: successRedirectUrl,
    failure_redirect_url: failureRedirectUrl,
    currency: "IDR",
    items,
  });

  const doRequest = (rejectUnauthorized = true) => new Promise((resolve, reject) => {
    const url = new URL(`${XENDIT_API_BASE_URL}/v2/invoices`);
    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        agent: new https.Agent({ rejectUnauthorized }),
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          let data = {};
          try {
            data = body ? JSON.parse(body) : {};
          } catch {
            data = { raw: body };
          }

          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve(data);
            return;
          }

          reject(new Error(data?.message || data?.error_message || `Gagal membuat invoice Xendit (${response.statusCode})`));
        });
      }
    );

    request.setTimeout(15000, () => {
      request.destroy(new Error("Koneksi ke Xendit timeout"));
    });

    request.on("error", reject);
    request.write(payload);
    request.end();
  });

  try {
    return await doRequest(true);
  } catch (error) {
    const certRelated = String(error.message || "").toLowerCase().includes("certificate")
      || String(error.message || "").toLowerCase().includes("tls")
      || String(error.message || "").toLowerCase().includes("self signed");

    if (certRelated && ALLOW_INSECURE_TLS) {
      return await doRequest(false);
    }

    throw new Error(`Koneksi ke Xendit gagal: ${error.message}`);
  }
};

export const isXenditWebhookAuthorized = (req) => {
  const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!expectedToken) return true;

  const receivedToken = req.headers["x-callback-token"];
  return String(receivedToken || "") === String(expectedToken);
};
