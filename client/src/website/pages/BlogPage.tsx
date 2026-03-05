// client/src/features/landing/BlogPage.tsx
// SEO-optimized blog for dashfields.com — social media marketing articles.
import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Clock, Tag, Search, ChevronRight, Rss, TrendingUp, BookOpen } from "lucide-react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

// ─── Blog Data ────────────────────────────────────────────────────────────────
const BLOG_POSTS = [
  {
    slug: "meta-ads-roas-optimization-2025",
    title: "How to Improve Your Paid Ads ROAS in 2025: A Complete Guide",
    excerpt: "Discover proven strategies to maximize your Return on Ad Spend on Facebook and Instagram. From audience targeting to creative testing, learn what actually works.",
    category: "Paid Ads",
    readTime: "8 min read",
    date: "March 3, 2025",
    image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80",
    featured: true,
    tags: ["Paid Ads", "ROAS", "Multi-Platform", "Analytics"],
  },
  {
    slug: "social-media-analytics-dashboard-guide",
    title: "The Ultimate Guide to Social Media Analytics Dashboards",
    excerpt: "Stop drowning in data. Learn how to build a social media analytics dashboard that gives you actionable insights across all your platforms in one place.",
    category: "Analytics",
    readTime: "6 min read",
    date: "February 28, 2025",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
    featured: true,
    tags: ["Analytics", "Dashboard", "Social Media"],
  },
  {
    slug: "ai-content-creation-social-media",
    title: "AI-Powered Content Creation for Social Media: What's Working in 2025",
    excerpt: "AI tools are transforming how brands create social media content. Here's how to use AI to generate high-performing posts, captions, and ad copy at scale.",
    category: "AI & Automation",
    readTime: "7 min read",
    date: "February 22, 2025",
    image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80",
    featured: false,
    tags: ["AI", "Content Creation", "Automation"],
  },
  {
    slug: "tiktok-ads-strategy-beginners",
    title: "TikTok Ads Strategy for Beginners: From Zero to First Campaign",
    excerpt: "TikTok advertising is no longer optional for brands targeting Gen Z and Millennials. This step-by-step guide walks you through launching your first successful TikTok campaign.",
    category: "TikTok",
    readTime: "9 min read",
    date: "February 15, 2025",
    image: "https://images.unsplash.com/photo-1611605698335-8441fbfd843d?w=800&q=80",
    featured: false,
    tags: ["TikTok", "Ads", "Strategy"],
  },
  {
    slug: "social-media-content-calendar-template",
    title: "How to Build a Social Media Content Calendar That Actually Works",
    excerpt: "A well-structured content calendar is the backbone of any successful social media strategy. Download our free template and learn how to plan 30 days of content in 2 hours.",
    category: "Content Strategy",
    readTime: "5 min read",
    date: "February 10, 2025",
    image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&q=80",
    featured: false,
    tags: ["Content Calendar", "Planning", "Strategy"],
  },
  {
    slug: "instagram-engagement-rate-improve",
    title: "10 Proven Ways to Improve Your Instagram Engagement Rate",
    excerpt: "Engagement rate is the true measure of Instagram success. Learn the tactics top brands use to consistently achieve 5%+ engagement rates on their posts.",
    category: "Instagram",
    readTime: "6 min read",
    date: "February 5, 2025",
    image: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=80",
    featured: false,
    tags: ["Instagram", "Engagement", "Growth"],
  },
  {
    slug: "linkedin-b2b-marketing-guide",
    title: "LinkedIn B2B Marketing: The Complete 2025 Playbook",
    excerpt: "LinkedIn generates 80% of B2B leads from social media. This comprehensive guide covers organic content, paid campaigns, and thought leadership strategies that convert.",
    category: "LinkedIn",
    readTime: "10 min read",
    date: "January 28, 2025",
    image: "https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=800&q=80",
    featured: false,
    tags: ["LinkedIn", "B2B", "Lead Generation"],
  },
  {
    slug: "social-media-budget-allocation-guide",
    title: "How to Allocate Your Social Media Advertising Budget in 2025",
    excerpt: "With so many platforms competing for your ad budget, how do you decide where to invest? This data-driven guide helps you allocate spend for maximum ROI.",
    category: "Strategy",
    readTime: "7 min read",
    date: "January 20, 2025",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
    featured: false,
    tags: ["Budget", "ROI", "Strategy"],
  },
];

const CATEGORIES = ["All", "Paid Ads", "Analytics", "AI & Automation", "TikTok", "Instagram", "LinkedIn", "Content Strategy", "Strategy"];

const CATEGORY_COLORS: Record<string, string> = {
  "Paid Ads": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Analytics": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "AI & Automation": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "TikTok": "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  "Instagram": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "LinkedIn": "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "Content Strategy": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Strategy": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
};

