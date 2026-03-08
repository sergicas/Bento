// Persistència local
const KEY = 'bento_docs_v1';
let docs = JSON.parse(localStorage.getItem(KEY) || '[]');
let currentFolder = '';

// Guarda a localStorage
function save() { localStorage.setItem(KEY, JSON.stringify(docs)); }

// Afegir document
function addDocument() {
  console.log('[Bento] Clic a Afegir');
  const name = document.getElementById('docName').value.trim();
  const cat  = document.getElementById('docCategory').value.trim();
  const folder = document.getElementById('docFolder').value.trim() || 'General';
  const sub  = document.getElementById('docSubfolder').value.trim();
  const tags = document.getElementById('docTags').value.split(',').map(t=>t.trim()).filter(Boolean);

  if (!name) { alert('Posa un nom'); return; }

  docs.push({ id: Date.now(), name, cat, folder, sub, tags });
  save();

  // Neteja inputs
  ['docName','docCategory','docFolder','docSubfolder','docTags']
    .forEach(id => document.getElementById(id).value = '');

  currentFolder = folder;
  render();
}

// Pintar pantalles
function render() {
  const q = (document.getElementById('search').value || '').toLowerCase();

  // Carpetes
  const folders = Array.from(new Set(docs.map(d => d.folder))).sort();
  const fc = document.getElementById('folders');
  fc.innerHTML =
    '<div class="folder" onclick="setFolder(\'\')"><h3>📁 Totes</h3></div>' +
    folders.map(f => `<div class="folder" onclick="setFolder('${f.replace(/'/g, '&#39;')}')"><h3>📁 ${f}</h3></div>`).join('');

  // Llista
  const list = document.getElementById('list');
  let filtered = docs.filter(d => !currentFolder || d.folder === currentFolder);
  if (q) {
    filtered = filtered.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.cat || '').toLowerCase().includes(q) ||
      (d.tags || []).join(' ').toLowerCase().includes(q)
    );
  }

  list.innerHTML = filtered
    .sort((a,b) => b.id - a.id)
    .map(d => `
      <div class="item">
        <div><strong>${d.name}</strong>
          <small> · ${d.cat || '—'} · ${d.folder}${d.sub ? ' / ' + d.sub : ''}</small>
        </div>
        <div><small>Etiquetes: ${(d.tags || []).join(', ') || '—'}</small></div>
      </div>
    `).join('') || '<small>Encara no hi ha documents.</small>';
}

function setFolder(f) { currentFolder = f; render(); }

// --- ÚNICA inicialització ---
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('addBtn');
  if (btn) btn.addEventListener('click', addDocument);
  document.getElementById('search').addEventListener('input', render);
  render();
});
