/**
 * 生氣簿(Student Life Record) Assistant Pro - Application Logic
 */

// Global Application State
const STORAGE_KEY = 'LIFE_RECORD_APP_DATA_V2';

let state = {
  classInfo: "3학년 2반",
  students: [],
  selectedStudentId: null,
  activeTab: 'tab-logs',
  filter: 'all',
  searchQuery: '',
  theme: 'light'
};

// ==========================================
// Initialization & State Persistence
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadStateFromStorage();
  
  // If state is completely empty, auto-load sample data for immediate WOW experience
  if (!state.students || state.students.length === 0) {
    loadSampleData(false); // don't show toast on initial load
  }

  setupEventListeners();
  renderApp();
});

function loadStateFromStorage() {
  try {
    const dataStr = localStorage.getItem(STORAGE_KEY);
    if (dataStr) {
      const parsed = JSON.parse(dataStr);
      state = { ...state, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load local storage state:", e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const info = document.getElementById('storageInfo');
    if (info) {
      info.textContent = `🔒 저장됨 (${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})`;
    }
  } catch (e) {
    console.error("Failed to save state to local storage:", e);
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('LIFE_RECORD_THEME') || 'light';
  state.theme = savedTheme;
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  state.theme = theme;
  document.body.className = theme === 'dark' ? 'dark-mode' : 'light-mode';
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('LIFE_RECORD_THEME', theme);
}

// ==========================================
// Sample Data Loader
// ==========================================
function loadSampleData(showNotification = true) {
  if (typeof SAMPLE_DATA !== 'undefined') {
    state.classInfo = SAMPLE_DATA.classInfo || "3학년 2반";
    state.students = JSON.parse(JSON.stringify(SAMPLE_DATA.students));
    if (state.students.length > 0) {
      state.selectedStudentId = state.students[0].id;
    }
    saveState();
    renderApp();
    if (showNotification) {
      showToast('✨ 체험용 샘플 데이터 6명이 탑재되었습니다!', 'success');
    }
  }
}

// ==========================================
// Main Render Controller
// ==========================================
function renderApp() {
  // 1. Class Info & Header Stats
  document.getElementById('classInfoLabel').textContent = state.classInfo;
  
  const totalStudents = state.students.length;
  let totalLogs = 0;
  let completedCount = 0;

  state.students.forEach(s => {
    totalLogs += (s.logs || []).length;
    if (s.synthesisReport && s.synthesisReport.trim().length > 10) {
      completedCount++;
    }
  });

  document.getElementById('statStudentCount').textContent = `${totalStudents}명`;
  document.getElementById('statLogCount').textContent = `${totalLogs}건`;
  document.getElementById('statCompletedCount').textContent = `${completedCount}명`;

  // 2. Render Sidebar Student List
  renderStudentList();

  // 3. Render Workspace View
  const emptyStateView = document.getElementById('emptyStateView');
  const studentWorkspace = document.getElementById('studentWorkspace');

  const currentStudent = getSelectedStudent();

  if (!currentStudent) {
    emptyStateView.classList.remove('hidden');
    studentWorkspace.classList.add('hidden');
  } else {
    emptyStateView.classList.add('hidden');
    studentWorkspace.classList.remove('hidden');
    renderStudentBanner(currentStudent);
    renderTabContents(currentStudent);
  }
}

function getSelectedStudent() {
  if (!state.selectedStudentId) return null;
  return state.students.find(s => s.id === state.selectedStudentId) || null;
}

// ==========================================
// Sidebar & Student List Rendering
// ==========================================
function renderStudentList() {
  const container = document.getElementById('studentListContainer');
  container.innerHTML = '';

  let filtered = state.students.filter(s => {
    // Search Filter
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchNo = s.number.toString().includes(q);
      if (!matchName && !matchNo) return false;
    }
    // Tab Filter (all, incomplete, completed)
    const isCompleted = s.synthesisReport && s.synthesisReport.trim().length > 10;
    if (state.filter === 'completed' && !isCompleted) return false;
    if (state.filter === 'incomplete' && isCompleted) return false;

    return true;
  });

  // Sort by student number
  filtered.sort((a, b) => a.number - b.number);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        검색 결과가 없습니다.
      </div>
    `;
    return;
  }

  filtered.forEach(s => {
    const card = document.createElement('div');
    card.className = `student-card ${s.id === state.selectedStudentId ? 'active' : ''}`;
    
    const isCompleted = s.synthesisReport && s.synthesisReport.trim().length > 10;
    const logCount = (s.logs || []).length;

    card.innerHTML = `
      <div class="student-card-left">
        <div class="student-card-num">${s.number}</div>
        <div class="student-card-info">
          <h4>${escapeHtml(s.name)}</h4>
          <div class="student-card-meta">
            <span>${s.gender || '미지정'}</span>
          </div>
        </div>
      </div>
      <div class="student-card-right">
        <span class="badge-log-count">${logCount}개 기록</span>
        <span class="badge-status ${isCompleted ? 'completed' : 'incomplete'}">
          ${isCompleted ? '작성완료' : '기록중'}
        </span>
      </div>
    `;

    card.addEventListener('click', () => {
      state.selectedStudentId = s.id;
      saveState();
      renderApp();
    });

    container.appendChild(card);
  });
}

// ==========================================
// Student Banner Rendering
// ==========================================
function renderStudentBanner(student) {
  document.getElementById('studentAvatar').textContent = String(student.number).padStart(2, '0');
  document.getElementById('studentName').textContent = student.name;
  document.getElementById('studentNoBadge').textContent = `${student.number}번`;
  document.getElementById('studentGenderTag').textContent = student.gender || '성별 미지정';

  const isCompleted = student.synthesisReport && student.synthesisReport.trim().length > 10;
  const statusBadge = document.getElementById('studentStatusBadge');
  statusBadge.textContent = isCompleted ? '작성 완료' : '기록 중';
  statusBadge.className = `status-badge ${isCompleted ? 'completed' : 'incomplete'}`;

  // Key Traits Tags
  const tagsContainer = document.getElementById('studentKeyTags');
  tagsContainer.innerHTML = '';

  // Extract top categories from logs
  const catCounts = {};
  (student.logs || []).forEach(l => {
    catCounts[l.category] = (catCounts[l.category] || 0) + 1;
  });

  const sortedCats = Object.keys(catCounts).sort((a,b) => catCounts[b] - catCounts[a]);
  if (sortedCats.length > 0) {
    sortedCats.slice(0, 3).forEach(c => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = `#${c}`;
      tagsContainer.appendChild(chip);
    });
  } else {
    tagsContainer.innerHTML = `<span class="subtext">누적 기록을 추가하면 핵심 태그가 표시됩니다.</span>`;
  }
}

