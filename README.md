# Chatwoot Shopify Order Lookup Dashboard

A Chatwoot Dashboard App that displays Shopify customer info and order history in the conversation sidebar.

![Dashboard Preview](https://via.placeholder.com/300x400?text=Shopify+Lookup)

## Features

- 🔍 **Customer Lookup** - Automatically find Shopify customers by email
- 💰 **Lifetime Stats** - View order count and total spend
- 📦 **Recent Orders** - Last 5 orders with status and tracking
- 🔗 **Quick Links** - Direct links to Shopify admin

## Setup

### 1. Create a Shopify Custom App

1. Go to your Shopify Admin → **Settings** → **Apps and sales channels**
2. Click **Develop apps** → **Create an app**
3. Name it "Chatwoot Integration" or similar
4. Click **Configure Admin API scopes** and enable:
   - `read_customers`
   - `read_orders`
5. Click **Install app**
6. Copy the **Admin API access token** (starts with `shpat_`)

### 2. Deploy the Dashboard App

#### Option A: Docker (Recommended)

```bash
# Build the image
docker build -t chatwoot-shopify-lookup .

# Run with environment variables
docker run -d \
  --name shopify-lookup \
  -p 3000:3000 \
  -e SHOPIFY_STORE=your-store.myshopify.com \
  -e SHOPIFY_ACCESS_TOKEN=shpat_xxxxx \
  chatwoot-shopify-lookup
```

#### Option B: Node.js

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Shopify credentials

# Start the server
npm start
```

#### Option C: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  shopify-lookup:
    build: .
    ports:
      - "3000:3000"
    environment:
      - SHOPIFY_STORE=${SHOPIFY_STORE}
      - SHOPIFY_ACCESS_TOKEN=${SHOPIFY_ACCESS_TOKEN}
    restart: unless-stopped
```

### 3. Configure Chatwoot Dashboard App

1. Go to your Chatwoot installation → **Settings** → **Integrations** → **Dashboard Apps**
2. Click **Add a new dashboard app**
3. Fill in:
   - **Name**: Shopify Orders
   - **Endpoint URL**: `https://your-domain.com/?email={{contact.email}}`
   
   > Replace `your-domain.com` with your actual domain where the app is hosted

4. Select **Conversation** as the display location
5. Save the integration

### 4. Test the Integration

1. Open any conversation in Chatwoot
2. The Shopify dashboard should appear in the sidebar
3. If the contact has an email matching a Shopify customer, their data will display

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SHOPIFY_STORE` | Yes | Your store domain (e.g., `mystore.myshopify.com`) |
| `SHOPIFY_ACCESS_TOKEN` | Yes | Admin API access token from your custom app |
| `SHOPIFY_API_VERSION` | No | API version (default: `2024-01`) |
| `PORT` | No | Server port (default: `3000`) |

## API Endpoints

### GET /api/customer
Look up a customer by email.

```bash
curl "http://localhost:3000/api/customer?email=customer@example.com"
```

**Response:**
```json
{
  "found": true,
  "id": "123456789",
  "firstName": "John",
  "lastName": "Doe",
  "email": "customer@example.com",
  "ordersCount": 5,
  "totalSpent": "523.99",
  "adminUrl": "https://store.myshopify.com/admin/customers/123456789",
  "orders": [
    {
      "id": "987654321",
      "name": "#1234",
      "createdAt": "2024-01-15T10:30:00Z",
      "financialStatus": "PAID",
      "fulfillmentStatus": "FULFILLED",
      "total": { "amount": "99.99", "currencyCode": "USD" },
      "adminUrl": "https://store.myshopify.com/admin/orders/987654321",
      "tracking": [
        { "number": "1Z999AA...", "url": "https://..." }
      ]
    }
  ]
}
```

### GET /api/orders/search
Search orders by query.

```bash
curl "http://localhost:3000/api/orders/search?query=1234"
```

### GET /api/health
Health check endpoint.

```bash
curl "http://localhost:3000/api/health"
```

## Deployment Options

### Railway / Render / Fly.io

1. Connect your Git repository
2. Set environment variables in the dashboard
3. Deploy

### Self-hosted with Nginx

```nginx
server {
    listen 443 ssl;
    server_name shopify-lookup.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Security Notes

- ⚠️ The Shopify access token has read access to customer data - keep it secure
- 🔒 Always use HTTPS in production
- 🔐 Consider adding authentication if exposing outside your network

## Troubleshooting

### "Customer not found"
- Verify the email exists in Shopify Customers
- Check that the API token has `read_customers` scope

### "Failed to fetch customer data"
- Verify `SHOPIFY_STORE` is correct (include `.myshopify.com`)
- Check that the access token is valid and not expired

### Dashboard not loading in Chatwoot
- Ensure the URL is accessible from where Chatwoot is hosted
- Check browser console for CORS or mixed content errors
- Verify HTTPS if Chatwoot is on HTTPS

## License

MIT
