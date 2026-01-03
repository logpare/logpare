# Algolia DocSearch Setup Guide

Complete guide for setting up Algolia DocSearch for the logpare open source project as of January 2026.

## Overview

**Algolia DocSearch** is a free, hosted search solution specifically designed for technical documentation and open source projects. It automatically crawls your documentation site and provides search functionality powered by Algolia's search engine.

**Key Benefits:**
- 100% free for open source and technical documentation
- Automated web crawling (no manual indexing needed)
- Full Docusaurus 3.9 integration
- Ask AI conversational search assistant support
- 5,000,000 records free per month
- 50,000,000 search requests per month
- 5,000,000 resources crawled per month

---

## Application Process

### Step 1: Visit DocSearch Dashboard

1. Navigate to: https://dashboard.algolia.com/users/sign_up?selected_plan=docsearch
2. Create an Algolia account (or log in if you already have one)
3. Select the DocSearch plan

### Step 2: Submit Your Domain

1. Enter your documentation site domain (e.g., `logpare.docs.example.com`)
2. Fill in project details
3. Confirm your website is publicly accessible

### Step 3: Automated Validation

The system will perform automated validation against DocSearch requirements:
- Website is production-ready (not under construction)
- Content is technical documentation
- Domain is publicly accessible and indexable

### Step 4: Domain Ownership Verification

**Timeline: Must complete within 7 days of approval**

You'll receive instructions to verify domain ownership via:
- DNS TXT record
- HTML file upload
- Or domain provider validation

### Step 5: Configure Crawler

Once approved, you'll configure DocSearch's web crawler:
- Set start URL(s) for crawling
- Configure URL patterns to include/exclude
- Set appropriate crawl depth and frequency
- Define selectors for content extraction

### Step 6: Receive Credentials

After crawler setup, you'll receive:
- **App ID**: Your Algolia application identifier
- **Search-Only API Key**: Public key for frontend search
- **Index Name**: DocSearch index identifier

Store these securely (can use environment variables or `.env.local`).

---

## Requirements Checklist

Before applying, ensure your project meets these criteria:

### Content Requirements
- [ ] Documentation site is **production-ready** (not placeholder/lorem ipsum)
- [ ] Content is **technical documentation** for an open source project
- [ ] Website is **publicly accessible** and indexable by web crawlers
- [ ] Minimum viable documentation exists (not just homepage)
- [ ] Site uses standard web technologies (HTML/CSS/JS)

### Domain Requirements
- [ ] You **own or control** the domain being submitted
- [ ] Domain is **not a subdomain** of a free hosting service (e.g., GitHub Pages is OK)
- [ ] No non-technical content mixed into documentation (e.g., marketing pages)
- [ ] Site doesn't use anti-bot protection that blocks DocSearch crawler

### Technical Requirements
- [ ] Documentation is **crawlable** (JavaScript-rendered sites need SEO considerations)
- [ ] Page content has proper **semantic HTML** (articles, sections, headings)
- [ ] No authentication wall blocking public access
- [ ] Documentation structure is logical (clear navigation)

### Licensing & Attribution
- [ ] You agree to display **"Search by Algolia"** badge/logo next to search results
- [ ] Logo links to: https://www.algolia.com
- [ ] Logo placement is **visible and prominent**

### Approval Criteria
Applications are **rejected** if:
- Website is not production-ready
- Content is non-technical
- Website structure prevents proper crawling
- No clear documentation exists

---

## Approval Timeline

### Typical Timeline

| Phase | Duration | Details |
|-------|----------|---------|
| **Application Submission** | Immediate | Submit domain through dashboard |
| **Automated Validation** | < 1 minute | System checks eligibility criteria |
| **Manual Review** | 1-2 business days | If automated check is inconclusive |
| **Approval Notification** | Immediate | Email confirmation with next steps |
| **Domain Verification** | 7 days max | You must complete verification |
| **Crawler Configuration** | 1-2 days | Setup indexing rules and patterns |
| **First Index Build** | 2-4 hours | Crawler indexes your documentation |
| **Credentials Delivery** | Immediate | Receive API credentials via email |

### Key Deadline

**⚠️ Important:** You must verify domain ownership **within 7 days** of approval, or your application will be deactivated.

### Recent Improvements

