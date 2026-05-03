# Testing Guide - IBM Cloud Migration

## 🚨 Prerequisites Required

Before testing, you need to install the following tools on your Windows system:

### 1. **Node.js & npm** (Required)

**Download & Install:**
- Visit: https://nodejs.org/
- Download: LTS version (recommended)
- Run installer and follow prompts
- Verify installation:
  ```powershell
  node --version
  npm --version
  ```

**Alternative: Use Bun (faster)**
- Visit: https://bun.sh/
- Download Windows installer
- Verify: `bun --version`

---

## 📋 Testing Checklist

### Phase 1: Local Setup ✅

#### Step 1: Install Dependencies
```powershell
# Using npm
npm install

# OR using bun
bun install
```

**Expected Output:**
- ✅ `pg` installed
- ✅ `bcrypt` installed
- ✅ `@types/pg` installed
- ✅ `@types/bcrypt` installed
- ✅ `ibm-cos-sdk` already installed

#### Step 2: Verify TypeScript Compilation
```powershell
# Check for TypeScript errors
npx tsc --noEmit
```

**Expected:** No errors (or only pre-existing Vite errors)

---

### Phase 2: IBM Cloud Services Setup 🔧

You need to create IBM Cloud services before testing. Follow these steps:

#### Step 1: Create IBM Cloud Account
1. Go to: https://cloud.ibm.com/registration
2. Sign up (free tier available)
3. Verify email

#### Step 2: Install IBM Cloud CLI
```powershell
# Download from: https://cloud.ibm.com/docs/cli
# Or use installer: https://clis.cloud.ibm.com/install/win

# Verify installation
ibmcloud --version

# Login
ibmcloud login
```

#### Step 3: Create PostgreSQL Database
```powershell
# Install database plugin
ibmcloud plugin install cloud-databases

# Create PostgreSQL instance (takes 5-10 minutes)
ibmcloud resource service-instance-create albert-postgres `
  databases-for-postgresql `
  standard `
  us-south `
  -p '{\"members_memory_allocation_mb\": \"4096\", \"members_disk_allocation_mb\": \"20480\"}'

# Create credentials
ibmcloud resource service-key-create albert-postgres-credentials `
  Manager `
  --instance-name albert-postgres

# Get connection details (save these!)
ibmcloud resource service-key albert-postgres-credentials --output json
```

**Save from output:**
- `connection.postgres.composed[0]` → Connection string
- `connection.postgres.certificate.certificate_base64` → SSL certificate

#### Step 4: Create Object Storage (Already Done ✅)
You already have IBM COS configured. Skip this step.

---

### Phase 3: Environment Configuration 🔐

#### Step 1: Create .env File
```powershell
# Copy example
Copy-Item .env.example .env

# Edit .env with your credentials
notepad .env
```

#### Step 2: Fill in Required Variables

**Minimum Required for Testing:**
```env
# IBM Databases for PostgreSQL
IBM_DB_CONNECTION_STRING=postgresql://user:password@host:port/ibmclouddb?sslmode=require
IBM_DB_CA_CERT=base64_encoded_certificate_here

# Admin credentials
ADMIN_EMAIL=admin@albert.com
ADMIN_PASSWORD=YourSecurePassword123!

# Optional: watsonx.ai (for full testing)
WATSONX_API_KEY=your_api_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com

# Optional: IBM COS (for full testing)
IBM_COS_API_KEY=your_api_key
IBM_COS_INSTANCE_ID=your_instance_id
IBM_COS_ENDPOINT=s3.us-south.cloud-object-storage.appdomain.cloud
IBM_COS_BUCKET=albert-papers
```

---

### Phase 4: Database Testing 🗄️

#### Test 1: Connection Test
```powershell
npm run db:test
```

**Expected Output:**
```
🧪 Database Connection Test
═══════════════════════════════════════
✅ Connected successfully! (XXXms)
📊 Database Information:
  Version: PostgreSQL 15.x
  Database: ibmclouddb
  User: ibm_cloud_xxx
✅ Found X tables
🎉 All tests passed!
```

#### Test 2: Run Migrations
```powershell
npm run db:migrate
```

**Expected Output:**
```
🚀 Starting database migration...
✅ Connected successfully!
⚙️  Running migration...
✅ Migration completed successfully!
📊 Created tables:
  ✓ profiles
  ✓ sessions
  ✓ otp_codes
  ✓ papers
  ✓ chat_messages
  ✓ paper_chunks
🎉 Database migration complete!
```

#### Test 3: Initialize Admin User
```powershell
npm run db:init-admin
```

**Expected Output:**
```
🔐 Admin User Initialization
⚙️  Creating admin user...
✅ Admin user created successfully!
📊 Admin User Details:
  Email: admin@albert.com
  Name: Admin
  Admin: true
🎉 Admin initialization complete!
```

