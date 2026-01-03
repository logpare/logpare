# logpare Agent Skills

This directory contains Agent Skills for Claude Code to enhance development and usage of logpare.

## What are Agent Skills?

Agent Skills are markdown files that teach Claude specialized knowledge for specific tasks. They're automatically triggered when your request matches their purpose—no explicit activation needed.

These skills follow the [Agent Skills specification](https://agentskills.io/specification) and work across Claude Code, Codex CLI, and other MCP-compatible systems.

## Available Skills

### 1. Compression Tuning (`compression-tuning/`)
**Use when**: Tuning parameters, analyzing compression results, diagnosing template issues, or optimizing performance.

**Includes**:
- Parameter tuning decision trees
- Recommended settings by log type
- Real-world case studies with before/after results
- Performance optimization guidelines

**Activates on**: "too many templates", "optimize compression", "tune parameters", "compression ratio"

---

### 2. Custom Preprocessing (`custom-preprocessing/`)
**Use when**: Creating custom preprocessing strategies, defining new masking patterns, or handling domain-specific log formats.

**Includes**:
- ParsingStrategy interface guide
- Comprehensive pattern library (AWS, Azure, GCP, auth, payments, etc.)
- Custom tokenization examples
- Dynamic similarity threshold strategies

**Activates on**: "custom pattern", "mask variables", "define strategy", "domain-specific logs"

---

### 3. Debugging Templates (`debugging-templates/`)
**Use when**: Troubleshooting template generation, investigating grouping issues, or diagnosing unexpected results.

**Includes**:
- 4-phase systematic debugging process
- Preprocessing/tokenization trace tools
- Similarity calculation helpers
- Common issues checklist

**Activates on**: "why aren't logs grouping", "debug templates", "troubleshoot compression", "unexpected results"

---

### 4. MCP Server Development (`mcp-server-development/`)
**Use when**: Creating MCP servers for logpare, exposing logpare as AI tools, or building integrations.

**Includes**:
- Complete MCP server implementation
- Tool definitions and handlers
- Claude Desktop integration
- Testing and deployment guides

**Activates on**: "MCP server", "Model Context Protocol", "expose as tool", "Claude integration"

---

### 5. Contributing & Development (`contributing-development/`)
**Use when**: Making contributions, setting up dev environment, writing tests, or preparing PRs.

**Includes**:
- Project architecture overview
- Development workflow
- Testing best practices
- V8 optimization guidelines
- Pull request process

**Activates on**: "contribute", "add feature", "setup development", "write tests", "pull request"

---

## How Skills Work

1. **Discovery**: Claude loads skill names and descriptions at startup
2. **Activation**: When your request matches a description, Claude loads the full skill
3. **Execution**: Claude follows instructions and loads supporting files as needed

## Skill Structure

```
.claude/skills/
├── skill-name/
│   ├── SKILL.md              # Main instructions (REQUIRED)
│   ├── references/           # Supporting documentation (optional)
│   │   └── detailed-guide.md
│   └── scripts/              # Executable helpers (optional)
│       └── helper.sh
└── README.md                 # This file
```

## Using Skills

Skills trigger automatically—just ask Claude naturally:

```
❌ Don't say: "Use the compression-tuning skill"
✅ Do say: "I'm getting too many templates, how can I optimize this?"
```

Claude will automatically activate the appropriate skill based on your request.

## Creating New Skills

To create a new skill:

1. Create directory: `.claude/skills/my-skill-name/`
2. Create `SKILL.md` with frontmatter:
   ```yaml
   ---
   name: my-skill-name
   description: Use when [triggering conditions]. What this skill does.
   ---

   # My Skill Name

   [Instructions for Claude]
   ```
3. Add supporting files in `references/` if needed
4. Restart Claude Code to load the new skill

**Key guidelines**:
- Description should include trigger keywords users would naturally say
- Keep SKILL.md under 500 lines (use progressive disclosure)
- Link to reference files for detailed docs
- Test with real user queries

## Progressive Disclosure

Skills use a three-level disclosure pattern:

- **Level 1**: Metadata (~100 tokens) - Always loaded
- **Level 2**: SKILL.md content (<5000 tokens) - Loaded when triggered
- **Level 3**: Reference files - Loaded only when explicitly needed

This keeps context windows efficient while providing depth when needed.

## Best Practices

✅ **Do**:
- Write specific, keyword-rich descriptions
- Include concrete examples in skills
- Use tables and code blocks for clarity
- Link to reference files for deep details
- Test skills with real queries

❌ **Don't**:
- Create vague descriptions ("Helps with logs")
- Put everything in one giant SKILL.md
- Create deeply nested reference chains
- Duplicate information across skills

## Skills vs CLAUDE.md

**Skills** (this directory):
- Triggered automatically by matching requests
- Optional, task-specific knowledge
- Can restrict tool access via `allowed-tools`
- Good for: specialized workflows, debugging, tutorials

**CLAUDE.md** (root):
- Loaded in every conversation
- Universal project context
- Always available
- Good for: build commands, architecture, coding standards

## Resources

- [Agent Skills Specification](https://agentskills.io/specification)
- [Claude Code Skills Documentation](https://code.claude.com/docs/en/skills)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)
- [obra/superpowers](https://github.com/obra/superpowers) - Battle-tested skills library

## Contributing Skills

To contribute a new skill to logpare:

1. Create the skill following the structure above
2. Test it with real usage scenarios
3. Document when it should activate
4. Submit a PR with:
   - Skill implementation
   - Example usage scenarios
   - Documentation updates

---

**Note**: These skills are designed to enhance the logpare development and usage experience. They complement the existing CLAUDE.md file by providing specialized, on-demand knowledge.