As of 2025-2026, DocSearch features:
- **Self-service onboarding** with immediate access
- **Automated validation** that eliminates most manual reviews
- **Faster processing** for well-structured documentation sites

---

## Docusaurus 3.9 Configuration

### Prerequisites

- Docusaurus 3.9 or higher
- Node.js 20.0 or higher
- DocSearch API credentials (app ID, search key, index name)

### Installation

First, update DocSearch to v4 (if not already using it):

```bash
npm install @docsearch/react@latest
# or with pnpm
pnpm add @docsearch/react@latest
```

### Basic Configuration

Open your `docusaurus.config.ts` (or `.js`) and add the Algolia configuration to `themeConfig`:

```typescript
// docusaurus.config.ts
export default {
  // ... other config ...

  themeConfig: {
    // ... other theme config ...

    algolia: {
      // Credentials from DocSearch approval email
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',  // This is public - it's read-only
      indexName: 'YOUR_INDEX_NAME',

      // Optional: Recommended settings
      contextualSearch: true,           // Filter results by current version/language
      searchPagePath: 'search',         // Custom search page route (optional)

      // Optional: Advanced options
      externalUrlRegex: 'example\\.com|blog\\.example\\.com',  // External domains to include
      insights: false,                  // Track search analytics (requires additional setup)

      // Optional: Customize search parameters
      searchParameters: {
        facetFilters: [],  // Additional facet filtering
      },
    },
  },
};
```

### Required: Algolia Logo Attribution

DocSearch requires you display the Algolia logo. This is typically auto-handled by the theme, but verify it appears next to search results.

If using custom search UI, add:

```html
<a href="https://www.algolia.com/docsearch">
  <img src="https://cdn.jsdelivr.net/npm/docsearch.js@2/dist/cdn/docsearch.png" alt="Search by Algolia" />
</a>
```

### Advanced: Contextual Search Configuration

For multi-version documentation:

```typescript
algolia: {
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_SEARCH_API_KEY',
  indexName: 'YOUR_INDEX_NAME',
  contextualSearch: true,
  searchParameters: {
    facetFilters: [
      'language:en',
      ['docusaurus_tag:default', 'docusaurus_tag:docs-default-current'],
    ],
  },
},
```

### Troubleshooting Configuration Issues

**Issue:** Search returns no results even though index exists

**Solutions:**
1. Verify `appId`, `apiKey`, and `indexName` are correct
2. Check that DocSearch crawler has completed indexing (check Algolia dashboard)
3. For multi-language sites, ensure `facetFilters` match indexed fields
4. Verify no authentication walls block crawler access

**Issue:** Index doesn't match my site content

**Solutions:**
1. Log into Algolia dashboard
2. Check crawler configuration and crawl logs
3. Ensure crawler URLs are correct
4. Check content extraction selectors
5. May need to delete/recreate index and re-crawl

---

## Ask AI Feature Setup

### Overview

**Ask AI** adds a conversational AI assistant to your DocSearch. Users can ask natural language questions and get answers based on your documentation.

### Prerequisites

- DocSearch v4 (required for Ask AI support)
- Docusaurus 3.9+ (with Ask AI support)
- LLM provider account with API key (OpenAI, Anthropic, etc.)
- Ask AI assistant created in Algolia dashboard

### Step 1: Create Ask AI Assistant

1. **Log in** to Algolia dashboard
2. Navigate to your **DocSearch application**
3. Go to **Data Sources > Ask AI**
4. Click **"Create Your Assistant"**

### Step 2: Configure Domains

Whitelist all domains where Ask AI should be active:

```
Exact domains:    www.logpare.dev
                  logpare.dev

Wildcard patterns: *.logpare.dev
                   docs.logpare.*
```

Only requests from whitelisted domains will access your Ask AI assistant.

### Step 3: Select & Configure LLM Provider

Choose your LLM provider and configure:

```
Provider Options:
  - OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5 Turbo)
  - Anthropic (Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku)
  - Mistral
  - Custom via API endpoints

Configuration:
  - API Key: Enter your provider API key securely
  - Model: Select specific model version
  - Temperature: 0.7 (recommended)
  - Max Tokens: Set reasonable limits to manage costs
  - Token Limit Alerts: Enable cost warnings
```

### Step 4: Create System Prompt

