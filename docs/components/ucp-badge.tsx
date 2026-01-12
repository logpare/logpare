import type { ReactNode } from 'react';

export function UCPBadge(): ReactNode {
  return (
    <a
      href="https://ucp.dev"
      target="_blank"
      rel="noopener noreferrer"
      className="ucp-badge"
      title="Universal Commerce Protocol Compatible"
    >
      <span className="ucp-badge-icon">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </span>
      UCP-Ready
    </a>
  );
}

export function UCPFeatureCard(): ReactNode {
  return (
    <div className="ucp-feature-card">
      <div className="ucp-feature-card-header">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ucp-feature-card-icon"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <h3>UCP-Ready</h3>
      </div>
      <p>
        Compatible with the{' '}
        <a href="https://ucp.dev" target="_blank" rel="noopener noreferrer">
          Universal Commerce Protocol
        </a>{' '}
        for agentic commerce. Compress checkout logs, analyze payment errors, and debug
        multi-agent transactions.
      </p>
      <ul>
        <li>Checkout session log compression</li>
        <li>UCP error pattern analysis</li>
        <li>Agent-to-Agent (A2A) log processing</li>
        <li>Session ID and status tracking</li>
      </ul>
    </div>
  );
}
