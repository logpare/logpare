import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

function Hero() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <h1 className={styles.heroTitle}>logpare</h1>
        <p className={styles.heroSubtitle}>
          Semantic log compression for LLM context windows
        </p>
        <div className={styles.terminal}>
          <div className={styles.terminalHeader}>
            <span className={styles.terminalDot} />
            <span className={styles.terminalDot} />
            <span className={styles.terminalDot} />
          </div>
          <div className={styles.terminalBody}>
            <code>
              <span className={styles.terminalPrompt}>$</span> npx logpare ./app.log
            </code>
          </div>
        </div>
        <div className={styles.heroButtons}>
          <Link className={styles.primaryButton} to="/docs/intro">
            Get Started
          </Link>
          <Link className={styles.secondaryButton} to="/playground">
            Try Playground
          </Link>
        </div>
      </div>
    </header>
  );
}

function BeforeAfter() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>60-90% Token Reduction</h2>
        <p className={styles.sectionSubtitle}>
          Stop wasting tokens on repetitive log patterns
        </p>
        <div className={styles.comparison}>
          <div className={styles.comparisonBlock}>
            <h3 className={styles.comparisonTitle}>Before</h3>
            <pre className={styles.codeBlock}>
{`INFO Connection from 192.168.1.1 established
INFO Connection from 192.168.1.2 established
INFO Connection from 10.0.0.55 established
INFO Connection from 172.16.0.12 established
... (10,844 more similar lines)`}
            </pre>
            <div className={styles.stat}>10,847 lines</div>
          </div>
          <div className={styles.comparisonArrow}>→</div>
          <div className={styles.comparisonBlock}>
            <h3 className={styles.comparisonTitle}>After</h3>
            <pre className={styles.codeBlock}>
{`=== Log Compression Summary ===
Input: 10,847 lines → 23 templates

Top templates by frequency:
[4,521x] INFO Connection from <*> established
[3,892x] DEBUG Request <*> processed in <*>
[1,203x] WARN Retry attempt <*> for <*>`}
            </pre>
            <div className={styles.stat}>23 templates</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      title: 'High Compression',
      description: '60-90% token reduction using the Drain algorithm to identify log templates.',
      icon: '📉',
    },
    {
      title: 'Preserves Context',
      description: 'Extracts URLs, status codes, correlation IDs, and timing data automatically.',
      icon: '🔍',
    },
    {
      title: 'Fast Processing',
      description: '10,000+ lines/second with V8-optimized, monomorphic classes.',
      icon: '⚡',
    },
    {
      title: 'Multiple Formats',
      description: 'Summary, detailed, and JSON output formats for different use cases.',
      icon: '📋',
    },
  ];

  return (
    <section className={`${styles.section} ${styles.sectionAlt}`}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Features</h2>
        <div className={styles.featureGrid}>
          {features.map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Quick Start</h2>
        <div className={styles.quickStartGrid}>
          <div className={styles.quickStartStep}>
            <div className={styles.stepNumber}>1</div>
            <h3>CLI</h3>
            <pre className={styles.codeBlockSmall}>
{`npx logpare ./logs/*.log`}
            </pre>
          </div>
          <div className={styles.quickStartStep}>
            <div className={styles.stepNumber}>2</div>
            <h3>Library</h3>
            <pre className={styles.codeBlockSmall}>
{`import { compress } from 'logpare';

const result = compress(lines);
console.log(result.formatted);`}
            </pre>
          </div>
          <div className={styles.quickStartStep}>
            <div className={styles.stepNumber}>3</div>
            <h3>Pipe</h3>
            <pre className={styles.codeBlockSmall}>
{`cat app.log | npx logpare`}
            </pre>
          </div>
        </div>
        <div className={styles.ctaButtons}>
          <Link className={styles.primaryButton} to="/docs/installation">
            Installation Guide
          </Link>
          <Link className={styles.secondaryButton} to="/docs/api/compress">
            API Reference
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): React.JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Semantic Log Compression`}
      description="Semantic log compression for LLM context windows. Reduce log tokens by 60-90% while preserving diagnostic information."
    >
      <Hero />
      <main>
        <BeforeAfter />
        <Features />
        <QuickStart />
      </main>
    </Layout>
  );
}
