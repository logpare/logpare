import Link from 'next/link';
import Logo from '@/components/Logo';

function Hero() {
  return (
    <header className="py-24 px-8 text-center bg-gradient-to-b from-fd-background to-fd-secondary/30">
      <div className="max-w-3xl mx-auto">
        <span className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/25 rounded-full font-mono text-xs font-semibold text-primary uppercase tracking-wide mb-6">
          Open Source · MIT License
        </span>
        <div className="flex items-center justify-center gap-3 mb-4">
          <Logo className="w-16 h-16 text-fd-foreground" />
        </div>
        <h1 className="text-5xl md:text-6xl font-bold font-mono tracking-tight mb-4">
          logpare
        </h1>
        <p className="text-xl md:text-2xl text-fd-muted-foreground font-sans mb-8">
          Semantic log compression for LLM context windows
        </p>
        <div className="terminal max-w-md mx-auto mb-8">
          <div className="terminal-header">
            <span className="terminal-dot" />
            <span className="terminal-dot" />
            <span className="terminal-dot" />
          </div>
          <div className="terminal-body">
            <code>
              <span className="terminal-prompt">$</span> npx logpare ./app.log
            </code>
          </div>
        </div>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/docs"
            className="inline-block px-6 py-3 font-sans font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/playground"
            className="inline-block px-6 py-3 font-sans font-semibold text-primary border-2 border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
          >
            Try Playground
          </Link>
        </div>
      </div>
    </header>
  );
}

