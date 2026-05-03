# Complete IBM Cloud Migration Guide
## Replace Lovable Cloud + Supabase with 100% IBM Stack

---

## 🎯 Migration Goals

1. ✅ Replace Lovable Cloud → **IBM Cloud Code Engine**
2. ✅ Replace Supabase Database → **IBM Cloud Databases for PostgreSQL**
3. ✅ Replace Supabase Auth → **IBM App ID with OTP**
4. ✅ Keep existing admin credentials: `admin@albert.com`
5. ✅ Implement numeric OTP for new users

---

## 📊 Migration Overview

| Component | Current | Target | Status |
|-----------|---------|--------|--------|
| **AI** | IBM watsonx.ai | IBM watsonx.ai | ✅ Done |
| **Storage** | localStorage | IBM Cloud Object Storage | ✅ Done |
| **Database** | Supabase PostgreSQL | IBM Databases for PostgreSQL | ⏳ To Do |
| **Auth** | Supabase Auth | IBM App ID | ⏳ To Do |
| **Hosting** | Lovable Cloud | IBM Code Engine | ⏳ To Do |
| **Secrets** | Lovable Env Vars | IBM Secrets Manager | ⏳ To Do |

---

## ⚠️ IMPORTANT: Migration Order

**DO NOT skip steps or change order!**

1. **Phase 1:** Set up IBM Databases (database first!)
2. **Phase 2:** Migrate data from Supabase
3. **Phase 3:** Set up IBM App ID
4. **Phase 4:** Update application code
5. **Phase 5:** Deploy to IBM Code Engine
6. **Phase 6:** Test and verify

---

## 📋 Phase 1: IBM Databases for PostgreSQL Setup

### Step 1.1: Create Database Instance

```bash
# Login to IBM Cloud
ibmcloud login --sso

# Target resource group
ibmcloud target -g Default

# Create PostgreSQL instance (Standard plan)
ibmcloud resource service-instance-create albert-db \
  databases-for-postgresql standard us-south \
  -p '{
    "members_memory_allocation_mb": "4096",
    "members_disk_allocation_mb": "20480",
    "members_cpu_allocation_count": "3",
    "version": "15"
  }'

# Wait for provisioning (takes 5-10 minutes)
ibmcloud resource service-instance albert-db
```

### Step 1.2: Create Service Credentials

```bash
# Create credentials with admin access
ibmcloud resource service-key-create albert-db-admin \
  Administrator \
  --instance-name albert-db

# Get connection details
ibmcloud resource service-key albert-db-admin --output json > db-credentials.json
```

### Step 1.3: Extract Connection String

From `db-credentials.json`, find:

```json
{
  "connection": {
    "postgres": {
      "composed": [
        "postgres://ibm_cloud_xxx:password@host:port/ibmclouddb?sslmode=verify-full"
      ],
      "certificate": {
        "certificate_base64": "LS0tLS1CRUdJTi..."
      }
    }
  }
}
```

Save to `.env`:
```bash
IBM_DB_CONNECTION_STRING=postgres://ibm_cloud_xxx:password@host:port/ibmclouddb?sslmode=verify-full
IBM_DB_CA_CERT=<certificate_base64_content>
```

### Step 1.4: Create Database Schema

```sql
-- Connect to IBM PostgreSQL
psql "$IBM_DB_CONNECTION_STRING"

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- For admin@albert.com
  name TEXT,
  onboarded BOOLEAN DEFAULT FALSE,
  research_context JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create papers table (replacing localStorage)
CREATE TABLE papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_key TEXT NOT NULL, -- IBM COS key
  page_count INTEGER,
  uploaded_at BIGINT NOT NULL,
  analyzing BOOLEAN DEFAULT FALSE,
  
  -- Full text and chunks (for search)
  full_text TEXT,
  chunks TEXT[],
  
  -- AI analysis results
  tags TEXT[],
  relevance_score INTEGER,
  excerpt TEXT,
  keywords TEXT[],
  
  -- Research record
  research_record JSONB,
  
  -- Metadata
  source_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  ts BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create OTP codes table (for IBM App ID integration)
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_papers_user_id ON papers(user_id);
CREATE INDEX idx_papers_uploaded_at ON papers(uploaded_at DESC);
CREATE INDEX idx_chat_messages_paper_id ON chat_messages(paper_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_otp_codes_email ON otp_codes(email);
CREATE INDEX idx_otp_codes_expires_at ON otp_codes(expires_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_papers_updated_at BEFORE UPDATE ON papers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 1.5: Insert Admin User

```sql
-- Insert admin@albert.com with hashed password
-- Password: Use bcrypt to hash the current password
INSERT INTO profiles (email, password_hash, name, onboarded)
VALUES (
  'admin@albert.com',
  '$2b$10$<bcrypt_hash_of_password>', -- Replace with actual hash
  'Admin User',
  TRUE
);
```

**To generate password hash:**
```javascript
// Run this in Node.js
const bcrypt = require('bcrypt');
const password = 'your-current-password';
const hash = await bcrypt.hash(password, 10);
console.log(hash);
```

---

## 📋 Phase 2: Data Migration from Supabase

### Step 2.1: Export Data from Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Export profiles
supabase db dump --data-only --table profiles > supabase_profiles.sql

# Export any other tables you have
```

