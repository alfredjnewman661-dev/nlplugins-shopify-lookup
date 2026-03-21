# Shopify Lookup — Demo Walkthrough

## What It Does
Displays Shopify customer information and order history directly in the Chatwoot conversation sidebar by automatically looking up customers by their email address. This eliminates the need for support agents to switch between Chatwoot and Shopify admin to access customer purchase history and order details during support conversations.

## Key Features
• Automatic customer lookup by email from conversation contact
• Lifetime customer statistics including order count and total spend
• Recent order history with status, tracking numbers, and quick links
• Direct links to Shopify admin for detailed customer and order management
• Real-time data via Shopify Admin API with customizable API version support
• Embedded dashboard app that loads seamlessly in Chatwoot sidebar
• Docker deployment with minimal configuration requirements

## How It Works
1. Customer starts a conversation in Chatwoot with their email address
2. Chatwoot loads the Shopify Lookup dashboard app in the conversation sidebar
3. Dashboard automatically queries the email parameter from the contact
4. Plugin calls Shopify Admin API to search for customer by email address
5. If found, displays customer profile with lifetime stats and recent orders
6. Support agent can view order history, payment status, and fulfillment details
7. Agent clicks direct links to jump to specific orders in Shopify admin
8. Plugin provides instant context without leaving the support conversation

## Technical Details
- Platform: Chatwoot (dashboard app integration)
- Language: Node.js with Express.js framework
- Deployment: Docker (docker-compose up)
- Configuration: Environment variables (.env)

## Screenshots / Demo Flow
**Chatwoot Settings**: Dashboard Apps configuration page showing the Shopify integration setup with endpoint URL and conversation location selected.

**Customer Conversation**: Active Chatwoot conversation window with the Shopify lookup dashboard loaded in the right sidebar, showing loading state.

**Customer Found**: Dashboard displaying found customer profile including name, email, total orders count, and lifetime value with formatted currency.

**Order History View**: Expanded view showing last 5 orders with order numbers, dates, payment status (PAID/PENDING), fulfillment status (FULFILLED/UNFULFILLED), and order totals.

**Order Details**: Individual order entry showing order number, tracking information, shipping status, and clickable links to Shopify admin order page.

**Customer Not Found**: Dashboard showing "Customer not found" message for contacts without Shopify accounts, with option to search by different email.

**Direct Admin Links**: Clicking order links opens Shopify admin in new tab showing the specific order details with all order information and customer context readily available.