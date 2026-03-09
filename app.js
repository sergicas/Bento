// ✅ SOLUCIÓ: Supabase ja està declarat al HTML
// app.js simplement usa la variable global `supabase`

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
  if (!supabase) {
    console.error('❌ Supabase no està disponible');
    showToast('Error: Supabase no disponible ❌');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Error carregant documents:', error);
      showToast('Error carregant documents ❌');
      return;
    }

    docs = data || [];
    console.log('✅ Documents carregats:', docs.length);
    render();
  } catch (err) {
    console.error('Exception en fetchDocuments:', err);
    showToast('Error carregant documents ❌');
  }
}

async function addDocument() {
  if (!supabase) {
    console.error('❌ Supabase no està disponible');
    showToast('Error: Supabase no disponible ❌');
    return;
  }

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

    try {
      const { error: uploadError } = await supabase.storage
        .from('bento-files')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error pujant fitxer:', uploadError);
        showToast('Error pujant fitxer ❌');
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('bento-files')
        .getPublicUrl(fileName);

      if (publicUrlData && publicUrlData.publicUrl) {
        file_url = publicUrlData.publicUrl;
        console.log('✅ Fitxer pujat:', file_url);
      }
    } catch (err) {
      console.error('Error en procés de pujada:', err);
      showToast('Error en procés de pujada ❌');
      return;
    }
  }

  const newDoc = {
    name,
    cat,
    folder,
    sub,
    tags: tagsStr,
    file_url: file_url
  };

  try {
    const { data, error } = await supabase
      .from('documents')
      .insert([newDoc])
      .select();

    if (error) {
      console.error('Error insertant document:', error);
      showToast('Error en afegir document ❌');
      return;
    }

    if (data && data.length > 0) {
      docs.unshift(data[0]);
      console.log('✅ Document afegit correctament');
    }

    // Netejar formulari
    ['docName', 'docCategory', 'docFolder', 'docSubfolder', 'docTags'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    if (fileInput) fileInput.value = '';

    currentFolder = folder;
    render();
    showToast('Document afegit correctament! ✅');
  } catch (err) {
    console.error('Exception en addDocument:', err);
    showToast('Error en afegir document ❌');
  }
}

async function deleteDocument(id) {
  if (!id || isNaN(id)) {
    console.error('ID inválid:', id);
    showToast('Error: ID inválid ❌');
    return;
  }

  if (!supabase) {
    showToast('Error: Supabase no disponible ❌');
    return;
  }

  if (confirm('N\'estàs segur que vols eliminar aquest document? Aquesta acció no es pot desfer.')) {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error eliminant document:', error);
        showToast('Error en eliminar document ❌');
        return;
      }

      docs = docs.filter(d => d.id !== id);
      console.log('✅ Document eliminat correctament');
      render();
      showToast('Document eliminat correctament 🗑️');
    } catch (err) {
      console.error('Exception en deleteDocument:', err);
      showToast('Error en eliminar document ❌');
    }
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
      const safeHtml = escapeHtml(f);
      return `<div class="folder" onclick="setFolder('${safeHtml}')"><h3>📁 ${safeHtml}</h3></div>`;
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

// Inicialitzar quan el DOM estigui llest
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Inicialitzant Bento...');
  
  const btn = document.getElementById('addBtn');
  if (btn) btn.addEventListener('click', addDocument);

  const search = document.getElementById('search');
  if (search) search.addEventListener('input', render);

  // Carregar documents del núvol
  fetchDocuments();
});
