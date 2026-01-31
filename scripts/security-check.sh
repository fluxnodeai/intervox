#!/bin/bash

# ============================================
# INTERVOX Security Pre-Commit Check
# Run this before every git commit
# ============================================

echo "Running security checks..."
ERRORS=0

# Check 1: Verify .gitignore exists and has .env
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo "FAIL: .gitignore missing or doesn't contain .env"
    ERRORS=$((ERRORS + 1))
else
    echo "OK: .gitignore contains .env exclusion"
fi

# Check 2: Look for hardcoded API key patterns
echo "Scanning for hardcoded secrets..."

# Common API key patterns - search in source files
FOUND_SECRETS=0

# Check for sk- patterns (Anthropic, OpenAI style keys)
if grep -rn "sk-[a-zA-Z0-9]\{20,\}" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v node_modules | grep -v ".env" | grep -v "security-check" | head -3; then
    echo "POTENTIAL SECRET: Found sk- pattern"
    FOUND_SECRETS=$((FOUND_SECRETS + 1))
fi

# Check for xai- patterns (xAI keys)
if grep -rn "xai-[a-zA-Z0-9]\{20,\}" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v node_modules | grep -v ".env" | grep -v "security-check" | head -3; then
    echo "POTENTIAL SECRET: Found xai- pattern"
    FOUND_SECRETS=$((FOUND_SECRETS + 1))
fi

# Check for hardcoded Bearer tokens
if grep -rn "Bearer ['\"][a-zA-Z0-9_-]\{20,\}['\"]" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v node_modules | grep -v ".env" | grep -v "process.env" | grep -v "security-check" | head -3; then
    echo "POTENTIAL SECRET: Found hardcoded Bearer token"
    FOUND_SECRETS=$((FOUND_SECRETS + 1))
fi

if [ $FOUND_SECRETS -gt 0 ]; then
    ERRORS=$((ERRORS + FOUND_SECRETS))
fi

# Check 3: Ensure .env is not staged
if git diff --cached --name-only 2>/dev/null | grep -q "^\.env"; then
    echo "CRITICAL: .env is staged for commit! Run: git reset HEAD .env"
    ERRORS=$((ERRORS + 1))
else
    echo "OK: .env is not staged"
fi

# Check 4: Look for process.env usage (informational)
ENV_USAGE=$(grep -rn "process\.env\." --include="*.ts" --include="*.js" . 2>/dev/null | grep -v node_modules | wc -l)
echo "INFO: Found $ENV_USAGE references to process.env"

# Final result
echo ""
if [ $ERRORS -eq 0 ]; then
    echo "All security checks passed. Safe to commit."
    exit 0
else
    echo "$ERRORS security issue(s) found. Fix before committing."
    exit 1
fi
