/**
 * UCP Extension Types for @logpare/mcp
 *
 * Optional extension for Universal Commerce Protocol (UCP) compatibility.
 * Enable with { ucp: { enabled: true } } in server config.
 */

/**
 * UCP Extension configuration
 */
export interface UCPExtensionConfig {
  /** Enable UCP tools and resources */
  enabled: boolean;

  /** UCP protocol version (default: "2026-01-11") */
  version?: string;

  /** Custom UCP patterns to recognize */
  customPatterns?: UCPCustomPattern[];
}

/**
 * Custom pattern for UCP log recognition
 */
export interface UCPCustomPattern {
  /** Pattern name */
  name: string;

  /** Regex pattern to match */
  pattern: RegExp;

  /** Pattern category */
  category: 'session_id' | 'error_code' | 'status' | 'custom';
}

/**
 * UCP Checkout Session context extracted from logs
 */
export interface UCPCheckoutContext {
  /** Checkout session IDs found in logs */
  session_ids: string[];

  /** Status transitions observed */
  status_flow: string[];

  /** Error codes encountered */
  error_codes: string[];

  /** Duration in ms (if extractable) */
  duration_ms?: number;
}

/**
 * UCP error code with metadata
 */
export interface UCPErrorCode {
  /** Error code identifier */
  code: string;

  /** Severity level */
  severity: 'recoverable' | 'requires_buyer_input' | 'requires_buyer_review';

  /** Human-readable description */
  description: string;
}

/**
 * Standard UCP error codes
 */
export const UCP_ERROR_CODES: UCPErrorCode[] = [
  {
    code: 'MERCHANDISE_NOT_AVAILABLE',
    severity: 'requires_buyer_input',
    description: 'Requested item is out of stock or unavailable',
  },
  {
    code: 'PAYMENT_DECLINED',
    severity: 'requires_buyer_input',
    description: 'Payment instrument was declined',
  },
  {
    code: 'CHECKOUT_EXPIRED',
    severity: 'recoverable',
    description: 'Checkout session has expired',
  },
  {
    code: 'INVALID_CURRENCY',
    severity: 'recoverable',
    description: 'Unsupported currency for this merchant',
  },
  {
    code: 'INVENTORY_UNAVAILABLE',
    severity: 'requires_buyer_input',
    description: 'Insufficient inventory for requested quantity',
  },
  {
    code: 'DISCOUNT_CODE_EXPIRED',
    severity: 'recoverable',
    description: 'Discount code has expired',
  },
  {
    code: 'DISCOUNT_CODE_INVALID',
    severity: 'recoverable',
    description: 'Discount code is not recognized',
  },
  {
    code: 'DISCOUNT_CODE_ALREADY_APPLIED',
    severity: 'recoverable',
    description: 'Discount code has already been applied to this checkout',
  },
];

/**
 * UCP checkout status values
 */
export type UCPCheckoutStatus =
  | 'incomplete'
  | 'requires_escalation'
  | 'ready_for_complete'
  | 'complete_in_progress'
  | 'completed'
  | 'canceled';

/**
 * UCP-enhanced compression result
 */
export interface UCPCompressionResult {
  /** Output version */
  version: '1.2';

  /** UCP-specific context */
  ucp_context: UCPCheckoutContext;

  /** Standard compression stats */
  stats: {
    inputLines: number;
    uniqueTemplates: number;
    compressionRatio: number;
    estimatedTokenReduction: number;
  };

  /** Compressed templates */
  templates: Array<{
    id: string;
    pattern: string;
    occurrences: number;
    severity: string;
  }>;
}
