import express from "express";
import fetch from "node-fetch";
let endpoint = "https://app.agent-hq.io";
{
  endpoint = "https://app.agent-hq.io";
}
const api_access_token = "RFc2qj5ErcDekWBqDTI3uzBUOgq1wgnwq5XR5IlL1RM";
const agent_id = "OJMqQJ";
const app = express();
app.use(express.json());
app.post("/api", async (req, res) => {
  const response = await fetch(`${endpoint}/api/v1/agents/${agent_id}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${api_access_token}`
    },
    body: JSON.stringify({
      input: req.body.input,
      history: req.body.history
    })
  });
  const data = await response.json();
  res.status(200).json(data);
});
const handler = app;
export {
  handler
};