### Step 2.2: Transform and Import to IBM

```sql
-- Connect to IBM PostgreSQL
psql "$IBM_DB_CONNECTION_STRING"

-- Import profiles (adjust as needed)
\i supabase_profiles.sql

-- Verify data
SELECT COUNT(*) FROM profiles;
SELECT * FROM profiles WHERE email = 'admin@albert.com';
```

---

## 📋 Phase 3: IBM App ID Setup

### Step 3.1: Create IBM App ID Instance

```bash
# Create App ID instance
ibmcloud resource service-instance-create albert-appid \
  appid lite us-south

# Create service credentials
ibmcloud resource service-key-create albert-appid-key \
  Manager \
  --instance-name albert-appid

# Get credentials
ibmcloud resource service-key albert-appid-key --output json > appid-credentials.json
```

### Step 3.2: Configure Email Provider

1. Go to IBM Cloud Console → App ID instance
2. Navigate to "Manage Authentication" → "Email"
3. Enable "Email and Password"
4. Configure email templates:
   - **OTP Email Template:**
   ```html
   <h2>Your Albert Verification Code</h2>
   <p>Your verification code is: <strong>{{code}}</strong></p>
   <p>This code expires in 10 minutes.</p>
   ```

### Step 3.3: Configure OTP Settings

```bash
# Via IBM Cloud CLI or API
# Set OTP expiration to 10 minutes
# Set OTP length to 6 digits
# Enable numeric-only codes
```

---

## 📋 Phase 4: Update Application Code

### Step 4.1: Install Dependencies

```bash
npm install pg bcrypt ibmcloud-appid
# or
bun add pg bcrypt ibmcloud-appid
```

### Step 4.2: Create Database Client

Create `src/integrations/ibm-db/client.ts`:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.IBM_DB_CONNECTION_STRING!,
  ssl: {
    rejectUnauthorized: false,
    ca: Buffer.from(process.env.IBM_DB_CA_CERT!, 'base64').toString('utf-8')
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const db = {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
};

export default db;
```

### Step 4.3: Create Auth Functions

Create `src/lib/ibm-auth.ts`:

```typescript
import bcrypt from 'bcrypt';
import db from '@/integrations/ibm-db/client';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via email (integrate with IBM App ID or SendGrid)
async function sendOTP(email: string, code: string) {
  // TODO: Integrate with IBM App ID email service
  console.log(`OTP for ${email}: ${code}`);
  // In production, use IBM App ID's email service
}

// Sign in with email (sends OTP)
export const signInWithEmail = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    try {
      const { email } = data;
      
      // Check if user exists
      const result = await db.query(
        'SELECT id FROM profiles WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return { success: false, error: 'User not found. Please sign up first.' };
      }
      
      // Generate OTP
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Store OTP in database
      await db.query(
        `INSERT INTO otp_codes (email, code, expires_at)
         VALUES ($1, $2, $3)`,
        [email, code, expiresAt]
      );
      
      // Send OTP via email
      await sendOTP(email, code);
      
      return { success: true, message: 'OTP sent to your email' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Failed to send OTP' };
    }
  });

// Verify OTP and create session
export const verifyOTP = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    email: z.string().email(),
    code: z.string().length(6)
  }))
  .handler(async ({ data }) => {
    try {
      const { email, code } = data;
      
      // Find valid OTP
      const result = await db.query(
        `SELECT id FROM otp_codes
         WHERE email = $1 AND code = $2 AND expires_at > NOW() AND used = FALSE
         ORDER BY created_at DESC LIMIT 1`,
        [email, code]
      );
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Invalid or expired OTP' };
      }
      
      // Mark OTP as used
      await db.query(
        'UPDATE otp_codes SET used = TRUE WHERE id = $1',
        [result.rows[0].id]
      );
      
      // Get user profile
      const userResult = await db.query(
        'SELECT id, email, name, onboarded, research_context FROM profiles WHERE email = $1',
        [email]
      );
      
      const user = userResult.rows[0];
      
      // Create session token (use JWT or similar)
      const sessionToken = generateSessionToken(user);
      
      return {
        success: true,
        user,
        sessionToken
      };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { success: false, error: 'Failed to verify OTP' };
    }
  });

// Sign up new user
export const signUpWithEmail = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    email: z.string().email(),
    name: z.string().min(1)
  }))
  .handler(async ({ data }) => {
    try {
      const { email, name } = data;
      
      // Check if user already exists
      const existing = await db.query(
        'SELECT id FROM profiles WHERE email = $1',
        [email]
      );
      
      if (existing.rows.length > 0) {
        return { success: false, error: 'User already exists. Please sign in.' };
      }
      
      // Create new user
      await db.query(
        'INSERT INTO profiles (email, name) VALUES ($1, $2)',
        [email, name]
      );
      
      // Generate and send OTP
      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      await db.query(
        'INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, $3)',
        [email, code, expiresAt]
      );
      
      await sendOTP(email, code);
      
      return { success: true, message: 'Account created. OTP sent to your email.' };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'Failed to create account' };
    }
  });

