// 資料存儲
let notes = [];
let categories = JSON.parse(localStorage.getItem('noteCategories')) || [
    '工作筆記', '學習筆記', '會議記錄', '專案規劃', '個人日記'
];

// 從 localStorage 載入筆記
function loadNotesFromStorage() {
    const stored = localStorage.getItem('notes');
    if (stored) {
        notes = JSON.parse(stored);
    }
}

// 儲存筆記到 localStorage
function saveNotesToStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
}

// 儲存類別到 localStorage
function saveCategoriesToStorage() {
    localStorage.setItem('noteCategories', JSON.stringify(categories));
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadNotesFromStorage();
    updateCategorySelects();
    updateStatistics();
    renderNotes();

    // 表單提交事件
    document.getElementById('noteForm').addEventListener('submit', handleSubmit);
});

// 處理表單提交
function handleSubmit(e) {
    e.preventDefault();

    const category = document.getElementById('noteCategory').value;
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const tags = document.getElementById('noteTags').value.trim();

    if (!category || !title || !content) {
        showAlert('請填寫所有必填欄位', 'warning');
        return;
    }

    // 自動美編處理
    const formattedContent = autoFormatContent(content);

    const note = {
        id: Date.now(),
        category: category,
        title: title,
        content: content,
        formattedContent: formattedContent, // 儲存美編後的內容
        tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    notes.push(note);
    saveNotesToStorage();
    updateStatistics();
    renderNotes();
    resetForm();
    showAlert('筆記已成功新增並自動排版！', 'success');
}

// 自動美編排版功能
function autoFormatContent(content) {
    let formatted = content;

    // 1. 辨識並格式化標題（偵測全大寫或帶有數字編號的行）
    formatted = formatted.replace(/^([A-Z\s]{3,}|[\d一二三四五六七八九十]+[、.)].*|第[一二三四五六七八九十\d]+[章節])$/gm, 
        '<h3 style="color: #667eea; font-size: 1.3em; font-weight: bold; margin: 20px 0 10px 0; border-bottom: 2px solid #667eea; padding-bottom: 5px;">$1</h3>');

    // 2. 辨識並格式化項目列表（• - * 開頭）
    formatted = formatted.replace(/^[•\-\*]\s*(.+)$/gm, 
        '<div style="margin: 8px 0 8px 20px; padding-left: 15px; border-left: 3px solid #667eea;">• $1</div>');

    // 3. 辨識並格式化數字列表
    formatted = formatted.replace(/^(\d+)[.、)]\s*(.+)$/gm, 
        '<div style="margin: 8px 0 8px 20px; padding-left: 15px;"><span style="color: #667eea; font-weight: bold;">$1.</span> $2</div>');

    // 4. 格式化引用或重點（> 或「」包圍）
    formatted = formatted.replace(/^>\s*(.+)$/gm, 
        '<blockquote style="margin: 15px 0; padding: 15px 20px; background: #f0f4ff; border-left: 5px solid #667eea; font-style: italic; color: #555;">$1</blockquote>');

    // 5. 強調文字（*文字* 或 **文字**）
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, 
        '<strong style="color: #667eea; font-weight: bold;">$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, 
        '<em style="color: #764ba2; font-style: italic;">$1</em>');

    // 6. 底線文字（_文字_）
    formatted = formatted.replace(/_(.+?)_/g, 
        '<u style="text-decoration: underline; text-decoration-color: #667eea;">$1</u>');

    // 7. 代碼或技術名詞（`文字`）
    formatted = formatted.replace(/`(.+?)`/g, 
        '<code style="background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: Consolas, monospace; color: #e74c3c;">$1</code>');

    // 8. 分隔線（--- 或 ===）
    formatted = formatted.replace(/^(---+|===+)$/gm, 
        '<hr style="border: none; border-top: 2px dashed #667eea; margin: 20px 0;">');

    // 9. 網址自動轉連結
    formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, 
        '<a href="$1" target="_blank" style="color: #667eea; text-decoration: underline;">$1</a>');

    // 10. 格式化段落（兩個以上換行視為新段落）
    formatted = formatted.replace(/\n\n+/g, '</p><p style="margin: 15px 0; line-height: 1.8;">');
    formatted = '<p style="margin: 15px 0; line-height: 1.8;">' + formatted + '</p>';

    // 11. 高亮重點文字（【】或[]包圍）
    formatted = formatted.replace(/【(.+?)】/g, 
        '<mark style="background: #fff3cd; padding: 2px 6px; border-radius: 3px; font-weight: bold;">$1</mark>');

    return formatted;
}

