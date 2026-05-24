import { useState } from "react";

const sections = [
  {
    id: "LIVE",
    category: "Live Runtime",
    status: "mostly_ready",
    priority: 1,
    color: "#00FF94",
    items: [
      {
        title: "Backend health is working",
        detail: "The production API has returned a healthy /health response after the Postgres credential fix.",
        code: "curl -s https://vindica.me/health\n# expected: {\"status\":\"ok\",\"env\":\"production\"}",
        risk: "GOOD - API is booting and connected to Postgres",
      },
      {
        title: "Confirm nginx keeps /api prefix",
        detail: "Host nginx must proxy /api/ without a trailing slash on proxy_pass. Otherwise /api/v1/... becomes /v1/... and the frontend sees failed scans.",
        code: "location /api/ {\n  proxy_pass http://127.0.0.1:8000;\n}",
        risk: "BLOCKER IF WRONG - API routes return 404",
      },
    ],
  },
  {
    id: "SCAN",
    category: "Scan Engine",
    status: "working_local",
    priority: 2,
    color: "#38BDF8",
    items: [
      {
        title: "Main scan flow runs locally",
        detail: "POST /api/v1/scans creates a job, status polling advances, and completed results return structured JSON.",
        code: "curl -X POST http://127.0.0.1:8000/api/v1/scans \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"email\":\"anne@example.com\",\"full_name\":\"Anne Example\"}'",
        risk: "GOOD - scan lifecycle is alive",
      },
      {
        title: "Broker progress no longer looks frozen",
        detail: "The Playwright broker loop now reports broker-by-broker status instead of sitting at 30% for most of the run.",
        code: "data_broker - scanning Radaris (6/10)\nprogress: 47.5",
        risk: "FIXED LOCALLY - needs live deploy",
      },
      {
        title: "Username and phone fallbacks added",
        detail: "If a scan completes without evidence rows, username scans fall through to platform probes and phone scans fall through to phone enrichment.",
        code: "username -> /api/v1/lookups/username/{username}\nphone -> /api/v1/lookups/phone/{number}",
        risk: "FIXED LOCALLY - needs live deploy",
      },
    ],
  },
  {
    id: "PROVIDERS",
    category: "Provider Keys",
    status: "partial",
    priority: 3,
    color: "#FFD700",
    items: [
      {
        title: "Brave Search key still unlocks the biggest evidence gap",
        detail: "Name, username, phone, and email public-source evidence depend heavily on Brave Search unless we rely only on local fallback probes.",
        code: "BRAVE_API_KEY=...\n# or\nBRAVE_SEARCH_API_KEY=...",
        risk: "HIGH - name/email scans stay thin without it",
      },
      {
        title: "HIBP key required for real breach data",
        detail: "Email breach and paste results need HIBP_API_KEY. Without it, the app should show provider unavailable, not pretend no breach exists.",
        code: "HIBP_API_KEY=...",
        risk: "HIGH - email breach evidence unavailable",
      },
      {
        title: "Optional image/domain enrichers",
        detail: "HF enables image analysis. VirusTotal and Shodan enrich domain intelligence. URLScan is already usable without a key.",
        code: "HF_TOKEN=...\nVIRUSTOTAL_API_KEY=...\nSHODAN_API_KEY=...",
        risk: "MEDIUM - richer results, not core uptime",
      },
    ],
  },
  {
    id: "DEPLOY",
    category: "Deploy Procedure",
    status: "needs_safe_redeploy",
    priority: 4,
    color: "#FB923C",
    items: [
      {
        title: "Restore folders before redeploying",
        detail: "A failed tar unpack left /var/www/vindica without frontend/backend folders on disk, while old containers kept running. Restore from latest prev/backup folders before the next deploy.",
        code: "cd /var/www/vindica\nFRONT_DIR=$(ls -dt frontend.prev.* frontend.backup.* 2>/dev/null | head -1)\nBACK_DIR=$(ls -dt backend.prev.* backend.backup.* 2>/dev/null | head -1)\n[ -d frontend ] || mv \"$FRONT_DIR\" frontend\n[ -d backend ] || mv \"$BACK_DIR\" backend",
        risk: "BLOCKER - build context missing if not restored",
      },
      {
        title: "Stage archive before swapping live folders",
        detail: "Future deploys should unpack to /tmp/vindica-stage first, verify backend/frontend exist, then swap into /var/www/vindica.",
        code: "mkdir -p /tmp/vindica-stage\ntar -xzf /tmp/vindica-live-deploy.tar.gz -C /tmp/vindica-stage\ntest -d /tmp/vindica-stage/frontend\ntest -d /tmp/vindica-stage/backend",
        risk: "REQUIRED - prevents half-deploys",
      },
      {
        title: "Rebuild only app containers",
        detail: "Postgres, Redis, and host nginx do not need downtime for code deploys. Rebuild frontend/backend/workers/beat.",
        code: "docker compose --env-file .env build frontend backend worker-scans worker-honey beat\ndocker compose --env-file .env up -d frontend backend worker-scans worker-honey beat",
        risk: "GOOD - controlled restart scope",
      },
    ],
  },
  {
    id: "SMOKE",
    category: "Smoke Tests",
    status: "required",
    priority: 5,
    color: "#A78BFA",
    items: [
      {
        title: "Local smoke test",
        detail: "Before uploading, run frontend build, backend compile, backend health, and one scan request.",
        code: "cd frontend && npm run build\nbackend/.venv312/bin/python -m py_compile backend/app/workers/playwright_worker.py backend/app/workers/tasks.py\ncurl -s http://127.0.0.1:8000/health",
        risk: "REQUIRED - catches local regressions",
      },
      {
        title: "Live smoke test",
        detail: "After deploy, check health, page shell, /osint, and one real username or phone scan.",
        code: "curl -s https://vindica.me/health\ncurl -I https://vindica.me/\ncurl -I https://vindica.me/osint",
        risk: "REQUIRED - proves deployed code is actually live",
      },
    ],
  },
];

