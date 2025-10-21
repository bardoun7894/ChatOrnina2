# Ornina AI - Admin Login Credentials

## Date: October 21, 2025

---

## ✅ Admin Account Created Successfully

An administrator account has been created for Ornina AI platform.

### Login Credentials

- **Email:** `admin@ornina.ai`
- **Password:** `admin123`
- **Role:** ADMIN
- **Subscription Tier:** Pro
- **Email Status:** Verified

---

## How to Login

1. Navigate to: http://localhost:3090 (or your deployment URL)
2. Enter the email: **admin@ornina.ai**
3. Enter the password: **admin123**
4. Click "Continue"

---

## ⚠️ Important Security Notice

**PLEASE CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!**

The default password `admin123` is temporary and insecure. To change it:

1. Log in with the credentials above
2. Go to Settings > Account
3. Change your password to a strong, unique password
4. Save the changes

Recommended password requirements:
- At least 12 characters
- Mix of uppercase and lowercase letters
- Include numbers and special characters
- Don't use common words or patterns

---

## Account Features

As an **ADMIN** user, you have access to:

✅ **Full Platform Access**
- All AI services (Chat, Code Generation, Design Analysis, etc.)
- User management capabilities
- System administration features
- No usage quotas (Pro subscription)

✅ **Subscription Benefits**
- **Tier:** Pro (highest paid tier)
- **Status:** Active
- **Messages:** Unlimited
- **Images:** Unlimited
- **Videos:** Unlimited
- **Code Generations:** Unlimited
- **Design Analyses:** Unlimited

✅ **Admin Privileges**
- Create/manage users
- Configure system settings
- Access admin dashboard
- View system analytics
- Manage subscriptions

---

## User Management

To create additional users, you can:

### Option 1: Allow User Registration
Users can sign up at: http://localhost:3090/register
(Registration is currently enabled in the config)

### Option 2: Create Users Manually
Run the create user script:
```bash
cd /root/LibreChat
npm run create-user
```

### Option 3: Use the create-admin-user.js Script
Modify the script and run it again:
```bash
cd /root/LibreChat
# Edit create-admin-user.js to change email/password
node create-admin-user.js
```

---

## Troubleshooting

### Can't Login?
1. **Clear browser cache and cookies**
2. **Try in an incognito/private window**
3. **Verify servers are running:**
   ```bash
   ps aux | grep "node api/server"  # Backend should be running
   ps aux | grep "vite"              # Frontend should be running
   ```
4. **Check backend logs:**
   ```bash
   tail -50 /root/LibreChat/server-output.log
   ```

### "Email not verified" error?
The user was created with `emailVerified: true`, so this shouldn't happen. If it does, check the database.

### Password not working?
The password is: `admin123` (all lowercase, no spaces)
If still not working, recreate the user:
```bash
cd /root/LibreChat
node create-admin-user.js
```

---

## Database Information

- **MongoDB:** Running on localhost:27017
- **Database Name:** LibreChat
- **Collection:** users
- **User Count:** 1 (admin@ornina.ai)

---

## Next Steps

After logging in, you should:

1. ✅ **Change your password** (Settings > Account)
2. ✅ **Configure AI API keys** if not already set:
   - OpenAI API key for GPT, DALL-E, Whisper, TTS
   - Anthropic API key for Claude models
   - Google API key for Gemini models
   - Runway or Stability AI key for video generation
   - Stripe keys for billing (if using subscriptions)

3. ✅ **Test the platform features:**
   - Try the multi-language chat (Arabic/English)
   - Test code generation
   - Try design analysis
   - Test voice features

4. ✅ **Review security settings:**
   - Generate proper JWT secrets (currently using defaults)
   - Set up proper CREDS_KEY and CREDS_IV
   - Configure HTTPS for production

---

## Support

If you encounter any issues:

1. Check the logs:
   - Backend: `/root/LibreChat/server-output.log`
   - Frontend: `/root/LibreChat/frontend.log`

2. Verify services are running:
   ```bash
   curl http://localhost:3080/health  # Should return "OK"
   curl http://localhost:3090         # Should return HTML
   ```

3. Check the configuration:
   ```bash
   curl http://localhost:3080/api/config | jq .
   ```

---

## Summary

✅ Admin account created and ready to use
✅ Full access to all Ornina AI features
✅ Pro subscription tier (unlimited usage)
✅ Email verified

**Login now at:** http://localhost:3090

**Email:** admin@ornina.ai  
**Password:** admin123

**Remember to change the password after first login!**
