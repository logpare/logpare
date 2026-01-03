# Pattern Library

Comprehensive regex patterns for masking domain-specific identifiers in logs.

## Table of Contents

1. [Cloud Providers](#cloud-providers)
2. [Authentication & Security](#authentication--security)
3. [Payment & Finance](#payment--finance)
4. [Observability & Tracing](#observability--tracing)
5. [Database Systems](#database-systems)
6. [Web & HTTP](#web--http)
7. [Healthcare](#healthcare)
8. [General Purpose](#general-purpose)

---

## Cloud Providers

### AWS
```typescript
const awsPatterns = {
  instanceId: /i-[a-f0-9]{8,17}/gi,              // EC2 instance: i-1234567890abcdef0
  volumeId: /vol-[a-f0-9]{8,17}/gi,              // EBS volume: vol-049df61146c4d7901
  snapshotId: /snap-[a-f0-9]{8,17}/gi,           // Snapshot: snap-0123456789abcdef
  amiId: /ami-[a-f0-9]{8,17}/gi,                 // AMI: ami-0abcdef1234567890
  securityGroupId: /sg-[a-f0-9]{8,17}/gi,        // Security group: sg-903004f8
  subnetId: /subnet-[a-f0-9]{8,17}/gi,           // Subnet: subnet-12345678
  vpcId: /vpc-[a-f0-9]{8,17}/gi,                 // VPC: vpc-1234567a
  arn: /arn:aws:[a-z0-9-]+:[a-z0-9-]*:\d{12}:[^\s]+/gi, // ARN
  s3Bucket: /s3:\/\/[a-z0-9.-]+/gi,              // S3 bucket URI
  accessKeyId: /AKIA[A-Z0-9]{16}/g,              // Access key ID (NEVER log secrets!)
};
```

### Azure
```typescript
const azurePatterns = {
  subscriptionId: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
  resourceGroup: /resourceGroups\/[a-zA-Z0-9-_]+/gi,
  vmId: /\/subscriptions\/[^\/]+\/resourceGroups\/[^\/]+\/providers\/Microsoft\.Compute\/virtualMachines\/[a-zA-Z0-9-]+/gi,
  correlationId: /x-ms-correlation-request-id:\s*[a-f0-9-]+/gi,
};
```

### Google Cloud Platform
```typescript
const gcpPatterns = {
  projectId: /projects\/[a-z0-9-]+/gi,
  instanceId: /instances\/[a-z0-9-]+/gi,
  zone: /zones\/[a-z]+-[a-z]+\d+-[a-z]/gi,       // us-central1-a
  gcsBucket: /gs:\/\/[a-z0-9._-]+/gi,
};
```

---

## Authentication & Security

### API Keys & Tokens
```typescript
const authPatterns = {
  jwtToken: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
  bearerToken: /Bearer\s+[A-Za-z0-9-._~+\/]+=*/gi,
  apiKey: /[a-z]{2,10}[-_]?[a-z0-9]{32,}/gi,     // Generic API key
  stripeKey: /sk_live_[a-zA-Z0-9]{24,}/g,
  githubToken: /gh[ps]_[a-zA-Z0-9]{36,}/g,
  awsSecret: /[A-Za-z0-9/+=]{40}/g,              // AWS secret access key
};
```

### Session & Request IDs
```typescript
const sessionPatterns = {
  sessionId: /sess(?:ion)?[-_]?[a-f0-9]{16,64}/gi,
  cookieValue: /=[a-zA-Z0-9+/=]{20,}/g,          // Cookie values
  csrfToken: /csrf[-_]?token[=:]\s*[a-zA-Z0-9+/=-]+/gi,
};
```

---

## Payment & Finance

### Payment Processors
```typescript
const paymentPatterns = {
  // Stripe
  stripeCustomer: /cus_[A-Za-z0-9]{14,}/g,
  stripeCharge: /ch_[A-Za-z0-9]{24,}/g,
  stripePaymentIntent: /pi_[A-Za-z0-9]{24,}/g,

  // PayPal
  paypalTxn: /[A-Z0-9]{17}/g,                    // PayPal transaction ID

  // Square
  squarePayment: /[a-zA-Z0-9]{22}/g,

  // Generic
  transactionId: /(?:txn|transaction)[-_]?id[=:]\s*[a-zA-Z0-9-]+/gi,
};
```

### Financial Data
```typescript
const financialPatterns = {
  // Credit card (PCI compliance - should NEVER be logged!)
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,

  // Account numbers (mask for privacy)
  accountNumber: /account[#\s:-]*\d{8,}/gi,

  // Routing numbers
  routingNumber: /routing[#\s:-]*\d{9}/gi,

  // Invoice/Order IDs
  invoiceId: /(?:INV|invoice)[-_]?\d{4,}/gi,
  orderId: /(?:ORD|order)[-_]?\d{6,}/gi,
};
```

---

## Observability & Tracing

### Distributed Tracing
```typescript
const tracingPatterns = {
  // OpenTelemetry/Jaeger
  traceId: /trace[-_]?id[=:]\s*[a-f0-9]{32}/gi,
  spanId: /span[-_]?id[=:]\s*[a-f0-9]{16}/gi,

  // Zipkin
  zipkinTraceId: /[a-f0-9]{16,32}/g,             // 64-bit or 128-bit

  // DataDog
  datadogTraceId: /dd\.trace_id[=:]\s*\d+/gi,

  // Generic correlation IDs
  correlationId: /(?:correlation|request|x-request)[-_]?id[=:]\s*[a-zA-Z0-9-]+/gi,
  requestId: /req[-_]?[a-f0-9]{8,}/gi,
};
```

### Metrics & Monitoring
```typescript
const metricsPatterns = {
  metricName: /metric[=:]\s*[a-z._]+/gi,
  prometheusLabel: /\{[a-z_]+="[^"]+"\}/gi,
};
```

---

## Database Systems

### PostgreSQL
```typescript
const postgresPatterns = {
  pid: /PID\s*:\s*\d+/gi,
  duration: /duration:\s*[\d.]+\s*ms/gi,
  statement: /statement:\s*.+$/gi,               // Mask SQL statements
};
```

### MongoDB
```typescript
const mongoPatterns = {
  objectId: /ObjectId\("[a-f0-9]{24}"\)/gi,
  connId: /conn\d+/gi,
  queryId: /queryId:\s*\d+/gi,
};
```

### MySQL
```typescript
const mysqlPatterns = {
  threadId: /Thread\s+\d+/gi,
  queryTime: /Query_time:\s*[\d.]+/gi,
};
```

### Redis
```typescript
const redisPatterns = {
  dbIndex: /DB\s+\d+/gi,
  keyName: /key[=:]\s*[^\s]+/gi,                 // Redis key names
};
```

---

## Web & HTTP

### URLs & Endpoints
```typescript
const webPatterns = {
  // Full URLs (already in DEFAULT_PATTERNS)
  fullUrl: /https?:\/\/[^\s]+/gi,

  // Query strings
  queryString: /\?[^\s#]+/gi,

  // Path parameters
  pathParam: /\/\d+(?=\/|$)/g,                   // /users/123/posts
  uuidInPath: /\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,

  // HTTP headers
  userAgent: /User-Agent:\s*.+$/gi,
  referer: /Referer:\s*.+$/gi,
};
```

### Status Codes & Durations
```typescript
const httpPatterns = {
  statusCode: /\b(?:status[=:]\s*)?(?:HTTP\/\d\.\d\s+)?([1-5]\d{2})\b/gi,
  duration: /\b\d+\.?\d*\s*(?:ms|sec|s|min|µs|us|ns)\b/gi,
  responseTime: /response_time[=:]\s*[\d.]+/gi,
};
```

---

## Healthcare

### HIPAA-Sensitive Identifiers
```typescript
const healthcarePatterns = {
  // Medical Record Number (MRN)
  mrn: /MRN[=:\s#]*[A-Z0-9]{6,}/gi,

  // Patient ID
  patientId: /(?:patient|pt)[-_]?id[=:]\s*[A-Z0-9-]+/gi,

  // National Provider Identifier (NPI)
  npi: /\b\d{10}\b/g,                            // 10-digit NPI

  // Encounter ID
  encounterId: /encounter[=:\s#]*[A-Z0-9-]+/gi,

  // Insurance Member ID
  memberId: /member[=:\s#]*[A-Z0-9-]+/gi,
};
```

---

## General Purpose

### Identifiers
```typescript
const generalPatterns = {
  // Generic UUID (already in DEFAULT_PATTERNS)
  uuid: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,

  // Generic hex strings
  hexString: /\b0x[a-f0-9]+\b/gi,
  longHex: /\b[a-f0-9]{16,}\b/gi,

  // Base64-encoded data
  base64: /[A-Za-z0-9+/]{20,}={0,2}/g,

  // Email addresses (for privacy)
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // Phone numbers (for privacy)
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,

  // MAC addresses
  macAddress: /\b[a-f0-9]{2}:[a-f0-9]{2}:[a-f0-9]{2}:[a-f0-9]{2}:[a-f0-9]{2}:[a-f0-9]{2}\b/gi,
};
```

### Kubernetes/Container
```typescript
const k8sPatterns = {
  podName: /[a-z0-9-]+-[a-z0-9]{9,10}-[a-z0-9]{5}/g,    // deployment-abc1234567-xyz89
  containerId: /[a-f0-9]{64}/g,                          // Full container ID
  shortContainerId: /[a-f0-9]{12}/g,                     // Short container ID
  namespace: /namespace[=:\/]\s*[a-z0-9-]+/gi,
  imageDigest: /sha256:[a-f0-9]{64}/g,
};
```

---

## Usage Examples

### Combine Multiple Pattern Sets
```typescript
import { defineStrategy } from 'logpare';

const comprehensiveStrategy = defineStrategy({
  patterns: {
    ...awsPatterns,
    ...tracingPatterns,
    ...webPatterns,
    // Add custom patterns
    myCustomId: /CUSTOM-\d+/g,
  }
});
```

### Selective Pattern Application
```typescript
// Only mask sensitive data, preserve structure
const privacyStrategy = defineStrategy({
  patterns: {
    // Financial
    creditCard: financialPatterns.creditCard,
    accountNumber: financialPatterns.accountNumber,

    // Personal
    email: generalPatterns.email,
    phone: generalPatterns.phone,

    // Healthcare
    mrn: healthcarePatterns.mrn,
    patientId: healthcarePatterns.patientId,
  }
});
```

### Domain-Specific Combinations
```typescript
// E-commerce application
const ecommerceStrategy = defineStrategy({
  patterns: {
    ...paymentPatterns,
    ...financialPatterns,
    customerId: /CUST-\d{8}/g,
    productSku: /SKU-[A-Z0-9]{6}/g,
  }
});

// Microservices platform
const microservicesStrategy = defineStrategy({
  patterns: {
    ...tracingPatterns,
    ...k8sPatterns,
    ...webPatterns,
    serviceId: /svc-[a-z0-9-]+/gi,
  }
});
```

---

## Testing Patterns

### Validate Regex
```typescript
const testPattern = (pattern: RegExp, testCases: string[]) => {
  testCases.forEach(test => {
    const match = test.match(pattern);
    console.log(`"${test}" → ${match ? match[0] : 'no match'}`);
  });
};

// Example
testPattern(awsPatterns.instanceId, [
  'i-1234567890abcdef0',  // Should match
  'instance-abc',         // Should not match
]);
```

### Performance Test
```typescript
const benchmarkPattern = (pattern: RegExp, text: string, iterations = 10000) => {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    text.replace(pattern, '<*>');
  }
  const elapsed = performance.now() - start;
  console.log(`${iterations} iterations in ${elapsed.toFixed(2)}ms`);
};
```

---

## Security Notes

**CRITICAL**: Never log sensitive data in the first place!

- **Credit cards**: Should NEVER appear in logs (PCI compliance)
- **Passwords**: Should NEVER appear in logs
- **API secrets**: Should NEVER appear in logs (use secret managers)
- **Personal data**: Comply with GDPR, HIPAA, etc.

These patterns are for **defense-in-depth** when sensitive data accidentally appears in logs, not as a replacement for proper security practices.