// ─── Article Card ─────────────────────────────────────────────────────────────
function ArticleCard({ post, featured = false }: { post: typeof BLOG_POSTS[0]; featured?: boolean }) {
  const catColor = CATEGORY_COLORS[post.category] ?? "bg-gray-100 text-gray-600";
  return (
    <Link href={`/blog/${post.slug}`}>
      <article className={`group cursor-pointer rounded-2xl overflow-hidden border border-border/40 bg-card hover:border-brand/30 hover:shadow-lg transition-all duration-300 ${featured ? "flex flex-col md:flex-row" : "flex flex-col"}`}>
        <div className={`overflow-hidden ${featured ? "md:w-2/5 shrink-0" : ""}`}>
          <img
            src={post.image}
            alt={post.title}
            className={`w-full object-cover group-hover:scale-105 transition-transform duration-500 ${featured ? "h-56 md:h-full" : "h-44"}`}
          />
        </div>
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${catColor}`}>
              {post.category}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.readTime}
            </span>
          </div>
          <h2 className={`font-bold text-foreground group-hover:text-brand transition-colors leading-snug mb-2 ${featured ? "text-xl" : "text-base"}`}>
            {post.title}
          </h2>
          <p className="text-sm text-muted-foreground line-clamp-2 flex-1 mb-4">
            {post.excerpt}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{post.date}</span>
            <span className="text-xs font-medium text-brand flex items-center gap-1 group-hover:gap-2 transition-all">
              Read more <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ─── Blog Post Page ───────────────────────────────────────────────────────────
function BlogPostPage({ slug }: { slug: string }) {
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Article not found.</p></div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-sm font-bold text-brand">Dashfields</Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm text-foreground truncate">{post.category}</span>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category] ?? "bg-gray-100 text-gray-600"}`}>
              {post.category}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />{post.readTime}
            </span>
            <span className="text-xs text-muted-foreground">{post.date}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{post.title}</h1>
          <p className="text-lg text-muted-foreground">{post.excerpt}</p>
        </div>

        {/* Featured Image */}
        <img src={post.image} alt={post.title} className="w-full h-72 object-cover rounded-2xl mb-10" />

        {/* Article Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-[15px] leading-relaxed">
          <p>
            In today's competitive digital landscape, understanding and optimizing your social media performance is no longer optional — it's essential for business growth. Whether you're managing campaigns for a small business or overseeing a multi-platform strategy for an enterprise brand, the principles remain the same: measure what matters, test consistently, and iterate quickly.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">Why This Matters in 2025</h2>
          <p>
            The social media advertising landscape has evolved dramatically. Platforms are more sophisticated, audiences are more discerning, and competition for attention has never been higher. Brands that succeed are those that combine data-driven decision making with creative excellence.
          </p>
          <p>
            The good news? With the right tools and frameworks, you can systematically improve your performance across every metric that matters — from reach and engagement to conversions and revenue.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">Key Strategies to Implement</h2>
          <p>
            The most successful social media marketers share a common trait: they treat their channels as living experiments. Every post, every ad, every campaign is an opportunity to learn something new about your audience and refine your approach.
          </p>
          <p>
            Start by establishing clear baselines for your key metrics. What is your current average engagement rate? What's your typical cost per click? What conversion rate are you achieving from social traffic? Without these benchmarks, you can't measure improvement.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">Measuring What Matters</h2>
          <p>
            Not all metrics are created equal. Vanity metrics like follower count and raw impressions can be misleading. Focus instead on metrics that directly correlate with business outcomes: engagement rate, click-through rate, conversion rate, and return on ad spend (ROAS).
          </p>
          <p>
            A unified analytics dashboard — one that aggregates data from all your platforms in one place — is invaluable here. It allows you to spot patterns, identify underperforming channels, and reallocate budget to what's working.
          </p>

          <h2 className="text-xl font-bold mt-8 mb-4">The Role of AI and Automation</h2>
          <p>
            Artificial intelligence is transforming social media marketing in profound ways. From AI-generated content suggestions to automated bid optimization, the tools available today can dramatically reduce the time you spend on routine tasks while improving outcomes.
          </p>
          <p>
            The key is to use AI as an amplifier of human creativity and judgment, not a replacement for it. Let AI handle the data analysis and pattern recognition, while you focus on strategy and creative direction.
          </p>

          <div className="bg-brand/5 border border-brand/20 rounded-2xl p-6 my-8">
            <h3 className="font-bold text-brand mb-2">Ready to take your social media analytics to the next level?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Dashfields gives you a unified dashboard for all your social media platforms, with AI-powered insights and automated reporting.
            </p>
            <Link href="/dashboard">
              <button className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                Start Free Trial →
              </button>
            </Link>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-border/40">
          {post.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>

        {/* Related Articles */}
        <div className="mt-12">
          <h3 className="text-lg font-bold mb-4">Related Articles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 2).map((p) => (
              <ArticleCard key={p.slug} post={p} />
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}

// ─── Main Blog Page ───────────────────────────────────────────────────────────
export default function BlogPage({ params }: { params?: { slug?: string } }) {
  usePageTitle(params?.slug ? "Blog Article" : "Blog — Social Media Marketing Tips");

  if (params?.slug) {
    return <BlogPostPage slug={params.slug} />;
  }

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = BLOG_POSTS.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const featured = filtered.filter((p) => p.featured);
  const rest = filtered.filter((p) => !p.featured);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold text-brand">Dashfields</Link>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="text-sm font-medium text-foreground">Blog</Link>
            <Link href="/dashboard">
              <button className="px-3 py-1.5 rounded-lg bg-brand text-brand-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-b from-brand/5 to-background border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 text-brand text-xs font-medium mb-4">
            <Rss className="w-3.5 h-3.5" />
            Social Media Marketing Blog
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Grow Your Brand with
            <span className="text-brand"> Data-Driven</span> Insights
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            Expert guides, strategies, and tips to help you master social media marketing, advertising, and analytics.
          </p>
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat
                  ? "bg-brand text-brand-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No articles found. Try a different search or category.</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-brand" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Featured</h2>
                </div>
                <div className="space-y-6">
                  {featured.map((p) => <ArticleCard key={p.slug} post={p} featured />)}
                </div>
              </div>
            )}

            {/* All Articles */}
            {rest.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-brand" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {featured.length > 0 ? "More Articles" : "Articles"}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((p) => <ArticleCard key={p.slug} post={p} />)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Newsletter CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-br from-brand/10 to-brand/5 border border-brand/20 p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Stay Ahead of the Curve</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Get weekly insights on social media marketing, analytics tips, and platform updates delivered to your inbox.
          </p>
          <div className="flex gap-2 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-3 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button className="px-4 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