// ==========================================
// Tab Contents & Workspaces
// ==========================================
function renderTabContents(student) {
  // Update Tab Counts
  document.getElementById('tabLogCount').textContent = (student.logs || []).length;

  // Active Tab Switch
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === state.activeTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    if (panel.id === state.activeTab) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // Render Tab 1: Logs
  renderLogCategoryPresets();
  renderTimeline(student);
  
  // Set default log date to today if empty
  const logDateInput = document.getElementById('logDate');
  if (!logDateInput.value) {
    logDateInput.value = new Date().toISOString().split('T')[0];
  }

  // Render Tab 2: Synthesis
  renderSynthesisPanel(student);

  // Render Tab 3: Class Overview
  renderClassOverviewTable();
}

// ==========================================
// Log Preset Chips & Form
// ==========================================
function renderLogCategoryPresets() {
  const categorySelect = document.getElementById('logCategory');
  const selectedCat = categorySelect.value;
  const container = document.getElementById('presetChipsContainer');
  container.innerHTML = '';

  const phrases = PRESET_PHRASES[selectedCat] || [];
  phrases.forEach(phrase => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'preset-chip';
    chip.textContent = phrase;
    chip.addEventListener('click', () => {
      const textarea = document.getElementById('logContent');
      if (textarea.value.trim().length > 0) {
        textarea.value += ' ' + phrase;
      } else {
        textarea.value = phrase;
      }
      textarea.focus();
    });
    container.appendChild(chip);
  });
}

