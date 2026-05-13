# 21st.dev Magic — UI Component Generation Skill

Use this skill when the user asks to build, create, or generate UI components, pages, or frontend elements.

## What This Is

Magic by 21st.dev is an MCP-powered tool that generates polished React/TypeScript UI components from natural language. It draws from 21st.dev's component library and supports TypeScript, Tailwind, shadcn/ui, and major frameworks.

Source: https://github.com/21st-dev/magic-mcp (4.9k stars)

## Core Tools Available (via MCP)

| Tool | Trigger | What It Does |
|------|---------|--------------|
| `21st_magic_component_builder` | `/ui`, `/21st`, or any component request | Generates a new UI component from a description |
| `logo_search` | User asks for a brand logo | Returns SVG logo from SVGL library |
| `fetch_ui` | User wants to use an existing 21st.dev component | Fetches component code from the registry |
| `refine_ui` | User wants to tweak an existing component | Iterates on a generated component |

## How to Use

When a user asks for UI work, use the Magic MCP tool:

```
/ui create a pricing table with 3 tiers for a SaaS product
/ui build a dark mode dashboard sidebar with collapsible navigation
/21st add a hero section with gradient background and CTA button
```

After the tool returns a component snippet, integrate it into the appropriate file in the codebase.

## MCP Setup (requires API key)

To activate the MCP server for Claude Code, add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/magic-mcp@latest"],
      "env": {
        "TWENTY_FIRST_API_KEY": "<your-key-from-21st.dev/magic>"
      }
    }
  }
}
```

Get an API key at: https://21st.dev/magic

## SDK Packages (21st-dev/21st-sdk)

| Package | Use |
|---------|-----|
| `@21st-sdk/react` | Chat UI components for React apps |
| `@21st-sdk/agent` | Core agent + tool type definitions |
| `@21st-sdk/node` | Node.js API client |
| `@21st-sdk/nextjs` | Next.js server + client integration |

Install: `npm install @21st-sdk/react` (or relevant package)

## Component Categories Supported

- Buttons, inputs, forms, dialogs, tables
- Navigation bars, sidebars, breadcrumbs
- Dashboards, cards, stat panels
- Landing pages, hero sections, pricing tables
- Modals, toasts, alerts, banners
- Data visualisation components

## Activation

This skill activates when the user asks to:
- Build or generate a React/UI component
- Create a page layout or section
- Use `/ui` or `/21st` commands
- Search for a brand logo (SVGL)