---

### Phase 5: Application Testing 🚀

#### Test 1: Build Application
```powershell
npm run build
```

**Expected:** Build completes without errors

#### Test 2: Start Development Server
```powershell
npm run dev
```

**Expected:**
- Server starts on http://localhost:5173
- No connection errors
- Can access login page

#### Test 3: Test Authentication

**Admin Login:**
1. Go to http://localhost:5173/login
2. Enter: `admin@albert.com`
3. Enter: Your admin password
4. Should redirect to dashboard

**OTP Login (New User):**
1. Go to http://localhost:5173/login
2. Enter: `test@example.com`
3. Check console logs for OTP code
4. Enter OTP code
5. Should create account and login

---

### Phase 6: Feature Testing 🎯

#### Test Task 1: Auto-fill Research Database
1. Login as admin
2. Upload a PDF paper
3. Wait for watsonx.ai analysis
4. Verify 6 fields populated:
   - ✅ Relevance Score
   - ✅ Research Alignment
   - ✅ Key Findings
   - ✅ Methodology Summary
   - ✅ Limitations
   - ✅ Future Directions

#### Test Task 2: In-card "Ask Bob"
1. Click "Ask Bob" on a paper card
2. Type a question
3. Verify response uses 3 chunks
4. Check response quality

#### Test Task 3: "Talk with Albert"
1. Open Albert Assistant panel
2. Ask a question across papers
3. Verify context from multiple papers
4. Check conversation history

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'pg'"
**Solution:** Run `npm install` first

### Issue: "IBM_DB_CONNECTION_STRING not set"
**Solution:** Create and configure .env file

### Issue: "Connection refused"
**Solution:** 
- Check PostgreSQL instance is running
- Verify connection string
- Check firewall settings

### Issue: "SSL certificate error"
**Solution:**
- Verify IBM_DB_CA_CERT is base64 encoded
- Check certificate is complete (no line breaks)

### Issue: "Admin user already exists"
**Solution:** 
- Use update option in init-admin script
- Or manually update password in database

---

## 📊 Test Results Template

Use this template to document your test results:

```markdown
# Test Results - [Date]

## Environment
- Node.js: [version]
- npm: [version]
- OS: Windows 11

## Phase 1: Local Setup
- [ ] Dependencies installed
- [ ] TypeScript compiles

## Phase 2: IBM Services
- [ ] PostgreSQL created
- [ ] Credentials obtained
- [ ] COS configured

## Phase 3: Configuration
- [ ] .env file created
- [ ] All variables set

## Phase 4: Database
- [ ] Connection test passed
- [ ] Migrations successful
- [ ] Admin initialized

## Phase 5: Application
- [ ] Build successful
- [ ] Dev server starts
- [ ] Login page accessible

## Phase 6: Features
- [ ] Task 1: Auto-fill works
- [ ] Task 2: Ask Bob works
- [ ] Task 3: Talk with Albert works

## Issues Found
[List any issues]

## Notes
[Additional observations]
```

---

## 🎯 Quick Start (If Everything is Ready)

If you already have Node.js and IBM services set up:

```powershell
# 1. Install dependencies
npm install

# 2. Configure environment
Copy-Item .env.example .env
# Edit .env with your credentials

# 3. Setup database
npm run db:test        # Test connection
npm run db:migrate     # Run migrations
npm run db:init-admin  # Create admin user

# 4. Start application
npm run dev

# 5. Test in browser
# Go to http://localhost:5173
```

---

## 📞 Need Help?

### Documentation
- **IBM_DEPLOYMENT_GUIDE.md** - Full deployment guide
- **IBM_MIGRATION_COMPLETE.md** - Implementation summary
- **FULL_IBM_MIGRATION_GUIDE.md** - Migration strategy

### Common Commands
```powershell
# Check what's installed
node --version
npm --version
ibmcloud --version

# View logs
npm run dev  # Check console output

# Database operations
npm run db:test        # Test connection
npm run db:migrate     # Run migrations
npm run db:init-admin  # Initialize admin

# Build and deploy
npm run build          # Build for production
npm run deploy:setup   # Setup Code Engine secrets
npm run deploy         # Deploy to IBM Cloud
```

---

## ✅ Success Criteria

Your testing is successful when:

1. ✅ All dependencies installed without errors
2. ✅ Database connection test passes
3. ✅ Migrations complete successfully
4. ✅ Admin user created
5. ✅ Application builds without errors
6. ✅ Dev server starts and is accessible
7. ✅ Can login with admin credentials
8. ✅ Can upload and analyze papers (Task 1)
9. ✅ Ask Bob feature works (Task 2)
10. ✅ Talk with Albert works (Task 3)

---

**Ready to start? Install Node.js first, then follow Phase 1!** 🚀