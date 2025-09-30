# Systematic Debugging Workflow

A step-by-step approach for debugging complex application issues, especially when multiple layers (frontend, backend, database) are involved.

## Phase 1: Problem Definition & Isolation

### 1.1 Define the Problem Clearly
- **What exactly isn't working?** (specific feature, expected vs actual behavior)
- **What is working?** (helps isolate the scope)
- **When did it last work?** (recent changes, deployments)
- **What changed recently?** (code, config, environment)

### 1.2 Initial Hypothesis Generation
- List 3-5 potential causes (frontend bug, backend API, database, authentication, etc.)
- Rank by likelihood based on symptoms
- Note: Don't get attached to initial hypotheses - be ready to pivot

## Phase 2: Layer-by-Layer Verification

### 2.1 Database Layer (Bottom Up)
```bash
# Direct database queries to verify data exists
# Example: Check if fleet data exists at coordinate
SELECT * FROM fleets WHERE locationCoord = 'A00:00:12:02';
```

**Questions to answer:**
- Does the expected data exist in the database?
- Is the data in the correct format?
- Are there any obvious data corruption issues?

### 2.2 Backend API Layer
```bash
# Test API endpoints directly (curl, Postman, or custom debug tool)
curl -H "Authorization: Bearer <token>" \
     http://localhost:3001/api/game/fleets-overview?base=A00:00:12:02
```

**Questions to answer:**
- Does the API endpoint exist and respond?
- Is authentication working?
- Does the API return the expected data format?
- Are there any server-side errors?

### 2.3 Frontend Layer
- **Network Tab**: Check if API calls are being made
- **Console Logs**: Look for JavaScript errors
- **Authentication State**: Verify tokens/session data
- **Component State**: Check if data is being received but not displayed

## Phase 3: Authentication Deep Dive

*Authentication issues are common and can masquerade as data problems*

### 3.1 Token Verification
```javascript
// Check various possible token storage locations
localStorage.getItem('token')                    // Simple storage
localStorage.getItem('auth-token')               // Common alternative
sessionStorage.getItem('token')                 // Session storage

// Check complex auth stores
const authStore = JSON.parse(localStorage.getItem('auth-store'));
console.log(authStore?.state?.auth);

// Check application-specific stores
Object.keys(localStorage).filter(key => key.includes('auth'))
```

### 3.2 Authentication Flow Analysis
```javascript
// Look for token provider patterns
import { getToken } from './services/tokenProvider';
console.log('Token from provider:', getToken());

// Check how working components authenticate
// Search codebase for 'Authorization', 'Bearer', 'getToken'
```

## Phase 4: Create Isolation Tools

### 4.1 Debug Tool Template
Create simple HTML tools to test APIs independently:

```html
<!DOCTYPE html>
<html>
<head><title>API Debug Tool</title></head>
<body>
    <h1>API Debug Tool</h1>
    
    <div>
        <h3>Authentication Test</h3>
        <button onclick="testAuth()">Test Auth</button>
        <pre id="authResult"></pre>
    </div>
    
    <div>
        <h3>API Endpoint Test</h3>
        <input type="text" id="endpoint" placeholder="API endpoint">
        <button onclick="testEndpoint()">Test Endpoint</button>
        <pre id="endpointResult"></pre>
    </div>

    <script>
        function loadTokenFromLocalStorage() {
            // Try various token locations
            return localStorage.getItem('token') || 
                   getTokenFromComplexStore() || 
                   null;
        }

        async function testAuth() {
            // Test authentication independently
        }

        async function testEndpoint() {
            // Test specific API endpoint
        }
    </script>
</body>
</html>
```

### 4.2 Systematic Console Commands
```javascript
// Authentication Debugging Checklist
console.log("=== Authentication Debug ===");
console.log("Simple token:", localStorage.getItem('token'));
console.log("Storage keys:", Object.keys(localStorage));
console.log("Session keys:", Object.keys(sessionStorage));

// Check complex stores
Object.keys(localStorage)
  .filter(key => key.includes('auth') || key.includes('user'))
  .forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key));
      console.log(`${key}:`, data);
    } catch(e) {
      console.log(`${key}:`, localStorage.getItem(key));
    }
  });
```

## Phase 5: Root Cause Analysis

### 5.1 Compare Working vs Non-Working Components
- Find a component that successfully makes similar API calls
- Compare authentication methods
- Compare data handling patterns
- Look for differences in imports, token retrieval, etc.

### 5.2 Code Pattern Analysis
```bash
# Search for authentication patterns in codebase
grep -r "Authorization" src/
grep -r "getToken" src/
grep -r "Bearer" src/
```

## Phase 6: Solution Implementation

### 6.1 Minimal Viable Fix
- Implement the smallest change that addresses the root cause
- Avoid refactoring multiple things at once
- Test the fix in isolation

### 6.2 Verification Steps
1. **Direct test**: Does the specific issue work now?
2. **Regression test**: Do related features still work?
3. **Edge case test**: What happens with invalid data/auth?

## Phase 7: Documentation & Prevention

### 7.1 Document the Solution
- Root cause identified
- Why it was hard to find
- Solution implemented
- Prevention strategies

### 7.2 Improve Debugging Infrastructure
- Add better error messages
- Improve logging
- Create permanent debugging tools
- Update documentation

## Common Gotchas by Layer

### Database Layer
- Data exists but in unexpected format
- Queries working but returning empty results due to filtering
- Case sensitivity issues
- Date/time formatting issues

### Backend API Layer  
- Endpoint exists but requires authentication
- API returns 200 but with `success: false`
- CORS issues in development
- Different authentication between endpoints

### Frontend Layer
- Token stored in different location than expected
- Component not re-rendering after data fetch
- Race conditions in data loading
- Cached API responses

### Authentication Layer
- Multiple authentication systems in same app
- Tokens stored in memory vs localStorage
- Token format differences (simple string vs complex object)
- Authentication working but token retrieval method different

## Debugging Anti-Patterns to Avoid

❌ **Making multiple changes at once** - Makes it hard to identify what fixed the issue

❌ **Assuming the obvious cause** - Often the real issue is elsewhere

❌ **Skipping layers** - Always verify each layer systematically  

❌ **Not documenting findings** - Waste time re-discovering the same issues

❌ **Fighting symptoms instead of root cause** - Band-aid fixes that don't last

## Success Patterns

✅ **Bottom-up verification** - Start with data layer, work up

✅ **Isolation testing** - Test each component independently  

✅ **Comparative analysis** - Compare working vs broken components

✅ **Systematic elimination** - Rule out possibilities methodically

✅ **Tool creation** - Build debugging tools for complex systems

---

## Example: Fleet Loading Issue Case Study

**Problem**: Fleets not displaying in UI, but other data loads fine

**Layer-by-Layer Analysis**:
1. ✅ Database: Fleet data exists and is correct
2. ✅ Backend API: `/fleets-overview` endpoint works and returns data  
3. ❌ Frontend: API calls failing with 401 Unauthorized

**Root Cause Discovery**:
- Other components use `getToken()` from `tokenProvider.ts`
- Fleet component used `localStorage.getItem('token')` 
- App stores tokens in memory, not localStorage

**Solution**: Updated fleet component to use same authentication method as rest of app

**Key Lesson**: Authentication issues can masquerade as data problems. Always verify auth flow when API calls fail.