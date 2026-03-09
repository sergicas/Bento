// ============================================
// BENTO - FASE 5: SUPABASE (AMB PUJADA D'ARXIUS)
// ============================================

// Variables globals
let supabase = null;
let docs = [];
let currentFolder = '';

// ============================================
// 1. Inicialitzar Supabase
// ============================================
function initSupabase() {
    if (supabase) return;

    const supabaseUrl = 'https://vlyhfgrxpyyscsklxoru.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZseWhmZ3J4cHl5c2Nza2x4b3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTU1NDQsImV4cCI6MjA4ODU3MTU0NH0.-kwCSNUO29zjbtz_8cQ6ACFp8GsM_mdcmBtygGd9cgY';

    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase connectat per a la Fase 5');
}

// ============================================
// 2. Funcions Auxiliars (Toast i Escapatge)
// ============================================
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// 3. Cargar Documents des del Núvol
// ============================================
async function fetchDocuments() {
    if (!supabase) return;
    try {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;
        docs = data || [];
        renderFolders();
        renderList();
    } catch (err) {
        console.error('Error carregant documents:', err);
        showToast('Error carregant dades ❌');
    }
}

// ============================================
// 4. Afegir Document al Núvol (Amb Suport d'Arxius)
// ============================================
async function addDocument() {
    if (!supabase) {
        showToast('Error de Supabase ❌');
        return;
    }

    const name = document.getElementById('docName')?.value.trim();
    const cat = document.getElementById('docCategory')?.value.trim();
    const folder = document.getElementById('docFolder')?.value.trim() || 'General';
    const sub = document.getElementById('docSubfolder')?.value.trim();
    const tagsStr = document.getElementById('docTags')?.value || '';
    const tagsFormatted = tagsStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).join(',');

    const fileInput = document.getElementById('docFile');
    const file = fileInput?.files?.[0];

    if (!name) {
        showToast('❌ Posa un nom al document!');
        return;
    }

    showToast('Sincronitzant amb el núvol... ⏳');

    let file_url = null;

    // Pujar arxiu a Storage si l'usuari n'ha seleccionat un
    if (file) {
        showToast('Pujant l\\'arxiu... ⏳');
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
            // No aturem;  creem igual la metadata sense arxiu si falla aquest pas
        }
    }

    // Guardar metadata del document a la base de dades SQL
    try {
        const { data, error } = await supabase
            .from('documents')
            .insert([{
                name,
                cat,
                folder,
                sub,
                tags: tagsFormatted,
                file_url
            }])
            .select();

        if (error) throw error;

        if (data?.length > 0) {
            docs.unshift(data[0]);
        }

        // Netejar el formulari
        ['docName', 'docCategory', 'docFolder', 'docSubfolder', 'docTags'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        if (fileInput) fileInput.value = '';
        const fileNameDisplay = document.getElementById('fileNameDisplay');
        if (fileNameDisplay) fileNameDisplay.innerText = 'Adjuntar arxiu...';

        currentFolder = folder;
        renderFolders();
        renderList();
        showToast('Document guardat al núvol ✅');

    } catch (err) {
        console.error('Error pujant document a Supabase:', err);
        showToast('Error de connexió ❌');
    }
}

// ============================================
// 5. Eliminar Document del Núvol
// ============================================
async function deleteDocument(id) {
    if (!id || isNaN(id)) return;
    if (!confirm('Vols eliminar el document definitivament del servidor?')) return;

    if (!supabase) return;

    try {
        const { error } = await supabase.from('documents').delete().eq('id', id);
        if (error) throw error;

        docs = docs.filter(d => d.id !== id);
        renderFolders();
        renderList();
        showToast('Document esborrat 🗑️');
    } catch (err) {
        console.error('Error eliminant document del núvol:', err);
    }
}

// ============================================
// 6. Funcions de Ui: Renderitzar Dades
// ============================================
function renderFolders() {
    const foldersEl = document.getElementById('folders');
    if (!foldersEl) return;

    const uniqueFolders = Array.from(new Set(docs.map(d => d.folder).filter(Boolean))).sort();

    let html = `<button class="folder ${currentFolder === '' ? 'active' : ''}" onclick="setFolder('')">
                <span class="folder-icon">📁</span>
                <span class="folder-name">Totes</span>
              </button>`;

    uniqueFolders.forEach(f => {
        const safeF = escapeHtml(f);
        const isActive = currentFolder === f ? 'active' : '';
        html += `<button class="folder ${isActive}" onclick="setFolder('${safeF}')">
               <span class="folder-icon">📁</span>
               <span class="folder-name">${safeF}</span>
             </button>`;
    });

    foldersEl.innerHTML = html;
}

function setFolder(folderName) {
    currentFolder = folderName;
    renderFolders();
    renderList();
}

function renderList() {
    const listEl = document.getElementById('list');
    const searchEl = document.getElementById('search');
    if (!listEl) return;

    const query = (searchEl?.value || '').toLowerCase();
    let filtered = docs.filter(d => currentFolder === '' || d.folder === currentFolder);

    if (query) {
        filtered = filtered.filter(d => {
            let tagsStr = '';
            if (Array.isArray(d.tags)) { tagsStr = d.tags.join(' '); }
            else if (typeof d.tags === 'string') { tagsStr = d.tags.split(',').join(' '); }
            return [d.name, d.cat, d.folder, d.sub, tagsStr].join(' ').toLowerCase().includes(query);
        });
    }

    filtered.sort((a, b) => b.id - a.id);

    if (filtered.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">
      No hi ha cap document guardat.
    </div>`;
        return;
    }

    listEl.innerHTML = filtered.map(d => {
        let finalTagsArray = [];
        if (Array.isArray(d.tags)) { finalTagsArray = d.tags; }
        else if (typeof d.tags === 'string' && d.tags !== "") { finalTagsArray = d.tags.split(','); }

        const tagsHtml = finalTagsArray.map(t => `<span class="tag">#${escapeHtml(t.trim())}</span>`).join('');

        return `
      <div class="item">
        <div class="item-content">
          <h3 class="item-title">${escapeHtml(d.name)}</h3>
          <div class="item-meta">
             ${d.cat ? `<span class="badge category-badge">${escapeHtml(d.cat)}</span>` : ''}
             <span class="badge folder-badge">${escapeHtml(d.folder || 'General')} ${d.sub ? ` / ${escapeHtml(d.sub)}` : ''}</span>
          </div>
          ${tagsHtml ? `<div class="item-tags">${tagsHtml}</div>` : ''}
        </div>
        <div class="item-actions">
           ${d.file_url
                ? `<a href="${escapeHtml(d.file_url)}" target="_blank" class="attachment-btn" style="text-decoration:none">Veure arxiu 📎</a>`
                : `<div style="width:1px"></div>`
            }
           <button class="delete-btn" onclick="deleteDocument(${d.id})">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
           </button>
        </div>
      </div>
    `;
    }).join('');
}

// ============================================
// 7. Punt d'Entrada
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Fase 5: Inicialitzant Supabase Backend amb Arxius...");

    const checkSupabase = setInterval(() => {
        if (window.supabase) {
            clearInterval(checkSupabase);
            initSupabase();

            document.getElementById('addBtn')?.addEventListener('click', addDocument);
            document.getElementById('search')?.addEventListener('input', renderList);

            fetchDocuments();
        }
    }, 100);
});
