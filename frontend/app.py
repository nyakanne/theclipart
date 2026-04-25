"""Second Brain AI — Streamlit frontend."""

import os
from datetime import datetime
from typing import Optional

import pandas as pd
import requests
import streamlit as st

API_URL = os.getenv("API_URL", "http://localhost:8000")

st.set_page_config(
    page_title="Second Brain AI",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Global style ───────────────────────────────────────────────────────────────

st.markdown("""
<style>
  .stApp { background-color: #faf9f7; }
  .block-container { padding-top: 1.5rem; }
  h1, h2, h3 { color: #2d2a26; font-weight: 600; }
  .metric-card {
    background: white;
    border-radius: 12px;
    padding: 1rem;
    border: 1px solid #ede9e4;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .stButton > button {
    border-radius: 8px;
    border: 1px solid #d4cfc8;
    background: white;
  }
  .stButton > button:hover { background: #f5f3f0; }
</style>
""", unsafe_allow_html=True)


# ── Helpers ────────────────────────────────────────────────────────────────────

def api(method: str, path: str, **kwargs):
    try:
        resp = getattr(requests, method)(f"{API_URL}{path}", timeout=30, **kwargs)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.ConnectionError:
        st.error("Cannot reach the backend. Is it running?")
        return None
    except requests.exceptions.HTTPError as e:
        st.error(f"API error: {e.response.text[:200]}")
        return None
    except Exception as e:
        st.error(f"Error: {e}")
        return None


def risk_badge(level: str) -> str:
    colors = {"low": "🟢", "medium": "🟡", "high": "🔴", "critical": "🚨"}
    return colors.get(level, "⚪")


# ── Sidebar navigation ─────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("# 🧠 Second Brain")
    st.caption("Your private AI operating system")
    st.divider()
    page = st.radio(
        "Navigate",
        [
            "🏠 Home",
            "💬 Chat",
            "🌿 Memory Garden",
            "📥 Ingest",
            "🤖 Agent Activity",
            "✅ Approval Queue",
            "📞 Call Inbox",
            "🔍 Truth Check",
            "📋 Projects & Tasks",
            "👥 Contacts",
            "📊 Audit Log",
            "⚙️ Settings",
        ],
        label_visibility="collapsed",
    )
    st.divider()
    st.caption("v0.1.0 · Local-first · Privacy-first")


# ══════════════════════════════════════════════════════════════════════════════
# HOME — Daily Briefing
# ══════════════════════════════════════════════════════════════════════════════

if page == "🏠 Home":
    st.title("Good morning 🧠")
    st.caption(f"Today is {datetime.now().strftime('%A, %B %d, %Y')}")

    col1, col2, col3 = st.columns(3)
    with col1:
        if st.button("▶ Trigger Briefing Scan"):
            result = api("post", "/api/agents/briefing")
            if result:
                st.success("Briefing generated!")
                st.rerun()

    briefing = api("get", "/api/briefings/latest")

    if not briefing:
        st.info("No briefing yet. Click 'Trigger Briefing Scan' to generate your first one.")
    else:
        st.markdown(f"*Generated: {briefing['created_at'][:16]}*")
        st.divider()

        c1, c2 = st.columns(2)
        with c1:
            st.subheader("👁 What I Noticed")
            for item in briefing.get("noticed", []):
                st.markdown(f"- {item}")
            if not briefing.get("noticed"):
                st.caption("Nothing new detected.")

            st.subheader("🗂 What I Organized")
            for item in briefing.get("organized", []):
                st.markdown(f"- {item}")

        with c2:
            st.subheader("💡 Recommendations")
            for item in briefing.get("recommendations", []):
                st.markdown(f"- {item}")

            st.subheader("⏳ Needs Approval")
            pending = briefing.get("pending_approvals", [])
            if pending:
                for item in pending:
                    st.warning(f"⚠ {item}")
            else:
                st.success("No pending approvals.")


# ══════════════════════════════════════════════════════════════════════════════
# CHAT
# ══════════════════════════════════════════════════════════════════════════════

elif page == "💬 Chat":
    st.title("Chat with your Second Brain")

    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if msg.get("sources"):
                with st.expander("Sources"):
                    for s in msg["sources"]:
                        st.caption(f"• {s}")
            if msg.get("confidence"):
                badge = {"high": "🟢", "medium": "🟡", "low": "🔴"}.get(msg["confidence"], "")
                st.caption(f"Confidence: {badge} {msg['confidence']} · Verifier: {msg.get('verifier_status', '—')}")

    if prompt := st.chat_input("Ask your second brain anything..."):
        st.session_state.chat_history.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                result = api("post", "/api/chat", json={
                    "message": prompt,
                    "history": [
                        {"role": m["role"], "content": m["content"]}
                        for m in st.session_state.chat_history[:-1]
                    ],
                })

            if result:
                reply = result["reply"]
                st.markdown(reply)
                confidence = result.get("confidence", "low")
                verifier = result.get("verifier_status", "—")
                badge = {"high": "🟢", "medium": "🟡", "low": "🔴"}.get(confidence, "")
                st.caption(f"Confidence: {badge} {confidence} · Verifier: {verifier}")
                if result.get("sources"):
                    with st.expander("Sources"):
                        for s in result["sources"]:
                            st.caption(f"• {s}")
                st.session_state.chat_history.append({
                    "role": "assistant",
                    "content": reply,
                    "sources": result.get("sources", []),
                    "confidence": confidence,
                    "verifier_status": verifier,
                })
            else:
                st.session_state.chat_history.append({"role": "assistant", "content": "Error connecting to backend."})

    if st.sidebar.button("Clear Chat"):
        st.session_state.chat_history = []
        st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# MEMORY GARDEN
# ══════════════════════════════════════════════════════════════════════════════

elif page == "🌿 Memory Garden":
    st.title("Memory Garden")
    st.caption("Your organized knowledge base")

    col1, col2 = st.columns([3, 1])
    with col2:
        mem_type_filter = st.selectbox("Filter type", ["all", "note", "fact", "event", "contact", "project", "observation"])

    params = {} if mem_type_filter == "all" else {"memory_type": mem_type_filter}
    memories = api("get", "/api/memory", params={**params, "limit": 100})

    if not memories:
        st.info("No memories yet. Start ingesting content to build your knowledge base.")
    else:
        st.metric("Total memories", len(memories))
        st.divider()
        for mem in memories:
            tags = " ".join(f"`{t}`" for t in (mem.get("tags") or []))
            with st.expander(f"**{mem['title']}** · {mem['memory_type']} · {mem['created_at'][:10]} {tags}"):
                st.markdown(mem["content"][:500] + ("..." if len(mem["content"]) > 500 else ""))
                if mem.get("source"):
                    st.caption(f"Source: {mem['source']}")
                if st.button("Delete", key=f"del_{mem['id']}"):
                    if api("delete", f"/api/memory/{mem['id']}"):
                        st.success("Deleted.")
                        st.rerun()


# ══════════════════════════════════════════════════════════════════════════════
# INGEST
# ══════════════════════════════════════════════════════════════════════════════

elif page == "📥 Ingest":
    st.title("Ingest Content")

    tab1, tab2, tab3 = st.tabs(["📝 Paste Text", "🌐 URL", "📄 Upload File"])

    with tab1:
        title = st.text_input("Title", placeholder="Meeting notes, article summary, idea...")
        content = st.text_area("Content", height=200)
        source = st.text_input("Source label", value="manual")
        mem_type = st.selectbox("Memory type", ["note", "fact", "event", "observation", "contact", "project"])
        tags_raw = st.text_input("Tags (comma-separated)")
        chunk_size = st.slider("Chunk size (words)", 100, 800, 300)

        if st.button("Ingest Text", type="primary"):
            if not content.strip():
                st.warning("Please enter some content.")
            else:
                tags = [t.strip() for t in tags_raw.split(",") if t.strip()]
                result = api("post", "/api/ingest/text", json={
                    "title": title or content[:60],
                    "content": content,
                    "source": source,
                    "memory_type": mem_type,
                    "tags": tags,
                    "chunk_size": chunk_size,
                })
                if result:
                    st.success(f"Ingested: **{result['title']}**")

    with tab2:
        url = st.text_input("URL", placeholder="https://example.com/article")
        if st.button("Ingest URL", type="primary"):
            if not url.strip():
                st.warning("Please enter a URL.")
            else:
                with st.spinner("Fetching..."):
                    result = api("post", "/api/ingest/url", params={"url": url})
                if result:
                    st.success(f"Ingested: **{result['title']}**")

    with tab3:
        uploaded = st.file_uploader("Upload file (PDF, DOCX, TXT, MD)", type=["pdf", "docx", "txt", "md"])
        file_tags = st.text_input("Tags (comma-separated)", key="file_tags")
        if uploaded and st.button("Upload & Ingest", type="primary"):
            with st.spinner("Processing..."):
                result = requests.post(
                    f"{API_URL}/api/ingest/file",
                    files={"file": (uploaded.name, uploaded.getvalue(), uploaded.type)},
                    data={"tags": file_tags},
                    timeout=60,
                )
            if result.ok:
                data = result.json()
                st.success(f"Ingested: **{uploaded.name}** → Memory ID: {data['memory_id']}")
            else:
                st.error(result.text)


# ══════════════════════════════════════════════════════════════════════════════
# AGENT ACTIVITY
# ══════════════════════════════════════════════════════════════════════════════

elif page == "🤖 Agent Activity":
    st.title("Agent Activity")

    st.subheader("Run an Agent")
    agent_choice = st.selectbox("Agent", ["Watcher", "Archivist", "Strategist", "Operator"])
    agent_input = st.text_area("Input / goal", height=100)

    if st.button("Run Agent", type="primary"):
        with st.spinner(f"Running {agent_choice}..."):
            if agent_choice == "Watcher":
                result = api("post", "/api/agents/watcher")
            elif agent_choice == "Archivist":
                result = api("post", "/api/agents/archivist", params={"content": agent_input})
            elif agent_choice == "Strategist":
                result = api("post", "/api/agents/strategist", params={"goal": agent_input})
            elif agent_choice == "Operator":
                result = api("post", "/api/agents/operator", params={"task": agent_input})
        if result:
            st.json(result)

    st.divider()
    st.subheader("Recent Audit Events")
    logs = api("get", "/api/audit", params={"limit": 20})
    if logs:
        for log in logs:
            st.markdown(f"**{log['event_type']}** · `{log['actor']}` · {log['created_at'][:16]}")


# ══════════════════════════════════════════════════════════════════════════════
# APPROVAL QUEUE
# ══════════════════════════════════════════════════════════════════════════════

elif page == "✅ Approval Queue":
    st.title("Approval Queue")

    reviewer = st.text_input("Your name", value="owner", key="reviewer_name")

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Pending Actions")
    with col2:
        if st.button("↻ Refresh"):
            st.rerun()

    pending = api("get", "/api/actions/pending")

    if not pending:
        st.success("✅ No pending actions. All clear.")
    else:
        st.metric("Pending", len(pending))
        for action in pending:
            risk = action.get("risk_level", "medium")
            with st.expander(f"{risk_badge(risk)} **{action['title']}** · `{action['action_type']}`"):
                st.markdown(f"**Reason:** {action['reason']}")
                if action.get("proposed_content"):
                    st.markdown("**Proposed content:**")
                    st.code(action["proposed_content"], language=None)
                st.caption(
                    f"Proposed by: `{action['proposed_by']}` · "
                    f"Risk: `{risk}` · "
                    f"Reversible: `{action['reversible']}` · "
                    f"Created: {action['created_at'][:16]}"
                )

                c1, c2 = st.columns(2)
                if c1.button("✅ Approve", key=f"approve_{action['id']}"):
                    result = api("post", f"/api/actions/{action['id']}/approve", json={"reviewer": reviewer})
                    if result:
                        st.success("Approved and executed.")
                        st.rerun()

                rejection_reason = st.text_input("Rejection reason", key=f"reason_{action['id']}")
                if c2.button("❌ Reject", key=f"reject_{action['id']}"):
                    result = api("post", f"/api/actions/{action['id']}/reject", json={"reviewer": reviewer, "reason": rejection_reason})
                    if result:
                        st.info("Rejected.")
                        st.rerun()

    st.divider()
    st.subheader("All Actions")
    all_actions = api("get", "/api/actions", params={"limit": 20})
    if all_actions:
        df = pd.DataFrame([{
            "Title": a["title"],
            "Type": a["action_type"],
            "Risk": a["risk_level"],
            "Status": a["status"],
            "By": a["proposed_by"],
            "Created": a["created_at"][:16],
        } for a in all_actions])
        st.dataframe(df, use_container_width=True)


# ══════════════════════════════════════════════════════════════════════════════
# CALL INBOX
# ══════════════════════════════════════════════════════════════════════════════

elif page == "📞 Call Inbox":
    st.title("Call Inbox")

    tab1, tab2, tab3 = st.tabs(["📋 Call Log", "⬆ Outbound Requests", "⚙ Voice Settings"])

    with tab1:
        calls = api("get", "/api/voice/calls", params={"limit": 20})
        if not calls:
            st.info("No calls yet.")
        else:
            for call in calls:
                direction = "📲 Inbound" if call["direction"] == "inbound" else "📤 Outbound"
                status_icon = {"ended": "✅", "active": "🔴", "ringing": "📳", "missed": "❌"}.get(call["status"], "⚪")
                with st.expander(f"{status_icon} {direction} · {call.get('caller_number', 'Unknown')} · {call['created_at'][:16]}"):
                    st.caption(f"Duration: {call.get('duration_seconds', 'N/A')}s · Provider: {call['provider']} · Status: {call['status']}")
                    if st.button("View Transcript", key=f"transcript_{call['id']}"):
                        transcript = api("get", f"/api/voice/calls/{call['id']}/transcript")
                        if transcript:
                            for line in transcript:
                                st.markdown(f"**{line['speaker']}:** {line['content']}")
                        else:
                            st.info("No transcript available.")

    with tab2:
        st.subheader("Request Outbound Call")
        with st.form("outbound_form"):
            to_number = st.text_input("Phone number")
            to_name = st.text_input("Name (optional)")
            purpose = st.text_area("Purpose of call")
            script = st.text_area("Draft script (optional)")
            if st.form_submit_button("Request Outbound Call"):
                result = api("post", "/api/voice/outbound/request", json={
                    "to_number": to_number,
                    "to_name": to_name,
                    "purpose": purpose,
                    "script_draft": script,
                })
                if result:
                    st.success("Outbound call request created — awaiting approval.")

        st.subheader("Pending Outbound Calls")
        reviewer = st.text_input("Reviewer name", value="owner", key="voice_reviewer")
        pending = api("get", "/api/voice/outbound/pending")
        if pending:
            for req in pending:
                with st.expander(f"📤 Call to {req.get('to_name') or req['to_number']} · {req['created_at'][:16]}"):
                    st.markdown(f"**Purpose:** {req['purpose']}")
                    if req.get("script_draft"):
                        st.code(req["script_draft"])
                    col1, col2 = st.columns(2)
                    if col1.button("✅ Approve", key=f"outbound_approve_{req['id']}"):
                        result = api("post", f"/api/voice/outbound/{req['id']}/approve", params={"reviewer": reviewer})
                        if result:
                            st.success("Approved.")
                            st.rerun()
        else:
            st.info("No pending outbound calls.")

    with tab3:
        st.subheader("Voice Settings")
        st.info("Configure LiveKit and Twilio credentials in your .env file.")
        st.code("""
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-key
LIVEKIT_API_SECRET=your-secret
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1...
        """)


# ══════════════════════════════════════════════════════════════════════════════
# TRUTH CHECK (Verifier + Search)
# ══════════════════════════════════════════════════════════════════════════════

elif page == "🔍 Truth Check":
    st.title("Truth Check")
    st.caption("Search your memory and verify claims against stored knowledge.")

    query = st.text_input("Search or claim to verify", placeholder="What do I know about X?")
    col1, col2 = st.columns(2)
    k = col1.slider("Results", 1, 10, 5)
    threshold = col2.slider("Similarity threshold", 0.1, 0.9, 0.3)

    if st.button("Search & Verify", type="primary"):
        with st.spinner("Searching memory..."):
            result = api("post", "/api/search", json={"query": query, "k": k, "threshold": threshold})
        if result:
            hits = result.get("hits", [])
            st.metric("Memory hits", len(hits))
            if not hits:
                st.warning("No matching memories found. Cannot verify this claim from stored knowledge.")
            else:
                for hit in hits:
                    score_pct = int(hit["score"] * 100)
                    with st.expander(f"**{hit['memory_title']}** · {score_pct}% match"):
                        st.markdown(hit["content"])
                        col1, col2 = st.columns(2)
                        col1.caption(f"Label: `{hit.get('label', 'FACT')}`")
                        col2.caption(f"Source: {hit.get('source') or 'unknown'}")


# ══════════════════════════════════════════════════════════════════════════════
# PROJECTS & TASKS
# ══════════════════════════════════════════════════════════════════════════════

elif page == "📋 Projects & Tasks":
    st.title("Projects & Tasks")

    tab1, tab2 = st.tabs(["📁 Projects", "✔ Tasks"])

    with tab1:
        with st.expander("+ New Project"):
            with st.form("new_project"):
                pname = st.text_input("Project name")
                pdesc = st.text_area("Description")
                ptags = st.text_input("Tags")
                if st.form_submit_button("Create"):
                    tags = [t.strip() for t in ptags.split(",") if t.strip()]
                    result = api("post", "/api/projects", json={"name": pname, "description": pdesc, "tags": tags})
                    if result:
                        st.success(f"Project created: {pname}")
                        st.rerun()

        projects = api("get", "/api/projects")
        if projects:
            for p in projects:
                tags = " ".join(f"`{t}`" for t in (p.get("tags") or []))
                st.markdown(f"**{p['name']}** · `{p['status']}` {tags}")
                if p.get("description"):
                    st.caption(p["description"])
                st.divider()

    with tab2:
        with st.expander("+ New Task"):
            with st.form("new_task"):
                ttitle = st.text_input("Task title")
                tpriority = st.selectbox("Priority", ["high", "medium", "low"])
                if st.form_submit_button("Create"):
                    result = api("post", "/api/tasks", json={"title": ttitle, "priority": tpriority})
                    if result:
                        st.success(f"Task created: {ttitle}")
                        st.rerun()

        tasks = api("get", "/api/tasks")
        if tasks:
            df = pd.DataFrame([{
                "Title": t["title"],
                "Priority": t["priority"],
                "Status": t["status"],
                "Due": t.get("due_date", "")[:10] if t.get("due_date") else "",
                "Created": t["created_at"][:10],
            } for t in tasks])
            st.dataframe(df, use_container_width=True)


# ══════════════════════════════════════════════════════════════════════════════
# CONTACTS
# ══════════════════════════════════════════════════════════════════════════════

elif page == "👥 Contacts":
    st.title("Contacts")

    with st.expander("+ Add Contact"):
        with st.form("new_contact"):
            cname = st.text_input("Name")
            cemail = st.text_input("Email")
            cphone = st.text_input("Phone")
            crel = st.text_input("Relationship")
            cnotes = st.text_area("Notes")
            if st.form_submit_button("Add"):
                result = api("post", "/api/contacts", json={
                    "name": cname, "email": cemail, "phone": cphone,
                    "relationship_type": crel, "notes": cnotes,
                })
                if result:
                    st.success(f"Added: {cname}")
                    st.rerun()

    contacts = api("get", "/api/contacts")
    if contacts:
        for c in contacts:
            with st.expander(f"**{c['name']}**"):
                col1, col2 = st.columns(2)
                col1.write(f"📧 {c.get('email') or '—'}")
                col1.write(f"📞 {c.get('phone') or '—'}")
                col2.write(f"🔗 {c.get('relationship_type') or '—'}")
                if c.get("notes"):
                    st.caption(c["notes"])
    else:
        st.info("No contacts yet.")


# ══════════════════════════════════════════════════════════════════════════════
# AUDIT LOG
# ══════════════════════════════════════════════════════════════════════════════

elif page == "📊 Audit Log":
    st.title("Audit Log")
    st.caption("Immutable record of all system events")

    col1, col2 = st.columns(2)
    event_filter = col1.text_input("Filter event type")
    actor_filter = col2.text_input("Filter actor")

    params = {"limit": 100}
    if event_filter:
        params["event_type"] = event_filter
    if actor_filter:
        params["actor"] = actor_filter

    logs = api("get", "/api/audit", params=params)
    if logs:
        df = pd.DataFrame([{
            "Time": l["created_at"][:16],
            "Event": l["event_type"],
            "Actor": l["actor"],
            "Resource": f"{l.get('resource_type', '')} {l.get('resource_id', '')}".strip(),
            "IP": l.get("ip_address") or "—",
        } for l in logs])
        st.dataframe(df, use_container_width=True)
    else:
        st.info("No audit logs found.")


# ══════════════════════════════════════════════════════════════════════════════
# SETTINGS
# ══════════════════════════════════════════════════════════════════════════════

elif page == "⚙️ Settings":
    st.title("Settings")

    st.subheader("Backend Connection")
    st.code(f"API_URL = {API_URL}")
    health = api("get", "/health")
    if health:
        st.success(f"Backend connected · env: `{health.get('env', 'unknown')}`")
    else:
        st.error("Backend not reachable")

    st.divider()
    st.subheader("Action Registry")
    registry = api("get", "/api/actions/registry/list")
    if registry:
        for action in registry:
            with st.expander(f"{risk_badge(action['risk_level'])} `{action['name']}` — {action['description']}"):
                st.json({
                    "risk_level": action["risk_level"],
                    "reversible": action["reversible"],
                    "requires_approval": action["requires_approval"],
                    "external": action["external"],
                    "parameters": action["parameters"],
                })

    st.divider()
    st.subheader("Core Safety Rules")
    st.markdown("""
    - 🔒 `REQUIRE_APPROVAL = true` — All external actions require human approval
    - 🚫 Agents may **never** execute external actions autonomously
    - ✅ Agents may analyze, summarize, organize, draft, and **propose**
    - 📋 Every proposed action is logged and auditable
    - 🔍 All answers are verified for grounding before display
    """)