// 重置表單
function resetForm() {
    document.getElementById('noteForm').reset();
}

// 新增類別
function addNewCategory() {
    const categoryName = prompt('請輸入新類別名稱：');
    if (categoryName && categoryName.trim()) {
        const trimmedName = categoryName.trim();
        if (categories.includes(trimmedName)) {
            showAlert('此類別已存在', 'warning');
            return;
        }
        categories.push(trimmedName);
        saveCategoriesToStorage();
        updateCategorySelects();
        showAlert('類別已新增', 'success');
    }
}

// 更新類別下拉選單
function updateCategorySelects() {
    const categorySelect = document.getElementById('noteCategory');
    const categoryFilter = document.getElementById('categoryFilter');
    
    // 保留預設選項
    const defaultOption = categorySelect.querySelector('option[value=""]');
    categorySelect.innerHTML = '';
    categorySelect.appendChild(defaultOption);
    
    const filterDefaultOption = categoryFilter.querySelector('option[value=""]');
    categoryFilter.innerHTML = '';
    categoryFilter.appendChild(filterDefaultOption);
    
    categories.forEach(cat => {
        const option1 = document.createElement('option');
        option1.value = cat;
        option1.textContent = cat;
        categorySelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = cat;
        option2.textContent = cat;
        categoryFilter.appendChild(option2);
    });
}

// 更新統計資料
function updateStatistics() {
    document.getElementById('totalNotes').textContent = notes.length;
    
    const uniqueCategories = new Set(notes.map(n => n.category));
    document.getElementById('totalCategories').textContent = uniqueCategories.size;
    
    if (notes.length > 0) {
        const latestNote = notes[notes.length - 1];
        const date = new Date(latestNote.updatedAt);
        document.getElementById('lastUpdate').textContent = formatDate(date);
    } else {
        document.getElementById('lastUpdate').textContent = '-';
    }
}

// 格式化日期
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 渲染筆記列表
function renderNotes() {
    const notesList = document.getElementById('notesList');
    const categoryFilter = document.getElementById('categoryFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filteredNotes = notes;
    
    // 類別篩選
    if (categoryFilter) {
        filteredNotes = filteredNotes.filter(note => note.category === categoryFilter);
    }
    
    // 搜尋篩選
    if (searchTerm) {
        filteredNotes = filteredNotes.filter(note => {
            return note.title.toLowerCase().includes(searchTerm) ||
                   note.content.toLowerCase().includes(searchTerm) ||
                   note.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        });
    }
    
    if (filteredNotes.length === 0) {
        notesList.innerHTML = '<div class="no-notes">沒有符合條件的筆記</div>';
        return;
    }
    
    notesList.innerHTML = filteredNotes.map(note => `
        <div class="note-card">
            <div class="note-header">
                <span class="note-category">${note.category}</span>
                <span class="note-date">${formatDate(new Date(note.createdAt))}</span>
            </div>
            <h3 class="note-title">${note.title}</h3>
            <div class="note-content formatted-preview" style="padding: 15px; background: #f9f9f9; border-radius: 8px; max-height: 180px; overflow: hidden; position: relative;">
                ${note.formattedContent || note.content.substring(0, 200) + (note.content.length > 200 ? '...' : '')}
                ${(note.formattedContent || note.content).length > 200 ? '<div style="position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: linear-gradient(transparent, #f9f9f9);"></div>' : ''}
            </div>
            ${note.tags.length > 0 ? `
                <div class="note-tags">
                    ${note.tags.map(tag => `<span class="note-tag">#${tag}</span>`).join('')}
                </div>
            ` : ''}
            <div class="note-actions">
                <button class="btn-preview" onclick="previewNote(${note.id})" style="background: linear-gradient(135deg, #667eea, #764ba2);">👁️ 預覽排版</button>
                <button class="btn-edit" onclick="editNote(${note.id})">✏️ 編輯</button>
                <button class="btn-delete" onclick="deleteNote(${note.id})">🗑️ 刪除</button>
            </div>
        </div>
    `).join('');
}

// 篩選筆記
function filterNotes() {
    renderNotes();
}

// 清除篩選
function clearFilters() {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('searchInput').value = '';
    renderNotes();
}

// 編輯筆記
function editNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    
    const modalContent = `
        <form id="editNoteForm">
            <div class="form-group">
                <label>類別 *</label>
                <select id="editCategory" required>
                    ${categories.map(cat => `
                        <option value="${cat}" ${note.category === cat ? 'selected' : ''}>${cat}</option>
                    `).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>標題 *</label>
                <input type="text" id="editTitle" value="${note.title}" required>
            </div>
            
            <div class="form-group">
                <label>內容 *</label>
                <textarea id="editContent" rows="8" required>${note.content}</textarea>
            </div>
            
            <div class="form-group">
                <label>標籤</label>
                <input type="text" id="editTags" value="${note.tags.join(', ')}">
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-primary">💾 儲存</button>
                <button type="button" class="btn-secondary" onclick="closeEditModal()">取消</button>
            </div>
        </form>
    `;
    
    document.getElementById('editFormContainer').innerHTML = modalContent;
    document.getElementById('editModal').style.display = 'block';
    
    document.getElementById('editNoteForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        note.category = document.getElementById('editCategory').value;
        note.title = document.getElementById('editTitle').value.trim();
        note.content = document.getElementById('editContent').value.trim();
        note.formattedContent = autoFormatContent(note.content); // 更新時重新美編
        note.tags = document.getElementById('editTags').value.trim()
            .split(',').map(t => t.trim()).filter(t => t);
        note.updatedAt = new Date().toISOString();
        
        saveNotesToStorage();
        updateStatistics();
        renderNotes();
        closeEditModal();
        showAlert('筆記已更新並重新排版', 'success');
    });
}

