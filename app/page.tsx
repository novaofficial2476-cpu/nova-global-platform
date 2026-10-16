"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell, Bookmark, Compass, Film, Heart, Home, ImagePlus, MessageCircle,
  MoreHorizontal, Plus, Search, Send, Settings2, Sparkles, Users, Video,
  X, Menu, Globe2, ShieldCheck, LogIn, LogOut, UserRound
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";

type Member = { id: string; display_name: string; username: string | null; bio: string; is_private: boolean };
type Comment = { id: string; post_id: string; author_id: string; body: string; created_at: string; profiles: { display_name: string; username: string | null } | { display_name: string; username: string | null }[] | null };
type Post = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
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
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [mediaPickerType, setMediaPickerType] = useState<"image" | "video">("image");
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState("NOVA User");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [profileImageBusy, setProfileImageBusy] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [conversations, setConversations] = useState<Array<{id:string; title:string|null; is_group:boolean; created_at:string}>>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Array<{id:string; sender_id:string; body:string; created_at:string}>>>({});
  const [activeConversation, setActiveConversation] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [newChatUser, setNewChatUser] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [communities, setCommunities] = useState<Array<{id:string; name:string; slug:string; description:string; owner_id:string}>>([]);

  useEffect(() => {
    if (!supabase) { setLoadingPosts(false); return; }
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); if (data.user) void loadProfile(data.user.id); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); if (session?.user) void loadProfile(session.user.id); });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function loadMembers() {
    if (!supabase) return;
    setLoadingMembers(true);
    const { data, error } = await supabase.from("profiles").select("id, display_name, username, bio, is_private").order("created_at", { ascending: false }).limit(40);
    if (error) setNotice(error.message); else setMembers((data ?? []).filter(member => member.id !== user?.id) as Member[]);
    if (user) { const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id).eq("status", "accepted"); setFollowingIds((follows ?? []).map(item => item.following_id)); }
    setLoadingMembers(false);
  }

  async function loadConversations() {
    if (!supabase || !user) { setAuthOpen(true); setNotice("Sign in to use NOVA Messages."); return; }
    const { data: memberships, error } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", user.id);
    if (error) { setNotice("Messages could not load: " + error.message); return; }
    const ids = (memberships ?? []).map(row => row.conversation_id);
    if (!ids.length) { setConversations([]); setActiveConversation(""); setMessagesByConversation({}); return; }
    const { data: chats, error: chatError } = await supabase.from("conversations").select("id,title,is_group,created_at").in("id", ids).order("created_at", {ascending:false});
    if (chatError) { setNotice("Conversations could not load: " + chatError.message); return; }
    setConversations(chats ?? []);
    if (!activeConversation || !ids.includes(activeConversation)) setActiveConversation(ids[0]);
    const { data: msgs, error: msgError } = await supabase.from("messages").select("id,conversation_id,sender_id,body,created_at").in("conversation_id", ids).order("created_at", {ascending:true}).limit(300);
    if (msgError) { setNotice("Messages could not load: " + msgError.message); return; }
    const grouped: Record<string, Array<{id:string;sender_id:string;body:string;created_at:string}>> = {};
    for (const m of msgs ?? []) (grouped[m.conversation_id] ??= []).push(m);
    setMessagesByConversation(grouped);
  }

  async function startConversation(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user) { setAuthOpen(true); return; }
    const target = members.find(m => m.username?.toLowerCase() === newChatUser.trim().replace(/^@/, "").toLowerCase());
    if (!target) { await loadMembers(); setNotice("Find the recipient in Explore first, then enter their exact username."); return; }
    if (target.id === user.id) { setNotice("You cannot start a chat with yourself."); return; }
    const { data: memberships, error: memberError } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", user.id);
    if (memberError) { setNotice(memberError.message); return; }
    for (const row of memberships ?? []) {
      const { data: other } = await supabase.from("conversation_members").select("user_id").eq("conversation_id", row.conversation_id).eq("user_id", target.id).maybeSingle();
      if (other) { setActiveConversation(row.conversation_id); setNotice("Opened existing conversation."); await loadConversations(); return; }
    }
    const { data: chat, error } = await supabase.from("conversations").insert({created_by:user.id,is_group:false,title:null}).select("id").single();
    if (error || !chat) { setNotice("Could not create conversation: " + (error?.message ?? "Unknown error")); return; }
    const { error: addError } = await supabase.from("conversation_members").insert([{conversation_id:chat.id,user_id:user.id},{conversation_id:chat.id,user_id:target.id}]);
    if (addError) { setNotice("Conversation was created but adding participants failed: " + addError.message); return; }
    setNewChatUser(""); setActiveConversation(chat.id); await loadConversations(); setNotice("Conversation created.");
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user || !activeConversation || !messageDraft.trim()) return;
    const { error } = await supabase.from("messages").insert({conversation_id:activeConversation,sender_id:user.id,body:messageDraft.trim()});
    if (error) { setNotice("Message not sent: " + error.message); return; }
    setMessageDraft(""); await loadConversations();
  }

  async function loadCommunities() {
    if (!supabase) return;
    const { data, error } = await supabase.from("communities").select("id,name,slug,description,owner_id").eq("is_private",false).order("created_at",{ascending:false}).limit(50);
    if (error) setNotice("Groups could not load: " + error.message); else setCommunities(data ?? []);
  }

  async function createCommunity(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user) { setAuthOpen(true); return; }
    const name=communityName.trim();
    if(name.length<3){setNotice("Group name must have at least 3 characters.");return;}
    const slug=name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+user.id.slice(0,6);
    const {data:community,error}=await supabase.from("communities").insert({name,slug,description:communityDescription.trim(),owner_id:user.id,is_private:false}).select("id").single();
    if(error||!community){setNotice("Group creation failed: "+(error?.message??"Unknown error"));return;}
    const {error:joinError}=await supabase.from("community_members").insert({community_id:community.id,user_id:user.id,role:"owner"});
    if(joinError){setNotice("Group created but owner membership failed: "+joinError.message);return;}
    setCommunityName("");setCommunityDescription("");await loadCommunities();setNotice("Your public group is created.");
  }

  async function joinCommunity(communityId:string) {
    if(!supabase||!user){setAuthOpen(true);return;}
    const {error}=await supabase.from("community_members").insert({community_id:communityId,user_id:user.id,role:"member"});
    setNotice(error ? "Could not join group: "+error.message : "You joined the group.");
  }

  async function toggleFollow(memberId: string) {
    if (!supabase || !user) { setAuthOpen(true); setNotice("Sign in to follow NOVA members."); return; }
    const isFollowing = followingIds.includes(memberId);
    const result = isFollowing ? await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", memberId) : await supabase.from("follows").insert({ follower_id: user.id, following_id: memberId, status: "accepted" });
    if (result.error) { setNotice(result.error.message); return; }
    setFollowingIds(current => isFollowing ? current.filter(id => id !== memberId) : [...current, memberId]);
    setNotice(isFollowing ? "You unfollowed this member." : "You are now following this member.");
  }

  async function loadProfile(userId: string) {
    if (!supabase) return;
    const { data, error } = await supabase.from("profiles").select("display_name, username, bio, avatar_url, cover_url").eq("id", userId).maybeSingle();
    if (!error && data) { setDisplayName(data.display_name || "NOVA User"); setUsername(data.username || ""); setBio(data.bio || ""); setAvatarUrl(data.avatar_url || ""); setCoverUrl(data.cover_url || ""); }
  }

  async function uploadProfileImage(event: React.ChangeEvent<HTMLInputElement>, kind: "avatar" | "cover") {
    const file = event.target.files?.[0];
    if (!file || !supabase || !user) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) { setNotice("Profile photos must be an image of 10 MB or less."); event.target.value = ""; return; }
    setProfileImageBusy(true);
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
    const path = user.id + "/profile-" + kind + "-" + Date.now() + "-" + safeName;
    const { error } = await supabase.storage.from("nova-media").upload(path, file, { contentType: file.type, upsert: false });
    setProfileImageBusy(false);
    if (error) { setNotice("Profile photo upload failed: " + error.message); return; }
    const url = supabase.storage.from("nova-media").getPublicUrl(path).data.publicUrl;
    if (kind === "avatar") setAvatarUrl(url); else setCoverUrl(url);
    setNotice(kind === "avatar" ? "Profile photo uploaded. Save your profile to apply it." : "Cover photo uploaded. Save your profile to apply it.");
    event.target.value = "";
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user) return;
    setSavingProfile(true);
    const cleanUsername = username.trim().replace(/^@/, "");
    const { error } = await supabase.from("profiles").update({ display_name: displayName.trim() || "NOVA User", username: cleanUsername || null, bio: bio.trim(), avatar_url: avatarUrl || null, cover_url: coverUrl || null }).eq("id", user.id);
    setSavingProfile(false);
    if (error) { setNotice(error.message.includes("profiles_username_key") ? "That username is already taken. Choose another." : error.message); return; }
    setNotice("Profile saved."); setProfileOpen(false);
  }

  async function loadPosts() {
    if (!supabase) { setLoadingPosts(false); return; }
    setLoadingPosts(true);
    const { data, error } = await supabase
      .from("posts")
      .select("id, author_id, body, created_at, media_url, media_type, moderation_status, profiles!posts_author_id_fkey(display_name, username)")
      .eq("visibility", "public")
      .eq("moderation_status", "visible")
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
    if (user) {
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id).eq("status", "accepted");
      setFollowingIds((follows ?? []).map(item => item.following_id));
    }
    setLoadingPosts(false);
  }

  useEffect(() => { void loadPosts(); }, [supabase, user?.id]);

  const visiblePosts = useMemo(() => posts.filter(p => {
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    const matchesSearch = (p.body + (profile?.display_name ?? "") + (profile?.username ?? "")).toLowerCase().includes(query.toLowerCase());
    if (!matchesSearch) return false;
    if (active === "Shorts") return p.media_type === "video" && Boolean(p.media_url);
    if (active === "Following") return followingIds.includes(p.author_id);
    return true;
  }), [posts, query, active, followingIds]);

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

  function chooseMedia(kind: "image" | "video") {
    if (!user) { setAuthOpen(true); setNotice("Sign in before uploading media."); return; }
    setMediaPickerType(kind);
    if (mediaInputRef.current) { mediaInputRef.current.accept = kind === "image" ? "image/jpeg,image/png,image/webp,image/gif" : "video/mp4,video/webm,video/quicktime"; mediaInputRef.current.click(); }
  }

  function onMediaSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const expected = mediaPickerType === "image" ? file.type.startsWith("image/") : file.type.startsWith("video/");
    if (!expected) { setNotice("Choose a supported " + mediaPickerType + " file."); event.target.value = ""; return; }
    if (file.size > 100 * 1024 * 1024) { setNotice("Media must be 100 MB or smaller."); event.target.value = ""; return; }
    setSelectedMedia(file); setMediaPreview(URL.createObjectURL(file)); setNotice("Media selected. Share your post when ready.");
  }

  async function publishPost() {
    if (!composer.trim() && !selectedMedia) { setNotice("Write a thought or attach a photo/video before sharing."); return; }
    if (!supabase) { setNotice("Database connection is missing; media cannot be published."); return; }
    if (!user) { setAuthOpen(true); setNotice("Sign in to publish a post that is saved to your account."); return; }
    setUploadingMedia(true); setNotice("");
    let media_url: string | null = null;
    let media_type: "image" | "video" | null = null;
    if (selectedMedia) {
      media_type = selectedMedia.type.startsWith("video/") ? "video" : "image";
      const safeName = selectedMedia.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
      const path = user.id + "/" + Date.now() + "-" + safeName;
      const { error: uploadError } = await supabase.storage.from("nova-media").upload(path, selectedMedia, { contentType: selectedMedia.type, upsert: false });
      if (uploadError) { setUploadingMedia(false); setNotice("Upload failed: " + uploadError.message); return; }
      media_url = supabase.storage.from("nova-media").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("posts").insert({ author_id: user.id, body: composer.trim(), media_url, media_type, visibility: "public" });
    setUploadingMedia(false);
    if (error) { setNotice("Media uploaded but the post could not be saved: " + error.message); return; }
    setComposer(""); setSelectedMedia(null); setMediaPreview(""); if (mediaInputRef.current) mediaInputRef.current.value = "";
    setActive(media_type === "video" ? "Shorts" : "Home"); setNotice("Published to NOVA."); await loadPosts();
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

  async function reportPost(postId: string) {
    if (!supabase || !user) { setAuthOpen(true); setNotice("Sign in to report content."); return; }
    const reason = window.prompt("Why are you reporting this post? (spam, harassment, harmful content, etc.)");
    if (!reason || reason.trim().length < 3) return;
    const { error } = await supabase.from("content_reports").insert({ reporter_id: user.id, target_type: "post", target_id: postId, reason: reason.trim().slice(0, 1000) });
    setNotice(error ? "Report could not be submitted: " + error.message : "Report submitted for moderator review.");
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
        <button className="icon-button notification" aria-label="Notifications" onClick={() => setNotice("Browser push notifications can display incoming alerts, but server-side push delivery still needs provider configuration.")}><Bell size={19}/><i/></button>
        {user ? <button className="avatar avatar-small" aria-label="Edit profile" title="Edit profile" onClick={() => setProfileOpen(true)}><UserRound size={17}/></button> : <button className="avatar avatar-small" aria-label="Sign in" onClick={() => {setAuthMode("login");setAuthOpen(true);}}><UserRound size={17}/></button>}
      </header>
      <div className="layout">
        <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
          <div className="side-label">YOUR SPACE</div>
          {nav.map(item => <button key={item.label} className={`nav-item ${active === item.label ? "nav-active" : ""}`} onClick={() => { setActive(item.label); setMobileMenu(false); if (item.label === "Explore") void loadMembers(); else if (item.label === "Shorts") { setNotice(""); void loadPosts(); } else if (item.label === "Home" || item.label === "Following") void loadPosts(); else if (item.label === "Messages") void loadConversations(); else if (item.label === "Communities") void loadCommunities(); else if (item.label === "Saved") setNotice("Saved posts are not implemented yet."); }}><item.icon size={19}/><span>{item.label}</span></button>)}
          <div className="side-divider"/>
          <div className="side-label">YOUR COMMUNITIES <button aria-label="Add community" onClick={() => {setActive("Communities");void loadCommunities();}}><Plus size={15}/></button></div>
          <button className="community-item" onClick={() => {setActive("Communities");void loadCommunities();}}><span className="community-icon purple">✳</span> Design & ideas</button>
          <button className="community-item" onClick={() => {setActive("Communities");void loadCommunities();}}><span className="community-icon orange">⌁</span> Everyday explorers</button>
          <button className="community-item" onClick={() => {setActive("Communities");void loadCommunities();}}><span className="community-icon green">✺</span> Creator circle</button>
          <button className="discover-link" onClick={() => {setActive("Explore");void loadMembers();}}>Discover communities <span>↗</span></button>
          <div className="sidebar-bottom"><ShieldCheck size={16}/><span>Your space, your rules.</span></div>
        </aside>
        <section className="feed-column">
          <div className="welcome"><div><div className="eyebrow"><Sparkles size={13}/> A NEW KIND OF SOCIAL</div><h1>Make room for <span>you.</span></h1><p>Good things happen when we find our people.</p></div><div className="welcome-orb"><Globe2 size={38}/><span/></div></div>
          {active === "Messages" && <section className="explore-panel card"><div className="section-heading"><div><span className="live-dot"/> NOVA MESSAGES</div><button className="icon-button subtle" onClick={() => void loadConversations()} aria-label="Refresh messages"><Settings2 size={17}/></button></div><form className="comment-form" onSubmit={startConversation}><input value={newChatUser} onChange={e=>setNewChatUser(e.target.value)} placeholder="Start chat: exact @username" aria-label="Recipient username"/><button className="share-button" type="submit">New chat</button></form><div className="message-layout"><div className="conversation-list">{conversations.map(chat=><button key={chat.id} className={"conversation-choice "+(activeConversation===chat.id?"conversation-active":"")} onClick={()=>setActiveConversation(chat.id)}>{chat.title || (chat.is_group?"Group conversation":"Private conversation")}<small>{messagesByConversation[chat.id]?.at(-1)?.body || "No messages yet"}</small></button>)}{conversations.length===0&&<p>No conversations yet. Start a chat with an existing NOVA username.</p>}</div><div className="message-thread">{(messagesByConversation[activeConversation]??[]).map(m=><div key={m.id} className={"message-bubble "+(m.sender_id===user?.id?"message-own":"")}>{m.body}<small>{new Date(m.created_at).toLocaleString()}</small></div>)}{activeConversation&&<form className="comment-form" onSubmit={sendMessage}><input value={messageDraft} onChange={e=>setMessageDraft(e.target.value)} placeholder="Write a message…" maxLength={4000} required/><button className="share-button" type="submit">Send</button></form>}</div></div></section>}
          {active === "Communities" && <section className="explore-panel card"><div className="section-heading"><div><span className="live-dot"/> PUBLIC GROUPS</div><button className="icon-button subtle" onClick={()=>void loadCommunities()} aria-label="Refresh groups"><Settings2 size={17}/></button></div><form className="community-create-form" onSubmit={createCommunity}><input value={communityName} onChange={e=>setCommunityName(e.target.value)} placeholder="New group name" minLength={3} maxLength={80} required/><input value={communityDescription} onChange={e=>setCommunityDescription(e.target.value)} placeholder="Describe your group" maxLength={500}/><button className="share-button" type="submit">Create group</button></form>{communities.map(group=><div className="member-row" key={group.id}><div className="avatar">{group.name.slice(0,1).toUpperCase()}</div><div className="member-info"><strong>{group.name}</strong><small>{group.description}</small></div><button className="outline-button" onClick={()=>void joinCommunity(group.id)}>Join</button></div>)}{communities.length===0&&<p>No public groups yet. Create the first group.</p>}</section>}
          {active === "Explore" && <section className="explore-panel card"><div className="section-heading"><div><span className="live-dot"/> DISCOVER MEMBERS</div><button className="icon-button subtle" aria-label="Refresh members" onClick={() => void loadMembers()}><Settings2 size={17}/></button></div>{loadingMembers ? <p>Loading members…</p> : members.length === 0 ? <p>No public member profiles to show yet.</p> : members.map(member => <div className="member-row" key={member.id}><div className="avatar">{member.display_name.slice(0,1).toUpperCase()}</div><div className="member-info"><strong>{member.display_name}</strong><span>{member.username ? "@"+member.username : "NOVA member"}</span>{member.bio && <small>{member.bio}</small>}</div><button className="outline-button follow-button" onClick={() => void toggleFollow(member.id)}>{followingIds.includes(member.id) ? "Following" : "Follow"}</button></div>)}</section>}
          <div className="feed-tabs"><button className={active === "Home" ? "tab-selected" : ""} onClick={() => {setActive("Home");void loadPosts();}}>Latest <span/></button><button className={active === "Following" ? "tab-selected" : ""} onClick={() => {setActive("Following");void loadPosts();}}>Following</button><button className={active === "Shorts" ? "tab-selected" : ""} onClick={() => {setActive("Shorts");void loadPosts();}}>Shorts</button></div>
          <section className="composer card">
            <div className="avatar composer-avatar">{(displayName || user?.email)?.slice(0,1).toUpperCase() ?? "N"}</div>
            <div className="composer-main"><textarea value={composer} onChange={e => setComposer(e.target.value)} placeholder={user ? "What’s on your mind?" : "Sign in to share with NOVA…"} rows={2} aria-label="Write a post"/><div className="composer-actions"><div className="composer-tools"><button aria-label="Add image" onClick={() => chooseMedia("image")}><ImagePlus size={18}/></button><button aria-label="Add video or Short" onClick={() => chooseMedia("video")}><Video size={18}/></button><span className="privacy-note"><Globe2 size={13}/> Public</span></div><button className="share-button" onClick={publishPost} disabled={uploadingMedia}><Send size={15}/> {uploadingMedia ? "Uploading…" : "Share"}</button></div>{mediaPreview && <div className="media-preview">{selectedMedia?.type.startsWith("video/") ? <video src={mediaPreview} controls playsInline /> : <img src={mediaPreview} alt="Selected upload preview" />}<button type="button" className="outline-button" onClick={() => {setSelectedMedia(null);setMediaPreview("");if(mediaInputRef.current)mediaInputRef.current.value="";}}>Remove media</button></div>}<input ref={mediaInputRef} className="hidden-media-input" type="file" onChange={onMediaSelected} aria-label="Choose media file" /></div>
          </section>
          {notice && <div className="notice" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={15}/></button></div>}
          {!supabase && <div className="notice" role="status"><span>Database connection needs setup: add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.</span></div>}
          <div className="section-heading"><div><span className="live-dot"/> {active === "Shorts" ? "NOVA SHORTS" : active === "Following" ? "FOLLOWING FEED" : "YOUR FEED"} <span className="muted-label">/ LIVE DATABASE POSTS</span></div><button className="icon-button subtle" aria-label="Refresh feed" onClick={() => void loadPosts()}><Settings2 size={17}/></button></div>
          <div className="posts">
            {loadingPosts && <div className="empty-state card"><strong>Loading NOVA feed…</strong></div>}
            {!loadingPosts && visiblePosts.map(post => {
              const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
              const name = profile?.display_name || "NOVA member";
              const handle = profile?.username ? "@" + profile.username : "NOVA member";
              const time = new Date(post.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
              return <article className="post card" key={post.id}>
                <div className="post-header"><div className="post-avatar avatar-art nova"><Sparkles size={20}/></div><div className="post-author"><strong>{name}</strong><span>{handle} · {time}</span></div><button className="icon-button subtle more" aria-label="Post options" onClick={() => void reportPost(post.id)}><MoreHorizontal size={20}/></button></div>
                <p className="post-text">{post.body}</p>
                {post.media_url && post.media_type === "image" && <img className="post-media" src={post.media_url} alt="Photo shared on NOVA" loading="lazy" />}
                {post.media_url && post.media_type === "video" && <video className={active === "Shorts" ? "post-media short-video" : "post-media"} src={post.media_url} controls playsInline preload="metadata" />}
                <div className="post-meta"><span>{post.media_type === "video" ? "NOVA Short" : post.media_type === "image" ? "Photo post" : "Text post"}</span><span>{commentsByPost[post.id]?.length ?? 0} replies</span></div>
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
          <section className="side-card trend-card"><div className="right-title">DISCOVER NOVA <Sparkles size={15}/></div><button className="trend" onClick={() => setNotice("Creator discovery will be added in a later phase.")}><span className="trend-number">01</span><span><strong>Find your people</strong><small>Communities and creators</small></span><span className="trend-arrow">↗</span></button><button className="trend" onClick={() => {setActive("Shorts");void loadPosts();}}><span className="trend-number">02</span><span><strong>Watch Shorts</strong><small>Short-form videos</small></span><span className="trend-arrow">↗</span></button><button className="trend" onClick={() => {setActive("Messages");void loadConversations();}}><span className="trend-number">03</span><span><strong>Start a conversation</strong><small>Private messages</small></span><span className="trend-arrow">↗</span></button><button className="text-link" onClick={() => {setActive("Explore");void loadMembers();}}>Explore NOVA ↗</button></section>
          <section className="side-card invite-card"><div className="invite-icon"><Users size={20}/></div><div className="right-title">BETTER TOGETHER</div><h3>Your people are out there.</h3><p>Build a corner of the internet that feels like yours.</p><button className="outline-button" onClick={() => {setAuthMode("signup");setAuthOpen(true);}}>Join NOVA <Plus size={15}/></button></section>
          <div className="right-links"><a href="#about">About NOVA</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/export">Export data</a><a href="/delete-account">Delete account</a><a href="/admin">Admin</a><span>© 2026 NOVA</span></div>
        </aside>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">{nav.slice(0,5).map(item => <button key={item.label} className={active === item.label ? "mobile-active" : ""} onClick={() => {setActive(item.label);if(item.label === "Explore")void loadMembers();else if(item.label === "Shorts")void loadPosts();else if(item.label === "Messages")void loadConversations();else if(item.label === "Communities")void loadCommunities();}}><item.icon size={20}/><span>{item.label === "Communities" ? "Groups" : item.label}</span></button>)}</nav>
      {profileOpen && <div className="auth-backdrop" role="presentation" onClick={() => setProfileOpen(false)}><section className="auth-card card" role="dialog" aria-modal="true" aria-labelledby="profile-title" onClick={e => e.stopPropagation()}><button className="icon-button auth-close" aria-label="Close" onClick={() => setProfileOpen(false)}><X size={18}/></button><h2 id="profile-title">Your profile</h2><p>Update the details other NOVA members see.</p><form onSubmit={saveProfile}><label htmlFor="nova-avatar-upload">Profile photo</label>{avatarUrl && <img className="profile-upload-preview" src={avatarUrl} alt="Current profile photo" />}<input id="nova-avatar-upload" className="profile-file-input" type="file" accept="image/*" onChange={event => void uploadProfileImage(event, "avatar")} /><label htmlFor="nova-cover-upload">Cover photo</label>{coverUrl && <img className="cover-upload-preview" src={coverUrl} alt="Current cover photo" />}<input id="nova-cover-upload" className="profile-file-input" type="file" accept="image/*" onChange={event => void uploadProfileImage(event, "cover")} /><label htmlFor="nova-display-name">Display name</label><input id="nova-display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} required maxLength={80}/><label htmlFor="nova-username">Username</label><input id="nova-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="yourname" pattern="[A-Za-z0-9_.]{3,30}" title="3–30 characters: letters, numbers, underscore or dot" maxLength={30}/><label htmlFor="nova-bio">Bio</label><textarea id="nova-bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={500} placeholder="A little about you"/><button className="share-button auth-submit" type="submit" disabled={savingProfile || profileImageBusy}>{profileImageBusy ? "Uploading photo…" : savingProfile ? "Saving…" : "Save profile"}</button></form><button className="auth-switch" onClick={() => void signOut()}>Sign out of NOVA</button></section></div>}
      {authOpen && <div className="auth-backdrop" role="presentation" onClick={() => setAuthOpen(false)}><section className="auth-card card" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={e => e.stopPropagation()}><button className="icon-button auth-close" aria-label="Close" onClick={() => setAuthOpen(false)}><X size={18}/></button><div className="brand auth-brand"><span className="brand-mark">N</span><span>NOVA<span className="brand-dot">.</span></span></div><h2 id="auth-title">{authMode === "signup" ? "Create your account" : "Welcome back"}</h2><p>One account for your NOVA world.</p><form onSubmit={handleAuth}><label htmlFor="nova-email">Email</label><input id="nova-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/><label htmlFor="nova-password">Password</label><input id="nova-password" type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"/><button className="share-button auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : authMode === "signup" ? "Create account" : "Sign in"} <LogIn size={16}/></button></form><button className="auth-switch" onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}>{authMode === "signup" ? "Already have an account? Sign in" : "New to NOVA? Create an account"}</button></section></div>}
    </main>
  );
}
