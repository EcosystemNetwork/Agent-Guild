# Agent Guild — Demo Playbook

## Pre-Demo Checklist

Run through these before every demo session.

### Environment

- [ ] `.env` file is present with valid keys:
  - `TRUEFOUNDRY_API_KEY` — LLM gateway
  - `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID` — login
  - `BLAND_API_KEY`, `BLAND_PATHWAY_ID` — real voice calls
  - `WEBHOOK_BASE_URL` — ngrok/tunnel URL for Bland webhooks (e.g. `https://abc123.ngrok.io`)
- [ ] ngrok tunnel running: `ngrok http 3001`
- [ ] Server + frontend running: `npm run dev:all`
- [ ] Smoke tests pass: `npm run test:smoke`
- [ ] Browser open to `http://localhost:5173`
- [ ] Auth0 test user credentials ready
- [ ] Target phone number for voice escalation confirmed

### Data Reset (optional)

```bash
rm -rf .data/ server/data/
npm run dev:server   # re-seeds agent records
```

---

## Demo Script (2-3 minutes)

### Step 1 — Login (15s)

1. Navigate to `http://localhost:5173`.
2. Click **Sign In** — Auth0 login screen appears.
3. Enter test user credentials and authenticate.
4. Dashboard loads showing guild status, active agents, and mission metrics.

> "We're authenticated via Auth0. Every action from here is tied to a real user session."

### Step 2 — Connect an Account (15s)

1. Open **Settings** (gear icon in sidebar).
2. Under **Connected Accounts**, click **Connect** on one provider (e.g., GitHub).
3. Show the connection status flip to **Linked**.
4. Alternatively: open **Agent Registry** and show an agent is **Connected** with its session mode.

> "Agents are registered with real upstream identities. This is the trust chain."

### Step 3 — Launch a Mission (30s)

1. Navigate to **Missions**.
2. Click **New Mission**.
3. Fill in:
   - Name: "Perimeter Recon — East Sector"
   - Type: Research
   - Agent: CIPHER-7
   - Priority: High
   - Prompt: "Investigate anomalous DNS traffic from subnet 10.0.4.0/24"
4. Click **Launch**.
5. Watch the mission transcript stream in real-time as CIPHER-7 responds.

> "The mission is running against a real LLM via TrueFoundry. That transcript is live."

### Step 4 — Sync a Context Source (20s)

1. Open the mission's **Comms** channel (click into the mission thread).
2. In the right panel, see the **Context Sources** section.
3. Click **Sync** on one Airbyte source (e.g., Threat Intel).
4. Watch the sync status update and fresh records appear.

> "Context is pulled from real data sources via Airbyte. The agent sees this data in its next message."

### Step 5 — Run a Tool (20s)

1. Still in the mission thread, the agent may invoke a tool automatically.
2. Or manually: click the tool icon and select **dns-lookup**.
3. Enter target: `example.com`, record type: `A`.
4. Watch the tool execute and return real DNS results.

> "That was a real DNS lookup — not mocked. Tools run server-side with actual network access."

### Step 6 — Voice Escalation (30s)

1. In the mission thread, click the **Phone** icon (voice escalation).
2. Enter the target phone number.
3. Click **Call**.
4. Watch the call card appear:
   - Status: Queued → Ringing → In Progress → Completed.
   - **Live** badge confirms this is a real Bland.ai call.
5. When completed, expand the card to show:
   - **Summary** — AI-generated call summary from Bland.
   - **Transcript** — real conversation transcript.
   - **Recording** — clickable link to the call recording.

> "That call just happened. The summary, transcript, and recording are from Bland's API — not simulated."

### Wrap-up (10s)

1. Return to Dashboard — show the mission completed.
2. Open the Trust Ledger — show audit trail.

> "Every step used real data: real auth, real LLM, real tools, real voice calls. The smoke test suite validates this flow is repeatable."

---

## Smoke Test Details

```bash
# Run the full smoke suite (starts a test server automatically)
npm run test:smoke

# Tests cover:
# 1. Auth — /api/auth/me returns 401 without token
# 2. Agents — CRUD on /api/agents
# 3. Missions — create, retrieve, append transcript
# 4. Context — gateway health check
# 5. Tools — list tools, execute dns-lookup
# 6. Voice — launch call, webhook processing, call detail fetch
```

### With Real Bland Calls

```bash
BLAND_API_KEY=sk-xxx npm run test:smoke
```

When `BLAND_API_KEY` is set, the voice tests make a real outbound call and verify the response.

---

## Simulation vs Live Indicators

| UI Element | Simulated | Live |
|---|---|---|
| Call card badge | Amber "Simulated" | Green "Live" |
| Summary text | Prefixed with `[SIMULATED]` | Real Bland summary |
| Transcript | Prefixed with `[SIMULATED TRANSCRIPT]` | Real conversation |
| Recording link | Not shown | Clickable "Play Recording" |
| Bland call ID | `sim-*` | Real UUID from Bland |
