# IBM Cloud Deployment Guide
## Albert Research Assistant - Complete IBM Stack

This guide walks you through deploying Albert Research Assistant entirely on IBM Cloud infrastructure.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: IBM Cloud Setup](#phase-1-ibm-cloud-setup)
4. [Phase 2: Database Setup](#phase-2-database-setup)
5. [Phase 3: Object Storage Setup](#phase-3-object-storage-setup)
6. [Phase 4: Application Deployment](#phase-4-application-deployment)
7. [Phase 5: Post-Deployment](#phase-5-post-deployment)
8. [Troubleshooting](#troubleshooting)
9. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🏗️ Architecture Overview

### IBM Services Used

| Service | Purpose | Cost Tier |
|---------|---------|-----------|
| **IBM watsonx.ai** | AI analysis, Q&A, chat assistant | Pay-as-you-go |
| **IBM Cloud Object Storage** | PDF file storage | Lite (Free) / Standard |
| **IBM Databases for PostgreSQL** | Application database | Standard |
| **IBM Code Engine** | Application hosting | Pay-as-you-go |
| **IBM Container Registry** | Docker image storage | Free tier available |

### Data Flow

```
User → Code Engine (App) → PostgreSQL (Metadata)
                         → COS (PDF Files)
                         → watsonx.ai (AI Analysis)
```

---

## ✅ Prerequisites

### Required Tools

```bash
# IBM Cloud CLI
curl -fsSL https://clis.cloud.ibm.com/install/linux | sh

# Docker
# Install from: https://docs.docker.com/get-docker/

# Node.js 20+
# Install from: https://nodejs.org/

# Git
# Install from: https://git-scm.com/
```

### IBM Cloud Account

1. Create account at https://cloud.ibm.com/registration
2. Verify email
3. Add payment method (required for some services)

### Required Credentials

- IBM Cloud API Key
- watsonx.ai API Key & Project ID
- Admin password for admin@albert.com

---

## 🚀 Phase 1: IBM Cloud Setup

### 1.1 Login to IBM Cloud

```bash
# Login
ibmcloud login

# Or with SSO
ibmcloud login --sso

# Target your resource group
ibmcloud target -g Default
```

### 1.2 Install Required Plugins

```bash
# Code Engine plugin
ibmcloud plugin install code-engine

# Container Registry plugin
ibmcloud plugin install container-registry

# Databases plugin
ibmcloud plugin install cloud-databases
```

### 1.3 Create Resource Group (Optional)

```bash
# Create dedicated resource group
ibmcloud resource group-create albert-resources

# Target the resource group
ibmcloud target -g albert-resources
```

---

## 🗄️ Phase 2: Database Setup

### 2.1 Create PostgreSQL Instance

```bash
# Create PostgreSQL instance
ibmcloud resource service-instance-create \
  albert-postgres \
  databases-for-postgresql \
  standard \
  us-south \
  -p '{
    "members_memory_allocation_mb": "4096",
    "members_disk_allocation_mb": "20480",
    "version": "15"
  }'

# Wait for provisioning (5-10 minutes)
ibmcloud resource service-instance albert-postgres
```

### 2.2 Create Service Credentials

```bash
# Create credentials
ibmcloud resource service-key-create \
  albert-postgres-credentials \
  Manager \
  --instance-name albert-postgres

# Get connection string
ibmcloud resource service-key albert-postgres-credentials --output json
```

### 2.3 Get Connection Details

The output will include:
- `connection.postgres.composed[0]` - Full connection string
- `connection.postgres.certificate.certificate_base64` - SSL certificate

Save these for your `.env` file.

### 2.4 Run Database Migrations

```bash
# Install dependencies
npm install

# Set environment variables
export IBM_DB_CONNECTION_STRING="postgresql://..."
export IBM_DB_CA_CERT="base64_encoded_cert"

# Run migrations
psql "$IBM_DB_CONNECTION_STRING" < supabase/migrations/20260503000000_ibm_migration.sql
```

### 2.5 Initialize Admin User

```bash
# Create admin initialization script
node -e "
const { initializeAdmin } = require('./src/lib/ibm-auth');
initializeAdmin('your_secure_password_here')
  .then(result => console.log('Admin initialized:', result))
  .catch(err => console.error('Error:', err));
"
```

---

## 📦 Phase 3: Object Storage Setup

### 3.1 Create COS Instance

```bash
# Create COS instance
ibmcloud resource service-instance-create \
  albert-cos \
  cloud-object-storage \
  standard \
  global

# Wait for provisioning
ibmcloud resource service-instance albert-cos
```

### 3.2 Create Service Credentials

```bash
# Create credentials with HMAC
ibmcloud resource service-key-create \
  albert-cos-credentials \
  Writer \
  --instance-name albert-cos \
  --parameters '{"HMAC": true}'

# Get credentials
ibmcloud resource service-key albert-cos-credentials --output json
```

Save:
- `apikey` → `IBM_COS_API_KEY`
- `resource_instance_id` → `IBM_COS_INSTANCE_ID`

### 3.3 Create Bucket

```bash
# Install COS plugin
ibmcloud plugin install cloud-object-storage

# Configure COS
ibmcloud cos config crn --crn <instance_crn>

# Create bucket
ibmcloud cos bucket-create \
  --bucket albert-papers \
  --ibm-service-instance-id <instance_id> \
  --region us-south
```

### 3.4 Configure CORS (Optional)

```bash
# Create CORS config file
cat > cors-config.json << EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://your-app-url.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

# Apply CORS
ibmcloud cos bucket-cors-put \
  --bucket albert-papers \
  --cors-configuration file://cors-config.json
```

---

## 🚢 Phase 4: Application Deployment

### 4.1 Prepare Environment Variables

Create `.env` file:

```bash
# watsonx.ai
WATSONX_API_KEY=your_watsonx_api_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com

# IBM Cloud Object Storage
IBM_COS_API_KEY=your_cos_api_key
IBM_COS_INSTANCE_ID=your_instance_id
IBM_COS_ENDPOINT=s3.us-south.cloud-object-storage.appdomain.cloud
IBM_COS_BUCKET=albert-papers

# IBM Databases for PostgreSQL
IBM_DB_CONNECTION_STRING=postgresql://user:pass@host:port/dbname?sslmode=require
IBM_DB_CA_CERT=base64_encoded_certificate

# Application
NODE_ENV=production
PORT=8080
ADMIN_EMAIL=admin@albert.com
```

### 4.2 Setup Secrets in Code Engine

```bash
# Make script executable
chmod +x setup-secrets.sh

# Run setup
./setup-secrets.sh
```

### 4.3 Deploy Application

```bash
# Make script executable
chmod +x ibm-code-engine-deploy.sh

# Run deployment
./ibm-code-engine-deploy.sh
```

The script will:
1. Build Docker image
2. Push to IBM Container Registry
3. Create/update Code Engine application
4. Configure auto-scaling
5. Return application URL

### 4.4 Verify Deployment

```bash
# Check application status
ibmcloud ce app get --name albert-app

# View logs
ibmcloud ce app logs --name albert-app

# Test health endpoint
curl https://your-app-url.com/health
```

---

## ✨ Phase 5: Post-Deployment

### 5.1 Configure Custom Domain (Optional)

```bash
# Add custom domain
ibmcloud ce app update --name albert-app \
  --domain your-domain.com

# Configure DNS
# Add CNAME record pointing to Code Engine URL
```

### 5.2 Setup Monitoring

```bash
# Enable logging
ibmcloud ce app update --name albert-app \
  --log-level info

# View metrics
ibmcloud ce app events --name albert-app
```

### 5.3 Configure Auto-Scaling

```bash
# Update scaling parameters
ibmcloud ce app update --name albert-app \
  --min-scale 1 \
  --max-scale 10 \
  --scale-down-delay 300
```

### 5.4 Backup Strategy

**Database Backups:**
```bash
# IBM Databases includes automatic backups
# Configure backup retention
ibmcloud resource service-instance-update albert-postgres \
  --parameters '{"backup_retention_days": 30}'
```

**Object Storage Versioning:**
```bash
# Enable versioning on bucket
ibmcloud cos bucket-versioning-put \
  --bucket albert-papers \
  --versioning-configuration Status=Enabled
```

---

## 🔧 Troubleshooting

### Application Won't Start

```bash
# Check logs
ibmcloud ce app logs --name albert-app --tail 100

# Check environment variables
ibmcloud ce secret get --name albert-secrets

# Restart application
ibmcloud ce app update --name albert-app --force
```

### Database Connection Issues

```bash
# Test connection
psql "$IBM_DB_CONNECTION_STRING" -c "SELECT version();"

# Check SSL certificate
echo $IBM_DB_CA_CERT | base64 -d

# Verify firewall rules
# IBM Databases allows all IPs by default
```

### Object Storage Issues

```bash
# Test COS access
ibmcloud cos objects --bucket albert-papers

# Check credentials
ibmcloud resource service-key albert-cos-credentials

# Verify bucket permissions
ibmcloud cos bucket-get --bucket albert-papers
```

### watsonx.ai Issues

```bash
# Test API key
curl -X POST "https://iam.cloud.ibm.com/identity/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=$WATSONX_API_KEY"

# Check project ID
# Verify in watsonx.ai console
```

---

## 📊 Monitoring & Maintenance

### Daily Checks

```bash
# Application health
curl https://your-app-url.com/health

# Database status
ibmcloud resource service-instance albert-postgres

# Storage usage
ibmcloud cos bucket-head --bucket albert-papers
```

### Weekly Tasks

1. Review application logs
2. Check error rates
3. Monitor costs
4. Review security alerts

### Monthly Tasks

1. Update dependencies
2. Review and optimize database
3. Clean up old sessions/OTPs
4. Review backup retention

### Cost Optimization

```bash
# View current costs
ibmcloud billing account-usage

# Optimize Code Engine
# - Reduce min-scale during off-hours
# - Adjust memory/CPU allocation

# Optimize Database
# - Review connection pooling
# - Optimize queries
# - Consider read replicas for scale

# Optimize Object Storage
# - Enable lifecycle policies
# - Archive old papers
# - Use compression
```

---

## 🔐 Security Best Practices

### 1. Rotate Credentials Regularly

```bash
# Rotate API keys every 90 days
ibmcloud iam api-key-create albert-new-key

# Update secrets
./setup-secrets.sh
```

### 2. Enable Audit Logging

```bash
# Enable activity tracking
ibmcloud at event-route-create \
  --name albert-audit \
  --target-type logdna
```

### 3. Configure Network Policies

```bash
# Restrict Code Engine egress (if needed)
ibmcloud ce app update --name albert-app \
  --service-account restricted
```

### 4. Regular Security Scans

```bash
# Scan Docker image
docker scan ${IMAGE_NAME}:${IMAGE_TAG}

# Update dependencies
npm audit fix
```

---

## 📞 Support & Resources

### IBM Cloud Support
- Console: https://cloud.ibm.com/
- Documentation: https://cloud.ibm.com/docs
- Support: https://cloud.ibm.com/unifiedsupport/supportcenter

### Service-Specific Docs
- Code Engine: https://cloud.ibm.com/docs/codeengine
- Databases: https://cloud.ibm.com/docs/databases-for-postgresql
- Object Storage: https://cloud.ibm.com/docs/cloud-object-storage
- watsonx.ai: https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-overview.html

### Community
- IBM Developer: https://developer.ibm.com/
- Stack Overflow: Tag `ibm-cloud`
- GitHub: https://github.com/IBM

---

## 🎉 Deployment Complete!

Your Albert Research Assistant is now running entirely on IBM Cloud infrastructure:

✅ Application hosted on IBM Code Engine  
✅ Database on IBM Databases for PostgreSQL  
✅ Files stored in IBM Cloud Object Storage  
✅ AI powered by IBM watsonx.ai  
✅ Auto-scaling and monitoring enabled  

**Next Steps:**
1. Access your application at the provided URL
2. Login with admin@albert.com
3. Upload your first research paper
4. Start using AI-powered research assistance!

---

**Need Help?** Check the troubleshooting section or contact IBM Cloud support.