// Admin login with password (for admin@albert.com)
export const adminLogin = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    email: z.string().email(),
    password: z.string()
  }))
  .handler(async ({ data }) => {
    try {
      const { email, password } = data;
      
      // Only allow admin email
      if (email !== 'admin@albert.com') {
        return { success: false, error: 'Admin login only' };
      }
      
      // Get user with password hash
      const result = await db.query(
        'SELECT id, email, name, password_hash, onboarded, research_context FROM profiles WHERE email = $1',
        [email]
      );
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Invalid credentials' };
      }
      
      const user = result.rows[0];
      
      // Verify password
      const valid = await bcrypt.compare(password, user.password_hash);
      
      if (!valid) {
        return { success: false, error: 'Invalid credentials' };
      }
      
      // Create session token
      const sessionToken = generateSessionToken(user);
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          onboarded: user.onboarded,
          research_context: user.research_context
        },
        sessionToken
      };
    } catch (error) {
      console.error('Admin login error:', error);
      return { success: false, error: 'Failed to login' };
    }
  });

function generateSessionToken(user: any): string {
  // TODO: Implement JWT token generation
  // For now, return a simple token
  return Buffer.from(JSON.stringify({
    userId: user.id,
    email: user.email,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  })).toString('base64');
}
```

### Step 4.4: Update Store to Use Database

Update `src/lib/store.ts` to use IBM PostgreSQL instead of localStorage.

---

## 📋 Phase 5: IBM Code Engine Deployment

### Step 5.1: Create Dockerfiles

**Frontend Dockerfile:**
```dockerfile
# Dockerfile.frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

**Backend Dockerfile:**
```dockerfile
# Dockerfile.backend
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Step 5.2: Deploy to Code Engine

```bash
# Create Code Engine project
ibmcloud ce project create --name albert-research

# Select project
ibmcloud ce project select --name albert-research

# Build and deploy frontend
ibmcloud ce application create \
  --name albert-frontend \
  --build-source . \
  --dockerfile Dockerfile.frontend \
  --port 8080 \
  --min-scale 1 \
  --max-scale 5

# Build and deploy backend
ibmcloud ce application create \
  --name albert-backend \
  --build-source . \
  --dockerfile Dockerfile.backend \
  --port 3000 \
  --min-scale 1 \
  --max-scale 10 \
  --env-from-secret albert-secrets

# Get URLs
ibmcloud ce application get --name albert-frontend
ibmcloud ce application get --name albert-backend
```

---

## 📋 Phase 6: Testing & Verification

### Test Checklist:

- [ ] Admin login works (admin@albert.com + password)
- [ ] New user signup works (email + OTP)
- [ ] OTP login works for existing users
- [ ] Papers upload to IBM COS
- [ ] Papers stored in IBM PostgreSQL
- [ ] All three tasks (1, 2, 3) still work
- [ ] watsonx.ai integration works
- [ ] Chat history persists
- [ ] Multi-device access works

---

## 💰 Final Cost Estimate

| Service | Monthly Cost |
|---------|--------------|
| IBM watsonx.ai | $10-50 |
| IBM Cloud Object Storage | $1-5 |
| IBM Databases for PostgreSQL | $30-100 |
| IBM App ID | Free-$5 |
| IBM Code Engine | $10-30 |
| IBM Secrets Manager | $5 |
| **TOTAL** | **$56-195/month** |

---

## 🎯 Final Architecture

```
100% IBM CLOUD STACK

┌─────────────────────────────────────────────────────────────┐
│              IBM CLOUD CODE ENGINE                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Frontend (Nginx + React)                              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Backend (Node.js + Express)                           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ IBM watsonx  │ │  IBM Cloud   │ │  IBM Cloud   │ │  IBM App ID  │
│     .ai      │ │  Databases   │ │   Object     │ │              │
│              │ │     for      │ │   Storage    │ │ • Email OTP  │
│ • Granite 3  │ │  PostgreSQL  │ │              │ │ • Admin pwd  │
│   8B         │ │              │ │ • PDF files  │ │ • Sessions   │
│ • Analysis   │ │ • Profiles   │ │ • User data  │ │              │
│ • Ask Bob    │ │ • Papers     │ │              │ │              │
│ • Albert     │ │ • Chat hist  │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**Total IBM Services: 5-6** ✅ **100% IBM Stack!**

---

## ⚠️ Important Notes

1. **Backup First:** Export all data from Supabase before migration
2. **Test Locally:** Test database connection and auth before deploying
3. **Gradual Migration:** Can run both systems in parallel during transition
4. **Admin Access:** Keep admin@albert.com credentials secure
5. **OTP Delivery:** Configure email service (SendGrid, IBM Email Service, etc.)

---

## 📞 Support

- IBM Cloud Docs: https://cloud.ibm.com/docs
- IBM Support: https://cloud.ibm.com/unifiedsupport/cases/form
- Community: https://community.ibm.com/community/user/cloud/home

---

This migration will take **2-3 days** to complete properly. Follow each phase carefully and test thoroughly before moving to the next phase.