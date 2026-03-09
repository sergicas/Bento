// ============================================
// BENTO - Organitzador de Documents
// Solució DEFINITIVA: Supabase inicialitzat UNA SOLA VEZ
// ============================================

// Variables globals
let supabase = null;
let docs = [];
let currentFolder = '';

// ============================================
// 1. Inicialitzar Supabase
// ============================================
function initSupabase() {
  if (supabase) return; // Ja està inicialitzat

  const supabaseUrl = 'https://vlyhfgrxpyyscsklxoru.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZseWhmZ3J4cHl5c2Nza2x4b3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTU1NDQsImV4cCI6MjA4ODU3MTU0NH0.-kwCSNUO29zjbtz_8cQ6ACFp8GsM_mdcmBtygGd9cgY';

  supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase inicialitzat');
}

// ============================================
// 2. Toast Notifications
// ============================================
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.innerText = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ============================================
// 3. HTML Escaping
// ============================================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// 4. Cargar Documents
// ============================================
async function fetchDocuments() {
  if (!supabase) {
    console.error('Supabase no inicialitzat');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;

    docs = data || [];
    console.log(`✅ Carregats ${docs.length} documents`);
    render();
  } catch (err) {
    console.error('Error carregant documents:', err);
    showToast('Error carregant documents ❌');
  }
}

// ============================================
// 5. Afegir Document
// ============================================
async function addDocument() {
  if (!supabase) {
    showToast('Error: Supabase no inicialitzat ❌');
    return;
  }

  const name = document.getElementById('docName')?.value.trim();
  const cat = document.getElementById('docCategory')?.value.trim();
  const folder = document.getElementById('docFolder')?.value.trim() || 'General';
  const sub = document.getElementById('docSubfolder')?.value.trim();
  const tagsStr = document.getElementById('docTags')?.value || '';
  const fileInput = document.getElementById('docFile');
  const file = fileInput?.files?.[0];

  if (!name) {
    alert('Posa un nom al document');
    return;
  }

  let file_url = null;

  // Pujar fitxer si existe
  if (file) {
    showToast('Pujant fitxer... ⏳');
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('bento-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('bento-files')
        .getPublicUrl(fileName);

      file_url = publicUrlData?.publicUrl;
    } catch (err) {
      console.error('Error pujant fitxer:', err);
      showToast('Error pujant fitxer ❌');
      return;
    }
  }

  // Insertar document
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert([{ name, cat, folder, sub, tags: tagsStr, file_url }])
      .select();

    if (error) throw error;

    if (data?.length > 0) {
      docs.unshift(data[0]);
      console.log('✅ Document afegit');
    }

    // Netejar formulari
    ['docName', 'docCategory', 'docFolder', 'docSubfolder', 'docTags'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    if (fileInput) fileInput.value = '';

    currentFolder = folder;
    render();
    showToast('Document afegit ✅');
  } catch (err) {
    console.error('Error afegint document:', err);
    showToast('Error afegint document ❌');
  }
}

// ============================================
// 6. Eliminar Document
// ============================================
async function deleteDocument(id) {
  if (!id || isNaN(id)) {
    console.error('ID inválid:', id);
    return;
  }

  if (!confirm('Eliminar document? No es pot desfer.')) return;

  if (!supabase) {
    showToast('Error: Supabase no inicialitzat ❌');
    return;
  }

  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;

    docs = docs.filter(d => d.id !== id);
    console.log('✅ Document eliminat');
    render();
    showToast('Document eliminat ✅');
  } catch (err) {
    console.error('Error eliminant document:', err);
    showToast('Error eliminant document ❌');
  }
}

// ============================================
// 7. Renderitzar UI
// ============================================
function render() {
  const searchEl = document.getElementById('search');
  const foldersEl = document.getElementById('folders');
  const listEl = document.getElementById('list');

  if (!foldersEl || !listEl) return;

  const q = (searchEl?.value || '').toLowerCase();

  // Generar carpetes
  const folders = Array.from(
    new Set(docs.map(d => d.folder).filter(Boolean))
  ).sort();

  foldersEl.innerHTML = `<div class="folder" onclick="setFolder('')"><h3>📁 Totes</h3></div>` +
    folders.map(f => 
      `<div class="folder" onclick="setFolder('${escapeHtml(f)}')"><h3>📁 ${escapeHtml(f)}</h3></div>`
    ).join('');

  // Filtrar documents
  let filtered = docs.filter(d => !currentFolder || d.folder === currentFolder);

  if (q) {
    filtered = filtered.filter(d => {
      const tagArray = (d.tags || '').split(',').map(t => t.trim());
      return [d.name, d.cat, d.folder, d.sub, ...tagArray]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }

  // Renderitzar documents
  listEl.innerHTML = filtered
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
            ${d.file_url ? `<div style="margin-top: 6px;"><a href="${escapeHtml(d.file_url)}" target="_blank" class="attachment-btn">Veure arxiu 📎</a></div>` : ''}
          </div>
          <button class="delete-btn" onclick="deleteDocument(${d.id})">🗑️</button>
        </div>
      `;
    })
    .join('') || '<small>Encara no hi ha documents.</small>';
}

// ============================================
// 8. Filtrar per Carpeta
// ============================================
function setFolder(f) {
  currentFolder = f;
  render();
}

// ============================================
// 9. Inicialitzar al carregar pàgina
// ============================================
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Inicialitzant Bento...');
  
  // Esperar a que Supabase library estigui carregada
  const checkSupabase = setInterval(() => {
    if (window.supabase) {
      clearInterval(checkSupabase);
      initSupabase();
      
      // Connectar events
      document.getElementById('addBtn')?.addEventListener('click', addDocument);
      document.getElementById('search')?.addEventListener('input', render);
      
      // Caregar documents
      fetchDocuments();
    }
  }, 100);
});
