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

# Check for actual API key values (20+ chars after prefix)
SK_MATCHES=$(grep -rn 'sk-[a-zA-Z0-9]\{20,\}' --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v ".env" | grep -v "\.example" || true)
if [ -n "$SK_MATCHES" ]; then
    echo "POTENTIAL SECRET: Found sk- pattern"
    echo "$SK_MATCHES" | head -3
    ERRORS=$((ERRORS + 1))
fi

XAI_MATCHES=$(grep -rn 'xai-[a-zA-Z0-9]\{20,\}' --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v ".env" | grep -v "\.example" || true)
if [ -n "$XAI_MATCHES" ]; then
    echo "POTENTIAL SECRET: Found xai- pattern"
    echo "$XAI_MATCHES" | head -3
    ERRORS=$((ERRORS + 1))
fi

# Check for hardcoded string literals that look like API keys
BEARER_MATCHES=$(grep -rn "Authorization.*Bearer.*['\"][a-zA-Z0-9_-]\{30,\}['\"]" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v node_modules | grep -v "process.env" || true)
if [ -n "$BEARER_MATCHES" ]; then
    echo "POTENTIAL SECRET: Found hardcoded Bearer token"
    echo "$BEARER_MATCHES" | head -3
    ERRORS=$((ERRORS + 1))
fi

# Check 3: Ensure .env is not staged
if git diff --cached --name-only 2>/dev/null | grep -q "^\.env$"; then
    echo "CRITICAL: .env is staged for commit! Run: git reset HEAD .env"
    ERRORS=$((ERRORS + 1))
else
    echo "OK: .env is not staged"
fi

# Check 4: Look for process.env usage (informational)
ENV_USAGE=$(grep -rn "process\.env\." --include="*.ts" --include="*.js" . 2>/dev/null | grep -v node_modules | wc -l)
echo "INFO: Found $ENV_USAGE references to process.env (good - using env vars)"

# Final result
echo ""
if [ $ERRORS -eq 0 ]; then
    echo "All security checks passed. Safe to commit."
    exit 0
else
    echo "$ERRORS security issue(s) found. Fix before committing."
    exit 1
fi