// 刪除筆記
function deleteNote(id) {
    showConfirm('確定要刪除這筆筆記嗎？', () => {
        notes = notes.filter(n => n.id !== id);
        saveNotesToStorage();
        updateStatistics();
        renderNotes();
        showAlert('筆記已刪除', 'success');
    });
}

// 關閉編輯 Modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// 預覽單一筆記
function previewNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    
    const previewContent = `
        <div style="max-width: 900px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #667eea;">
                <h1 style="color: #667eea; font-size: 2.5em; margin-bottom: 10px;">${note.title}</h1>
                <div style="color: #888; font-size: 1.1em;">
                    <span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 5px 15px; border-radius: 20px; margin-right: 15px;">${note.category}</span>
                    <span>${formatDate(new Date(note.createdAt))}</span>
                </div>
                ${note.tags.length > 0 ? `
                    <div style="margin-top: 15px;">
                        ${note.tags.map(tag => `<span style="background: #e8eaf6; color: #667eea; padding: 5px 15px; border-radius: 15px; margin: 5px; display: inline-block;">#${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            <div style="font-size: 1.1em; color: #333; line-height: 1.9;">
                ${note.formattedContent || note.content}
            </div>
        </div>
    `;
    
    document.getElementById('previewContent').innerHTML = previewContent;
    document.getElementById('previewModal').style.display = 'block';
}

// 預覽文件
function previewDocument() {
    if (notes.length === 0) {
        showAlert('目前沒有筆記可以預覽', 'warning');
        return;
    }
    
    const previewContent = generateDocumentContent();
    document.getElementById('previewContent').innerHTML = previewContent;
    document.getElementById('previewModal').style.display = 'block';
}

// 關閉預覽 Modal
function closePreviewModal() {
    document.getElementById('previewModal').style.display = 'none';
}

// 生成文件內容
function generateDocumentContent() {
    // 按類別分組
    const notesByCategory = {};
    notes.forEach(note => {
        if (!notesByCategory[note.category]) {
            notesByCategory[note.category] = [];
        }
        notesByCategory[note.category].push(note);
    });
    
    let html = `
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #667eea; font-size: 2.5em; margin-bottom: 10px;">📝 筆記整合文件</h1>
            <p style="color: #999; font-size: 1.1em;">匯出日期：${formatDate(new Date())}</p>
            <p style="color: #999;">共 ${notes.length} 筆筆記 | ${Object.keys(notesByCategory).length} 個類別</p>
        </div>
    `;
    
    // 依類別輸出
    Object.keys(notesByCategory).sort().forEach(category => {
        html += `<div class="preview-category-section">`;
        html += `<h2 class="preview-category-title">${category}</h2>`;
        
        notesByCategory[category].forEach(note => {
            html += `
                <div class="preview-note">
                    <h3 class="preview-note-title">${note.title}</h3>
                    <p style="color: #999; font-size: 0.9em; margin-bottom: 10px;">${formatDate(new Date(note.createdAt))}</p>
                    ${note.tags.length > 0 ? `
                        <div style="margin-bottom: 15px;">
                            ${note.tags.map(tag => `<span style="background: #e8eaf6; color: #667eea; padding: 4px 12px; border-radius: 15px; font-size: 0.85em; margin-right: 8px;">#${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="preview-note-content" style="font-size: 1.05em; line-height: 1.8;">${note.formattedContent || note.content}</div>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    return html;
}

// 匯出 PDF
async function exportToPDF() {
    if (notes.length === 0) {
        showAlert('目前沒有筆記可以匯出', 'warning');
        return;
    }
    
    try {
        // 創建臨時容器
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = 'width: 210mm; padding: 20mm; background: white; font-family: Microsoft JhengHei, Arial, sans-serif;';
        tempDiv.innerHTML = generateDocumentContent();
        document.body.appendChild(tempDiv);
        
        // 使用 html2canvas 轉換
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        // 創建 PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        const fileName = `筆記整合_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        document.body.removeChild(tempDiv);
        showAlert('PDF 已成功匯出！', 'success');
        
    } catch (error) {
        console.error('PDF 匯出失敗:', error);
        showAlert('PDF 匯出失敗，請重試', 'error');
    }
}

// 匯出 Word（簡化版本 - 實際為 HTML 格式）
function exportToWord() {
    if (notes.length === 0) {
        showAlert('目前沒有筆記可以匯出', 'warning');
        return;
    }
    
    try {
        const content = generateDocumentContent();
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Microsoft JhengHei', Arial, sans-serif; padding: 40px; }
                    h1 { color: #667eea; }
                    h2 { color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; margin-top: 40px; }
                    h3 { color: #333; }
                    .preview-note { margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 10px; }
                    .preview-note-content { line-height: 1.8; white-space: pre-wrap; }
                </style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `;
        
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `筆記整合_${new Date().toISOString().split('T')[0]}.doc`;
        link.click();
        URL.revokeObjectURL(url);
        
        showAlert('Word 文件已成功匯出！', 'success');
        
    } catch (error) {
        console.error('Word 匯出失敗:', error);
        showAlert('Word 匯出失敗，請重試', 'error');
    }
}

// 自訂提示窗
function showAlert(message, type = 'info') {
    const overlay = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    const messageEl = document.getElementById('alertMessage');
    const buttonsEl = document.getElementById('alertButtons');
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    icon.textContent = icons[type] || icons.info;
    messageEl.textContent = message;
    buttonsEl.innerHTML = '<button class="alert-btn alert-btn-primary" onclick="closeAlert()">確定</button>';
    
    overlay.style.display = 'block';
}

function showConfirm(message, onConfirm) {
    const overlay = document.getElementById('customAlert');
    const icon = document.getElementById('alertIcon');
    const messageEl = document.getElementById('alertMessage');
    const buttonsEl = document.getElementById('alertButtons');
    
    icon.textContent = '❓';
    messageEl.textContent = message;
    buttonsEl.innerHTML = `
        <button class="alert-btn alert-btn-secondary" onclick="closeAlert()">取消</button>
        <button class="alert-btn alert-btn-primary" onclick="confirmAction()">確定</button>
    `;
    
    window.pendingConfirmAction = onConfirm;
    overlay.style.display = 'block';
}

function closeAlert() {
    document.getElementById('customAlert').style.display = 'none';
    window.pendingConfirmAction = null;
}

function confirmAction() {
    if (window.pendingConfirmAction) {
        window.pendingConfirmAction();
        window.pendingConfirmAction = null;
    }
    closeAlert();
}

// Modal 點擊外部關閉
window.onclick = function(event) {
    const previewModal = document.getElementById('previewModal');
    const editModal = document.getElementById('editModal');
    
    if (event.target === previewModal) {
        closePreviewModal();
    }
    if (event.target === editModal) {
        closeEditModal();
    }
};