Choose from three pre-built prompt templates or create custom:

**Template Option 1: Technical Documentation Expert**
```
You are an expert in [PROJECT_NAME]. Help users understand and use
[PROJECT_NAME] by answering questions based on the official documentation.
Be concise, accurate, and cite documentation sections when relevant.
```

**Template Option 2: Technical Support**
```
You are a technical support specialist for [PROJECT_NAME]. Help users
troubleshoot issues and get the most out of [PROJECT_NAME]. Provide
step-by-step guidance and practical examples.
```

**Template Option 3: Customer Service (for commercial projects)**
```
You are a helpful assistant for [PROJECT_NAME] users. Answer questions
about features, usage, and best practices. Escalate complex issues to
human support when needed.
```

**Custom Template:**
- Write your own system prompt
- Define assistant tone and behavior
- Specify response format preferences
- Include any project-specific guidelines

### Step 5: Configure Docusaurus Integration

Update your `docusaurus.config.ts` to enable Ask AI:

```typescript
// docusaurus.config.ts
export default {
  themeConfig: {
    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'YOUR_INDEX_NAME',

      // Ask AI Configuration (DocSearch v4 only)
      askAi: {
        // Your Ask AI Assistant ID from Algolia dashboard
        assistantId: 'YOUR_ASSISTANT_ID',

        // Optional: Filter Ask AI to specific documentation sections
        searchParameters: {
          facetFilters: ['language:en', 'version:latest'],
        },

        // Optional: Show suggested questions in the UI
        suggestedQuestions: true,
      },
    },
  },
};
```

### Step 6: Test Ask AI

1. **Build your Docusaurus site**: `pnpm build`
2. **Start local server**: `pnpm start`
3. **Open search box** and look for Ask AI assistant
4. **Test with questions**:
   - "How do I get started with logpare?"
   - "What compression ratios can I achieve?"
   - "How do I configure custom preprocessing?"

### Ask AI Best Practices

| Practice | Recommendation |
|----------|----------------|
| **Cost Management** | Set token limits in LLM config, monitor usage in Algolia dashboard |
| **Response Quality** | Use specific, detailed system prompts; test with real user questions |
| **Documentation Quality** | Ensure docs are well-structured; Ask AI quality depends on indexed content |
| **Suggested Questions** | Enable for better UX; appear based on popular searches |
| **Fallback Behavior** | Configure what happens if Ask AI fails (fall back to keyword search) |
| **User Privacy** | Remember: Ask AI logs queries; review privacy policy implications |

### API Configuration for Custom UI

If not using Docusaurus, integrate Ask AI directly:

```javascript
import { askAi } from '@docsearch/react';

const response = await askAi({
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_SEARCH_API_KEY',
  assistantId: 'YOUR_ASSISTANT_ID',
  query: 'How do I use logpare?',
  facetFilters: ['language:en'],
});

console.log(response.answer);      // AI-generated answer
console.log(response.citations);   // Source documentation links
```

---

## Implementation Checklist

Use this checklist as you implement DocSearch:

### Pre-Application
- [ ] Documentation site is production-ready
- [ ] All main docs pages are published
- [ ] Site is publicly accessible
- [ ] Domain is properly configured

### Application & Approval
- [ ] Applied via DocSearch dashboard
- [ ] Application approved by Algolia
- [ ] Domain ownership verified within 7 days
- [ ] Received API credentials (app ID, search key, index name)

### Docusaurus Integration
- [ ] Upgraded to Docusaurus 3.9+
- [ ] Updated to DocSearch v4: `npm install @docsearch/react@latest`
- [ ] Added Algolia config to `docusaurus.config.ts`
- [ ] Verified Algolia logo appears in search UI
- [ ] Tested search functionality locally
- [ ] Rebuilt and deployed documentation site

### Ask AI Setup (Optional)
- [ ] Created Ask AI assistant in Algolia dashboard
- [ ] Configured LLM provider (OpenAI/Anthropic/etc.)
- [ ] Created system prompt or selected template
- [ ] Whitelisted documentation domain(s)
- [ ] Updated `docusaurus.config.ts` with `askAi` config
- [ ] Tested Ask AI with sample questions
- [ ] Verified suggested questions appear (if enabled)
- [ ] Monitored LLM token usage

