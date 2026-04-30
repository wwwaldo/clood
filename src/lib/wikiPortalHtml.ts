import type { TopicMemory } from "./memoryStorage";

export function generatePortalHtml(memories: TopicMemory[]): string {
  const memoriesJson = JSON.stringify(memories);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>clood wiki</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: #0a0a0f;
    color: #e8e4e0;
    display: flex;
    height: 100vh;
    overflow: hidden;
  }
  .sidebar {
    width: 280px;
    min-width: 280px;
    background: #14141f;
    border-right: 1px solid #2a2a3a;
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  .sidebar-header {
    padding: 20px;
    border-bottom: 1px solid #2a2a3a;
  }
  .sidebar-header h1 {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  .sidebar-header h1 span { color: #d4a574; }
  .sidebar-header p {
    font-size: 12px;
    color: #5a5666;
    margin-top: 4px;
  }
  .search-wrap {
    padding: 12px 16px;
    border-bottom: 1px solid #2a2a3a;
  }
  .search-wrap input {
    width: 100%;
    background: #0a0a0f;
    border: 1px solid #2a2a3a;
    border-radius: 8px;
    padding: 8px 12px;
    color: #e8e4e0;
    font-size: 13px;
    outline: none;
  }
  .search-wrap input:focus { border-color: #d4a574; }
  .search-wrap input::placeholder { color: #5a5666; }
  .topic-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
  }
  .topic-list::-webkit-scrollbar { width: 4px; }
  .topic-list::-webkit-scrollbar-track { background: transparent; }
  .topic-list::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 2px; }
  .topic-item {
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    margin-bottom: 2px;
    transition: background 0.15s;
  }
  .topic-item:hover { background: #1e1e2e; }
  .topic-item.active { background: rgba(212, 165, 116, 0.15); }
  .topic-name {
    font-size: 14px;
    font-weight: 600;
    color: #e8e4e0;
    margin-bottom: 2px;
  }
  .topic-item.active .topic-name { color: #d4a574; }
  .topic-meta {
    font-size: 11px;
    color: #5a5666;
    display: flex;
    gap: 8px;
  }
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .main-header {
    padding: 16px 24px;
    border-bottom: 1px solid #2a2a3a;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 60px;
  }
  .main-title {
    font-size: 24px;
    font-weight: 700;
    color: #d4a574;
  }
  .main-actions { display: flex; gap: 8px; }
  .btn {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid #2a2a3a;
    background: #14141f;
    color: #e8e4e0;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn:hover { border-color: #d4a574; color: #d4a574; }
  .btn-save {
    background: #d4a574;
    color: #0a0a0f;
    border-color: #d4a574;
    font-weight: 600;
  }
  .btn-save:hover { background: #b8895a; }
  .btn-danger { color: #e05555; border-color: #e05555; }
  .btn-danger:hover { background: rgba(224, 85, 85, 0.1); }
  .main-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }
  .main-content::-webkit-scrollbar { width: 4px; }
  .main-content::-webkit-scrollbar-track { background: transparent; }
  .main-content::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 2px; }
  .meta-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
    font-size: 12px;
    color: #5a5666;
  }
  .rank-badge {
    background: rgba(212, 165, 116, 0.15);
    border: 1px solid #d4a574;
    border-radius: 99px;
    padding: 2px 10px;
    color: #d4a574;
    font-weight: 700;
    font-size: 12px;
  }
  .content-text {
    font-size: 15px;
    line-height: 1.7;
    color: #8a8694;
    white-space: pre-wrap;
  }
  .wiki-link {
    color: #d4a574;
    text-decoration: underline;
    cursor: pointer;
    text-underline-offset: 2px;
  }
  .wiki-link:hover { color: #e8c9a0; }
  .edit-area {
    width: 100%;
    min-height: 300px;
    background: #0a0a0f;
    border: 1px solid #d4a574;
    border-radius: 8px;
    padding: 16px;
    color: #e8e4e0;
    font-size: 15px;
    line-height: 1.7;
    font-family: inherit;
    resize: vertical;
    outline: none;
  }
  .links-section {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #2a2a3a;
  }
  .links-title {
    font-size: 12px;
    font-weight: 700;
    color: #5a5666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }
  .links-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
  .link-pill {
    background: rgba(212, 165, 116, 0.15);
    border: 1px solid rgba(212, 165, 116, 0.25);
    border-radius: 99px;
    padding: 4px 14px;
    font-size: 13px;
    color: #d4a574;
    cursor: pointer;
    transition: all 0.15s;
  }
  .link-pill:hover { border-color: #d4a574; background: rgba(212, 165, 116, 0.25); }
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #5a5666;
    gap: 8px;
  }
  .empty-state svg { opacity: 0.3; }
  .status-dot {
    width: 8px; height: 8px;
    border-radius: 4px;
    background: #55b87a;
    display: inline-block;
    margin-right: 6px;
  }
</style>
</head>
<body>
<div class="sidebar">
  <div class="sidebar-header">
    <h1>clood<span>.</span> wiki</h1>
    <p><span class="status-dot"></span>connected to phone</p>
  </div>
  <div class="search-wrap">
    <input type="text" id="search" placeholder="Search memories...">
  </div>
  <div class="topic-list" id="topicList"></div>
</div>
<div class="main">
  <div class="main-header" id="mainHeader">
    <span class="main-title" id="mainTitle">Select a topic</span>
    <div class="main-actions" id="mainActions"></div>
  </div>
  <div class="main-content" id="mainContent">
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/></svg>
      <p>Select a topic from the sidebar</p>
    </div>
  </div>
</div>
<script>
let memories = ${memoriesJson};
let activeTopic = null;
let editing = false;

function renderSidebar(filter) {
  const list = document.getElementById('topicList');
  const q = (filter || '').toLowerCase();
  const filtered = q
    ? memories.filter(m => m.topic.includes(q) || m.content.toLowerCase().includes(q))
    : memories;
  list.innerHTML = filtered.map(m => {
    const active = activeTopic && activeTopic.topic === m.topic ? ' active' : '';
    return '<div class="topic-item' + active + '" onclick="selectTopic(\\'' + m.topic.replace(/'/g, "\\\\'") + '\\')">'
      + '<div class="topic-name">' + esc(m.topic) + '</div>'
      + '<div class="topic-meta"><span>rank ' + m.rank + '</span>'
      + (m.links.length ? '<span>' + m.links.length + ' links</span>' : '')
      + '</div></div>';
  }).join('');
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderWikiContent(content) {
  const parts = content.split(/(\\[\\[.+?\\]\\])/g);
  return parts.map(p => {
    const m = p.match(/^\\[\\[(.+?)\\]\\]$/);
    if (m) {
      const topic = m[1];
      return '<span class="wiki-link" onclick="selectTopic(\\'' + topic.toLowerCase().trim().replace(/'/g, "\\\\'") + '\\')">' + esc(topic) + '</span>';
    }
    return esc(p);
  }).join('');
}

function selectTopic(topicName) {
  const mem = memories.find(m => m.topic === topicName);
  if (!mem) {
    document.getElementById('mainTitle').textContent = topicName;
    document.getElementById('mainActions').innerHTML = '';
    document.getElementById('mainContent').innerHTML = '<div class="empty-state"><p>Topic not found</p></div>';
    activeTopic = null;
    renderSidebar(document.getElementById('search').value);
    return;
  }
  activeTopic = mem;
  editing = false;
  renderMain();
  renderSidebar(document.getElementById('search').value);
}

function renderMain() {
  if (!activeTopic) return;
  const m = activeTopic;
  document.getElementById('mainTitle').textContent = m.topic;

  const date = new Date(m.updatedAt);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr = months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();

  if (editing) {
    document.getElementById('mainActions').innerHTML =
      '<button class="btn btn-save" onclick="saveEdit()">Save</button>'
      + '<button class="btn" onclick="cancelEdit()">Cancel</button>';
    document.getElementById('mainContent').innerHTML =
      '<div class="meta-bar"><span class="rank-badge">rank ' + m.rank + '</span><span>Updated ' + dateStr + '</span></div>'
      + '<textarea class="edit-area" id="editArea">' + esc(m.content) + '</textarea>'
      + '<p style="margin-top:8px;font-size:12px;color:#5a5666">Use [[topic name]] to link to other topics</p>';
  } else {
    document.getElementById('mainActions').innerHTML =
      '<button class="btn" onclick="startEdit()">Edit</button>'
      + '<button class="btn btn-danger" onclick="deleteMem()">Delete</button>';
    let html = '<div class="meta-bar"><span class="rank-badge">rank ' + m.rank + '</span><span>Updated ' + dateStr + '</span></div>'
      + '<div class="content-text">' + renderWikiContent(m.content) + '</div>';
    if (m.links.length > 0) {
      html += '<div class="links-section"><div class="links-title">Related topics</div><div class="links-wrap">'
        + m.links.map(l => '<span class="link-pill" onclick="selectTopic(\\'' + l.replace(/'/g, "\\\\'") + '\\')">' + esc(l) + '</span>').join('')
        + '</div></div>';
    }
    document.getElementById('mainContent').innerHTML = html;
  }
}

function startEdit() {
  editing = true;
  renderMain();
  document.getElementById('editArea').focus();
}

function cancelEdit() {
  editing = false;
  renderMain();
}

async function saveEdit() {
  const content = document.getElementById('editArea').value;
  const topic = activeTopic.topic;
  try {
    await fetch('/api/memories/' + encodeURIComponent(topic), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const res = await fetch('/api/memories');
    memories = await res.json();
    activeTopic = memories.find(m => m.topic === topic);
    editing = false;
    renderMain();
    renderSidebar(document.getElementById('search').value);
  } catch (e) {
    alert('Failed to save: ' + e.message);
  }
}

async function deleteMem() {
  if (!confirm('Delete "' + activeTopic.topic + '" permanently?')) return;
  try {
    await fetch('/api/memories/' + encodeURIComponent(activeTopic.topic), { method: 'DELETE' });
    const res = await fetch('/api/memories');
    memories = await res.json();
    activeTopic = null;
    editing = false;
    document.getElementById('mainTitle').textContent = 'Select a topic';
    document.getElementById('mainActions').innerHTML = '';
    document.getElementById('mainContent').innerHTML = '<div class="empty-state"><p>Topic deleted</p></div>';
    renderSidebar(document.getElementById('search').value);
  } catch (e) {
    alert('Failed to delete: ' + e.message);
  }
}

document.getElementById('search').addEventListener('input', function() {
  renderSidebar(this.value);
});

renderSidebar();
</script>
</body>
</html>`;
}
