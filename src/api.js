import express from "express";

let endpoint = "http://app.agent-hq.io";
if (import.meta.env.VITE_AGHQ_ENDPOINT) {
  endpoint = import.meta.env.VITE_AGHQ_ENDPOINT;
}

const api_access_token = import.meta.env.VITE_AGHQ_API_ACCESS_TOKEN;

const agent_id = import.meta.env.VITE_AGHQ_AGENT_ID;

const app = express();
app.use(express.json());

app.post("/api", async (req, res) => {
  const response = await fetch(`${endpoint}/api/v1/agents/${agent_id}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${api_access_token}`,
    },
    body: JSON.stringify({
      input: req.body.input,
      history: req.body.history,
    }),
  });

  const data = await response.json();

  res.status(200).json(data);
});

export const handler = app;
