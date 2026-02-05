# Deploying PennQuinn.com to AWS Lightsail

This guide walks you through deploying the PennQuinn.com blog to AWS Lightsail.

## Overview

You'll set up:
1. A Lightsail PostgreSQL database (~$15/month)
2. A Lightsail Node.js instance (~$10/month)
3. Connect your domain (pennquinn.com)

**Estimated monthly cost: ~$25-30**

---

## Step 1: Create an AWS Account (if you don't have one)

1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Follow the signup process (you'll need a credit card)

---

## Step 2: Create a Lightsail Database

1. Go to https://lightsail.aws.amazon.com
2. Click **Databases** in the left sidebar
3. Click **Create database**
4. Choose:
   - **Region**: Pick one close to you (e.g., "Virginia" for US East)
   - **Database type**: PostgreSQL
   - **Version**: Latest available (16.x)
   - **Plan**: $15/month (1 GB RAM) is plenty for this site
   - **Database name**: `pennquinn`
   - **Master username**: `dbadmin`
   - **Master password**: Create a strong password (SAVE THIS!)
5. Click **Create database**
6. Wait for it to become "Available" (can take 10-15 minutes)

### Get Your Database Connection String

Once the database is available:
1. Click on your database name
2. Go to the **Connect** tab
3. Note down:
   - **Endpoint** (something like: `ls-abc123.xyz.us-east-1.rds.amazonaws.com`)
   - **Port**: `5432`
   - **User name**: `dbadmin`
   - **Password**: (the one you created)

Your DATABASE_URL will be:
```
postgresql://dbadmin:YOUR_PASSWORD@YOUR_ENDPOINT:5432/pennquinn
```

---

## Step 3: Create a Lightsail Instance

1. Go to https://lightsail.aws.amazon.com
2. Click **Instances** in the left sidebar
3. Click **Create instance**
4. Choose:
   - **Region**: Same region as your database
   - **Platform**: Linux/Unix
   - **Blueprint**: Node.js (under "Apps + OS")
   - **Plan**: $10/month (1 GB RAM) or $20/month (2 GB) for better performance
   - **Instance name**: `pennquinn`
5. Click **Create instance**
6. Wait for it to become "Running"

---

## Step 4: Configure the Instance

### Connect to Your Instance

1. Click on your instance name
2. Click **Connect using SSH** (the orange button)
3. A terminal window will open in your browser

### Install Required Software

In the SSH terminal, run these commands:

```bash
# Update the system
sudo yum update -y

# Install Git
sudo yum install git -y

# Install PostgreSQL client (for database commands)
sudo yum install postgresql15 -y
```

### Clone Your Project

```bash
# Go to the apps directory
cd /opt/bitnami

# Clone your project (replace with your GitHub repo URL)
git clone https://github.com/YOUR_USERNAME/PennQuinncom.git pennquinn

# Go into the project
cd pennquinn

# Install dependencies
npm install
```

### Set Up Environment Variables

```bash
# Create the .env file
nano .env
```

Add these lines (replace with your actual values):
```
DATABASE_URL=postgresql://dbadmin:YOUR_PASSWORD@YOUR_DATABASE_ENDPOINT:5432/pennquinn
SESSION_SECRET=generate-a-random-string-here
ADMIN_PASSWORD=your-admin-password
NODE_ENV=production
PORT=5000
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

### Build and Start the App

```bash
# Build the app
npm run build

# Test that it starts
npm run start
```

If you see "serving on port 5000", it's working! Press `Ctrl+C` to stop it.

---

## Step 5: Set Up Process Manager (Keep App Running)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the app with PM2
pm2 start npm --name "pennquinn" -- run start

# Save the PM2 configuration so it restarts on reboot
pm2 save

# Set up PM2 to start on system boot
sudo env PATH=$PATH:/opt/bitnami/node/bin pm2 startup systemd -u bitnami --hp /home/bitnami
```

### Useful PM2 Commands

- `pm2 status` - See if app is running
- `pm2 logs` - View app logs
- `pm2 restart pennquinn` - Restart the app
- `pm2 stop pennquinn` - Stop the app

---

## Step 6: Open the Firewall Port

1. In Lightsail, click on your instance
2. Go to the **Networking** tab
3. Under "IPv4 Firewall", click **Add rule**
4. Add a rule for port **5000** (or whatever PORT you chose)
   - Application: Custom
   - Protocol: TCP
   - Port: 5000

Your site should now be accessible at:
```
http://YOUR_INSTANCE_IP:5000
```

Find your IP on the instance's main page.

---

## Step 7: Set Up Your Domain (pennquinn.com)

### Create a Static IP

1. In Lightsail, go to **Networking**
2. Click **Create static IP**
3. Attach it to your pennquinn instance
4. Note down the static IP address

### Point Your Domain to Lightsail

You'll need to update your domain's DNS settings wherever you registered pennquinn.com:

1. Log into your domain registrar (GoDaddy, Namecheap, Google Domains, etc.)
2. Find DNS settings for pennquinn.com
3. Add or update these records:
   - **A Record**: `@` → Your Lightsail static IP
   - **A Record**: `www` → Your Lightsail static IP

DNS changes can take up to 48 hours to propagate, but usually it's much faster.

---

## Step 8: Set Up HTTPS (SSL Certificate)

For a free SSL certificate, we'll use Certbot:

```bash
# Install Certbot
sudo yum install certbot -y

# Get the certificate (replace with your domain)
sudo certbot certonly --standalone -d pennquinn.com -d www.pennquinn.com
```

Then you'll need to update your app to use HTTPS, or put a reverse proxy like Nginx in front of it. This is a more advanced step - let me know if you'd like help with this!

---

## Step 9: Upload Your Images

Your existing images (664MB in the /uploads folder) need to be uploaded:

### Option A: SCP from your computer
```bash
# From your local computer (not the Lightsail SSH):
scp -r uploads/ bitnami@YOUR_INSTANCE_IP:/opt/bitnami/pennquinn/
```

### Option B: Use Lightsail Object Storage
For better performance, you could migrate images to Lightsail Object Storage (~$1/month). This is optional but recommended for production.

---

## Step 10: Import Your Data

Your blog post data is in `posts-data.json`. The app will automatically import it when it first starts and finds an empty database.

If you need to re-import:
```bash
# Connect to your database
psql "postgresql://dbadmin:YOUR_PASSWORD@YOUR_DATABASE_ENDPOINT:5432/pennquinn"

# Clear existing posts (optional - only if you want to reset)
DELETE FROM posts;

# Exit psql
\q

# Restart the app to trigger import
pm2 restart pennquinn
```

---

## Troubleshooting

### App won't start
```bash
# Check logs
pm2 logs pennquinn

# Make sure .env file exists and has correct values
cat .env
```

### Can't connect to database
- Make sure your Lightsail instance and database are in the same region
- Enable "Public mode" on your database (in Lightsail database settings)
- Check that the database endpoint, username, and password are correct

### Site not loading
- Check that port 5000 is open in the firewall
- Verify PM2 shows the app as "online": `pm2 status`
- Check logs: `pm2 logs`

---

## Maintenance

### Updating the Site

```bash
cd /opt/bitnami/pennquinn
git pull
npm install
npm run build
pm2 restart pennquinn
```

### Viewing Logs

```bash
pm2 logs pennquinn
```

### Database Backups

Lightsail automatically backs up your database daily. You can also create manual snapshots in the Lightsail console.

---

## Cost Summary

| Service | Monthly Cost |
|---------|-------------|
| Lightsail Instance ($10 plan) | ~$10 |
| Lightsail Database ($15 plan) | ~$15 |
| Static IP | Free |
| Data Transfer (first 1TB) | Free |
| **Total** | **~$25/month** |
