// Supabase configuració
const supabaseUrl = 'https://vlyhfgrxpyyscsklxoru.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZseWhmZ3J4cHl5c2Nza2x4b3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTU1NDQsImV4cCI6MjA4ODU3MTU0NH0.-kwCSNUO29zjbtz_8cQ6ACFp8GsM_mdcmBtygGd9cgY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let docs = [];
let currentFolder = '';

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

async function fetchDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error('Error carregant documents de Supabase:', error);
    showToast('Error carregant documents ❌');
    return;
  }

  docs = data || [];
  render();
}

async function addDocument() {
  const name = document.getElementById('docName').value.trim();
  const cat = document.getElementById('docCategory').value.trim();
  const folder = document.getElementById('docFolder').value.trim() || 'General';
  const sub = document.getElementById('docSubfolder').value.trim();
  const tagsStr = document.getElementById('docTags').value;
  const fileInput = document.getElementById('docFile');
  const file = fileInput ? fileInput.files[0] : null;

  if (!name) {
    alert('Posa un nom al document');
    return;
  }

  let file_url = null;

  if (file) {
    showToast('Pujant fitxer al núvol... ⏳');
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('bento-files')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error pujant el fitxer:', uploadError);
      showToast('Error pujant el fitxer ❌');
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('bento-files')
      .getPublicUrl(fileName);

    file_url = publicUrlData.publicUrl;
  }

  const newDoc = {
    name,
    cat,
    folder,
    sub,
    tags: tagsStr,
    file_url: file_url
  };

  const { data, error } = await supabase
    .from('documents')
    .insert([newDoc])
    .select();

  if (error) {
    console.error('Error insertant a Supabase:', error);
    showToast('Error en afegir el document ❌');
    return;
  }

  // Afegeix el document retornat per Supabase (amb el seu ID real)
  if (data && data.length > 0) {
    docs.unshift(data[0]); // Posa'l al principi
  }

  ['docName', 'docCategory', 'docFolder', 'docSubfolder', 'docTags', 'docFile']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

  currentFolder = folder;
  render();
  showToast('Document afegit correctament! ✅');
}

async function deleteDocument(id) {
  if (confirm('N\'estàs segur que vols eliminar aquest document? Aquesta acció no es pot desfer i s\'eliminarà del núvol.')) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminant a Supabase:', error);
      showToast('Error en eliminar el document ❌');
      return;
    }

    docs = docs.filter(d => d.id !== id);
    render();
    showToast('Document eliminat correctament 🗑️');
  }
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
    filtered = filtered.filter(d => {
      const tagArray = (d.tags || '').split(',').map(t => t.trim());
      return d.name.toLowerCase().includes(q) ||
        (d.cat || '').toLowerCase().includes(q) ||
        (d.folder || '').toLowerCase().includes(q) ||
        (d.sub || '').toLowerCase().includes(q) ||
        tagArray.join(' ').toLowerCase().includes(q)
    });
  }

  listEl.innerHTML =
    filtered
      .map(d => {
        const tagArray = (d.tags || '').split(',').map(t => t.trim()).filter(Boolean);
        return `
        <div class="item">
          <div class="item-content">
            <div>
              <strong>${escapeHtml(d.name)}</strong>
              <small> · ${escapeHtml(d.cat || '—')} · ${escapeHtml(d.folder || '—')}${d.sub ? ' / ' + escapeHtml(d.sub) : ''}</small>
            </div>
            <div>
              <small>Etiquetes: ${escapeHtml(tagArray.join(', ') || '—')}</small>
            </div>
            ${d.file_url ? `<div style="margin-top: 6px;"><a href="${escapeHtml(d.file_url)}" target="_blank" class="attachment-btn" title="Veure arxiu adjunt">Veure arxiu 📎</a></div>` : ''}
          </div>
          <button class="delete-btn" onclick="deleteDocument(${d.id})" title="Eliminar document">🗑️</button>
        </div>
      `})
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

  // Carregar els documents del núvol en obrir la pàgina
  fetchDocuments();
});
