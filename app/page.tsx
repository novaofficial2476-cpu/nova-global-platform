"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bell, Bookmark, Compass, Film, Heart, Home, ImagePlus, MessageCircle,
  MoreHorizontal, Plus, Search, Send, Settings2, Sparkles, Users, Video,
  X, Menu, Globe2, ShieldCheck, LogIn, LogOut, UserRound
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";

type Comment = { id: string; post_id: string; author_id: string; body: string; created_at: string; profiles: { display_name: string; username: string | null } | { display_name: string; username: string | null }[] | null };
type Post = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: { display_name: string; username: string | null } | { display_name: string; username: string | null }[] | null;
};
const nav = [
  { label: "Home", icon: Home }, { label: "Explore", icon: Compass }, { label: "Shorts", icon: Film },
  { label: "Messages", icon: MessageCircle }, { label: "Communities", icon: Users }, { label: "Saved", icon: Bookmark },
];

export default function HomePage() {
  const supabase = getSupabase();
  const [active, setActive] = useState("Home");
  const [query, setQuery] = useState("");
  const [composer, setComposer] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<string[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoadingPosts(false); return; }
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function loadPosts() {
    if (!supabase) { setLoadingPosts(false); return; }
    setLoadingPosts(true);
    const { data, error } = await supabase
      .from("posts")
      .select("id, author_id, body, created_at, profiles!posts_author_id_fkey(display_name, username)")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) setNotice("Posts could not be loaded. Check the database policies and site configuration.");
    else {
      setPosts((data ?? []) as unknown as Post[]);
      const postIds = (data ?? []).map((post: { id: string }) => post.id);
      if (postIds.length) {
        const { data: commentData } = await supabase.from("comments")
          .select("id, post_id, author_id, body, created_at, profiles!comments_author_id_fkey(display_name, username)")
          .in("post_id", postIds).order("created_at", { ascending: true });
        const grouped: Record<string, Comment[]> = {};
        for (const comment of (commentData ?? []) as unknown as Comment[]) {
          (grouped[comment.post_id] ??= []).push(comment);
        }
        setCommentsByPost(grouped);
      } else setCommentsByPost({});
    }
    setLoadingPosts(false);
  }

  useEffect(() => { void loadPosts(); }, [supabase]);

  const visiblePosts = useMemo(() => posts.filter(p => {
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    return (p.body + (profile?.display_name ?? "") + (profile?.username ?? "")).toLowerCase().includes(query.toLowerCase());
  }), [posts, query]);

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    if (!supabase) { setNotice("Database setup is not complete yet. Add the two Supabase environment variables in Vercel."); return; }
    setBusy(true); setNotice("");
    const result = authMode === "signup"
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (result.error) { setNotice(result.error.message); return; }
    if (authMode === "signup" && !result.data.session) {
      setNotice("Account request received. If email confirmation is enabled in Supabase, check your inbox to finish signup.");
    } else {
      setNotice(authMode === "signup" ? "Your NOVA account is ready." : "Welcome back to NOVA.");
      setAuthOpen(false);
    }
    setPassword("");
  }

  async function publishPost() {
    if (!composer.trim()) { setNotice("Write a thought before sharing."); return; }
    if (!supabase) { setNotice("Connect the Supabase environment variables first to save posts."); return; }
    if (!user) { setAuthOpen(true); setNotice("Sign in to publish a post that is saved to your account."); return; }
    const { error } = await supabase.from("posts").insert({ author_id: user.id, body: composer.trim(), visibility: "public" });
    if (error) { setNotice(error.message); return; }
    setComposer(""); setNotice("Your post is published."); await loadPosts();
  }

  async function submitComment(postId: string) {
    const body = (commentDrafts[postId] ?? "").trim();
    if (!body) return;
    if (!supabase || !user) { setAuthOpen(true); setNotice("Sign in to reply to a post."); return; }
    const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: user.id, body });
    if (error) { setNotice(error.message); return; }
    setCommentDrafts(current => ({ ...current, [postId]: "" }));
    await loadPosts();
    setOpenComments(current => current.includes(postId) ? current : [...current, postId]);
  }

  async function submitComment(postId: string) {
    const body = (commentDrafts[postId] ?? "").trim();
    if (!body) return;
    if (!supabase || !user) { setAuthOpen(true); setNotice("Sign in to reply to a post."); return; }
    const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: user.id, body });
    if (error) { setNotice(error.message); return; }
    setCommentDrafts(current => ({ ...current, [postId]: "" }));
    await loadPosts();
    setOpenComments(current => current.includes(postId) ? current : [...current, postId]);
  }

  async function toggleLike(postId: string) {
    if (!supabase || !user) { setAuthOpen(true); setNotice("Sign in to appreciate posts."); return; }
    const { data: existing, error: readError } = await supabase.from("post_likes").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
    if (readError) { setNotice(readError.message); return; }
    const result = existing
      ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    if (result.error) setNotice(result.error.message);
    else setNotice(existing ? "Appreciation removed." : "You appreciated this post.");
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    setNotice(error ? error.message : "You are signed out.");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="icon-button menu-toggle" aria-label="Toggle menu" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={20}/> : <Menu size={20}/>}</button>
        <a className="brand" href="/" onClick={() => setActive("Home")}><span className="brand-mark">N</span><span>NOVA<span className="brand-dot">.</span></span></a>
        <div className="top-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search NOVA" aria-label="Search posts"/></div>
        <button className="icon-button notification" aria-label="Notifications" onClick={() => setNotice("Notifications will be enabled in a later build phase.")}><Bell size={19}/><i/></button>
        {user ? <button className="avatar avatar-small" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={17}/></button> : <button className="avatar avatar-small" aria-label="Sign in" onClick={() => {setAuthMode("login");setAuthOpen(true);}}><UserRound size={17}/></button>}
      </header>
      <div className="layout">
        <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
          <div className="side-label">YOUR SPACE</div>
          {nav.map(item => <button key={item.label} className={`nav-item ${active === item.label ? "nav-active" : ""}`} onClick={() => { setActive(item.label); setMobileMenu(false); if (item.label !== "Home") setNotice(item.label + " is planned for a later build phase."); }}><item.icon size={19}/><span>{item.label}</span></button>)}
          <div className="side-divider"/>
          <div className="side-label">YOUR COMMUNITIES <button aria-label="Add community" onClick={() => setNotice("Community creation is planned for a later phase.")}><Plus size={15}/></button></div>
          <button className="community-item" onClick={() => setNotice("Community pages are not connected yet.")}><span className="community-icon purple">✳</span> Design & ideas</button>
          <button className="community-item" onClick={() => setNotice("Community pages are not connected yet.")}><span className="community-icon orange">⌁</span> Everyday explorers</button>
          <button className="community-item" onClick={() => setNotice("Community pages are not connected yet.")}><span className="community-icon green">✺</span> Creator circle</button>
          <button className="discover-link" onClick={() => setActive("Explore")}>Discover communities <span>↗</span></button>
          <div className="sidebar-bottom"><ShieldCheck size={16}/><span>Your space, your rules.</span></div>
        </aside>
        <section className="feed-column">
          <div className="welcome"><div><div className="eyebrow"><Sparkles size={13}/> A NEW KIND OF SOCIAL</div><h1>Make room for <span>you.</span></h1><p>Good things happen when we find our people.</p></div><div className="welcome-orb"><Globe2 size={38}/><span/></div></div>
          <div className="feed-tabs"><button className="tab-selected" onClick={() => {setActive("Home");void loadPosts();}}>Latest <span/></button><button onClick={() => setNotice("Following feed will be added with follow relationships.")}>Following</button><button onClick={() => {setQuery("");void loadPosts();}}>All posts</button></div>
          <section className="composer card">
            <div className="avatar composer-avatar">{user?.email?.slice(0,1).toUpperCase() ?? "N"}</div>
            <div className="composer-main"><textarea value={composer} onChange={e => setComposer(e.target.value)} placeholder={user ? "What’s on your mind?" : "Sign in to share with NOVA…"} rows={2} aria-label="Write a post"/><div className="composer-actions"><div className="composer-tools"><button aria-label="Add image" onClick={() => setNotice("Image uploads will be enabled after storage is configured.")}><ImagePlus size={18}/></button><button aria-label="Add video" onClick={() => setNotice("Video uploads are planned for a later phase.")}><Video size={18}/></button><span className="privacy-note"><Globe2 size={13}/> Public</span></div><button className="share-button" onClick={publishPost}><Send size={15}/> Share</button></div></div>
          </section>
          {notice && <div className="notice" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={15}/></button></div>}
          {!supabase && <div className="notice" role="status"><span>Database connection needs setup: add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.</span></div>}
          <div className="section-heading"><div><span className="live-dot"/> YOUR FEED <span className="muted-label">/ REAL COMMUNITY POSTS</span></div><button className="icon-button subtle" aria-label="Refresh feed" onClick={() => void loadPosts()}><Settings2 size={17}/></button></div>
          <div className="posts">
            {loadingPosts && <div className="empty-state card"><strong>Loading NOVA feed…</strong></div>}
            {!loadingPosts && visiblePosts.map(post => {
              const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
              const name = profile?.display_name || "NOVA member";
              const handle = profile?.username ? "@" + profile.username : "NOVA member";
              const time = new Date(post.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
              return <article className="post card" key={post.id}>
                <div className="post-header"><div className="post-avatar avatar-art nova"><Sparkles size={20}/></div><div className="post-author"><strong>{name}</strong><span>{handle} · {time}</span></div><button className="icon-button subtle more" aria-label="Post options" onClick={() => setNotice("Post reporting and moderation tools are planned for a later phase.")}><MoreHorizontal size={20}/></button></div>
                <p className="post-text">{post.body}</p>
                <div className="post-meta"><span>Saved in NOVA</span><span>Replies coming later</span></div>
                <div className="post-actions"><button onClick={() => void toggleLike(post.id)}><Heart size={18}/><span>Appreciate</span></button><button onClick={() => setOpenComments(current => current.includes(post.id) ? current.filter(id => id !== post.id) : [...current, post.id])}><MessageCircle size={18}/><span>Reply ({commentsByPost[post.id]?.length ?? 0})</span></button><button onClick={() => {void navigator.clipboard?.writeText(window.location.origin);setNotice("NOVA link copied if your browser permits clipboard access.");}}><Send size={17}/><span>Share</span></button></div>
                {openComments.includes(post.id) && <div className="comments-panel">
                  {(commentsByPost[post.id] ?? []).map(comment => { const cp = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles; return <div className="comment-row" key={comment.id}><strong>{cp?.display_name || "NOVA member"}</strong><span>{comment.body}</span></div>; })}
                  <form className="comment-form" onSubmit={event => { event.preventDefault(); void submitComment(post.id); }}><input value={commentDrafts[post.id] ?? ""} onChange={event => setCommentDrafts(current => ({ ...current, [post.id]: event.target.value }))} placeholder={user ? "Write a reply…" : "Sign in to reply…"} maxLength={2000} /><button className="share-button" type="submit">Reply</button></form>
                </div>}
              </article>;
            })}
            {!loadingPosts && visiblePosts.length === 0 && <div className="empty-state card"><Search size={24}/><strong>{query ? "No posts found" : "Your feed is ready for its first post"}</strong><span>{query ? "Try another search." : "Sign in and share something with the NOVA community."}</span></div>}
          </div>
          <footer className="footer-note">NOVA is growing step by step <span>·</span> Made for connection, not noise.</footer>
        </section>
        <aside className="rightbar">
          <section className="side-card trend-card"><div className="right-title">DISCOVER NOVA <Sparkles size={15}/></div><button className="trend" onClick={() => setNotice("Creator discovery will be added in a later phase.")}><span className="trend-number">01</span><span><strong>Find your people</strong><small>Communities and creators</small></span><span className="trend-arrow">↗</span></button><button className="trend" onClick={() => setNotice("Short video feed is planned for a later phase.")}><span className="trend-number">02</span><span><strong>Watch Shorts</strong><small>Short-form videos</small></span><span className="trend-arrow">↗</span></button><button className="trend" onClick={() => setNotice("Messaging is planned for a later phase.")}><span className="trend-number">03</span><span><strong>Start a conversation</strong><small>Private messages</small></span><span className="trend-arrow">↗</span></button><button className="text-link" onClick={() => setNotice("Explore is still being built.")}>Explore NOVA ↗</button></section>
          <section className="side-card invite-card"><div className="invite-icon"><Users size={20}/></div><div className="right-title">BETTER TOGETHER</div><h3>Your people are out there.</h3><p>Build a corner of the internet that feels like yours.</p><button className="outline-button" onClick={() => {setAuthMode("signup");setAuthOpen(true);}}>Join NOVA <Plus size={15}/></button></section>
          <div className="right-links"><a href="#about">About NOVA</a><a href="#privacy">Privacy</a><a href="#guidelines">Community guidelines</a><span>© 2026 NOVA</span></div>
        </aside>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">{nav.slice(0,5).map(item => <button key={item.label} className={active === item.label ? "mobile-active" : ""} onClick={() => {setActive(item.label);if(item.label !== "Home")setNotice(item.label + " is planned for a later phase.");}}><item.icon size={20}/><span>{item.label === "Communities" ? "Groups" : item.label}</span></button>)}</nav>
      {authOpen && <div className="auth-backdrop" role="presentation" onClick={() => setAuthOpen(false)}><section className="auth-card card" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={e => e.stopPropagation()}><button className="icon-button auth-close" aria-label="Close" onClick={() => setAuthOpen(false)}><X size={18}/></button><div className="brand auth-brand"><span className="brand-mark">N</span><span>NOVA<span className="brand-dot">.</span></span></div><h2 id="auth-title">{authMode === "signup" ? "Create your account" : "Welcome back"}</h2><p>One account for your NOVA world.</p><form onSubmit={handleAuth}><label htmlFor="nova-email">Email</label><input id="nova-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/><label htmlFor="nova-password">Password</label><input id="nova-password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"/><button className="share-button auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : authMode === "signup" ? "Create account" : "Sign in"} <LogIn size={16}/></button></form><button className="auth-switch" onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}>{authMode === "signup" ? "Already have an account? Sign in" : "New to NOVA? Create an account"}</button></section></div>}
    </main>
  );
}