// ==========================================
// Timeline View
// ==========================================
function renderTimeline(student) {
  const container = document.getElementById('timelineContainer');
  const countEl = document.getElementById('timelineCount');
  const categoryFilter = document.getElementById('timelineCategoryFilter').value;

  container.innerHTML = '';
  
  let logs = student.logs || [];
  if (categoryFilter !== 'all') {
    logs = logs.filter(l => l.category === categoryFilter);
  }

  countEl.textContent = logs.length;

  if (logs.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted);">
        <p>등록된 누가기록이 없습니다.</p>
        <span class="subtext">왼쪽 폼에서 새 관찰 기록을 작성해보세요!</span>
      </div>
    `;
    return;
  }

  // Sort chronologically descending (newest first)
  const sortedLogs = [...logs].sort((a,b) => new Date(b.date) - new Date(a.date));

  const list = document.createElement('div');
  list.className = 'timeline-list';

  sortedLogs.forEach(log => {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const polarityClass = log.polarity || '긍정';

    item.innerHTML = `
      <div class="timeline-item-card">
        <div class="timeline-item-header">
          <div class="timeline-meta">
            <span class="timeline-date">${log.date}</span>
            <span class="cat-badge">${escapeHtml(log.category)}</span>
            <span class="polarity-badge ${polarityClass}">${log.polarity || '긍정'}</span>
          </div>
          <div class="timeline-actions">
            <button class="btn-icon-xs delete-log-btn" data-id="${log.id}" title="기록 삭제">🗑️</button>
          </div>
        </div>
        <div class="timeline-content">${escapeHtml(log.content)}</div>
      </div>
    `;

    // Event listener for delete
    const deleteBtn = item.querySelector('.delete-log-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('이 누가기록을 삭제하시겠습니까?')) {
        deleteLog(student.id, log.id);
      }
    });

    list.appendChild(item);
  });

  container.appendChild(list);
}

function deleteLog(studentId, logId) {
  const student = state.students.find(s => s.id === studentId);
  if (student) {
    student.logs = (student.logs || []).filter(l => l.id !== logId);
    saveState();
    renderApp();
    showToast('누가기록이 삭제되었습니다.', 'info');
  }
}

// ==========================================
// Synthesis Generator Engine
// ==========================================
function renderSynthesisPanel(student) {
  const logsCount = (student.logs || []).length;
  const analysisText = document.getElementById('synthesisAnalysisText');
  analysisText.textContent = `총 ${logsCount}건의 관찰 누적기록을 기반으로 종합분석합니다.`;

  const editor = document.getElementById('synthesisEditor');
  editor.value = student.synthesisReport || '';

  // Select current style radio
  const savedStyle = student.synthesisStyle || 'standard';
  document.querySelectorAll('input[name="synthesisStyle"]').forEach(radio => {
    if (radio.value === savedStyle) {
      radio.checked = true;
      radio.closest('.style-option').classList.add('active');
    } else {
      radio.closest('.style-option').classList.remove('active');
    }
  });

  // Perform live audit on current text
  auditNeisReportText(editor.value);
}

function generateSmartSynthesis() {
  const student = getSelectedStudent();
  if (!student) return;

  const logs = student.logs || [];
  if (logs.length === 0) {
    showToast('⚠️ 누적된 관찰 기록이 없어 기본 템플릿으로 생성되었습니다. 누가기록을 추가하면 더 구체적인 문장이 완성됩니다.', 'warning');
  }

  const selectedStyle = document.querySelector('input[name="synthesisStyle"]:checked').value;
  const selectedEnding = document.getElementById('endingType').value;

  // Group logs by category
  const categorized = {};
  logs.forEach(l => {
    if (!categorized[l.category]) categorized[l.category] = [];
    categorized[l.category].push(l.content);
  });

  let sentences = [];

  // 1. Intro Sentence based on Style & Student Notes
  if (selectedStyle === 'competency') {
    sentences.push(`${student.name} 학생은 지적 호기심과 주도적인 탐구 태도가 매우 뛰어난 학생임.`);
  } else if (selectedStyle === 'harmony') {
    sentences.push(`${student.name} 학생은 타인에 대한 두터운 배려심과 따뜻한 인품으로 학급의 긍정적인 공동체 분위기를 조성하는 학생임.`);
  } else {
    sentences.push(`${student.name} 학생은 성실하고 예의 바른 태도로 학교 생활 전반에 능동적으로 참여하는 모범적인 학생임.`);
  }

  // Add notes context if exists
  if (student.notes && student.notes.trim().length > 0) {
    const cleanNotes = student.notes.replace(/\.$/, '');
    sentences.push(`특히 ${cleanNotes} 등의 활동에서 강점을 드러냄.`);
  }

  // 2. Synthesize sentence blocks from log categories
  Object.keys(categorized).forEach(cat => {
    const contents = categorized[cat];
    const combinedText = contents.map(c => c.replace(/\.$/, '')).join(' 또한, ');
    
    if (cat === '협동·리더십') {
      sentences.push(`학급 공동체 활동 시 ${combinedText} 등의 리더십과 협동심을 보임.`);
    } else if (cat === '배려·봉사') {
      sentences.push(`봉사 및 배려 영역에서 ${combinedText} 모습으로 주변 교우들에게 훈훈한 본보기가 됨.`);
    } else if (cat === '학업태도·지적호기심') {
      sentences.push(`수업 및 학업 태도 면에서 ${combinedText} 하여 지적 성장 가능성을 입증함.`);
    } else if (cat === '규칙준수·책임감') {
      sentences.push(`규칙 준수 및 책임감 측면에서 ${combinedText} 함으로써 학급 구성원의 높은 신뢰를 얻음.`);
    } else if (cat === '창의성·도전정신') {
      sentences.push(`문제 해결 과정에서 ${combinedText} 하는 창의적 시도와 도전 정신이 돋보임.`);
    } else {
      sentences.push(`${cat} 영역에서 ${combinedText} 등의 관찰 특성을 보여줌.`);
    }
  });

  // 3. Conclusion Sentence
  if (selectedStyle === 'competency') {
    sentences.push(`향후 관심 분야에 대한 지속적인 탐구와 역량 개발을 통해 더 큰 성장이 기대됨.`);
  } else if (selectedStyle === 'harmony') {
    sentences.push(`자신뿐만 아니라 함께하는 주변 이웃과 함께 발전해 나가는 성숙한 주역으로 성장할 가능성이 매우 높음.`);
  } else {
    sentences.push(`앞으로의 학교 생활에서도 지속적인 자기 발전과 함께 학급의 든든한 일원으로서 훌륭히 역할을 다할 것으로 기대됨.`);
  }

  let finalReportText = sentences.join(' ');

  // 4. Normalize endings based on selectedEnding preference
  finalReportText = refineEndings(finalReportText, selectedEnding);

  // Update State & UI
  student.synthesisReport = finalReportText;
  student.synthesisStyle = selectedStyle;

  const editor = document.getElementById('synthesisEditor');
  editor.value = finalReportText;
  
  auditNeisReportText(finalReportText);
  saveState();
  renderApp();

  showToast('✨ 누적기록 기반 종합의견이 성공적으로 합성되었습니다!', 'success');
}

// Normalize/Refine Korean endings for NEIS standards
function refineEndings(text, endingType = 'ham') {
  if (!text) return '';

  let t = text;

  // Convert ~합니다 / ~했습니다 / ~입니다 -> NEIS style
  t = t.replace(/했습니다\./g, '함.');
  t = t.replace(/합니다\./g, '함.');
  t = t.replace(/보여줍니다\./g, '보여줌.');
  t = t.replace(/발휘하였습니다\./g, '발휘함.');
  t = t.replace(/발휘했습니다\./g, '발휘함.');
  t = t.replace(/입니다\./g, '임.');
  t = t.replace(/있습니다\./g, '있음.');
  t = t.replace(/돋보입니다\./g, '돋보임.');
  t = t.replace(/기대됩니다\./g, '기대됨.');

  if (endingType === 'ida') {
    t = t.replace(/함\./g, '임.');
  }

  return t;
}

// Audit Bytes & Forbidden Words
function auditNeisReportText(text) {
  const byteData = calculateNeisBytes(text);
  
  document.getElementById('byteCount').textContent = byteData.bytes;
  document.getElementById('charCount').textContent = byteData.charCount;
  document.getElementById('charNoSpaceCount').textContent = byteData.charNoSpaceCount;

  const progressFill = document.getElementById('byteProgressFill');
  const pct = Math.min(100, (byteData.bytes / 1500) * 100);
  progressFill.style.width = `${pct}%`;

  const byteMain = document.querySelector('.byte-main');
  if (byteData.bytes > 1500) {
    progressFill.classList.add('over-limit');
    byteMain.classList.add('warning');
  } else {
    progressFill.classList.remove('over-limit');
    byteMain.classList.remove('warning');
  }

  // Check Forbidden Words
  const foundForbidden = [];
  FORBIDDEN_WORDS.forEach(item => {
    if (text.includes(item.word)) {
      if (!foundForbidden.some(f => f.word === item.word)) {
        foundForbidden.push(item);
      }
    }
  });

  const alertBanner = document.getElementById('forbiddenAlert');
  const tagsContainer = document.getElementById('forbiddenTags');
  tagsContainer.innerHTML = '';

  if (foundForbidden.length > 0) {
    alertBanner.classList.remove('hidden');
    foundForbidden.forEach(f => {
      const tag = document.createElement('span');
      tag.className = 'forbidden-tag-chip';
      tag.textContent = `❌ ${f.word} (${f.category})`;
      tagsContainer.appendChild(tag);
    });
  } else {
    alertBanner.classList.add('hidden');
  }
}

// Calculate NEIS Bytes (Hangul: 3 bytes, Linebreak: 2 bytes, ASCII: 1 byte)
function calculateNeisBytes(str) {
  if (!str) return { bytes: 0, charCount: 0, charNoSpaceCount: 0 };
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (str[i] === '\n') {
      bytes += 2;
    } else if (code <= 0x007f) {
      bytes += 1;
    } else {
      bytes += 3;
    }
  }
  return {
    bytes,
    charCount: str.length,
    charNoSpaceCount: str.replace(/\s/g, '').length
  };
}

// ==========================================
// Class Overview & Print Modal
// ==========================================
function renderClassOverviewTable() {
  const tbody = document.getElementById('overviewTableBody');
  tbody.innerHTML = '';

  const sorted = [...state.students].sort((a,b) => a.number - b.number);

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px;">등록된 학생이 없습니다.</td></tr>`;
    return;
  }

  sorted.forEach(s => {
    const tr = document.createElement('tr');
    const isCompleted = s.synthesisReport && s.synthesisReport.trim().length > 10;
    const bytes = calculateNeisBytes(s.synthesisReport || '').bytes;

    // Distribution of log categories
    const catMap = {};
    (s.logs || []).forEach(l => { catMap[l.category] = (catMap[l.category] || 0) + 1; });
    const topCats = Object.keys(catMap).map(k => `${k}(${catMap[k]})`).join(', ') || '-';

    tr.innerHTML = `
      <td><strong>${s.number}번</strong></td>
      <td>${escapeHtml(s.name)}</td>
      <td>${s.gender || '미지정'}</td>
      <td>${(s.logs || []).length}건</td>
      <td><span class="subtext">${escapeHtml(topCats)}</span></td>
      <td>
        <span class="badge-status ${isCompleted ? 'completed' : 'incomplete'}">
          ${isCompleted ? '작성 완료' : '기록 중'}
        </span>
      </td>
      <td>${bytes} B</td>
      <td>
        <button class="btn btn-secondary-outline btn-xs select-student-btn" data-id="${s.id}">
          선택 및 편집
        </button>
      </td>
    `;

    tr.querySelector('.select-student-btn').addEventListener('click', () => {
      state.selectedStudentId = s.id;
      state.activeTab = 'tab-logs';
      saveState();
      renderApp();
    });

    tbody.appendChild(tr);
  });
}

