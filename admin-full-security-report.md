# WeHealthToday Security Assessment: Full Endpoint & Admin Review (2026-03-04)

**Target:** yes.wehealthtoday.com / api.wehealthtoday.com  
**Assessment Date:** 2026-03-04  
**Assessor:** Security Review

---

## Executive Summary

A comprehensive penetration test of WeHealthToday’s authentication and API endpoints reveals total system compromise is possible—both as a regular user and as admin. There is no real access control: demo, admin, and other user credentials all result in unrestricted access to every user and most administrative functions. This exposes all user data, login credentials, password hashes, and allows modification of every account in the database. Multiple critical vulnerabilities, including authentication bypass, IDOR, data leaks, and severe credential hygiene failures, undermine any expectation of confidentiality or integrity.

---

## Critical Findings

### 1. Authentication Controls Are Broken

- **No effective reCAPTCHA:** The login endpoint only checks if a captchaToken field exists and does not validate tokens with Google. Bypass is trivial.
- **Weak or no rate limiting:** Attackers can brute-force user credentials rapidly, even ignoring temporary ban after numerous failed attempts (per-identifier rather than per-IP, easily bypassed).
- **User enumeration:** The API provides distinct error messages for invalid/valid identifiers, facilitating targeted attacks.

### 2. Poor Credential Hygiene
- **Default/reused passwords:** All demo accounts and the main admin account use the same weak password ("test123"), immediately compromisable by dictionary attack.
- **No password strength requirements evident.**

### 3. Critical IDOR and Data Exposure Across All Endpoints
- **/api/users [GET]:** Reveals all user profile info (email, role, full PII, password hashes) for every user in the system.
- **/api/users/:id [GET]:** Allows viewing any individual user, including admin, and exposes password hashes.
- **/api/users/:id [PUT]:** Permits modifying any user, including privilege escalation or targeted sabotage.
- **Admin endpoints (/api/admin/doctors, etc):** Accessible by all users—no differentiation between admin and normal user sessions.
- **/api/sse/stats:** Exposes system/server metrics to all users.

### 4. Password Hash Exposure & Cracking Risk
- **All profile and list endpoints leak bcrypt hashes for every user.**
- **Hashes are immediately crackable due to weak, reused passwords.**

### 5. Stored XSS and Injection Risks
- **User profiles in the database hold stored XSS (`<img src=x>`) and SQL injection payloads,** indicating no input validation or sanitization on name/email fields.
- **Example:**
```json
{
  "firstName": "<img src=x>",
  "email": "' or '1'='1@evil.com"
}
```

### 6. Privilege Escalation
- **Any authenticated user, regardless of role, can assume admin capabilities by modifying their own or any other user's role field—there is no authorization enforcement.**

---

## Example Exploitation Workflow

```
# Login as any user (admin or demo)
curl -X POST 'https://api.wehealthtoday.com/api/auth-endpoints/login' \
  -H 'Content-Type: application/json' \
  --data-raw '{"identifier": "demo1@gmail.com", "password": "test123", "captchaToken": "03AHJFsute9gkW4X7MAQfF-ESFgL4r"}'
# Response contains JWT. Use it for all proofs below.

# Get all users (full PII and hashes)
curl -X GET 'https://api.wehealthtoday.com/api/users' -H "Authorization: Bearer $JWT"

# Get/modify any user (IDOR)
curl -X GET  'https://api.wehealthtoday.com/api/users/103' -H "Authorization: Bearer $JWT"
curl -X PUT  'https://api.wehealthtoday.com/api/users/103' -H "Authorization: Bearer $JWT" -H 'Content-Type: application/json' --data-raw '{"firstName":"pwned"}'

# View all doctors (supposedly admin-only)
curl -X GET 'https://api.wehealthtoday.com/api/admin/doctors' -H "Authorization: Bearer $JWT"

# View system stats
curl -X GET 'https://api.wehealthtoday.com/api/sse/stats' -H "Authorization: Bearer $JWT"
```

---

## Recommendations

1. **Implement proper, server-side reCAPTCHA and password strength validation.**
2. **Enforce IP-wide rate limiting and account lockout after repeated failed logins.**
3. **Correct user enumeration, providing generic error messages for failed login attempts.**
4. **Segregate regular, demo, and admin users—enforce role-based access at every API layer.**
5. **Never expose password hashes or sensitive data fields in any API response.**
6. **Harden endpoints against IDOR—always check that authenticated users are only accessing/modifying their own data except with explicit, validated admin intent.**
7. **Sanitize all input to prevent stored XSS/injection.**
8. **Perform credential hygiene: force password change for demo/admins, check for reuse, require strong passwords.**
9. **Thoroughly audit all endpoint access controls, including for all /admin/* and /sse/* endpoints.**

---

## Final Notes
- As of this assessment date, compromise of any WeHealthToday user or admin account gives immediate full access to all critical medical records and user PII in the database.
- Every listed vulnerability is directly and simply exploitable with public tools and wordlists.
- These issues require urgent, systematic remediation to restore minimal levels of security and privacy for patients and staff.
