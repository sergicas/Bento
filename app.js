const KEY = 'bento_docs_v1';
let docs = JSON.parse(localStorage.getItem(KEY) || '[]');
let currentFolder = '';

function save() {
  localStorage.setItem(KEY, JSON.stringify(docs));
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (toast) {
    if (message) toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function addDocument() {
  console.log('[Bento] Clic a Afegir');

  const name = document.getElementById('docName').value.trim();
  const cat = document.getElementById('docCategory').value.trim();
  const folder = document.getElementById('docFolder').value.trim() || 'General';
  const sub = document.getElementById('docSubfolder').value.trim();
  const tags = document.getElementById('docTags').value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  if (!name) {
    alert('Posa un nom');
    return;
  }

  docs.push({
    id: Date.now(),
    name,
    cat,
    folder,
    sub,
    tags
  });

  save();

  ['docName', 'docCategory', 'docFolder', 'docSubfolder', 'docTags']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

  currentFolder = folder;
  render();
  
  showToast('Document afegit correctament! ✅');
}

function render() {
  const searchEl = document.getElementById('search');
  const foldersEl = document.getElementById('folders');
  const listEl = document.getElementById('list');

  if (!foldersEl || !listEl) return;

  const q = (searchEl?.value || '').toLowerCase();

  const folders = Array.from(
    new Set(docs.map(d => d.folder).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  foldersEl.innerHTML =
    `<div class="folder" onclick="setFolder('')"><h3>📁 Totes</h3></div>` +
    folders.map(f => {
      const safeJs = JSON.stringify(f);
      const safeHtml = escapeHtml(f);
      return `<div class="folder" onclick='setFolder(${safeJs})'><h3>📁 ${safeHtml}</h3></div>`;
    }).join('');

  let filtered = docs.filter(d => !currentFolder || d.folder === currentFolder);

  if (q) {
    filtered = filtered.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.cat || '').toLowerCase().includes(q) ||
      (d.folder || '').toLowerCase().includes(q) ||
      (d.sub || '').toLowerCase().includes(q) ||
      (d.tags || []).join(' ').toLowerCase().includes(q)
    );
  }

  listEl.innerHTML =
    filtered
      .sort((a, b) => b.id - a.id)
      .map(d => `
        <div class="item">
          <div>
            <strong>${escapeHtml(d.name)}</strong>
            <small> · ${escapeHtml(d.cat || '—')} · ${escapeHtml(d.folder || '—')}${d.sub ? ' / ' + escapeHtml(d.sub) : ''}</small>
          </div>
          <div>
            <small>Etiquetes: ${escapeHtml((d.tags || []).join(', ') || '—')}</small>
          </div>
        </div>
      `)
      .join('') || '<small>Encara no hi ha documents.</small>';
}

function setFolder(f) {
  currentFolder = f;
  render();
}

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('addBtn');
  if (btn) btn.addEventListener('click', addDocument);

  const search = document.getElementById('search');
  if (search) search.addEventListener('input', render);

  render();
});
