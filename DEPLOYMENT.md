# EngrHenryTech BusinessAI — Deployment Guide

## Option 1: Railway.app (Recommended — Easiest)

Railway gives you 3 separate services: Backend, Frontend, Embedding.
Free tier available, paid starts at $5/month.

### Steps:

1. **Create Railway account** → railway.app → Sign up with GitHub

2. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

3. **Deploy Backend:**
   ```bash
   cd backend
   railway init          # Creates new project
   railway up            # Deploys
   ```
   Then go to Railway dashboard → your backend service → Variables → add all env vars from `.env.production`

4. **Deploy Embedding Service:**
   ```bash
   cd ../embedding-service
   railway link          # Link to same project
   railway up
   ```

5. **Deploy Frontend:**
   ```bash
   cd ../frontend
   railway link
   # Set build args in Railway dashboard:
   # VITE_API_URL = your backend Railway URL (e.g. https://businessai-backend.up.railway.app)
   railway up
   ```

6. **Update Google OAuth:**
   - Go to console.cloud.google.com
   - Add your Railway URLs to Authorized origins and redirect URIs

7. **Update Paystack:**
   - Go to dashboard.paystack.com → Settings → Webhooks
   - Add: `https://your-backend.railway.app/api/v1/payments/webhook`

---

## Option 2: VPS (Ubuntu 22.04) — Full Control

Best for: large clients, government contracts, custom domain, WhatsApp.

### Requirements:
- Ubuntu 22.04 VPS (DigitalOcean $12/mo, Contabo €4/mo, or any provider)
- Domain name pointed to your VPS IP
- At least 2GB RAM (4GB recommended for embedding model)

### Steps:

**1. Connect to your VPS:**
```bash
ssh root@your_vps_ip
```

**2. Upload your project:**
```bash
# On your local machine:
scp -r business-ai-agent root@your_vps_ip:/opt/
```

**3. Create .env file on VPS:**
```bash
cd /opt/business-ai-agent
cp .env.production .env
nano .env    # Fill in all values
```

**4. Run the deployment script:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**5. Setup Nginx reverse proxy with SSL:**
```bash
apt install -y nginx certbot python3-certbot-nginx

# Create nginx config
cat > /etc/nginx/sites-available/businessai << 'NGINX'
server {
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    server_name app.yourdomain.com;
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

ln -s /etc/nginx/sites-available/businessai /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Get SSL certificate (free from Let's Encrypt)
certbot --nginx -d api.yourdomain.com -d app.yourdomain.com
```

**6. Setup auto-renewal:**
```bash
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## Email Fix — Resend.com (Fixes SMTP Blocking in Nigeria)

1. Go to resend.com → Sign up free
2. Add your domain (or use their shared domain free)
3. Get your API key
4. Update `.env`:
   ```
   EMAIL_HOST=smtp.resend.com
   EMAIL_PORT=587
   EMAIL_USER=resend
   EMAIL_PASS=re_your_api_key_here
   EMAIL_FROM=EngrHenryTech BusinessAI <noreply@yourdomain.com>
   ```

---

## After Deployment Checklist

- [ ] Backend health check: `https://api.yourdomain.com/health`
- [ ] Frontend loads: `https://app.yourdomain.com`
- [ ] Can register a new account
- [ ] Google OAuth works (update redirect URIs)
- [ ] Can upload a document
- [ ] Chat works
- [ ] Paystack webhook configured
- [ ] Set your account to super_admin in MongoDB Atlas
- [ ] Switch Paystack to LIVE keys
- [ ] Setup Resend.com for email

---

## Make Your Account Super Admin

In MongoDB Atlas → Browse Collections → users collection:
```javascript
db.users.updateOne(
  { email: "henryengrakpan@gmail.com" },
  { $set: { role: "super_admin" } }
)
```

---

## Monthly Costs Estimate

| Service | Free Tier | Paid |
|---------|-----------|------|
| Railway (Backend) | $5 credit/mo | ~$10-20/mo |
| Railway (Frontend) | $5 credit/mo | ~$5/mo |
| Railway (Embedding) | $5 credit/mo | ~$10-15/mo |
| MongoDB Atlas | 512MB free | $9/mo (M10) |
| Cloudinary | 25GB free | $0 for now |
| Resend.com | 3,000 emails/mo free | $20/mo (50k emails) |
| Domain | — | ~$12/yr |
| **Total** | **Free to start** | **~$45-60/mo** |

At ₦14,900/month per client, you break even at **4 clients**.
At 20 clients: Revenue ₦298,000/mo — Cost ~₦70,000/mo = **₦228,000 profit/month**
