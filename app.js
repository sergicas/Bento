// Persistència local
const KEY = 'bento_docs_v1';
let docs = JSON.parse(localStorage.getItem(KEY) || '[]');
let currentFolder = '';

function save(){ localStorage.setItem(KEY, JSON.stringify(docs)); }

function add(){
  const name = document.getElementById('name').value.trim();
  const cat = document.getElementById('cat').value.trim();
  const folder = document.getElementById('folder').value.trim() || 'General';
  const sub = document.getElementById('sub').value.trim();
  const tags = document.getElementById('tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  if(!name) return alert('Posa un nom');
  docs.push({ id: Date.now(), name, cat, folder, sub, tags });
  save();
  ['name','cat','folder','sub','tags'].forEach(id=>document.getElementById(id).value='');
  currentFolder = folder;
  render();
}

function render(){
  const q = (document.getElementById('q').value||'').toLowerCase();
  const folders = Array.from(new Set(docs.map(d=>d.folder))).sort();
  const fc = document.getElementById('folders');
  fc.innerHTML = '<div class="folder" onclick="setFolder('')">Totes</div>' + folders.map(f=>`<div class="folder" onclick="setFolder('${f.replace(/'/g,"&#39;")}')"><h3>📁 ${f}</h3></div>`).join('');

  let filtered = docs.filter(d=> !currentFolder || d.folder===currentFolder);
  if(q){
    filtered = filtered.filter(d=> d.name.toLowerCase().includes(q) || (d.cat||'').toLowerCase().includes(q) || (d.tags||[]).join(' ').toLowerCase().includes(q));
  }
  document.getElementById('list').innerHTML = filtered.sort((a,b)=>b.id-a.id).map(d=>`
    <div class="item">
      <div><strong>${d.name}</strong> <small>· ${d.cat||'—'} · ${d.folder}${d.sub?(' / '+d.sub):''}</small></div>
      <div><small>Etiquetes: ${(d.tags||[]).join(', ')||'—'}</small></div>
    </div>
  `).join('') || '<small>Encara no hi ha documents.</small>';
}

function setFolder(f){ currentFolder = f; render(); }

window.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('addBtn').addEventListener('click', add);
  render();
});
// Inici: enganxa el listener i pinta
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('addBtn');
  if (btn) btn.addEventListener('click', addDocument);
  render();
});
