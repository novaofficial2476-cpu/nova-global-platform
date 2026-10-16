"use client";

import { useMemo, useState } from "react";
import {
  Bell, Bookmark, Compass, Film, Heart, Home, ImagePlus, MessageCircle,
  MoreHorizontal, Plus, Search, Send, Settings2, Sparkles, Users, Video,
  X, Menu, Globe2, Play, Hash, ShieldCheck
} from "lucide-react";

type Post = { id: number; name: string; handle: string; time: string; text: string; tag: string; likes: number; comments: number; art: string; liked: boolean };

const initialPosts: Post[] = [
  { id: 1, name: "Maya Chen", handle: "@mayamakes", time: "12 min", text: "A little reminder to make something today, even if nobody sees it. The process is the point. ✨", tag: "CREATIVITY", likes: 284, comments: 32, art: "sunset", liked: false },
  { id: 2, name: "Daniel Rivera", handle: "@danexplores", time: "38 min", text: "Found a quiet corner of the world that feels like pressing pause. Where would you disappear for a weekend?", tag: "TRAVEL", likes: 167, comments: 19, art: "mountain", liked: false },
  { id: 3, name: "NOVA Creators", handle: "@novacreators", time: "1 hr", text: "Your voice. Your corner of the internet. Your community. We’re building a more human way to connect — together.", tag: "NOVA NOTES", likes: 512, comments: 64, art: "nova", liked: false },
];

const nav = [
  { label: "Home", icon: Home }, { label: "Explore", icon: Compass }, { label: "Shorts", icon: Film },
  { label: "Messages", icon: MessageCircle }, { label: "Communities", icon: Users }, { label: "Saved", icon: Bookmark },
];

