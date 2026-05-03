// src/functions/watsonx.server.ts
// Server-only watsonx helpers. Never import this file from client code.

const IAM_URL = "https://iam.cloud.ibm.com/identity/token";

let cached: { token: string; exp: number } | null = null;

export async function getIamToken(): Promise<string> {
  const apiKey = process.env.WATSONX_API_KEY;
  if (!apiKey) throw new Error("WATSONX_API_KEY is not set");

  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;

  const body = new URLSearchParams({
    grant_type: "urn:ibm:params:oauth:grant-type:apikey",
    apikey: apiKey,
  });

  const res = await fetch(IAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IAM token exchange failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { access_token: string; expiration: number };
  cached = { token: json.access_token, exp: json.expiration };
  return json.access_token;
}

export type WatsonxParams = {
  model_id?: string;
  max_new_tokens?: number;
  temperature?: number;
};

export async function generateText(
  prompt: string,
  params: WatsonxParams = {}
): Promise<{ text: string; raw: unknown }> {
  const projectId = process.env.WATSONX_PROJECT_ID;
  if (!projectId) throw new Error("WATSONX_PROJECT_ID is not set");

  const region = process.env.WATSONX_REGION || "us-south";
  const url = `https://${region}.ml.cloud.ibm.com/ml/v1/text/generation?version=2024-05-29`;

  const token = await getIamToken();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model_id: params.model_id || "ibm/granite-3-8b-instruct",
      project_id: projectId,
      input: prompt,
      parameters: {
        decoding_method: "greedy",
        max_new_tokens: params.max_new_tokens ?? 600,
        temperature: params.temperature ?? 0.2,
        repetition_penalty: 1.05,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`watsonx generation failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as {
    results?: Array<{ generated_text?: string }>;
  };
  const text = json.results?.[0]?.generated_text ?? "";
  return { text, raw: json };
}

// Made with Bob
