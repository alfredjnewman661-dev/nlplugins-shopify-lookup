require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Shopify API configuration
const SHOPIFY_STORE = process.env.SHOPIFY_STORE; // e.g., 'mystore.myshopify.com'
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

// Helper: Make Shopify API request
async function shopifyRequest(endpoint, method = 'GET', body = null) {
  const url = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shopify API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

// Helper: Make Shopify GraphQL request
async function shopifyGraphQL(query, variables = {}) {
  const url = `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shopify GraphQL error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

// API: Get customer by email with orders
app.get('/api/customer', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // GraphQL query for customer + orders
    const query = `
      query getCustomerByEmail($email: String!) {
        customers(first: 1, query: $email) {
          edges {
            node {
              id
              legacyResourceId
              firstName
              lastName
              email
              phone
              createdAt
              ordersCount
              totalSpent
              orders(first: 5, sortKey: CREATED_AT, reverse: true) {
                edges {
                  node {
                    id
                    legacyResourceId
                    name
                    createdAt
                    displayFinancialStatus
                    displayFulfillmentStatus
                    totalPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    fulfillments {
                      trackingInfo {
                        number
                        url
                      }
                      status
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    const result = await shopifyGraphQL(query, { email: `email:${email}` });
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return res.status(500).json({ error: 'Failed to fetch customer data' });
    }
    
    const customers = result.data?.customers?.edges || [];
    
    if (customers.length === 0) {
      return res.json({ found: false, message: 'Customer not found in Shopify' });
    }
    
    const customer = customers[0].node;
    
    // Format the response
    const formattedCustomer = {
      found: true,
      id: customer.legacyResourceId,
      graphqlId: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.createdAt,
      ordersCount: customer.ordersCount,
      totalSpent: customer.totalSpent,
      adminUrl: `https://${SHOPIFY_STORE}/admin/customers/${customer.legacyResourceId}`,
      orders: customer.orders.edges.map(({ node: order }) => ({
        id: order.legacyResourceId,
        name: order.name,
        createdAt: order.createdAt,
        financialStatus: order.displayFinancialStatus,
        fulfillmentStatus: order.displayFulfillmentStatus,
        total: order.totalPriceSet.shopMoney,
        adminUrl: `https://${SHOPIFY_STORE}/admin/orders/${order.legacyResourceId}`,
        tracking: order.fulfillments.flatMap(f => 
          f.trackingInfo.map(t => ({
            number: t.number,
            url: t.url,
            status: f.status
          }))
        )
      }))
    };
    
    res.json(formattedCustomer);
    
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Search orders by order number or email
app.get('/api/orders/search', async (req, res) => {
  try {
    const { query: searchQuery } = req.query;
    
    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const query = `
      query searchOrders($query: String!) {
        orders(first: 10, query: $query, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              legacyResourceId
              name
              createdAt
              displayFinancialStatus
              displayFulfillmentStatus
              customer {
                firstName
                lastName
                email
              }
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `;
    
    const result = await shopifyGraphQL(query, { query: searchQuery });
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return res.status(500).json({ error: 'Failed to search orders' });
    }
    
    const orders = result.data?.orders?.edges?.map(({ node }) => ({
      id: node.legacyResourceId,
      name: node.name,
      createdAt: node.createdAt,
      financialStatus: node.displayFinancialStatus,
      fulfillmentStatus: node.displayFulfillmentStatus,
      total: node.totalPriceSet.shopMoney,
      customer: node.customer,
      adminUrl: `https://${SHOPIFY_STORE}/admin/orders/${node.legacyResourceId}`
    })) || [];
    
    res.json({ orders });
    
  } catch (error) {
    console.error('Error searching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    shopifyStore: SHOPIFY_STORE ? 'configured' : 'missing',
    timestamp: new Date().toISOString()
  });
});

// Serve the dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🛍️  Shopify Lookup Dashboard running on port ${PORT}`);
  console.log(`   Store: ${SHOPIFY_STORE || 'NOT CONFIGURED'}`);
});