function openPrintModal() {
  const modal = document.getElementById('printModal');
  const container = document.getElementById('printableContent');
  container.innerHTML = '';

  const sorted = [...state.students].sort((a,b) => a.number - b.number);

  if (sorted.length === 0) {
    container.innerHTML = '<p>인쇄할 학생 데이터가 없습니다.</p>';
  } else {
    sorted.forEach(student => {
      const page = document.createElement('div');
      page.className = 'printable-report-page';
      
      const byteInfo = calculateNeisBytes(student.synthesisReport || '');

      page.innerHTML = `
        <div style="border: 2px solid #333; padding: 24px; margin-bottom: 30px; background: white; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="font-size: 18pt; font-weight: bold;">[${escapeHtml(state.classInfo)}] 행동특성 및 종합의견 기록부</h2>
            <div style="font-size: 14pt; font-weight: bold;">
              ${student.number}번 성명: <span style="text-decoration: underline;">${escapeHtml(student.name)}</span> (${student.gender || ''})
            </div>
          </div>

          <div style="margin-bottom: 16px;">
            <h4 style="font-size: 11pt; font-weight: bold; margin-bottom: 6px; color: #4f46e5;">■ 누적 관찰 요약 (${(student.logs || []).length}건)</h4>
            <div style="font-size: 9.5pt; color: #555; background: #f9f9f9; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">
              ${(student.logs || []).map(l => `• [${l.date}] [${l.category}] ${escapeHtml(l.content)}`).join('<br>') || '누적 기록 없음'}
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h4 style="font-size: 11pt; font-weight: bold; color: #10b981;">■ 학기말 행동특성 및 종합의견 (NEIS 입력용)</h4>
              <span style="font-size: 9pt; color: #666;">(${byteInfo.bytes} Bytes / ${byteInfo.charCount}자)</span>
            </div>
            <div style="font-size: 10.5pt; line-height: 1.8; padding: 14px; border: 1px solid #333; background: #fff; border-radius: 4px; min-height: 140px; white-space: pre-wrap;">
              ${escapeHtml(student.synthesisReport || '아직 작성된 종합의견이 없습니다.')}
            </div>
          </div>
        </div>
      `;

      container.appendChild(page);
    });
  }

  modal.classList.remove('hidden');
}

