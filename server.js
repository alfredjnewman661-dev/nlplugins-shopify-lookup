require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { validateLicense } = require("./license");

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
const MOCK_MODE = process.env.MOCK_MODE === 'true';

// Mock data for testing
const MOCK_CUSTOMERS = {
  'test@example.com': {
    found: true,
    id: '1234567890',
    graphqlId: 'gid://shopify/Customer/1234567890',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    phone: '+1 555-123-4567',
    createdAt: '2023-06-15T10:30:00Z',
    ordersCount: 3,
    totalSpent: '549.97',
    adminUrl: `https://${SHOPIFY_STORE}/admin/customers/1234567890`,
    orders: [
      {
        id: '9876543210',
        name: '#1001',
        createdAt: '2024-02-01T14:22:00Z',
        financialStatus: 'PAID',
        fulfillmentStatus: 'FULFILLED',
        total: { amount: '199.99', currencyCode: 'USD' },
        adminUrl: `https://${SHOPIFY_STORE}/admin/orders/9876543210`,
        tracking: [{ number: '1Z999AA10123456784', url: 'https://www.ups.com/track?tracknum=1Z999AA10123456784', status: 'DELIVERED' }]
      },
      {
        id: '9876543211',
        name: '#1002',
        createdAt: '2024-01-15T09:45:00Z',
        financialStatus: 'PAID',
        fulfillmentStatus: 'IN_TRANSIT',
        total: { amount: '149.99', currencyCode: 'USD' },
        adminUrl: `https://${SHOPIFY_STORE}/admin/orders/9876543211`,
        tracking: [{ number: '9261290100130535442978', url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9261290100130535442978', status: 'IN_TRANSIT' }]
      },
      {
        id: '9876543212',
        name: '#1003',
        createdAt: '2023-12-20T16:30:00Z',
        financialStatus: 'PAID',
        fulfillmentStatus: 'FULFILLED',
        total: { amount: '199.99', currencyCode: 'USD' },
        adminUrl: `https://${SHOPIFY_STORE}/admin/orders/9876543212`,
        tracking: []
      }
    ]
  },
  'jane@example.com': {
    found: true,
    id: '1234567891',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '+1 555-987-6543',
    createdAt: '2024-01-10T08:00:00Z',
    ordersCount: 1,
    totalSpent: '79.99',
    adminUrl: `https://${SHOPIFY_STORE}/admin/customers/1234567891`,
    orders: [
      {
        id: '9876543220',
        name: '#1010',
        createdAt: '2024-02-05T11:00:00Z',
        financialStatus: 'PENDING',
        fulfillmentStatus: 'UNFULFILLED',
        total: { amount: '79.99', currencyCode: 'USD' },
        adminUrl: `https://${SHOPIFY_STORE}/admin/orders/9876543220`,
        tracking: []
      }
    ]
  }
};

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
    
    // Mock mode - return test data
    if (MOCK_MODE) {
      console.log(`[MOCK] Looking up customer: ${email}`);
      const mockCustomer = MOCK_CUSTOMERS[email.toLowerCase()];
      if (mockCustomer) {
        return res.json(mockCustomer);
      }
      return res.json({ found: false, message: 'Customer not found in Shopify (mock mode)', mockMode: true });
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
    mockMode: MOCK_MODE,
    timestamp: new Date().toISOString()
  });
});

// Serve the dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  await validateLicense(process.env.NLPLUGINS_LICENSE_KEY);
  app.listen(PORT, () => {
  console.log(`🛍️  Shopify Lookup Dashboard running on port ${PORT}`);
  console.log(`   Store: ${SHOPIFY_STORE || 'NOT CONFIGURED'}`);
});
}
start().catch(err => { console.error(err); process.exit(1); });