### Post-Launch Monitoring
- [ ] Monitor search analytics in Algolia dashboard
- [ ] Check crawler health and indexing status
- [ ] Review Ask AI interaction logs (if enabled)
- [ ] Verify attribution logo is displayed
- [ ] Track user engagement with search/Ask AI

---

## Useful Resources

### Official Documentation
- **DocSearch Program:** https://docsearch.algolia.com/docs/docsearch-program/
- **Who Can Apply:** https://docsearch.algolia.com/docs/who-can-apply/
- **DocSearch v4 Guide:** https://docsearch.algolia.com/docs/docsearch/
- **Ask AI Setup:** https://docsearch.algolia.com/docs/v4/askai/
- **Ask AI API Reference:** https://docsearch.algolia.com/docs/v4/askai-api/

### Docusaurus Integration
- **Docusaurus Search Documentation:** https://docusaurus.io/docs/search
- **Docusaurus 3.9 Release Notes:** https://docusaurus.io/blog/releases/3.9
- **Algolia Code Exchange:** https://www.algolia.com/developers/code-exchange/integrate-docusaurus-with-algolia-docsearch

### Algolia Resources
- **Algolia for Open Source:** https://www.algolia.com/for-open-source
- **DocSearch Plan Terms:** https://www.algolia.com/policies/docsearch-plan-specific-terms
- **Support & Community:** community@algolia.com
- **Algolia Discord:** https://discord.gg/algolia

### Related Tools
- **DocSearch Configs Repo:** https://github.com/algolia/docsearch-configs (reference configurations)
- **Docusaurus Search Comparison:** Multiple search solutions available

---

## FAQ

### How long until search is live after I apply?

Typically 1-2 weeks total:
- Application review: 1-2 business days
- Domain verification: up to 7 days (you control timeline)
- Crawler setup & first index: 2-4 hours after verification
- Total: 2-10 days depending on domain verification speed

### Can I use DocSearch with my own custom domain?

Yes! As long as you control/own the domain. Subdomains of free hosting (GitHub Pages, Vercel, etc.) are fine.

### What if my site doesn't get approved?

Common rejection reasons:
- Site not production-ready (too much placeholder content)
- Non-technical content mixed in
- Crawler can't access site (auth walls, robots.txt blocks)
- Poor site structure for crawling

**Solution:** Address the issues and reapply. Algolia usually provides feedback.

### Can I upgrade to paid DocSearch later?

Yes! You can upgrade from free DocSearch to a paid Algolia plan at any time to get additional features (higher limits, more analytics, etc.).

### Do I have to use Ask AI?

No! Ask AI is optional. You can use DocSearch search alone without the conversational AI component.

### How much does Ask AI cost?

Ask AI costs depend on your LLM provider:
- **OpenAI GPT-4 Turbo:** ~$0.01-0.03 per query
- **Anthropic Claude 3 Haiku:** ~$0.001-0.005 per query
- **Mistral:** Varies by model

Cost = (queries × tokens per query × provider rate). Set limits in Algolia dashboard.

### Can I use Ask AI with free DocSearch?

Yes! Ask AI works with free DocSearch. You only pay for LLM provider usage, not Algolia.

### What if my documentation site changes structure?

The crawler needs reconfiguration if:
- Main URL structure changes
- Content moves to different subpaths
- Documentation framework changes

You can update crawler rules in the Algolia dashboard anytime.

### How often does DocSearch re-crawl my site?

Default: Daily crawls. You can adjust crawl frequency in Algolia dashboard based on how often you update docs.

---

## Next Steps

1. **Prepare your documentation:** Ensure logpare docs are comprehensive and production-ready
2. **Apply to DocSearch:** Visit https://dashboard.algolia.com/users/sign_up?selected_plan=docsearch
3. **Verify domain:** Complete ownership verification within 7 days
4. **Integrate with Docusaurus:** Add Algolia config to `docusaurus.config.ts`
5. **Deploy:** Build and publish your documentation site
6. **Monitor:** Check Algolia dashboard for indexing health and search analytics
7. **(Optional) Enable Ask AI:** Set up conversational search assistant for enhanced UX

---

**Last Updated:** January 2026
**Docusaurus Version:** 3.9+
**DocSearch Version:** v4.0+
**Status:** Documentation current as of January 3, 2026