// ==========================================
// Event Listeners Setup
// ==========================================
function setupEventListeners() {
  // Theme Toggle
  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  // Load Sample Data Button
  document.getElementById('loadSampleBtn').addEventListener('click', () => {
    if (confirm('샘플 데모 학생 데이터(6명)를 탑재하시겠습니까? (기존 데이터와 함께 추가되거나 재구성됩니다)')) {
      loadSampleData(true);
    }
  });

  document.getElementById('emptyLoadSampleBtn').addEventListener('click', () => {
    loadSampleData(true);
  });

  // Data Dropdown Toggle
  const dataMenuBtn = document.getElementById('dataMenuBtn');
  const dropdownMenu = document.getElementById('dataDropdownMenu');
  dataMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
  });

  // JSON Export / Import
  document.getElementById('exportJsonBtn').addEventListener('click', exportDataJson);
  document.getElementById('importJsonBtn').addEventListener('click', () => {
    document.getElementById('jsonFileInput').click();
  });
  document.getElementById('jsonFileInput').addEventListener('change', importDataJson);

  // Clear All Data
  document.getElementById('clearDataBtn').addEventListener('click', () => {
    if (confirm('⚠️ 모든 학생 데이터 및 누가기록이 삭제됩니다. 정말 초기화하시겠습니까?')) {
      state.students = [];
      state.selectedStudentId = null;
      saveState();
      renderApp();
      showToast('전체 데이터가 초기화되었습니다.', 'info');
    }
  });

  // Search & Filter
  const searchInput = document.getElementById('studentSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    if (state.searchQuery) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    renderStudentList();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    renderStudentList();
  });

  // Filter Pills
  document.getElementById('filterPills').addEventListener('click', (e) => {
    if (e.target.classList.contains('pill')) {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      state.filter = e.target.dataset.filter;
      renderStudentList();
    }
  });

  // Navigation Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeTab = btn.dataset.tab;
      const student = getSelectedStudent();
      if (student) renderTabContents(student);
    });
  });

  // Log Form Category Change Listener for Preset Refresh
  document.getElementById('logCategory').addEventListener('change', renderLogCategoryPresets);

  // Save Log Form
  document.getElementById('logForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const student = getSelectedStudent();
    if (!student) return;

    const date = document.getElementById('logDate').value;
    const category = document.getElementById('logCategory').value;
    const polarity = document.getElementById('logPolarity').value;
    const content = document.getElementById('logContent').value.trim();

    if (!content) {
      showToast('관찰 내용을 입력해주세요.', 'warning');
      return;
    }

    const newLog = {
      id: 'log-' + Date.now(),
      date,
      category,
      polarity,
      content
    };

    if (!student.logs) student.logs = [];
    student.logs.push(newLog);

    saveState();
    document.getElementById('logContent').value = '';
    renderApp();
    showToast('💾 누가기록이 안전하게 저장되었습니다!', 'success');
  });

  document.getElementById('resetLogFormBtn').addEventListener('click', () => {
    document.getElementById('logContent').value = '';
  });

  // Timeline Filter Change
  document.getElementById('timelineCategoryFilter').addEventListener('change', () => {
    const student = getSelectedStudent();
    if (student) renderTimeline(student);
  });

  // Style Selector Change
  document.querySelectorAll('input[name="synthesisStyle"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.querySelectorAll('.style-option').forEach(opt => opt.classList.remove('active'));
      e.target.closest('.style-option').classList.add('active');
    });
  });

  // Generate Synthesis Button
  document.getElementById('generateReportBtn').addEventListener('click', generateSmartSynthesis);

  // Synthesis Editor Live Audit
  const editor = document.getElementById('synthesisEditor');
  editor.addEventListener('input', (e) => {
    auditNeisReportText(e.target.value);
  });

  // Save Synthesis Button
  document.getElementById('saveSynthesisBtn').addEventListener('click', () => {
    const student = getSelectedStudent();
    if (!student) return;

    student.synthesisReport = editor.value;
    saveState();
    renderApp();
    
    const saveStatus = document.getElementById('saveStatusText');
    saveStatus.textContent = '✓ 저장 완료';
    setTimeout(() => { saveStatus.textContent = ''; }, 2500);
    showToast('종합의견이 저장되었습니다.', 'success');
  });

  // Refine Endings Button
  document.getElementById('refineEndingBtn').addEventListener('click', () => {
    const endingType = document.getElementById('endingType').value;
    editor.value = refineEndings(editor.value, endingType);
    auditNeisReportText(editor.value);
    showToast('문장 어미가 NEIS 표준형으로 다듬어졌습니다.', 'info');
  });

  // Copy NEIS Button
  document.getElementById('copyNeisBtn').addEventListener('click', () => {
    const text = editor.value;
    if (!text || text.trim().length === 0) {
      showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 NEIS 입력용 종합의견이 클립보드에 복사되었습니다!', 'success');
    }).catch(err => {
      console.error('Clipboard copy failed:', err);
      showToast('복사에 실패했습니다. 직접 드래그하여 복사하세요.', 'danger');
    });
  });

  // Print Class Report Button
  document.getElementById('printClassReportBtn').addEventListener('click', openPrintModal);
  document.getElementById('closePrintModalBtn').addEventListener('click', () => {
    document.getElementById('printModal').classList.add('hidden');
  });

  // Add / Edit Student Modal
  const studentModal = document.getElementById('studentModal');
  document.getElementById('addStudentModalBtn').addEventListener('click', () => {
    document.getElementById('studentModalTitle').textContent = '새 학생 추가';
    document.getElementById('editStudentId').value = '';
    document.getElementById('modalStudentNumber').value = (state.students.length + 1);
    document.getElementById('modalStudentName').value = '';
    document.getElementById('modalStudentGender').value = '남';
    document.getElementById('modalStudentNotes').value = '';
    studentModal.classList.remove('hidden');
  });

  document.getElementById('editStudentBtn').addEventListener('click', () => {
    const student = getSelectedStudent();
    if (!student) return;
    document.getElementById('studentModalTitle').textContent = '학생 정보 수정';
    document.getElementById('editStudentId').value = student.id;
    document.getElementById('modalStudentNumber').value = student.number;
    document.getElementById('modalStudentName').value = student.name;
    document.getElementById('modalStudentGender').value = student.gender || '남';
    document.getElementById('modalStudentNotes').value = student.notes || '';
    studentModal.classList.remove('hidden');
  });

  document.getElementById('closeStudentModalBtn').addEventListener('click', () => {
    studentModal.classList.add('hidden');
  });
  document.getElementById('cancelStudentModalBtn').addEventListener('click', () => {
    studentModal.classList.add('hidden');
  });

  document.getElementById('studentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('editStudentId').value;
    const num = parseInt(document.getElementById('modalStudentNumber').value, 10);
    const name = document.getElementById('modalStudentName').value.trim();
    const gender = document.getElementById('modalStudentGender').value;
    const notes = document.getElementById('modalStudentNotes').value.trim();

    if (!name) return;

    if (editId) {
      // Edit existing
      const s = state.students.find(x => x.id === editId);
      if (s) {
        s.number = num;
        s.name = name;
        s.gender = gender;
        s.notes = notes;
      }
    } else {
      // Add new
      const newStudent = {
        id: 'std-' + Date.now(),
        number: num,
        name,
        gender,
        notes,
        logs: [],
        synthesisReport: '',
        synthesisStyle: 'standard'
      };
      state.students.push(newStudent);
      state.selectedStudentId = newStudent.id;
    }

    saveState();
    studentModal.classList.add('hidden');
    renderApp();
    showToast('학생 정보가 저장되었습니다.', 'success');
  });

  // Delete Student
  document.getElementById('deleteStudentBtn').addEventListener('click', () => {
    const student = getSelectedStudent();
    if (!student) return;

    if (confirm(`'${student.name}' 학생 및 관련 누가기록을 정말 삭제하시겠습니까?`)) {
      state.students = state.students.filter(s => s.id !== student.id);
      state.selectedStudentId = state.students.length > 0 ? state.students[0].id : null;
      saveState();
      renderApp();
      showToast('학생이 삭제되었습니다.', 'info');
    }
  });

  // Class Info Modal
  const classModal = document.getElementById('classInfoModal');
  document.getElementById('editClassBtn').addEventListener('click', () => {
    document.getElementById('modalClassInfoInput').value = state.classInfo;
    classModal.classList.remove('hidden');
  });
  document.getElementById('closeClassModalBtn').addEventListener('click', () => {
    classModal.classList.add('hidden');
  });
  document.getElementById('cancelClassModalBtn').addEventListener('click', () => {
    classModal.classList.add('hidden');
  });
  document.getElementById('classInfoForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.classInfo = document.getElementById('modalClassInfoInput').value.trim();
    saveState();
    classModal.classList.add('hidden');
    renderApp();
    showToast('학급 명칭이 수정되었습니다.', 'success');
  });
}

// JSON Export & Import Helpers
function exportDataJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `생기부_누가기록_백업_${state.classInfo}_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('📥 데이터 백업 JSON 파일이 다운로드되었습니다.', 'success');
}

function importDataJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (imported && Array.isArray(imported.students)) {
        state = { ...state, ...imported };
        saveState();
        renderApp();
        showToast('📤 백업 데이터가 정상 복원되었습니다!', 'success');
      } else {
        showToast('올바르지 않은 생기부 데이터 파일입니다.', 'danger');
      }
    } catch (err) {
      showToast('JSON 파싱 오류가 발생했습니다.', 'danger');
    }
  };
  reader.readAsText(file);
}

// Toast Helpers
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'danger') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
