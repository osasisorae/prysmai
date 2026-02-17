/**
 * Blog — Multi-post blog with index and article views
 * Design: Matches the refined V5 landing page (Inter, 2-color, generous whitespace)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, User, ArrowRight } from "lucide-react";
import { Link, useRoute } from "wouter";
import { getAllPosts, getPostBySlug, type BlogPost } from "@/data/blog-posts";
import { EarlyAccessModal } from "@/components/EarlyAccessModal";

const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663306080277/pKkWElgCpRmlNvjQ.png";

/* ─── Shared Navbar ─── */
function BlogNav({ onEarlyAccess }: { onEarlyAccess: () => void }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/80">
      <div className="container flex items-center justify-between h-16">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <img src={LOGO_URL} alt="Prysm AI" className="w-8 h-8" />
            <span className="text-lg font-semibold tracking-tight">
              Prysm<span className="text-primary">AI</span>
            </span>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
          <Link href="/blog" className="text-foreground font-medium">Blog</Link>
        </div>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onEarlyAccess}
        >
          Get Early Access
        </Button>
      </div>
    </nav>
  );
}

/* ─── Shared Footer ─── */
function BlogFooter() {
  return (
    <footer className="border-t border-border py-16">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="Prysm AI" className="w-7 h-7" />
            <span className="text-sm font-semibold">
              Prysm<span className="text-primary">AI</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built for builders who go deeper.
          </p>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Prysm AI
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Blog Index (list of all posts) ─── */
function BlogIndex() {
  const posts = getAllPosts();
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BlogNav onEarlyAccess={() => setEarlyAccessOpen(true)} />

      <section className="pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="container max-w-3xl">
          <p className="text-sm font-medium text-primary tracking-wide mb-4">
            Blog
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Insights from the frontier of AI interpretability
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-20">
            Technical deep dives, research breakdowns, and practical guides for the engineers building AI systems that need to be understood, not just deployed.
          </p>

          <div className="space-y-12">
            {posts.map((post) => (
              <article key={post.slug} className="group">
                <Link href={`/blog/${post.slug}`}>
                  <div className="cursor-pointer">
                    <span className="text-xs font-medium text-primary tracking-wide uppercase">
                      {post.category}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-2 mb-3 group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {post.author}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {post.readTime}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="mt-8 border-b border-border/30" />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/30">
        <div className="container max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to see inside your AI?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join the builders who go deeper. Get early access to Prysm AI.
          </p>
          <Button
            className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            onClick={() => setEarlyAccessOpen(true)}
          >
            Get Early Access
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      <BlogFooter />

      <EarlyAccessModal open={earlyAccessOpen} onOpenChange={setEarlyAccessOpen} />
    </div>
  );
}

/* ─── Single Article View ─── */
function BlogArticle({ post }: { post: BlogPost }) {
  const posts = getAllPosts();
  const currentIndex = posts.findIndex((p) => p.slug === post.slug);
  const nextPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;
  const prevPost = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BlogNav onEarlyAccess={() => setEarlyAccessOpen(true)} />

      <article className="pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="container max-w-3xl">
          {/* Back link */}
          <div className="mb-12">
            <Link href="/blog">
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
                All posts
              </span>
            </Link>
          </div>

          {/* Header */}
          <span className="text-xs font-medium text-primary tracking-wide uppercase">
            {post.category}
          </span>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mt-3 mb-8">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-16 pb-10 border-b border-border/30">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {post.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
          </div>

          {/* Article body */}
          <div
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Post navigation */}
          <div className="mt-20 pt-10 border-t border-border/30 flex flex-col sm:flex-row justify-between gap-6">
            {prevPost ? (
              <Link href={`/blog/${prevPost.slug}`}>
                <div className="cursor-pointer group">
                  <span className="text-xs text-muted-foreground">Previous</span>
                  <p className="text-sm font-medium mt-1 group-hover:text-primary transition-colors">
                    {prevPost.title}
                  </p>
                </div>
              </Link>
            ) : (
              <div />
            )}
            {nextPost ? (
              <Link href={`/blog/${nextPost.slug}`}>
                <div className="cursor-pointer group text-right">
                  <span className="text-xs text-muted-foreground">Next</span>
                  <p className="text-sm font-medium mt-1 group-hover:text-primary transition-colors">
                    {nextPost.title}
                  </p>
                </div>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </article>

      {/* CTA */}
      <section className="py-20 border-t border-border/30">
        <div className="container max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to see inside your AI?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join the builders who go deeper. Get early access to Prysm AI.
          </p>
          <Button
            className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            onClick={() => setEarlyAccessOpen(true)}
          >
            Get Early Access
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      <BlogFooter />

      <EarlyAccessModal open={earlyAccessOpen} onOpenChange={setEarlyAccessOpen} />
    </div>
  );
}

/* ─── Router: /blog → index, /blog/:slug → article ─── */
export default function Blog() {
  const [matchArticle, params] = useRoute("/blog/:slug");

  if (matchArticle && params?.slug) {
    const post = getPostBySlug(params.slug);
    if (post) {
      return <BlogArticle post={post} />;
    }
    // Slug not found — fall through to index
  }

  return <BlogIndex />;
}