export default function HomePage() {
  const [active, setActive] = useState("Home");
  const [query, setQuery] = useState("");
  const [composer, setComposer] = useState("");
  const [posts, setPosts] = useState(initialPosts);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const visiblePosts = useMemo(() => posts.filter(p => (p.text + p.name + p.tag).toLowerCase().includes(query.toLowerCase())), [posts, query]);

  function publishPost() {
    if (!composer.trim()) { setNotice("Write a thought before sharing."); return; }
    setPosts([{ id: Date.now(), name: "You", handle: "@you", time: "now", text: composer.trim(), tag: "YOUR POST", likes: 0, comments: 0, art: "plain", liked: false }, ...posts]);
    setComposer(""); setNotice("Your post was added to this local preview.");
  }
  function toggleLike(id: number) {
    setPosts(posts.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="icon-button menu-toggle" aria-label="Toggle menu" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={20}/> : <Menu size={20}/>}</button>
        <a className="brand" href="#" onClick={() => setActive("Home")}><span className="brand-mark">N</span><span>NOVA<span className="brand-dot">.</span></span></a>
        <div className="top-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search NOVA" aria-label="Search posts"/></div>
        <button className="icon-button notification" aria-label="Notifications" onClick={() => setNotice("Notifications will be available when accounts are connected.")}><Bell size={19}/><i/></button>
        <button className="avatar avatar-small" aria-label="Your profile" onClick={() => setNotice("Profiles will be connected to real accounts in the next phase.")}>Y</button>
      </header>

      <div className="layout">
        <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
          <div className="side-label">YOUR SPACE</div>
          {nav.map(item => <button key={item.label} className={`nav-item ${active === item.label ? "nav-active" : ""}`} onClick={() => { setActive(item.label); setMobileMenu(false); if (item.label !== "Home") setNotice(item.label + " is part of the next build phase."); }}><item.icon size={19}/><span>{item.label}</span>{item.label === "Messages" && <span className="nav-count">2</span>}</button>)}
          <div className="side-divider"/>
          <div className="side-label">YOUR COMMUNITIES <button aria-label="Add community" onClick={() => setNotice("Community creation will be added after accounts and database are connected.")}><Plus size={15}/></button></div>
          <button className="community-item" onClick={() => setNotice("Community pages are coming soon.")}><span className="community-icon purple">✳</span> Design & ideas</button>
          <button className="community-item" onClick={() => setNotice("Community pages are coming soon.")}><span className="community-icon orange">⌁</span> Everyday explorers</button>
          <button className="community-item" onClick={() => setNotice("Community pages are coming soon.")}><span className="community-icon green">✺</span> Creator circle</button>
          <button className="discover-link" onClick={() => setActive("Explore")}>Discover communities <span>↗</span></button>
          <div className="sidebar-bottom"><ShieldCheck size={16}/><span>Your space, your rules.</span></div>
        </aside>

        <section className="feed-column">
          <div className="welcome">
            <div><div className="eyebrow"><Sparkles size={13}/> A NEW KIND OF SOCIAL</div><h1>Make room for <span>you.</span></h1><p>Good things happen when we find our people.</p></div>
            <div className="welcome-orb"><Globe2 size={38}/><span/></div>
          </div>
          <div className="feed-tabs"><button className="tab-selected" onClick={() => setActive("Home")}>For you <span/></button><button onClick={() => setNotice("Following feed requires a real account.")}>Following</button><button onClick={() => setNotice("Latest feed will be powered by the database.")}>Latest</button></div>

          <section className="composer card">
            <div className="avatar composer-avatar">Y</div>
            <div className="composer-main"><textarea value={composer} onChange={e => setComposer(e.target.value)} placeholder="What’s on your mind?" rows={2} aria-label="Write a post"/><div className="composer-actions"><div className="composer-tools"><button aria-label="Add image" onClick={() => setNotice("Image uploads will be enabled after storage is connected.")}><ImagePlus size={18}/></button><button aria-label="Add video" onClick={() => setNotice("Video uploads are planned for a later phase.")}><Video size={18}/></button><span className="privacy-note"><Globe2 size={13}/> Public</span></div><button className="share-button" onClick={publishPost}><Send size={15}/> Share</button></div></div>
          </section>

          {notice && <div className="notice" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={15}/></button></div>}

          <div className="section-heading"><div><span className="live-dot"/> YOUR FEED <span className="muted-label">/ A LITTLE INSPIRATION</span></div><button className="icon-button subtle" aria-label="Feed settings" onClick={() => setNotice("Feed preferences will be customizable in a future phase.")}><Settings2 size={17}/></button></div>
          <div className="posts">
            {visiblePosts.map(post => <article className="post card" key={post.id}>
              <div className="post-header"><div className={`post-avatar avatar-art ${post.art}`}>{post.art === "nova" ? <Sparkles size={20}/> : post.name.slice(0,1)}</div><div className="post-author"><strong>{post.name}</strong><span>{post.handle} · {post.time}</span></div><button className="icon-button subtle more" aria-label="More post options" onClick={() => setNotice("More post controls will be available with real accounts.")}><MoreHorizontal size={20}/></button></div>
              <p className="post-text">{post.text}</p>
              {post.art !== "plain" && <div className={`post-art ${post.art}`}>{post.art === "sunset" ? <><div className="sun"/><div className="horizon"/></> : post.art === "mountain" ? <><div className="moon"/><div className="peak peak-one"/><div className="peak peak-two"/><div className="peak peak-three"/></> : post.art === "nova" ? <div className="nova-art-text">ONE WORLD.<br/><span>YOUR WORLD.</span></div> : null}<span className="art-tag">{post.tag}</span></div>}
              <div className="post-meta"><span>{post.likes.toLocaleString()} appreciations</span><span>{post.comments} replies</span></div>
              <div className="post-actions"><button className={post.liked ? "liked" : ""} onClick={() => toggleLike(post.id)}><Heart size={18} fill={post.liked ? "currentColor" : "none"}/><span>{post.liked ? "Appreciated" : "Appreciate"}</span></button><button onClick={() => setNotice("Replies will be saved once the database is connected.")}><MessageCircle size={18}/><span>Reply</span></button><button onClick={() => setNotice("Sharing links will be enabled in a later phase.")}><Send size={17}/><span>Share</span></button></div>
            </article>)}
            {visiblePosts.length === 0 && <div className="empty-state card"><Search size={24}/><strong>No posts found</strong><span>Try another search.</span></div>}
          </div>
          <footer className="footer-note">NOVA is in its first build phase <span>·</span> Made for connection, not noise.</footer>
        </section>

        <aside className="rightbar">
          <section className="side-card trend-card"><div className="right-title">TRENDING AROUND NOVA <Sparkles size={15}/></div><button className="trend" onClick={() => setQuery("creativity")}><span className="trend-number">01</span><span><strong>#CreativeEveryday</strong><small>2.4k conversations</small></span><span className="trend-arrow">↗</span></button><button className="trend" onClick={() => setQuery("travel")}><span className="trend-number">02</span><span><strong>#SlowTravel</strong><small>1.8k conversations</small></span><span className="trend-arrow">↗</span></button><button className="trend" onClick={() => setQuery("community")}><span className="trend-number">03</span><span><strong>#FindYourPeople</strong><small>960 conversations</small></span><span className="trend-arrow">↗</span></button><button className="text-link" onClick={() => {setQuery("");setNotice("Showing all preview posts.");}}>Explore all trends ↗</button></section>
          <section className="side-card invite-card"><div className="invite-icon"><Users size={20}/></div><div className="right-title">BETTER TOGETHER</div><h3>Your people are out there.</h3><p>Build a corner of the internet that feels like yours.</p><button className="outline-button" onClick={() => setNotice("Invites will be available after user accounts are ready.")}>Invite your people <Plus size={15}/></button></section>
          <div className="right-links"><a href="#about">About NOVA</a><a href="#privacy">Privacy</a><a href="#guidelines">Community guidelines</a><span>© 2026 NOVA · Preview build</span></div>
        </aside>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">{nav.slice(0,5).map(item => <button key={item.label} className={active === item.label ? "mobile-active" : ""} onClick={() => {setActive(item.label);if(item.label !== "Home")setNotice(item.label + " is part of the next build phase.");}}><item.icon size={20}/><span>{item.label === "Communities" ? "Groups" : item.label}</span></button>)}</nav>
    </main>
  );
}
