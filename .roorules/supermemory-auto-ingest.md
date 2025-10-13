---
description: Automatic SuperMemory integration for all Markdown files created or updated in the Attrition project. Ensures persistent knowledge retention across sessions.
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["supermemory", "automation", "markdown", "knowledge-retention", "mcp"]
globs: ["**/*.md"]
---

# SuperMemory Auto-Ingest for Markdown Files

## Objective

Automatically add every Markdown file created or significantly updated to SuperMemory for persistent knowledge retention. This ensures comprehensive project knowledge is preserved across all Cline sessions.

## Core Principle

SuperMemory serves as the primary persistent knowledge base for all project-related information. Every MD file creation or update MUST be accompanied by an automatic SuperMemory ingestion to maintain comprehensive project documentation.

## Mandatory Triggers

### Automatic Ingestion Required For:

1. **File Creation**: Any new `.md` file created via `write_to_file`
2. **Significant Updates**: Any substantial content changes via `replace_in_file` 
3. **Documentation Files**: All files in `docs/`, `.clinerules/`, `memory-bank/`
4. **Project Files**: README.md, achievements.md, and project documentation

### Immediate Execution Protocol

**AFTER every MD file operation:**

```typescript
// After write_to_file or replace_in_file for *.md
use_mcp_tool(
  server_name: "github.com/supermemoryai/supermemory-mcp",
  tool_name: "addToSupermemory", 
  arguments: {
    thingToRemember: `[Attrition MD File] ${filename}: ${summary_of_content}`
  }
)
```

**Content Summary Format:**
- File path and type
- Brief description of content (1-2 sentences)
- Key topics or sections
- Relationship to other project files
- Date stamp

## Example Automation Sequence

When creating or updating an MD file:

1. **Execute file operation** (write_to_file or replace_in_file)
2. **Wait for confirmation** of successful file operation
3. **Immediately ingest to SuperMemory**:
   ```
   use_mcp_tool:
   - server_name: github.com/supermemoryai/supermemory-mcp
   - tool_name: addToSupermemory
   - arguments: 
     thingToRemember: "[Attrition MD] docs/new-feature.md: Game mechanics documentation for new fleet combat system. Covers damage calculations, formation bonuses, and AI behavior patterns. Links to energy-budget-consistency.md for resource management."
   ```

## SuperMemory Content Tagging

**Standard Tags for Project Organization:**
- `[Attrition MD]` - All markdown files
- `[Attrition Rules]` - .clinerules files
- `[Attrition Docs]` - Documentation files
- `[Attrition Memory]` - memory-bank files
- `[Attrition Code]` - Technical implementation notes

## Backfill Protocol

For existing MD files not yet in SuperMemory:

1. **Scan for existing MD files**: Use `search_files` with pattern `*.md`
2. **Prioritize by importance**:
   - Game Mechanics and Rules.md (highest priority)
   - All .clinerules files
   - README.md and achievements.md
   - docs/ directory files
   - memory-bank/ files
3. **Batch ingest** with appropriate summaries and cross-references

## Error Handling

If SuperMemory MCP ingestion fails:
1. **Try Node.js tool fallback**: Use `node tools/supermemory-ingest.mjs add --content "..."` 
2. **Log the failure** but continue with the primary task
3. **Queue for retry** in next session
4. **Use fallback**: Add note to memory-bank/raw_reflection_log.md
5. **Never block** primary task completion due to SuperMemory issues

### Node.js Tool Fallback Method

When MCP server times out, use the reliable Node.js tool:

```bash
# PowerShell-safe command (set API key and run):
$env:SUPERMEMORY_API_KEY="your_api_key_here"; node tools/supermemory-ingest.mjs add --content "[Attrition MD] filename.md: summary of content"

# Dry run first to test:
$env:SUPERMEMORY_API_KEY="your_api_key_here"; node tools/supermemory-ingest.mjs add --content "test content" --dry-run
```

**API Key Setup:**
- Set `SUPERMEMORY_API_KEY` environment variable
- Never commit the API key to repository
- Use out-of-band secure sharing for credentials

## Query Before Create

Before implementing new features or solving problems:
1. **Search SuperMemory first**: Use the `search` tool to find relevant prior work
2. **Check for existing patterns**: Look for similar implementations or solutions
3. **Leverage accumulated knowledge**: Build on previous insights and decisions

## Implementation Rules

### MANDATORY Actions:
- **MUST** ingest every new MD file immediately after creation
- **MUST** ingest significant MD file updates (>100 character changes)
- **MUST** use standardized tagging format for organization
- **MUST** include file relationships and cross-references in summaries

### SHOULD Actions:
- **SHOULD** search SuperMemory before implementing new MD documentation
- **SHOULD** include context about why the file was created
- **SHOULD** reference related files and project components
- **SHOULD** maintain consistent summary format across ingestions

### MAY Actions:
- **MAY** batch multiple small changes for single ingestion
- **MAY** skip trivial formatting-only changes
- **MAY** include code snippets in summaries when relevant

## Success Metrics

A successful SuperMemory integration should achieve:
- ✅ Every created MD file automatically ingested
- ✅ Searchable project knowledge base maintained
- ✅ Cross-session knowledge retention improved
- ✅ Reduced redundant project exploration
- ✅ Enhanced decision-making through accumulated insights

## Monitoring and Maintenance

### Weekly Review (Optional):
- Query SuperMemory for recent Attrition entries
- Verify coverage of all important MD files
- Clean up duplicate or outdated entries
- Identify gaps in documentation coverage

### Quality Assurance:
- Summaries should be concise but informative
- Tags should be consistent across all entries
- Cross-references should be maintained
- Content should be searchable and actionable

## Override Conditions

This automation may be temporarily disabled by explicit user request:
- User explicitly states "don't add to SuperMemory"
- User requests "local only" documentation
- Temporary debugging or experimental files

## Integration with Existing Rules

This rule works in conjunction with:
- **Baby Steps™**: Each MD file is a discrete step worthy of knowledge retention
- **Self-Improving Cline**: SuperMemory supports continuous improvement through knowledge accumulation
- **Social Media**: Achievements and project milestones in MD files can inform hype posts
- **Continuous Improvement**: SuperMemory provides data for refining processes and rules

## Critical Success Factor

**The key to success is CONSISTENCY**: Every MD file operation must be followed by SuperMemory ingestion. This builds a comprehensive, searchable knowledge base that enhances project continuity across all sessions.
