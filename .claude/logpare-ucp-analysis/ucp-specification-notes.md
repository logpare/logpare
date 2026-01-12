# UCP Specification Research Notes

*Research conducted: 2026-01-12*

## Sources

- [UCP Official Site](https://ucp.dev)
- [UCP GitHub Repository](https://github.com/Universal-Commerce-Protocol/ucp)
- [UCP Samples Repository](https://github.com/Universal-Commerce-Protocol/samples)
- [Google Developers UCP Guide](https://developers.google.com/merchant/ucp)
- [Google Cloud Blog - Agentic Commerce](https://cloud.google.com/transform/a-new-era-agentic-commerce-retail-ai)
- [Google Developers Blog - Under the Hood](https://developers.googleblog.com/under-the-hood-universal-commerce-protocol-ucp/)
- [Shopify Engineering Blog](https://shopify.engineering/UCP)
- [TechCrunch Announcement](https://techcrunch.com/2026/01/11/google-announces-a-new-protocol-to-facilitate-commerce-using-ai-agents/)

---

## 1. What is UCP?

The **Universal Commerce Protocol (UCP)** is an open standard launched on January 11, 2026, by Google in collaboration with Shopify and 20+ industry partners (Etsy, Wayfair, Target, Walmart, Stripe, Visa, Mastercard, American Express, etc.).

### Core Purpose
UCP provides "a common language and functional primitives" enabling autonomous AI agents to:
- Discover products and merchant capabilities
- Complete checkout transactions
- Handle post-purchase operations (returns, tracking)

### Key Design Principles
1. **Transport Agnostic**: Supports REST API, MCP, and A2A (Agent-to-Agent)
2. **Composable Architecture**: Core Capabilities + optional Extensions
3. **Server-Selects Model**: Businesses determine protocol versions and features
4. **Reverse-Domain Namespacing**: e.g., `dev.ucp.shopping.checkout`
5. **Merchant of Record**: Businesses retain full ownership of customer relationships and data

---

## 2. Architecture Overview

### Service Discovery
Businesses publish capabilities at `/.well-known/ucp`:

```json
{
  "ucp": {
    "version": "2026-01-11",
    "services": {
      "dev.ucp.shopping": {
        "rest": {
          "schema": "https://ucp.dev/services/shopping/rest.openapi.json",
          "endpoint": "https://business.example.com/ucp/rest"
        },
        "mcp": {
          "schema": "https://ucp.dev/services/shopping/mcp.openrpc.json",
          "endpoint": "https://business.example.com/ucp/mcp"
        }
      }
    },
    "capabilities": ["dev.ucp.shopping.checkout", "dev.ucp.shopping.discount"]
  }
}
```

### Capabilities vs Extensions
| Type | Purpose | Example |
|------|---------|---------|
| **Capability** | Standalone feature (core "verbs") | `dev.ucp.shopping.checkout` |
| **Extension** | Optional module augmenting a capability | `dev.ucp.shopping.discount` (extends checkout) |

### Platform Authentication
Platforms advertise their profile URI via the `UCP-Agent` header:
```
UCP-Agent: profile="https://agent.example/profiles/shopping-agent.json"
```

---

## 3. Checkout Capability (`dev.ucp.shopping.checkout`)

**Version**: `2026-01-11`

### Session Lifecycle States
1. `incomplete` - Missing required information
2. `requires_escalation` - Needs buyer input/review (handoff to continue_url)
3. `ready_for_complete` - Ready for order placement
4. `complete_in_progress` - Business processing completion
5. `completed` - Order successfully placed
6. `canceled` - Session terminated

### Core Operations
| Operation | Description |
|-----------|-------------|
| `create_checkout` | Initiates session with items, buyer, currency, payment config |
| `get_checkout` | Returns current checkout status and data |
| `update_checkout` | Full resource replacement (platform sends complete object) |
| `complete_checkout` | Places order with payment instrument |
| `cancel_checkout` | Terminates session (non-terminal states only) |

### Data Model Highlights

**Line Items**:
```json
{
  "line_items": [
    {
      "item": { "id": "SKU123", "title": "Product", "price": 2500, "image_url": "..." },
      "quantity": 2,
      "totals": { "subtotal": 5000, "discount": 500, "total": 4500 }
    }
  ]
}
```

**Totals**:
- `items_discount` - Line-item discounts
- `subtotal` - Pre-tax, pre-fulfillment
- `discount` - Order-level discounts
- `fulfillment` - Shipping/delivery
- `tax` - Transaction taxes
- `total` - Final amount

**Error Severities**:
- `recoverable` - Platform fixable via Update Checkout
- `requires_buyer_input` - Missing buyer data
- `requires_buyer_review` - Policy/regulatory approval needed

---

## 4. MCP Transport Binding

### Tool Definitions
The MCP binding maps checkout operations to JSON-RPC 2.0 tools:

| Tool | Operation |
|------|-----------|
| `create_checkout` | Create Checkout |
| `get_checkout` | Get Checkout |
| `update_checkout` | Update Checkout |
| `complete_checkout` | Complete Checkout |
| `cancel_checkout` | Cancel Checkout |

### Message Format
```json
{
  "jsonrpc": "2.0",
  "method": "create_checkout",
  "params": {
    "_meta": {
      "ucp": {
        "profile": "https://platform.example/profiles/shopping-agent.json"
      }
    },
    "checkout": { ... }
  },
  "id": 1
}
```

### MCP Server Requirements
1. Execute JSON-RPC 2.0 protocol correctly
2. Expose all five core checkout tools
3. Validate inputs against UCP schemas
4. Return UCP error codes in JSON-RPC error `data` field
5. Support HTTP transport with streaming

### Error Response Format
```json
{
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": {
      "status": "error",
      "errors": [
        {
          "code": "MERCHANDISE_NOT_AVAILABLE",
          "severity": "requires_buyer_input"
        }
      ]
    }
  }
}
```

---

## 5. Extensions

### Discount Extension (`dev.ucp.shopping.discount`)
Adds `discounts` field to checkout:

```json
{
  "discounts": {
    "codes": ["SAVE20"],
    "applied": [
      {
        "code": "SAVE20",
        "title": "Summer Sale 20% Off",
        "amount": 1000,
        "automatic": false,
        "method": "across",
        "priority": 1,
        "allocations": [
          { "path": "$.line_items[0]", "amount": 600 },
          { "path": "$.line_items[1]", "amount": 400 }
        ]
      }
    ]
  }
}
```

**Rejection Error Codes**:
- `discount_code_expired`
- `discount_code_invalid`
- `discount_code_already_applied`
- `discount_code_combination_disallowed`
- `discount_code_user_not_logged_in`
- `discount_code_user_ineligible`

### Other Extensions
- `dev.ucp.shopping.fulfillment` - Shipping/delivery options
- `dev.ucp.shopping.buyer_consent` - Consent collection
- `dev.ucp.shopping.ap2_mandate` - Cryptographic authorization proofs

---

## 6. Payment Architecture

### Trust Triangle
1. **Business <-> Payment Provider**: Pre-existing legal/technical relationship
2. **Platform <-> Payment Provider**: Tokenization interaction
3. **Platform <-> Business**: Token submission only

### Payment Handlers
Handlers define how instruments are processed. Three implementation scenarios:

**Scenario A - Digital Wallet**: Platform uses wallet API for encrypted tokens

**Scenario B - Direct Tokenization with SCA**: Generic tokenizer requests session tokens; 3DS challenges trigger business pause

**Scenario C - Autonomous Agent (AP2)**: Agent generates cryptographic mandates with verifiable presentations

### PCI Scope Management
- Platforms avoid PCI-DSS scope via opaque credentials
- Businesses minimize scope through tokenization
- Payment credential providers are Level 1 certified

---

## 7. Sample Implementations

### GitHub Repositories
- **Spec + Docs**: https://github.com/Universal-Commerce-Protocol/ucp
- **Samples**: https://github.com/Universal-Commerce-Protocol/samples
- **Conformance Tests**: https://github.com/Universal-Commerce-Protocol/conformance

### Available Samples
1. **Python REST Server** (`rest/python/`)
   - Capability discovery
   - Checkout session management
   - Payment processing simulation
   - Flower shop client example

2. **Node.js REST Server** (`rest/nodejs/`)
   - Hono + Zod implementation
   - Shopping, checkout, order management

*Note: No MCP server samples available in public repositories yet.*

---

## 8. Industry Adoption

### Launch Partners (20+)
- **Platforms**: Shopify, Etsy, Wayfair
- **Retailers**: Target, Walmart, Best Buy, Home Depot, Macy's, Flipkart, Zalando
- **Payments**: Stripe, Adyen, Visa, Mastercard, American Express, PayPal

### Initial Deployment
- Google AI Mode in Search
- Gemini App
- Google Wallet integration
- Microsoft Copilot (Shopify integration)

### Market Projections
- AI platforms: 1.5% of retail ecommerce ($20.9B) in 2026 (eMarketer)
- $3-5 trillion opportunity by 2030 (McKinsey)

---

## 9. Key Observations for Logpare Integration

### Log-Relevant Data in UCP
1. **Checkout Sessions**: Each session has structured lifecycle events
2. **Error Messages**: Standardized error codes with severity levels
3. **Correlation IDs**: Trace IDs for multi-agent flows
4. **Timing Data**: Session TTL, processing times
5. **HTTP Status Codes**: Transport-level errors

### MCP Alignment Opportunities
1. UCP uses MCP for transport - logpare already has MCP server patterns
2. Both follow JSON-RPC 2.0 conventions
3. Both use tool/resource paradigm
4. Structured output (JSON format) aligns with UCP data models

### Potential Integration Surfaces
1. **Checkout Log Compression**: Process verbose checkout session logs
2. **Agent Debugging**: Compress A2A/MCP communication logs
3. **Conformance Testing**: Analyze test output patterns
4. **Audit Trail Compression**: Reduce storage for compliance logs
5. **Error Pattern Analysis**: Group similar checkout failures