function BeforeAfter() {
  return (
    <section className="py-20 px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold font-mono text-center tracking-tight mb-2">
          60-90% Token Reduction
        </h2>
        <p className="text-lg text-fd-muted-foreground text-center mb-12 font-sans">
          Stop wasting tokens on repetitive log patterns
        </p>
        <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
          <div className="flex-1 min-w-0 max-w-md">
            <h3 className="font-mono text-sm uppercase tracking-wider text-fd-muted-foreground mb-3">
              Before
            </h3>
            <pre className="code-block text-sm">
{`INFO Connection from 192.168.1.1 established
INFO Connection from 192.168.1.2 established
INFO Connection from 10.0.0.55 established
INFO Connection from 172.16.0.12 established
... (10,844 more similar lines)`}
            </pre>
            <div className="mt-3 text-sm text-fd-muted-foreground text-center">10,847 lines</div>
          </div>
          <div className="text-3xl font-bold text-primary hidden md:block">→</div>
          <div className="text-3xl font-bold text-primary md:hidden rotate-90">→</div>
          <div className="flex-1 min-w-0 max-w-md">
            <h3 className="font-mono text-sm uppercase tracking-wider text-fd-muted-foreground mb-3">
              After
            </h3>
            <pre className="code-block text-sm">
{`=== Log Compression Summary ===
Input: 10,847 lines → 23 templates

Top templates by frequency:
[4,521x] INFO Connection from <*> established
[3,892x] DEBUG Request <*> processed in <*>
[1,203x] WARN Retry attempt <*> for <*>`}
            </pre>
            <div className="mt-3 text-sm text-fd-muted-foreground text-center">23 templates</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyIBuiltThis() {
  return (
    <section className="py-20 px-8 flex justify-center">
      <div className="maker-note">
        <h2 className="font-serif text-2xl mb-5 mt-2 text-ink tracking-tight">
          Why I built this
        </h2>
        <p className="font-sans text-base leading-relaxed text-ink-muted mb-4">
          As I began building with AI coding assistants, I hit a wall:{' '}
          <strong className="text-ink font-semibold">context windows are expensive real estate.</strong>
        </p>
        <p className="font-sans text-base leading-relaxed text-ink-muted mb-4">
          Most developers just truncate logs or <code className="font-mono bg-black/5 px-1.5 py-0.5 rounded text-sm">grep</code> for errors.
          That felt imprecise. I wanted a way to keep the <em>structure</em> of
          the data without the <em>repetition</em>.
        </p>
        <p className="font-sans text-base leading-relaxed text-ink-muted mb-4">
          logpare is my attempt to solve the "noise vs. signal" problem—using
          the Drain algorithm to treat logs as a language rather than just text.
          It extracts the patterns that matter and discards the redundancy.
        </p>
        <div className="flex items-center gap-4 mt-7 pt-6 border-t border-black/10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-800 to-amber-600 text-paper flex items-center justify-center font-serif text-lg tracking-wide">
            JG
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-xs font-medium uppercase tracking-wide text-ink-muted">
              Built by
            </span>
            <span className="font-serif text-lg text-ink">Jeff Green</span>
            <span className="font-sans text-sm text-ink-muted">Product Engineer</span>
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
    <section className="py-20 px-8 bg-fd-secondary/30">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold font-mono text-center tracking-tight mb-12">
          Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="p-6 bg-fd-background rounded-lg border border-fd-border">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="font-mono font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="font-sans text-fd-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section className="py-20 px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold font-mono text-center tracking-tight mb-12">
          Quick Start
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-primary text-white rounded-full font-mono font-bold text-xl mb-4">
              1
            </div>
            <h3 className="font-mono font-semibold text-xl mb-4">CLI</h3>
            <pre className="code-block text-sm text-left">
{`npx logpare ./logs/*.log`}
            </pre>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-primary text-white rounded-full font-mono font-bold text-xl mb-4">
              2
            </div>
            <h3 className="font-mono font-semibold text-xl mb-4">Library</h3>
            <pre className="code-block text-sm text-left">
{`import { compress } from 'logpare';

const result = compress(lines);
console.log(result.formatted);`}
            </pre>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-primary text-white rounded-full font-mono font-bold text-xl mb-4">
              3
            </div>
            <h3 className="font-mono font-semibold text-xl mb-4">Pipe</h3>
            <pre className="code-block text-sm text-left">
{`cat app.log | npx logpare`}
            </pre>
          </div>
        </div>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/docs/installation"
            className="inline-block px-6 py-3 font-sans font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Installation Guide
          </Link>
          <Link
            href="/docs/api/compress"
            className="inline-block px-6 py-3 font-sans font-semibold text-primary border-2 border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
          >
            API Reference
          </Link>
        </div>
      </div>
    </section>
  );
}

function SuccessStories() {
  return (
    <section className="py-20 px-8 bg-fd-secondary/30">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-tight mb-4">
          Share Your Success Story
        </h2>
        <p className="text-lg text-fd-muted-foreground font-sans mb-8 leading-relaxed">
          Using logpare for log compression, LLM context optimization, or debugging?
          We'd love to hear how it's helped your workflow.
        </p>
        <div className="bg-fd-background rounded-lg border border-fd-border p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-left">
            <div>
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-mono font-semibold mb-1">Compression Results</h3>
              <p className="text-sm text-fd-muted-foreground">
                Share your token reduction ratios and cost savings
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">🔧</div>
              <h3 className="font-mono font-semibold mb-1">Integration Stories</h3>
              <p className="text-sm text-fd-muted-foreground">
                How you integrated logpare into your workflow
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">💡</div>
              <h3 className="font-mono font-semibold mb-1">Use Cases</h3>
              <p className="text-sm text-fd-muted-foreground">
                Creative ways you're using log compression
              </p>
            </div>
          </div>
          <a
            href="https://github.com/logpare/logpare/issues/new?template=success-story.yml"
            className="inline-block px-6 py-3 font-sans font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Submit Your Story
          </a>
          <p className="text-sm text-fd-muted-foreground mt-4">
            Stories may be featured on our website with your permission
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-8 bg-fd-card border-t border-fd-border">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-mono font-semibold mb-4">Docs</h3>
            <ul className="space-y-2 text-sm text-fd-muted-foreground">
              <li><Link href="/docs" className="hover:text-fd-foreground">Getting Started</Link></li>
              <li><Link href="/docs/api/compress" className="hover:text-fd-foreground">API Reference</Link></li>
              <li><Link href="/docs/cli" className="hover:text-fd-foreground">CLI Reference</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-mono font-semibold mb-4">Community</h3>
            <ul className="space-y-2 text-sm text-fd-muted-foreground">
              <li><a href="https://github.com/logpare/logpare" className="hover:text-fd-foreground">GitHub</a></li>
              <li><a href="https://github.com/logpare/logpare/issues" className="hover:text-fd-foreground">Issues</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-mono font-semibold mb-4">More</h3>
            <ul className="space-y-2 text-sm text-fd-muted-foreground">
              <li><a href="https://www.npmjs.com/package/logpare" className="hover:text-fd-foreground">npm Package</a></li>
              <li><a href="https://www.npmjs.com/package/@logpare/mcp" className="hover:text-fd-foreground">MCP Server</a></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-sm text-fd-muted-foreground pt-8 border-t border-fd-border">
          Copyright © {new Date().getFullYear()} logpare. Built with Fumadocs.
        </div>
      </div>
    </footer>
  );
}

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <Hero />
      <main>
        <BeforeAfter />
        <WhyIBuiltThis />
        <Features />
        <QuickStart />
        <SuccessStories />
      </main>
      <Footer />
    </>
  );
}
