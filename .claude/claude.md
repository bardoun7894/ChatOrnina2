# Claude Code Assistant - Project Rules

## History Documentation Rules

### When to Create History Documentation

Create a new markdown file in `.history/` folder in the following situations:

1. **After every successful feature implementation**
2. **After every bug fix or issue resolution**
3. **When user says "good" or confirms something is working**
4. **When user responds positively without explicit feedback**
5. **After every change or improvement made to the codebase**
6. **At the end of every session or when context is getting full**

### History File Naming Convention

Format: `YYYY-MM-DD-brief-description.md`

Examples:
- `2025-10-29-voice-input-code-blocks.md`
- `2025-10-29-rtl-fixes.md`
- `2025-10-30-dashboard-improvements.md`

### Required Sections in History Files

Each history file MUST include:

```markdown
# Session YYYY-MM-DD: Title

## Date: Full Date

## Summary
Brief 1-2 sentence summary of what was accomplished.

---

## Features Implemented

### 1. Feature Name ✅

**Problem**: Description of the problem or requirement

**Solution**: How it was solved

**Files Modified**:
- List of files with line numbers

**Code Example**: (if applicable)
```typescript
// Key code snippets
```

**Result**: What the outcome was

---

## Bug Fixes

### 1. Bug Description
**Error**: Error message or symptoms
**Solution**: How it was fixed
**Files Affected**: List of files
**Result**: Confirmation it's working

---

## Technical Details

### Models Used
- List of AI models/APIs used

### Dependencies Added
- List of new packages

---

## Files Modified

Comprehensive list with line numbers

---

## Testing Instructions

How to test the changes

---

## Known Issues

### Resolved:
- ✅ List resolved issues

### Outstanding:
- List any remaining issues

---

## Git Commit Message

Suggested commit message

---

## User Confirmation

**Status**: ✅ or ⏳
**Confirmed By**: User name or "awaiting confirmation"
**Date**: YYYY-MM-DD
```

### Auto-Save Triggers

Save history documentation automatically when:

1. **User says**: "good", "perfect", "works", "thanks", "ok", "done"
2. **User confirms indirectly**: By moving to next request without reporting issues
3. **Feature completion**: When all todo items are marked complete
4. **Session end**: When user says "bye" or context is almost full
5. **After every commit**: Document what was committed

### Git Integration

After creating history file:

1. **Stage the history file**:
   ```bash
   git add .history/YYYY-MM-DD-description.md
   ```

2. **Commit with the changes**:
   ```bash
   git add .
   git commit -m "feat: Brief description

   Detailed description of changes made

   - List of key changes
   - Files modified
   - Features added

   📚 Documented in .history/YYYY-MM-DD-description.md"
   ```

3. **Only push if user explicitly requests it**

### Example Workflow

```
User: "The voice input is working great!"

Assistant Actions:
1. Create .history/2025-10-29-voice-input.md with full documentation
2. git add .history/2025-10-29-voice-input.md
3. git add . (all other changes)
4. git commit -m "feat: Add voice input with Whisper API..."
5. Inform user: "✅ Changes documented and committed"
```

---

## Code Quality Rules

1. **Always use TypeScript** strict mode when possible
2. **Error handling**: Always include try-catch blocks
3. **Comments**: Add comments for complex logic
4. **File organization**: Keep related code together
5. **Naming conventions**: Use clear, descriptive names

---

## Project-Specific Guidelines

### OrninaChat Application

**Tech Stack**:
- Next.js 16.0.1 (Turbopack)
- React 19.2.0
- TypeScript
- MongoDB
- NextAuth.js
- Tailwind CSS

**AI Services**:
- OpenAI GPT-4o (chat/code)
- OpenAI Whisper (speech-to-text)
- Midjourney v7 via Kie.ai (images)
- Sora 2 via Kie.ai (videos)

**Key Files**:
- Chat UI: `/src/components/HomeChat/Chat.tsx`
- API Backend: `/src/pages/api/homechat.ts`
- Main Page: `/src/pages/home-chat.tsx`
- Conversations API: `/src/pages/api/conversations/`

**Port**: 7000

**Languages Supported**: Arabic (RTL), English (LTR)

---

## Commit Message Format

Use conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Maintenance tasks

Example:
```
feat(voice-input): Add Whisper API speech-to-text

- Implement voice recording with MediaRecorder API
- Integrate OpenAI Whisper for transcription
- Support Arabic and English auto-detection
- Add visual feedback during recording

Closes #123
📚 Documented in .history/2025-10-29-voice-input.md
```

---

## Response Format Rules

1. **Always show progress** using TodoWrite tool for multi-step tasks
2. **Provide context** when making changes
3. **Explain errors** clearly with solutions
4. **Ask for confirmation** before destructive operations
5. **Document as you go** - create history files immediately when user confirms

---

## Emergency Procedures

### If Build Fails:
```bash
rm -rf .next
rm -rf node_modules/.cache
npm run dev
```

### If Dependencies Break:
```bash
rm -rf node_modules
rm package-lock.json
npm install --legacy-peer-deps
```

### If Database Issues:
Check MongoDB connection in `.env` file

---

*Last Updated: 2025-10-29*
*Version: 1.0*