const lanes = [
  { label: "WORKING", ids: ["LIVE", "SCAN"], color: "#00FF94" },
  { label: "NEEDS KEYS", ids: ["PROVIDERS"], color: "#FFD700" },
  { label: "NEXT DEPLOY", ids: ["DEPLOY", "SMOKE"], color: "#FB923C" },
];

const statusLabel = {
  mostly_ready: "Mostly ready",
  working_local: "Working locally",
  partial: "Partial",
  needs_safe_redeploy: "Needs safe redeploy",
  required: "Required",
};

export default function Phase1Status() {
  const [open, setOpen] = useState("DEPLOY");
  const [showCode, setShowCode] = useState({});

  const toggle = (key) => setOpen(open === key ? null : key);
  const toggleCode = (key, event) => {
    event.stopPropagation();
    setShowCode((current) => ({ ...current, [key]: !current[key] }));
  };

  const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0);
  const fixedItems = sections
    .filter((section) => ["LIVE", "SCAN"].includes(section.id))
    .reduce((sum, section) => sum + section.items.length, 0);

  return (
    <div style={{
      background: "#07090E",
      minHeight: "100vh",
      fontFamily: "'DM Mono', 'Fira Code', monospace",
      color: "#CBD5E1",
      padding: "0 0 60px",
    }}>
      <div style={{
        background: "linear-gradient(180deg, #0F1117 0%, #07090E 100%)",
        borderBottom: "1px solid #00FF9422",
        padding: "36px 40px 28px",
      }}>
        <div style={{ fontSize: "10px", letterSpacing: "4px", color: "#00FF94", marginBottom: "8px" }}>
          VINDICA - PHASE 01 - LIVE OPERABILITY STATUS
        </div>
        <h1 style={{
          fontSize: "clamp(20px, 3.5vw, 32px)",
          fontWeight: 700,
          margin: "0 0 8px",
          color: "#F1F5F9",
          letterSpacing: "-0.3px",
        }}>
          What Is Actually Left Before Phase 1 Feels Live
        </h1>
        <p style={{ color: "#64748B", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>
          The old blockers are no longer accurate. The app runs; now we need the safer deploy flow, provider keys, and smoke tests.
        </p>

        <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
          {[
            { label: "Working Items", count: fixedItems, color: "#00FF94" },
            { label: "Provider Items", count: sections.find((s) => s.id === "PROVIDERS").items.length, color: "#FFD700" },
            { label: "Deploy Items", count: sections.find((s) => s.id === "DEPLOY").items.length, color: "#FB923C" },
            { label: "Total Checks", count: totalItems, color: "#94A3B8" },
          ].map(({ label, count, color }) => (
            <div key={label} style={{
              padding: "10px 20px",
              borderRadius: "8px",
              background: `${color}10`,
              border: `1px solid ${color}30`,
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}>
              <span style={{ fontSize: "22px", fontWeight: 700, color }}>{count}</span>
              <span style={{ fontSize: "10px", letterSpacing: "2px", color: "#64748B" }}>{label.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "32px 40px 0" }}>
        <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#334155", marginBottom: "16px" }}>
          CURRENT ORDER OF OPERATIONS
        </div>
        <div style={{ display: "flex", alignItems: "center", overflowX: "auto", paddingBottom: "8px" }}>
          {sections.map((section, index) => (
            <div key={section.id} style={{ display: "flex", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => toggle(section.id)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: open === section.id ? `${section.color}15` : "#0F1117",
                  border: `1px solid ${open === section.id ? section.color + "50" : "#1E293B"}`,
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  color: "#94A3B8",
                }}
              >
                <div style={{ fontSize: "9px", letterSpacing: "2px", color: section.color, marginBottom: "2px" }}>
                  STEP {section.priority}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600 }}>{section.id}</div>
              </button>
              {index < sections.length - 1 && (
                <div style={{ width: "24px", height: "1px", background: "#1E293B", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "32px 40px 0" }}>
        {lanes.map(({ label, ids, color }) => (
          <div key={label} style={{ marginBottom: "36px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ width: "3px", height: "20px", background: color, borderRadius: "2px" }} />
              <span style={{ fontSize: "10px", letterSpacing: "3px", color, fontWeight: 700 }}>{label}</span>
              <div style={{ flex: 1, height: "1px", background: `${color}15` }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {sections.filter((section) => ids.includes(section.id)).map((section) => (
                <div key={section.id}>
                  <div
                    onClick={() => toggle(section.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "16px 20px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      background: open === section.id ? `${section.color}08` : "#0D1117",
                      border: `1px solid ${open === section.id ? section.color + "30" : "#1E293B"}`,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      flexShrink: 0,
                      background: `${section.color}12`,
                      border: `1px solid ${section.color}25`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      letterSpacing: "1px",
                      color: section.color,
                      fontWeight: 700,
                    }}>
                      {section.id}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#E2E8F0" }}>{section.category}</div>
                      <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                        {statusLabel[section.status]} - {section.items.length} check{section.items.length > 1 ? "s" : ""}
                      </div>
                    </div>
                    <span style={{
                      color: "#64748B",
                      fontSize: "18px",
                      transform: open === section.id ? "rotate(90deg)" : "none",
                      transition: "transform 0.15s",
                    }}>›</span>
                  </div>

                  {open === section.id && (
                    <div style={{
                      marginTop: "4px",
                      marginLeft: "20px",
                      borderLeft: `2px solid ${section.color}30`,
                      paddingLeft: "20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      paddingTop: "12px",
                      paddingBottom: "12px",
                    }}>
                      {section.items.map((item, index) => {
                        const codeKey = `${section.id}-${index}`;
                        return (
                          <div key={item.title} style={{
                            background: "#0D1117",
                            border: "1px solid #1E293B",
                            borderRadius: "8px",
                            overflow: "hidden",
                          }}>
                            <div style={{ padding: "16px 20px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "#F1F5F9", marginBottom: "8px" }}>
                                {item.title}
                              </div>
                              <div style={{ fontSize: "12px", color: "#64748B", lineHeight: "1.6", marginBottom: "12px" }}>
                                {item.detail}
                              </div>
                              <div style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                background: section.color + "10",
                                border: `1px solid ${section.color}25`,
                              }}>
                                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: section.color }} />
                                <span style={{ fontSize: "10px", letterSpacing: "1px", color: section.color, fontWeight: 600 }}>
                                  {item.risk}
                                </span>
                              </div>
                            </div>
                            <div
                              onClick={(event) => toggleCode(codeKey, event)}
                              style={{
                                padding: "10px 20px",
                                borderTop: "1px solid #1E293B",
                                background: "#080B10",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span style={{ fontSize: "10px", letterSpacing: "2px", color: "#64748B" }}>
                                {showCode[codeKey] ? "HIDE CODE" : "SHOW CODE"}
                              </span>
                            </div>
                            {showCode[codeKey] && (
                              <pre style={{
                                margin: 0,
                                padding: "16px 20px",
                                background: "#04060A",
                                fontSize: "11px",
                                color: "#00FF94",
                                borderTop: "1px solid #1E293B",
                                overflowX: "auto",
                                lineHeight: "1.6",
                                whiteSpace: "pre-wrap",
                              }}>
                                {item.code}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        margin: "0 40px",
        padding: "24px 28px",
        background: "#00FF9408",
        border: "1px solid #00FF9420",
        borderRadius: "12px",
      }}>
        <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#00FF94", marginBottom: "16px" }}>
          DEFINITION OF DONE - CURRENT PHASE 1
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            "Server filesystem restored with frontend/ and backend/ present.",
            "Deploy archive is staged and verified before live folder swap.",
            "Frontend, backend, scan worker, honey worker, and beat rebuild cleanly.",
            "https://vindica.me/health returns 200 JSON.",
            "Host nginx preserves /api/v1 routes.",
            "One username scan and one phone scan show in-app results.",
            "Brave and HIBP missing-key states are visible until keys are added.",
          ].map((item, index) => (
            <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div style={{
                width: "20px",
                height: "20px",
                borderRadius: "4px",
                flexShrink: 0,
                border: "1px solid #00FF9430",
                background: "#00FF9408",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                color: "#00FF9460",
                marginTop: "1px",
              }}>
                {index + 1}
              </div>
              <span style={{ fontSize: "13px", color: "#94A3B8", lineHeight: "1.5" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
