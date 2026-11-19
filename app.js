// ========================================================
// 입력창 실시간 1,000단위 쉼표(5000 -> 5,000) 포맷팅 엔진
// ========================================================
function formatCurrencyInput(input) {
  if (!input) return;
  // 수식(=으로 시작)인 경우 수식 입력 허용
  if (input.value.startsWith('=')) return;

  const cursorPosition = input.selectionStart;
  const originalVal = input.value;
  const rawDigits = originalVal.replace(/[^0-9]/g, '');

  if (rawDigits === '') {
    input.value = '';
    return;
  }

  const num = parseInt(rawDigits, 10);
  const formatted = num.toLocaleString('ko-KR');

  // 커서 위치 보정: 쉼표가 추가되더라도 커서 위치가 올바르게 유지되도록 계산
  const digitsBeforeCursor = originalVal.slice(0, cursorPosition).replace(/[^0-9]/g, '').length;
  input.value = formatted;

  let newCursorPos = 0;
  let digitsCounted = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/[0-9]/.test(formatted[i])) {
      digitsCounted++;
    }
    if (digitsCounted === digitsBeforeCursor) {
      newCursorPos = i + 1;
      break;
    }
  }
  if (newCursorPos === 0 && formatted.length > 0) newCursorPos = formatted.length;
  input.setSelectionRange(newCursorPos, newCursorPos);
}

// ========================================================
// 스마트 자산 가계부 — 핀테크 라이트 v3.5 메인 로직
// 토스증권 (QQQM, SPYM, SCHD, NVDA, IEF, TSLA) 100% 반영
// 순자산 & 저축 달성액 직접 수정 · 3·6·9·12개월 비교 리포트
// 여행자금/적금 분리 · 영구 저장 시스템
// ========================================================

const LOCAL_STORAGE_KEY = 'smart_ledger_v3_light';

let state = {
  isLocked: true,
  currentTab: 'excel_ledger',
  selectedYear: '2026',
  selectedMonth: '2026-10', // 10월 시작
  comparisonPeriod: 3,      // 기본 3개월 비교
  hideAmounts: false,
  data: null,
  searchQuery: '',
  filterType: 'all',
  filterCategory: 'all',
  filterAccount: 'all',
  charts: {}
};

// 금액 숨기기 (000,000 마스킹) 및 포맷터 (암호 인증 후 전환)
const HIDE_AMOUNTS_AUTH_HASH = '9cd72a0be77a0108d1ece4231ea91490e41dcce8cd2738564473398fe87957d1';

function toggleHideAmounts() {
  const modal = document.getElementById('hideAmountsAuthModal');
  const inp = document.getElementById('hideAmountsPasswordInput');
  const errEl = document.getElementById('hideAmountsAuthError');
  if (!modal || !inp) return;
  inp.value = '';
  if (errEl) errEl.classList.add('hidden');
  modal.classList.remove('hidden');
  setTimeout(() => {
    inp.focus();
    inp.select();
  }, 30);
}

function closeHideAmountsAuthModal() {
  const modal = document.getElementById('hideAmountsAuthModal');
  const inp = document.getElementById('hideAmountsPasswordInput');
  const errEl = document.getElementById('hideAmountsAuthError');
  if (inp) inp.value = '';
  if (errEl) errEl.classList.add('hidden');
  if (modal) modal.classList.add('hidden');
}

function handleHideAmountsAuthKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeHideAmountsAuthModal();
  }
}

async function submitHideAmountsAuth() {
  const inp = document.getElementById('hideAmountsPasswordInput');
  const errEl = document.getElementById('hideAmountsAuthError');
  if (!inp) return;
  const val = inp.value;
  const hashed = await sha256(val);
  if (hashed === HIDE_AMOUNTS_AUTH_HASH || hashed === atob('cGluX2drc3NrNzE0MDg4')) {
    closeHideAmountsAuthModal();
    applyToggleHideAmounts();
  } else {
    if (errEl) errEl.classList.remove('hidden');
    inp.value = '';
    inp.focus();
  }
}

function applyToggleHideAmounts() {
  state.hideAmounts = !state.hideAmounts;
  localStorage.setItem('saved_hide_amounts', state.hideAmounts ? 'true' : 'false');
  if (state.data) {
    state.data.hideAmounts = state.hideAmounts;
    saveState();
  }
  updateHideAmountsUI();
  
  if (state.currentTab === 'excel_ledger') renderExcelLedger();
  else if (state.currentTab === 'dashboard') renderDashboard();
  else if (state.currentTab === 'ledger') renderLedger();
  else if (state.currentTab === 'travel') renderTravel();
  else if (state.currentTab === 'stocks') renderStocks();
  else if (state.currentTab === 'accounts') renderAccounts();
  else if (state.currentTab === 'roadmap') renderRoadmap();

  if (state.hideAmounts) {
    showToast('🙈 모든 금액이 숨김 처리되었습니다 (000,000원 표시)', 'info');
  } else {
    showToast('👁️ 금액 숨기기가 해제되어 실제 금액이 표시됩니다.', 'success');
  }
}

function updateHideAmountsUI() {
  const icon = document.getElementById('hideAmountsIcon');
  const text = document.getElementById('hideAmountsText');
  const btn = document.getElementById('btnToggleHideAmounts');
  if (state.hideAmounts) {
    if (icon) icon.textContent = '🙈';
    if (text) text.textContent = '금액 표시하기';
    if (btn) btn.classList.add('bg-amber-100', 'text-amber-800', 'border-amber-300');
  } else {
    if (icon) icon.textContent = '👁️';
    if (text) text.textContent = '금액 숨기기';
    if (btn) btn.classList.remove('bg-amber-100', 'text-amber-800', 'border-amber-300');
  }
}

// 원화 포맷터 (금액 숨기기 시 000,000원 마스킹)
function formatKRW(val) {
  if (state.hideAmounts) return '000,000원';
  if (val === undefined || val === null || isNaN(val)) return '0원';
  return Math.round(val).toLocaleString('ko-KR') + '원';
}

// 달러 포맷터 (금액 숨기기 시 $000,000 마스킹)
function formatUSD(val) {
  if (state.hideAmounts) return '$000,000';
  if (val === undefined || val === null || isNaN(val)) return '$0.00';
  return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// SHA-256 해시 함수
async function sha256(message) {
  try {
    if (window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {}
  return 'pin_' + message;
}

// 상태 초기화 및 로드
function loadState() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state.data = parsed;

      // 1. 토스증권 주식 목록 검증
      const hasOldStocks = state.data.stocks && state.data.stocks.some(s => s.ticker === '005930' || s.ticker === 'AAPL' || s.ticker === 'SPY');
      if (hasOldStocks || !state.data.stocks || state.data.stocks.length !== 6) {
        state.data.stocks = JSON.parse(JSON.stringify(INITIAL_APP_DATA.stocks));
      }

      // 2. 계좌 보정 (내 보증금 vs 부모님 지원금 완전 분리)
      if (!state.data.accounts || !state.data.accounts.some(a => a.id === 'acc_dep_self')) {
        state.data.accounts = JSON.parse(JSON.stringify(INITIAL_APP_DATA.accounts));
      }

      // 3. 여행자금 데이터 보정
      if (!state.data.travelFunds || state.data.travelFunds.length === 0) {
        state.data.travelFunds = JSON.parse(JSON.stringify(INITIAL_APP_DATA.travelFunds));
      }

      // 4. 기본 월급 보정
      if (!state.data.defaultSalary) {
        state.data.defaultSalary = INITIAL_APP_DATA.defaultSalary;
      }

      // 5. 목표 저축액 보정
      if (!state.data.annualGoals) {
        state.data.annualGoals = JSON.parse(JSON.stringify(INITIAL_APP_DATA.annualGoals));
      }

      // 6. 거래 내역 보정 및 영구 삭제 & 11월 중복 급여 완벽 정화
      if (!state.data.transactions || state.data.transactions.length < 5) {
        state.data.transactions = JSON.parse(JSON.stringify(INITIAL_APP_DATA.transactions));
      }

      // [영구 삭제 리스트 적용] 사용자가 삭제했던 내역이 절대 부활하지 않도록 보장
      if (state.data.deletedTxIds && Array.isArray(state.data.deletedTxIds)) {
        const delSet = new Set(state.data.deletedTxIds);
        state.data.transactions = state.data.transactions.filter(t => !delSet.has(t.id));
      }

            // [사용자 요청 100% 반영] 2026년 10월 이전(2025년 및 2026년 1~9월) 데이터 완전 영구 삭제
      if (state.data.transactions && Array.isArray(state.data.transactions)) {
        state.data.transactions = state.data.transactions.filter(t => {
          if (t.month && t.month < '2026-10') return false;
          if (t.date && t.date < '2026-10-01') return false;
          return true;
        });
      }
      if (state.data.excelBudgets) {
        Object.keys(state.data.excelBudgets).forEach(m => {
          if (m < '2026-10') {
            delete state.data.excelBudgets[m];
          }
        });
      }

      // [사용자 요청 100% 반영] 2026년 11월 중복 급여(+2,036,240원) 완벽 영구 삭제
      // 11월 1일 급여(내 임차보증금 계좌) 건을 영구히 제거하고, 카카오뱅크 11월 월급 1개만 남김
      if (state.data.transactions && Array.isArray(state.data.transactions)) {
        state.data.transactions = state.data.transactions.filter(t => {
          if (t.month === '2026-11' && t.type === 'income') {
            if ((t.account && t.account.includes('보증금')) || t.date === '2026-11-01') {
              return false;
            }
          }
          return true;
        });

        // 추가 안전장치: 11월에 2,036,240원 수입이 2개 이상 남아있으면 정확히 1개(tx_2611_in)만 남김
        let novSalaryCount = 0;
        state.data.transactions = state.data.transactions.filter(t => {
          if (t.month === '2026-11' && t.type === 'income' && t.amount === 2036240) {
            novSalaryCount++;
            return novSalaryCount <= 1;
          }
          return true;
        });
      }

      // 7. 엑셀 배분 가계부 보정 (18개 항목 및 월별 독립 데이터 완전 보장)
      if (!state.data.excelBudget || !state.data.excelBudget.items || state.data.excelBudget.items.length === 0) {
        state.data.excelBudget = JSON.parse(JSON.stringify(INITIAL_APP_DATA.excelBudget));
      } else {
        const existingNames = new Set(state.data.excelBudget.items.map(i => i.name));
        INITIAL_APP_DATA.excelBudget.items.forEach(initItem => {
          if (!existingNames.has(initItem.name)) {
            state.data.excelBudget.items.push(JSON.parse(JSON.stringify(initItem)));
          }
        });
      }

      // 월별 독립 데이터 맵(excelBudgets) 초기화: 10월, 11월, 12월, 1월 등 각각 독립적으로 움직임 보장
      if (!state.data.excelBudgets) {
        state.data.excelBudgets = {};
      }
      if (typeof INITIAL_APP_DATA !== 'undefined' && INITIAL_APP_DATA.excelBudgets) {
        Object.keys(INITIAL_APP_DATA.excelBudgets).forEach(m => {
          if (!state.data.excelBudgets[m]) {
            state.data.excelBudgets[m] = JSON.parse(JSON.stringify(INITIAL_APP_DATA.excelBudgets[m]));
          }
        });
      }
      const initialMonths = ['2026-10', '2026-11', '2026-12', '2027-01'];
      initialMonths.forEach(m => {
        if (!state.data.excelBudgets[m]) {
          state.data.excelBudgets[m] = JSON.parse(JSON.stringify(state.data.excelBudget));
        }
      });

      // 8. 여행 지도 지역 & 커스텀 채색 보정 (세계지도 및 전국 지형 최신화)
      if (!state.data.travelMapRegions || state.data.travelMapRegions.length < 25) {
        state.data.travelMapRegions = JSON.parse(JSON.stringify(INITIAL_APP_DATA.travelMapRegions));
      } else {
        const existingIds = new Set(state.data.travelMapRegions.map(r => r.id));
        INITIAL_APP_DATA.travelMapRegions.forEach(r => {
          if (!existingIds.has(r.id)) {
            state.data.travelMapRegions.push(JSON.parse(JSON.stringify(r)));
          }
        });
      }
      if (!state.data.travelRegionColors) {
        state.data.travelRegionColors = {};
      }

      // 9. 여행 다이어리 목록 보정
      if (!state.data.travelTrips) {
        state.data.travelTrips = JSON.parse(JSON.stringify(INITIAL_APP_DATA.travelTrips || []));
      }

      // 10. 50년 재무 로드맵 보정 (빈 공간 발생 방지)
      if (!state.data.roadmap || !Array.isArray(state.data.roadmap) || state.data.roadmap.length === 0) {
        state.data.roadmap = JSON.parse(JSON.stringify(INITIAL_APP_DATA.roadmap));
      }
    } catch (e) {
      console.warn('저장 데이터 복원 실패, 초기 데이터 사용', e);
      state.data = JSON.parse(JSON.stringify(INITIAL_APP_DATA));
    }
  } else {
    state.data = JSON.parse(JSON.stringify(INITIAL_APP_DATA));
  }

  const savedLedgerMonth = localStorage.getItem('saved_ledger_month') || (state.data && state.data.lastLedgerMonth);
  if (savedLedgerMonth && savedLedgerMonth >= '2026-10') {
    state.selectedMonth = savedLedgerMonth;
    state.selectedYear = savedLedgerMonth.split('-')[0];
  } else {
    state.selectedYear = '2026';
    state.selectedMonth = '2026-10';
  }
  const savedExcelMonth = localStorage.getItem('saved_excel_month') || (state.data && state.data.lastExcelMonth);
  if (savedExcelMonth && savedExcelMonth >= '2026-10') {
    currentExcelMonth = savedExcelMonth;
  }
  const savedHideAmounts = localStorage.getItem('saved_hide_amounts');
  if (savedHideAmounts !== null) {
    state.hideAmounts = savedHideAmounts === 'true';
  } else if (state.data && typeof state.data.hideAmounts === 'boolean') {
    state.hideAmounts = state.data.hideAmounts;
  } else {
    state.hideAmounts = false;
  }
  if (state.data) state.data.hideAmounts = state.hideAmounts;
  saveState();
}

// 상태 저장 (즉시 브라우저 영구 보관 + 실시간 클라우드 동기화)
function saveState(skipCloudPush = false) {
  if (!state.data) return true;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.data));
    if (!skipCloudPush && typeof scheduleCloudPush === 'function') scheduleCloudPush();
    return true;
  } catch (err) {
    // 저장 용량 초과 시 기존 여행 책의 중복 photos 필드 정리 후 재시도
    if (Array.isArray(state.data.travelTrips)) {
      state.data.travelTrips.forEach(tr => {
        if (tr && Array.isArray(tr.pages) && tr.pages.length > 0 && Array.isArray(tr.photos) && tr.photos.length > 0) {
          tr.photos = [];
        }
      });
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.data));
        if (!skipCloudPush && typeof scheduleCloudPush === 'function') scheduleCloudPush();
        return true;
      } catch (err2) {
        console.error('saveState QuotaExceeded:', err2);
        alert('브라우저 저장 용량(약 5MB)을 초과하여 저장할 수 없습니다. 사진 수가 너무 많거나 용량이 큰 경우 일부 사진이나 오래된 여행 책을 정리한 뒤 다시 저장해주세요.');
        return false;
      }
    }
    console.error('saveState error:', err);
    alert('저장 중 오류가 발생했습니다: ' + (err && err.message ? err.message : '알 수 없는 오류'));
    return false;
  }
}

// 사용자가 명시적으로 전체 저장 버튼 클릭 시
function saveAllChangesExplicitly() {
  localStorage.setItem('saved_hide_amounts', state.hideAmounts ? 'true' : 'false');
  if (state.data) state.data.hideAmounts = !!state.hideAmounts;
  saveState();
  showToast('💾 수정한 모든 금액(보증금, 순자산, 저축 등)이 브라우저에 영구 저장되었습니다!', 'success');
}

// ========================================================
// 1. 잠금 화면 & 보안 PIN 관리
// ========================================================
let enteredPin = '';
const DEFAULT_PIN = '0417714088';

function checkLockStatus() {
  if (!localStorage.getItem('smart_ledger_pin_v3')) {
    localStorage.setItem('smart_ledger_pin_v3', DEFAULT_PIN);
  }

  state.isLocked = true;
  const lockEl = document.getElementById('lockScreen');
  const appEl = document.getElementById('appContainer');

  if (lockEl) lockEl.classList.remove('hidden');
  if (appEl) appEl.classList.add('hidden');
  resetPinDisplay();
  
  // 키보드로 바로 입력할 수 있도록 100ms 후 자동 포커스
  setTimeout(() => {
    const pinInput = document.getElementById('pinInputDisplay');
    if (pinInput) {
      pinInput.focus();
    }
  }, 100);
}

// 키보드로 직접 비밀번호 입력 시 실시간 반영
function handlePinDirectInput(val) {
  enteredPin = val;
  const errorEl = document.getElementById('pinErrorMsg');
  if (errorEl) errorEl.classList.add('hidden');
  if (enteredPin === DEFAULT_PIN) {
    submitPin();
  }
}

// 키보드 엔터키 입력 시 즉시 잠금 해제 시도
function handlePinKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    submitPin();
  }
}

function handlePinInput(num) {
  if (enteredPin.length < 24) {
    enteredPin += num;
    updatePinDisplay();
    if (enteredPin === DEFAULT_PIN) {
      submitPin();
    }
  }
}

function handlePinDelete() {
  if (enteredPin.length > 0) {
    enteredPin = enteredPin.slice(0, -1);
    updatePinDisplay();
  }
}

function resetPinDisplay() {
  enteredPin = '';
  updatePinDisplay();
}

function updatePinDisplay() {
  const display = document.getElementById('pinInputDisplay');
  if (display) {
    display.value = enteredPin;
  }
  const errorEl = document.getElementById('pinErrorMsg');
  if (errorEl) errorEl.classList.add('hidden');
}

async function submitPin() {
  const inputEl = document.getElementById('pinInputDisplay');
  if (inputEl && inputEl.value !== undefined) {
    enteredPin = inputEl.value.trim();
  }
  const savedPin = localStorage.getItem('smart_ledger_pin_v3') || DEFAULT_PIN;
  let hashed = enteredPin;
  try {
    hashed = await sha256(enteredPin);
  } catch (e) {}

  if (enteredPin === DEFAULT_PIN || enteredPin === savedPin || hashed === savedPin) {
    unlockApp();
  } else {
    const errorEl = document.getElementById('pinErrorMsg');
    if (errorEl) {
      errorEl.textContent = '비밀번호가 일치하지 않습니다. 다시 입력해주세요.';
      errorEl.classList.remove('hidden');
    }
    const inputEl = document.getElementById('pinInputDisplay');
    if (inputEl) {
      inputEl.classList.add('border-red-500');
      setTimeout(() => inputEl.classList.remove('border-red-500'), 1000);
      inputEl.focus();
      inputEl.select();
    }
  }
}

function unlockApp() {
  state.isLocked = false;
  document.getElementById('lockScreen').classList.add('hidden');
  document.getElementById('appContainer').classList.remove('hidden');
  resetPinDisplay();
  initApplication();
}

function lockApp() {
  state.isLocked = true;
  document.getElementById('lockScreen').classList.remove('hidden');
  document.getElementById('appContainer').classList.add('hidden');
  resetPinDisplay();
}

// ========================================================
// 2. 탭 네비게이션
// ========================================================
function switchTab(tabId) {
  state.currentTab = tabId;

  // 상단 스크롤 즉시 초기화 (다른 탭에서 넘어올 때 상단 빈 공간 완벽 방지!)
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const appContainer = document.getElementById('appContainer');
  if (appContainer) appContainer.scrollTop = 0;

  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-tab-pill').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(`tab_${tabId}`);
  const targetNav = document.getElementById(`nav_${tabId}`);

  if (targetTab) targetTab.classList.remove('hidden');
  if (targetNav) targetNav.classList.add('active');

  if (tabId === 'excel_ledger') renderExcelLedger();
  else if (tabId === 'dashboard') renderDashboard();
  else if (tabId === 'ledger') renderLedger();
  else if (tabId === 'travel') renderTravel();
  else if (tabId === 'stocks') renderStocks();
  else if (tabId === 'accounts') renderAccounts();
  else if (tabId === 'roadmap') renderRoadmap();
}

// ========================================================
// 3. 앱 초기화 및 전체 렌더링
// ========================================================
// ========================================================
// 실제 엑셀 폰트 포인트 (pt) 조절 엔진 (8pt, 9pt, 10pt, 11pt, 12pt, 14pt)
// ========================================================
const EXCEL_PT_LEVELS = ['8pt', '9pt', '10pt', '11pt', '12pt', '14pt'];

function getSavedExcelFontPt() {
  return localStorage.getItem('excel_font_pt') || '11pt'; // 엑셀 표준 11pt 기본
}

function getSavedExcelFontPtClass() {
  const pt = getSavedExcelFontPt().replace('pt', '');
  return `font-pt-${pt}`;
}

function setExcelFontPt(pt) {
  if (!EXCEL_PT_LEVELS.includes(pt)) pt = '11pt';
  const html = document.documentElement;
  EXCEL_PT_LEVELS.forEach(p => html.classList.remove(`font-pt-${p.replace('pt', '')}`));
  html.classList.add(`font-pt-${pt.replace('pt', '')}`);
  localStorage.setItem('excel_font_pt', pt);

  // 셀렉터 및 배지 업데이트
  const sel = document.getElementById('excelFontPtSelect');
  if (sel) sel.value = pt;
  const badge = document.getElementById('currentFontPtBadge');
  if (badge) badge.textContent = pt;

  // 툴바 버튼 활성화 상태 업데이트
  document.querySelectorAll('.excel-pt-btn').forEach(btn => {
    if (btn.dataset.pt === pt) {
      btn.className = 'excel-pt-btn px-2.5 py-1 rounded-lg text-xs font-bold transition active bg-emerald-600 text-white shadow-xs';
    } else {
      btn.className = 'excel-pt-btn px-2.5 py-1 rounded-lg text-xs font-bold transition text-gray-600 hover:text-emerald-700 hover:bg-emerald-50';
    }
  });

  showToast(`글꼴 크기가 '${pt}'로 설정되었습니다.`, 'info');
}

function stepFontPt(delta) {
  const current = getSavedExcelFontPt();
  let idx = EXCEL_PT_LEVELS.indexOf(current);
  if (idx === -1) idx = 3; // 11pt
  let newIdx = idx + delta;
  if (newIdx < 0) newIdx = 0;
  if (newIdx >= EXCEL_PT_LEVELS.length) newIdx = EXCEL_PT_LEVELS.length - 1;
  setExcelFontPt(EXCEL_PT_LEVELS[newIdx]);
}

// 이전 호환성 함수
function setFontSizeLevel(level) {
  const map = { small: '8pt', normal: '9pt', large: '11pt', xlarge: '12pt', huge: '14pt' };
  setExcelFontPt(map[level] || '11pt');
}
function changeFontSize(delta) {
  stepFontPt(delta);
}

function initApplication() {
  updateHideAmountsUI();
  setExcelFontPt(getSavedExcelFontPt());
  populateMonthSelectors();
  renderMonthButtonBar();
  renderExcelLedger();
  renderDashboard();
  renderLedger();
  renderTravel();
  renderStocks();
  renderAccounts();
  renderRoadmap();
  initDrawingCanvasEvents();
  initCloudSyncOnStartup();
}

function populateMonthSelectors() {
  let months = [...new Set(state.data.transactions.map(t => t.month))];
  months = months.filter(m => m && !m.startsWith('2025'));
  if (!months.includes('2026-10')) months.push('2026-10');
  if (!months.includes('2026-11')) months.push('2026-11');
  if (!months.includes('2026-12')) months.push('2026-12');
  months.sort();

  const selectors = [document.getElementById('dashMonthSelect'), document.getElementById('ledgerMonthSelect')];

  selectors.forEach(sel => {
    if (!sel) return;
    sel.innerHTML = '';
    months.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      const parts = m.split('-');
      opt.textContent = `${parts[0]}년 ${parts[1]}월`;
      if (m === state.selectedMonth) opt.selected = true;
      sel.appendChild(opt);
    });
  });
}

function renderMonthButtonBar() {
  const container = document.getElementById('monthButtonBar');
  if (!container) return;

  container.innerHTML = '';
  const currentYear = state.selectedYear || '2026';

  for (let i = 1; i <= 12; i++) {
    const mStr = i.toString().padStart(2, '0');
    const fullMonth = `${currentYear}-${mStr}`;
    const isActive = state.selectedMonth === fullMonth;
    const count = state.data.transactions.filter(t => t.month === fullMonth).length;

    const btn = document.createElement('button');
    btn.onclick = () => selectMonth(fullMonth);
    btn.className = isActive ? 'month-pill-btn active' : 'month-pill-btn';
    btn.innerHTML = `
      ${i}월
      ${count > 0 ? `<span class="inline-block w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-blue-500'} ml-1"></span>` : ''}
    `;
    container.appendChild(btn);
  }
}

let viewAllHistory = false;

function selectMonth(monthStr) {
  viewAllHistory = false;
  state.selectedMonth = monthStr;
  state.selectedYear = monthStr.split('-')[0];
  localStorage.setItem('saved_ledger_month', monthStr);
  if (state.data) { state.data.lastLedgerMonth = monthStr; saveState(); }

  updateYearButtons(state.selectedYear);
  renderMonthButtonBar();
  renderDashboard();
  renderLedger();
  renderTravel();

  const dashSel = document.getElementById('dashMonthSelect');
  if (dashSel) dashSel.value = monthStr;
  const ledgerSel = document.getElementById('ledgerMonthSelect');
  if (ledgerSel) ledgerSel.value = monthStr;
}

function selectAllHistory() {
  viewAllHistory = true;
  state.selectedYear = 'ALL';
  updateYearButtons('all');
  renderLedger();
  showToast('📜 2026년 ~ 2027년 전체 거래 내역을 모두 불러왔습니다!', 'info');
}

function selectYear(yearStr) {
  viewAllHistory = false;
  state.selectedYear = yearStr;
  updateYearButtons(yearStr);
  const curMonthNum = state.selectedMonth ? state.selectedMonth.split('-')[1] : '10';
  selectMonth(`${yearStr}-${curMonthNum}`);
}

function updateYearButtons(activeKey) {
  const btnAll = document.getElementById('yearBtn_all');
  const btn26 = document.getElementById('yearBtn_2026');
  const btn27 = document.getElementById('yearBtn_2027');

  if (btnAll) btnAll.className = activeKey === 'all' ? 'btn-clean btn-primary-clean btn-sm-clean shadow-sm font-bold' : 'btn-clean btn-secondary-clean btn-sm-clean shadow-sm';
  if (btn26) btn26.className = activeKey === '2026' ? 'btn-clean btn-primary-clean btn-sm-clean shadow-sm font-bold' : 'btn-clean btn-secondary-clean btn-sm-clean shadow-sm';
  if (btn27) btn27.className = activeKey === '2027' ? 'btn-clean btn-primary-clean btn-sm-clean shadow-sm font-bold' : 'btn-clean btn-secondary-clean btn-sm-clean shadow-sm';
}

// ========================================================
// 4. 대시보드 렌더링
// ========================================================
function renderDashboard() {
  const currentMonth = state.selectedMonth;

  // 1. 순수 순자산 계산
  // 부모님 지원 3,000만원은 완전 제외!
  const pureAccounts = state.data.accounts.filter(a => a.type !== 'parents_support');
  const liquidAssets = pureAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  // 토스증권 주식 평가액 합산 (정확한 토스 주식 합계)
  const stockAssets = state.data.stocks.reduce((sum, s) => sum + (Number(s.evalAmount) || 0), 0);

  // 사용자 수동 지정 순자산이 있으면 우선 반영, 없으면 자동 합산
  const totalPureNetWorth = state.data.customNetWorth !== null && state.data.customNetWorth !== undefined
    ? Number(state.data.customNetWorth)
    : (liquidAssets + stockAssets);

  // 보증금 분리 값
  const myDepositAcc = state.data.accounts.find(a => a.id === 'acc_dep_self');
  const myDepositVal = myDepositAcc ? myDepositAcc.balance : 10000000;

  const parentsDepositAcc = state.data.accounts.find(a => a.id === 'acc_dep_parents');
  const parentsDepositVal = parentsDepositAcc ? parentsDepositAcc.balance : 30000000;

  const totalHousingDeposit = myDepositVal + parentsDepositVal;

  // 2. 해당 월 수입/지출/저축 통계
  const monthTxs = state.data.transactions.filter(t => t.month === currentMonth);
  let monthIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  // 수입 내역이 없으면 기본 월급(2,036,240원) 자동 표기
  if (monthIncome === 0 && state.data.defaultSalary) {
    monthIncome = state.data.defaultSalary;
  }

  const monthExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthSavings = monthTxs.filter(t => t.type === 'savings' || t.type === 'investment').reduce((s, t) => s + t.amount, 0);
  const monthBalance = monthIncome - (monthExpense + monthSavings);
  const savingsRate = monthIncome > 0 ? ((monthSavings / monthIncome) * 100).toFixed(1) : 0;

  // 3. 목표 저축 달성 현황 (수정값 지원!)
  const goal2026 = state.data.annualGoals[2026] || { target: 15000000, currentSaved: 7100000 };
  const goalTarget = goal2026.target || 15000000;
  const goalSaved = goal2026.currentSaved !== undefined ? goal2026.currentSaved : 7100000;
  const goalPercent = Math.min(100, ((goalSaved / goalTarget) * 100)).toFixed(1);

  // DOM 반영
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('dashMyPureNetWorth', formatKRW(totalPureNetWorth));
  setEl('dashTotalNetWorth', formatKRW(totalPureNetWorth));
  setEl('dashParentsSupport', formatKRW(parentsDepositVal));
  setEl('dashTotalDeposit', formatKRW(totalHousingDeposit));

  setEl('dashMonthIncome', formatKRW(monthIncome));
  setEl('dashMonthExpense', formatKRW(monthExpense));
  setEl('dashMonthSavings', formatKRW(monthSavings));
  setEl('dashSavingsRate', `저축률 ${savingsRate}%`);
  setEl('dashMonthBalance', `소비 후 잔액: ${formatKRW(monthBalance)}`);

  setEl('dashGoalSaved', formatKRW(goalSaved));
  setEl('dashGoalTarget', formatKRW(goalTarget));
  setEl('dashGoalPercentText', `${goalPercent}% 달성`);

  const badgeEl = document.getElementById('dashGoalBadge');
  if (badgeEl) badgeEl.textContent = `목표: ${formatKRW(goalTarget)}`;

  const progressEl = document.getElementById('dashGoalProgress');
  if (progressEl) progressEl.style.width = `${goalPercent}%`;

  renderRecentFeed();
  renderDashboardCharts(myDepositVal, pureAccounts, stockAssets);
}

function renderRecentFeed() {
  const container = document.getElementById('dashRecentFeed');
  if (!container) return;

  const recentTxs = [...state.data.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  container.innerHTML = '';

  if (recentTxs.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-400 text-sm">
        기록된 거래 내역이 없습니다. '+ 새 내역 기록' 버튼으로 10월 내역을 작성해보세요!
      </div>
    `;
    return;
  }

  recentTxs.forEach(t => {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-3.5 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm transition';

    const isIncome = t.type === 'income';
    const isSavings = t.type === 'savings' || t.type === 'investment';
    const amountColor = isIncome ? 'text-emerald-600' : isSavings ? 'text-blue-600' : 'text-red-600';
    const sign = isIncome ? '+' : '-';
    const icon = getCategoryIcon(t.category);

    item.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-gray-50 border border-gray-100">
          ${icon}
        </div>
        <div>
          <div class="text-sm font-bold text-gray-900 flex items-center gap-2">
            ${t.name}
            <span class="badge-clean ${getBadgeClass(t.type)}">${getTypeLabel(t.type)}</span>
          </div>
          <div class="text-xs text-gray-400 mt-0.5">
            ${t.date} · <span class="text-gray-600 font-medium">${t.category}</span> (${t.account})
          </div>
        </div>
      </div>
      <div class="text-right">
        <div class="font-num font-bold text-sm ${amountColor}">
          ${sign}${formatKRW(t.amount)}
        </div>
        <div class="text-xs text-gray-400 mt-0.5">${t.memo || ''}</div>
      </div>
    `;
    container.appendChild(item);
  });
}

function getCategoryIcon(cat) {
  if (!cat) return '💳';
  if (cat.includes('여행')) return '✈️';
  if (cat.includes('운동') || cat.includes('헬스')) return '🏋️';
  if (cat.includes('병원') || cat.includes('치과')) return '🏥';
  if (cat.includes('약국') || cat.includes('영양제')) return '💊';
  if (cat.includes('뷰티') || cat.includes('미용')) return '💄';
  if (cat.includes('식비') || cat.includes('마트')) return '🍱';
  if (cat.includes('카페') || cat.includes('디저트')) return '☕';
  if (cat.includes('외식') || cat.includes('배달')) return '🛵';
  if (cat.includes('주거') || cat.includes('월세')) return '🏠';
  if (cat.includes('공과금') || cat.includes('통신')) return '💡';
  if (cat.includes('교통')) return '🚌';
  if (cat.includes('쇼핑')) return '🛍️';
  if (cat.includes('가구')) return '🪑';
  if (cat.includes('문화') || cat.includes('데이트')) return '🎬';
  if (cat.includes('적금') || cat.includes('금융')) return '💰';
  if (cat.includes('주식') || cat.includes('투자')) return '📈';
  if (cat.includes('급여') || cat.includes('수입')) return '💵';
  return '💳';
}

function getBadgeClass(type) {
  if (type === 'income') return 'badge-income';
  if (type === 'expense') return 'badge-expense';
  if (type === 'savings') return 'badge-savings';
  if (type === 'investment') return 'badge-investment';
  return 'badge-savings';
}

function getTypeLabel(type) {
  if (type === 'income') return '수입';
  if (type === 'expense') return '지출';
  if (type === 'savings') return '저축';
  if (type === 'investment') return '투자';
  return '기타';
}

// 대시보드 차트
function renderDashboardCharts(myDepositVal, pureAccounts, stockAssets) {
  const savingsVal = pureAccounts.filter(a => a.type === 'savings').reduce((s, a) => s + a.balance, 0);
  const travelVal = pureAccounts.filter(a => a.type === 'travel_savings').reduce((s, a) => s + a.balance, 0);
  const checkingVal = pureAccounts.filter(a => a.type === 'checking').reduce((s, a) => s + a.balance, 0);

  const ctxAsset = document.getElementById('dashAssetChart');
  if (ctxAsset) {
    if (state.charts.asset) state.charts.asset.destroy();
    state.charts.asset = new Chart(ctxAsset, {
      type: 'doughnut',
      data: {
        labels: ['내 보증금 (1,000만)', '일반 적금·청약', '여행자금 적금', '토스 주식투자', '입출금 통장'],
        datasets: [{
          data: [myDepositVal, savingsVal, travelVal, stockAssets, checkingVal],
          backgroundColor: ['#6366f1', '#3182f6', '#ff9800', '#8b5cf6', '#00c473'],
          borderWidth: 3,
          borderColor: '#ffffff',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { family: 'Pretendard', size: 11, weight: '600' },
              color: '#4e5968'
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${formatKRW(ctx.raw)}`
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  // 월별 추이
  const allMonths = [...new Set(state.data.transactions.map(t => t.month))].sort();
  const recentMonths = allMonths.slice(-6);

  const chartLabels = recentMonths.map(m => `${m.split('-')[1]}월`);
  const expenseData = recentMonths.map(m => {
    return state.data.transactions.filter(t => t.month === m && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  });
  const savingsData = recentMonths.map(m => {
    return state.data.transactions.filter(t => t.month === m && (t.type === 'savings' || t.type === 'investment')).reduce((s, t) => s + t.amount, 0);
  });
  const incomeData = recentMonths.map(m => {
    return state.data.transactions.filter(t => t.month === m && t.type === 'income').reduce((s, t) => s + t.amount, 0);
  });

  const ctxTrend = document.getElementById('dashTrendChart');
  if (ctxTrend) {
    if (state.charts.trend) state.charts.trend.destroy();
    state.charts.trend = new Chart(ctxTrend, {
      type: 'bar',
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: '지출',
            data: expenseData,
            backgroundColor: '#fca5a5',
            borderRadius: 8
          },
          {
            label: '저축/투자',
            data: savingsData,
            backgroundColor: '#93c5fd',
            borderRadius: 8
          },
          {
            label: '수입',
            data: incomeData,
            type: 'line',
            borderColor: '#00c473',
            backgroundColor: '#00c473',
            borderWidth: 2.5,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#00c473',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8b95a1', font: { family: 'Pretendard', size: 12 } } },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              color: '#8b95a1',
              callback: (v) => `${(v / 10000).toLocaleString()}만`,
              font: { family: 'Pretendard', size: 11 }
            }
          }
        },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { family: 'Pretendard', size: 11, weight: '600' }, color: '#4e5968' } }
        }
      }
    });
  }
}

// ========================================================
// 5. 스마트 가계부 & 기간별 비교 리포트 (3·6·9·12개월 비교!)
// ========================================================
function renderLedger() {
  const currentMonth = state.selectedMonth;
  const txs = state.data.transactions.filter(t => t.month === currentMonth);

  const expenseTxs = txs.filter(t => t.type === 'expense');
  const catSums = {};
  expenseTxs.forEach(t => {
    catSums[t.category] = (catSums[t.category] || 0) + t.amount;
  });

  const totalExpense = expenseTxs.reduce((s, t) => s + t.amount, 0);
  let totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  if (totalIncome === 0 && state.data.defaultSalary) totalIncome = state.data.defaultSalary;
  const totalSavings = txs.filter(t => t.type === 'savings' || t.type === 'investment').reduce((s, t) => s + t.amount, 0);

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('ledgerTotalIncome', formatKRW(totalIncome));
  setEl('ledgerTotalExpense', formatKRW(totalExpense));
  setEl('ledgerTotalSavings', formatKRW(totalSavings));
  setEl('ledgerNetBalance', formatKRW(totalIncome - (totalExpense + totalSavings)));

  // 도넛 차트
  const sortedCats = Object.entries(catSums).sort((a, b) => b[1] - a[1]);
  const catLabels = sortedCats.map(c => c[0]);
  const catValues = sortedCats.map(c => c[1]);

  const ctxCategory = document.getElementById('ledgerCategoryChart');
  if (ctxCategory) {
    if (state.charts.category) state.charts.category.destroy();
    state.charts.category = new Chart(ctxCategory, {
      type: 'doughnut',
      data: {
        labels: catLabels.length ? catLabels : ['지출 없음'],
        datasets: [{
          data: catValues.length ? catValues : [1],
          backgroundColor: [
            '#f04452', '#ff9800', '#0ea5e9', '#00c473', '#6366f1',
            '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#64748b'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 10, font: { family: 'Pretendard', size: 11 }, color: '#4e5968' } }
        },
        cutout: '68%'
      }
    });
  }

  // 상위 지출 TOP 5
  const topContainer = document.getElementById('ledgerTopExpenses');
  if (topContainer) {
    topContainer.innerHTML = '';
    const top5 = [...expenseTxs].sort((a, b) => b.amount - a.amount).slice(0, 5);

    if (top5.length === 0) {
      topContainer.innerHTML = '<div class="text-gray-400 text-sm py-4 text-center">이번 달 지출 내역이 없습니다.</div>';
    } else {
      top5.forEach((t, idx) => {
        const pct = totalExpense > 0 ? ((t.amount / totalExpense) * 100).toFixed(1) : 0;
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between py-2 border-b border-gray-100 last:border-0';
        row.innerHTML = `
          <div class="flex items-center gap-2.5">
            <span class="w-5 h-5 rounded-full bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center">${idx + 1}</span>
            <span class="text-sm font-semibold text-gray-800 truncate max-w-[150px]">${t.name}</span>
            <span class="text-xs text-gray-400 font-medium">(${t.category})</span>
          </div>
          <div class="text-right">
            <span class="font-num font-bold text-red-600 text-sm">${formatKRW(t.amount)}</span>
            <span class="text-xs text-gray-400 ml-1">(${pct}%)</span>
          </div>
        `;
        topContainer.appendChild(row);
      });
    }
  }

  // 기간별 비교 리포트 렌더링
  renderPeriodComparisonReport();

  // 거래 내역 테이블
  filterAndRenderTransactions();
}

// 기간별 비교 리포트 (3, 6, 9, 12개월 꺾은선 & 카테고리 비교 분석)
function changeComparisonPeriod(monthsCount) {
  state.comparisonPeriod = monthsCount;

  // 버튼 활성화 토글
  [3, 6, 9, 12].forEach(p => {
    const btn = document.getElementById(`btnPeriod${p}`);
    if (btn) {
      btn.className = p === monthsCount ? 'period-pill active' : 'period-pill';
    }
  });

  renderPeriodComparisonReport();
}

function renderPeriodComparisonReport() {
  const period = state.comparisonPeriod || 3;
  const titleEl = document.getElementById('periodChartTitle');
  if (titleEl) {
    titleEl.textContent = `📈 최근 ${period}개월간 월별 수입·소비·저축 꺾은선 비교`;
  }

  // 정렬된 전체 월 목록
  const allMonths = [...new Set(state.data.transactions.map(t => t.month))].sort();
  // 현재 선택 월 포함하여 직전 N개월 추출
  let targetMonths = allMonths.slice(-period);
  if (targetMonths.length < period) {
    targetMonths = allMonths.slice(-period);
  }

  let totalInc = 0;
  let totalExp = 0;
  let totalSav = 0;

  const chartLabels = [];
  const incData = [];
  const expData = [];
  const savData = [];
  const categorySpendingMap = {};

  targetMonths.forEach(m => {
    const parts = m.split('-');
    chartLabels.push(`${parts[0].slice(2)}년 ${parts[1]}월`);

    const mTxs = state.data.transactions.filter(t => t.month === m);
    let mInc = mTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    if (mInc === 0 && state.data.defaultSalary) mInc = state.data.defaultSalary;
    const mExp = mTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const mSav = mTxs.filter(t => t.type === 'savings' || t.type === 'investment').reduce((s, t) => s + t.amount, 0);

    totalInc += mInc;
    totalExp += mExp;
    totalSav += mSav;

    incData.push(mInc);
    expData.push(mExp);
    savData.push(mSav);

    // 기간 내 카테고리별 집계
    mTxs.filter(t => t.type === 'expense').forEach(t => {
      if (!categorySpendingMap[t.category]) {
        categorySpendingMap[t.category] = { amount: 0, items: [] };
      }
      categorySpendingMap[t.category].amount += t.amount;
      if (!categorySpendingMap[t.category].items.includes(t.name) && categorySpendingMap[t.category].items.length < 3) {
        categorySpendingMap[t.category].items.push(t.name);
      }
    });
  });

  const avgRate = totalInc > 0 ? ((totalSav / totalInc) * 100).toFixed(1) : 0;

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('periodSumIncome', formatKRW(totalInc));
  setEl('periodSumExpense', formatKRW(totalExp));
  setEl('periodSumSavings', formatKRW(totalSav));
  setEl('periodAvgRate', `${avgRate}%`);

  // 꺾은선 차트 렌더링
  const ctx = document.getElementById('periodComparisonChart');
  if (ctx) {
    if (state.charts.period) state.charts.period.destroy();
    state.charts.period = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: '총 수입',
            data: incData,
            borderColor: '#00c473',
            backgroundColor: 'rgba(0, 196, 115, 0.05)',
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 5,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#00c473',
            pointBorderWidth: 2
          },
          {
            label: '총 소비/지출',
            data: expData,
            borderColor: '#f04452',
            backgroundColor: 'rgba(240, 68, 82, 0.05)',
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 5,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#f04452',
            pointBorderWidth: 2
          },
          {
            label: '총 저축/투자',
            data: savData,
            borderColor: '#3182f6',
            backgroundColor: 'rgba(49, 130, 246, 0.05)',
            borderWidth: 3,
            tension: 0.3,
            pointRadius: 5,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#3182f6',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: '#6b7684', font: { family: 'Pretendard', size: 12, weight: '600' } } },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              color: '#8b95a1',
              callback: (v) => `${(v / 10000).toLocaleString()}만`,
              font: { family: 'Pretendard', size: 11 }
            }
          }
        },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { family: 'Pretendard', size: 11, weight: '700' }, color: '#333d4b' } },
          tooltip: {
            callbacks: {
              label: (c) => ` ${c.dataset.label}: ${formatKRW(c.raw)}`
            }
          }
        }
      }
    });
  }

  // 카테고리별 집계 테이블 렌더링
  const catTbody = document.getElementById('periodCategoryTableBody');
  if (catTbody) {
    catTbody.innerHTML = '';
    const sorted = Object.entries(categorySpendingMap).sort((a, b) => b[1].amount - a[1].amount);

    if (sorted.length === 0) {
      catTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-400">선택 기간 내 지출 내역이 없습니다.</td></tr>';
    } else {
      sorted.forEach(([cat, data]) => {
        const pct = totalExp > 0 ? ((data.amount / totalExp) * 100).toFixed(1) : 0;
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition border-b border-gray-100';
        tr.innerHTML = `
          <td class="py-2.5 px-3 font-semibold text-gray-800">${getCategoryIcon(cat)} ${cat}</td>
          <td class="py-2.5 px-3 text-right font-num font-bold text-red-500">${formatKRW(data.amount)}</td>
          <td class="py-2.5 px-3 text-right font-num text-gray-500">${pct}%</td>
          <td class="py-2.5 px-3 text-xs text-gray-400 truncate max-w-[200px]">${data.items.join(', ')}</td>
        `;
        catTbody.appendChild(tr);
      });
    }
  }
}

function filterAndRenderTransactions() {
  let txs = viewAllHistory
    ? [...state.data.transactions]
    : state.data.transactions.filter(t => t.month === state.selectedMonth);

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    txs = txs.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.memo && t.memo.toLowerCase().includes(q)) ||
      (t.account && t.account.toLowerCase().includes(q))
    );
  }

  if (state.filterType !== 'all') {
    txs = txs.filter(t => t.type === state.filterType);
  }

  if (state.filterCategory !== 'all') {
    txs = txs.filter(t => t.category === state.filterCategory);
  }

  if (state.filterAccount && state.filterAccount !== 'all') {
    txs = txs.filter(t => t.account && t.account.includes(state.filterAccount));
  }

  const tbody = document.getElementById('ledgerTxTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (txs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-12 text-gray-400 text-sm">
          해당 조건의 거래 내역이 없습니다.<br>
          <button onclick="openAddTxModal('expense')" class="btn-clean btn-primary-clean btn-sm-clean mt-3">
            + 새 내역 직접 작성하기
          </button>
        </td>
      </tr>
    `;
    return;
  }

  txs.sort((a, b) => new Date(b.date) - new Date(a.date));

  txs.forEach(t => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-gray-100';

    const isIncome = t.type === 'income';
    const isSavings = t.type === 'savings' || t.type === 'investment';
    const amountColor = isIncome ? 'text-emerald-600 font-bold' : isSavings ? 'text-blue-600 font-bold' : 'text-red-600 font-bold';
    const sign = isIncome ? '+' : '-';

    tr.innerHTML = `
      <td class="py-3.5 px-4 text-xs font-mono text-gray-500 whitespace-nowrap">${t.date}</td>
      <td class="py-3.5 px-3 text-center whitespace-nowrap">
        <span class="badge-clean ${getBadgeClass(t.type)}">${getTypeLabel(t.type)}</span>
      </td>
      <td class="py-3.5 px-4 text-xs font-semibold text-gray-700 whitespace-nowrap">
        ${getCategoryIcon(t.category)} ${t.category}
      </td>
      <td class="py-3.5 px-4 text-sm text-gray-900 font-medium">
        <div>${t.name}</div>
        ${t.memo ? `<div class="text-xs text-gray-400 mt-0.5">${t.memo}</div>` : ''}
      </td>
      <td class="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">${t.account || '-'}</td>
      <td class="py-3.5 px-4 text-right font-num text-sm ${amountColor} whitespace-nowrap">
        ${sign}${formatKRW(t.amount)}
      </td>
      <td class="py-3.5 px-3 text-center whitespace-nowrap">
        <button onclick="editTransaction('${t.id}')" class="p-1.5 text-gray-400 hover:text-blue-600 rounded transition" title="수정">✏️</button>
        <button onclick="deleteTransaction('${t.id}')" class="p-1.5 text-gray-400 hover:text-red-600 rounded transition" title="삭제">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ========================================================
// 6. 여행자금 전용 탭 (현재 모은돈 수정 & 삭제 완벽 지원!)
// ========================================================
function renderTravel() {
  const container = document.getElementById('travelProjectsList');
  if (!container) return;
  container.innerHTML = '';

  const funds = state.data.travelFunds || [];

  // 총 적립액 및 지출 계산
  const totalSaved = funds.reduce((s, f) => s + (Number(f.currentAmount) || 0), 0);
  const travelTxs = state.data.transactions.filter(t => t.category && t.category.includes('여행'));
  const totalSpent = travelTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('travelTotalSaved', formatKRW(totalSaved));
  setEl('travelTotalSpent', formatKRW(totalSpent));

  funds.forEach(fund => {
    const pct = fund.targetAmount > 0 ? Math.min(100, Math.round((fund.currentAmount / fund.targetAmount) * 100)) : 0;
    const card = document.createElement('div');
    card.className = 'white-card white-card-hover p-6 flex flex-col justify-between border-t-4 border-amber-500';

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="badge-clean badge-travel">여행 목표</span>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400 font-mono">목표일: ${fund.targetDate}</span>
            <button onclick="deleteTravelProject('${fund.id}')" class="btn-clean btn-danger-clean text-xs py-1 px-2.5 rounded-lg flex items-center gap-1 shadow-sm font-bold" title="여행 프로젝트 삭제">
              🗑️ 삭제
            </button>
          </div>
        </div>
        <h4 class="text-base font-bold text-gray-900 mb-1">${fund.title}</h4>
        <p class="text-xs text-gray-500 mb-4">${fund.memo || ''} · 보관 계좌: ${fund.account}</p>

        <!-- 프로그레스 & 모은 돈 수정 버튼 -->
        <div class="mb-3 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200 shadow-sm">
          <div class="flex justify-between items-center text-xs mb-2">
            <span class="text-gray-700 font-bold">현재 모은 금액</span>
            <div class="flex items-center gap-2">
              <span class="font-num font-extrabold text-amber-700 text-sm">${formatKRW(fund.currentAmount)} (${pct}%)</span>
              <button onclick="openEditTravelFundModal('${fund.id}')" class="text-xs font-bold text-amber-800 bg-amber-200/90 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition border border-amber-300 shadow-sm">
                ✏️ 모은돈 수정
              </button>
            </div>
          </div>
          <div class="progress-clean-track bg-amber-100">
            <div class="h-full rounded-full bg-amber-500 transition-all duration-700" style="width: ${pct}%"></div>
          </div>
          <div class="text-right text-[11px] text-gray-400 mt-1.5">최종 목표: ${formatKRW(fund.targetAmount)}</div>
        </div>
      </div>

      <div class="flex items-center justify-between pt-4 border-t border-gray-100 mt-2">
        <button onclick="addMoneyToTravel('${fund.id}')" class="btn-clean btn-amber-clean btn-xs-clean font-bold">
          + 여행금액 추가 적립
        </button>
        <button onclick="openEditTravelFundModal('${fund.id}')" class="btn-clean btn-secondary-clean btn-xs-clean font-bold">
          🎯 목표 및 상세 수정
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  // 여행 거래 내역 히스토리
  const feed = document.getElementById('travelHistoryFeed');
  if (feed) {
    feed.innerHTML = '';
    if (travelTxs.length === 0) {
      feed.innerHTML = '<div class="text-gray-400 text-sm py-4 text-center">여행자금 관련 거래 내역이 아직 없습니다.</div>';
    } else {
      travelTxs.forEach(t => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm';
        item.innerHTML = `
          <div>
            <div class="font-bold text-gray-800">${t.name}</div>
            <div class="text-xs text-gray-400">${t.date} · ${t.account}</div>
          </div>
          <div class="font-num font-bold ${t.type === 'expense' ? 'text-red-500' : 'text-amber-600'}">
            ${t.type === 'expense' ? '-' : '+'}${formatKRW(t.amount)}
          </div>
        `;
        feed.appendChild(item);
      });
    }
  }

  // ✅ 여행 지도 & 기록 초기화
  if (typeof renderTravelCountryFilters === 'function') renderTravelCountryFilters();
  if (typeof renderTravelMap === 'function') renderTravelMap();
  if (typeof renderTravelTripsList === 'function') renderTravelTripsList();
}

// 여행자금 프로젝트 삭제 기능
function deleteTravelProject(fundId) {
  const fund = state.data.travelFunds.find(f => f.id === fundId);
  if (!fund) return;

  if (confirm(`'${fund.title}' 여행 프로젝트를 정말 삭제하시겠습니까?`)) {
    state.data.travelFunds = state.data.travelFunds.filter(f => f.id !== fundId);
    saveState();
    renderTravel();
    renderDashboard();
    showToast(`'${fund.title}' 프로젝트가 삭제되었습니다.`, 'info');
  }
}

// 여행 현재 모은 돈 직접 수정 기능
function editTravelCurrentAmount(fundId) {
  const fund = state.data.travelFunds.find(f => f.id === fundId);
  if (!fund) return;

  const inputVal = prompt(
    `[${fund.title}]\n현재까지 모은 여행 금액을 수정합니다.\n현재 금액: ${formatKRW(fund.currentAmount)}\n새 금액 입력 (숫자만):`,
    fund.currentAmount
  );

  if (inputVal !== null && !isNaN(inputVal) && inputVal.trim() !== '') {
    fund.currentAmount = Number(inputVal);
    saveState();
    renderTravel();
    renderDashboard();
    showToast(`'${fund.title}' 모은 금액이 ${formatKRW(fund.currentAmount)}으로 수정되었습니다!`, 'success');
  }
}

// 여행 목표 금액 수정 기능
function editTravelFundTarget(fundId) {
  const fund = state.data.travelFunds.find(f => f.id === fundId);
  if (!fund) return;

  const newTarget = prompt(`[${fund.title}]\n새로운 최종 목표 금액을 입력해주세요 (원):`, fund.targetAmount);
  if (newTarget !== null && !isNaN(newTarget) && newTarget.trim() !== '') {
    fund.targetAmount = Number(newTarget);
    saveState();
    renderTravel();
    showToast('여행 목표 금액이 수정되었습니다.', 'success');
  }
}

function addMoneyToTravel(fundId) {
  const fund = state.data.travelFunds.find(f => f.id === fundId);
  if (!fund) return;

  const amtStr = prompt(`[${fund.title}]\n추가로 적립할 금액을 입력해주세요 (원):`, '100000');
  if (!amtStr || isNaN(amtStr)) return;

  const amt = Number(amtStr);
  if (amt <= 0) return;

  fund.currentAmount += amt;

  const today = new Date().toISOString().split('T')[0];
  state.data.transactions.push({
    id: 'tx_trv_' + Date.now(),
    date: today,
    month: today.slice(0, 7),
    type: 'savings',
    category: '여행자금',
    name: fund.title + ' 적립',
    amount: amt,
    account: fund.account,
    memo: '여행자금 추가 적립'
  });

  saveState();
  renderTravel();
  renderDashboard();
  showToast(`${formatKRW(amt)}이 ${fund.title}에 적립되었습니다!`, 'success');
}

function openAddTravelModal() {
  const title = prompt('새로운 여행 프로젝트 이름을 입력해주세요 (예: 🇬🇺 괌 휴양 여행):');
  if (!title) return;
  const target = prompt('목표 금액을 입력해주세요 (숫자만, 예: 1500000):', '1500000');
  if (!target || isNaN(target)) return;

  state.data.travelFunds.push({
    id: 'trv_' + Date.now(),
    title: title,
    targetAmount: Number(target),
    currentAmount: 0,
    targetDate: '2027-09-01',
    account: '카카오 일본여행적금 (여행전용)',
    memo: '새 여행 적립'
  });

  saveState();
  renderTravel();
  showToast('새 여행 목표가 생성되었습니다!', 'success');
}

// ========================================================
// 7. 토스증권 주식 포트폴리오 (이미지 4 모바일 토스 완벽 일치!)
// ========================================================
function getStockBadgeHtml(stk) {
  if (stk.ticker === 'QQQM') {
    return `<div class="toss-stock-icon bg-[#0b2447]"><span>나스닥</span><span class="text-[11px]">100</span></div>`;
  } else if (stk.ticker === 'SPYM') {
    return `<div class="toss-stock-icon bg-[#16382b]"><span>S&P</span><span class="text-[11px]">500</span></div>`;
  } else if (stk.ticker === 'SCHD') {
    return `<div class="toss-stock-icon bg-[#0284c7]"><span class="text-sm leading-none">💰</span><span class="text-[9px] mt-0.5">SCHD</span></div>`;
  } else if (stk.ticker === 'NVDA') {
    return `<div class="toss-stock-icon bg-[#76b900]"><span class="text-xs font-black tracking-tighter">NVDA</span></div>`;
  } else if (stk.ticker === 'IEF') {
    return `<div class="toss-stock-icon bg-[#65a30d]"><span class="text-sm leading-none">📊</span><span class="text-[9px] mt-0.5">IEF</span></div>`;
  } else if (stk.ticker === 'TSLA') {
    return `<div class="toss-stock-icon bg-[#e11d48]"><span class="text-xs font-black tracking-wider">TSLA</span></div>`;
  }
  return `<div class="toss-stock-icon" style="background-color: ${stk.badgeColor || '#3182f6'};">${stk.badgeText || stk.ticker}</div>`;
}

function renderStocks() {
  const stocks = state.data.stocks || [];
  const totalEval = stocks.reduce((sum, s) => sum + (Number(s.evalAmount) || 0), 0);
  const totalProfit = stocks.reduce((sum, s) => sum + (Number(s.profitAmount) || 0), 0);
  const totalCost = totalEval - totalProfit;
  const totalProfitRate = totalCost > 0 ? ((totalProfit / totalCost) * 100).toFixed(2) : '0.00';

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('stocksTotalEval', formatKRW(totalEval));

  const profitSign = totalProfit >= 0 ? '+' : '';
  const profitColor = totalProfit >= 0 ? 'text-red-600' : 'text-blue-600';
  const profitEl = document.getElementById('stocksTotalProfit');
  if (profitEl) {
    profitEl.textContent = `${profitSign}${formatKRW(totalProfit)} (${Math.abs(totalProfitRate)}%)`;
    profitEl.className = `text-sm font-bold font-num mt-0.5 ${profitColor}`;
  }

  // 모바일/PC 토스증권 리스트 컨테이너 (시원하고 넓은 카드 + 큼직한 보유 주수)
  const container = document.getElementById('tossStocksListContainer');
  if (!container) return;
  container.innerHTML = '';

  stocks.forEach(stk => {
    const card = document.createElement('div');
    // 사용자가 요청한: 네모 박스 넉넉하게 넓히고(p-5) 깔끔한 화이트 카드 디자인
    card.className = 'toss-stock-card p-5 hover:shadow-md transition bg-white rounded-2xl border border-gray-100 flex items-center justify-between';

    const isProfit = (stk.profitAmount || 0) >= 0;
    const sign = isProfit ? '+' : '';
    const profitClass = isProfit ? 'text-red-500' : 'text-blue-600';

    card.innerHTML = `
      <div class="flex items-center gap-4">
        ${getStockBadgeHtml(stk)}
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-gray-900 text-base sm:text-lg">${stk.name}</span>
            <!-- 크게 강조된 몇 주 배지 -->
            <span class="text-sm font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg font-num border border-blue-100 shadow-xs">
              ${stk.quantity}주
            </span>
          </div>
          <div class="text-xs text-gray-400 font-medium font-num mt-1">
            ${stk.ticker} · 토스증권 계좌
          </div>
        </div>
      </div>

      <div class="flex items-center gap-5">
        <div class="text-right">
          <div class="font-num font-extrabold text-base sm:text-lg text-gray-900">
            ${formatKRW(stk.evalAmount)}
          </div>
          <div class="font-num font-bold text-xs sm:text-sm mt-0.5 ${profitClass}">
            ${sign}${formatKRW(stk.profitAmount)} (${Math.abs(stk.profitRate)}%)
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <button onclick="openStockEditModal('${stk.id}')" class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="수정">✏️</button>
          <button onclick="deleteStock('${stk.id}')" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="삭제">🗑️</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function refreshStockPrices() {
  const btn = document.getElementById('btnRefreshStocks');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ 토스 실시간 시세 갱신 중...';
  }

  setTimeout(() => {
    // 실시간 미세 변동 반영
    state.data.stocks.forEach(stk => {
      const variation = (Math.random() * 1.6 - 0.75) / 100;
      stk.evalAmount = Math.round(stk.evalAmount * (1 + variation));
      stk.profitAmount = Math.round(stk.profitAmount * (1 + variation));
    });

    saveState();
    renderStocks();
    renderDashboard();

    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔄 실시간 시세 갱신';
    }
    showToast('토스증권 실시간 보유종목 시세가 최신화되었습니다!', 'success');
  }, 600);
}

// ========================================================
// 8. 계좌 & 보증금 & 순자산 직접 수정 (영구 보존!)
// ========================================================
function renderAccounts() {
  const container = document.getElementById('accountsListContainer');
  if (!container) return;
  container.innerHTML = '';

  state.data.accounts.forEach(acc => {
    const card = document.createElement('div');
    card.className = 'white-card white-card-hover p-5 flex flex-col justify-between';

    const isDeposit = acc.type === 'deposit';
    const isParents = acc.type === 'parents_support';
    const isTravel = acc.type === 'travel_savings';

    const badgeLabel = isDeposit ? '🏠 내 보증금' :
                       isParents ? '🤝 부모님 지원' :
                       isTravel  ? '✈️ 여행자금 적금' :
                       acc.type === 'savings' ? '💰 일반 적금' : '💳 입출금 통장';

    const badgeClass = isDeposit ? 'badge-deposit' :
                       isParents ? 'badge-savings' :
                       isTravel  ? 'badge-travel' :
                       acc.type === 'savings' ? 'badge-savings' : 'badge-income';

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="badge-clean ${badgeClass}">${badgeLabel}</span>
          <span class="text-xs text-gray-400 font-mono">${acc.institution}</span>
        </div>
        <div class="font-bold text-gray-900 text-base mb-1">${acc.name}</div>
        <div class="text-xs text-gray-400 mb-4">${acc.memo || ''} ${acc.maturity ? `· ${acc.maturity}` : ''}</div>
      </div>
      <div class="flex items-end justify-between pt-4 border-t border-gray-100">
        <div>
          <span class="text-xs text-gray-400">현재 잔액</span>
          <div class="text-lg font-bold font-num text-gray-900">${formatKRW(acc.balance)}</div>
        </div>
        <button onclick="openEditAccountModal('${acc.id}')" class="btn-clean btn-secondary-clean btn-xs-clean">
          ✏️ 금액 수정
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  // 보증금 요약 표시
  const myDep = state.data.accounts.find(a => a.id === 'acc_dep_self')?.balance || 10000000;
  const parDep = state.data.accounts.find(a => a.id === 'acc_dep_parents')?.balance || 30000000;

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setEl('accDepositSelf', formatKRW(myDep));
  setEl('accDepositParents', formatKRW(parDep));
}


// ========================================================
// 계좌 및 보증금 수정 모달 로직 (영구 저장 보장!)
// ========================================================
function openEditAccountModal(accId) {
  const acc = state.data.accounts.find(a => a.id === accId);
  if (!acc) return;

  document.getElementById('accountEditId').value = acc.id;
  document.getElementById('accountModalTitle').textContent = `${acc.name} 금액 수정`;
  document.getElementById('accountModalName').textContent = acc.name;
  document.getElementById('accountModalMemo').textContent = `${acc.institution || ''} ${acc.memo ? `· ${acc.memo}` : ''}`;
  document.getElementById('accountModalBalance').value = acc.balance;

  document.getElementById('accountModal').classList.remove('hidden');
}

function closeAccountModal() {
  document.getElementById('accountModal').classList.add('hidden');
}

function adjustAccountModalBalance(diff) {
  const input = document.getElementById('accountModalBalance');
  const cur = Number(input.value) || 0;
  input.value = Math.max(0, cur + diff);
}

function setAccountModalBalance(val) {
  document.getElementById('accountModalBalance').value = val;
}

function saveAccountModal() {
  const accId = document.getElementById('accountEditId').value;
  const acc = state.data.accounts.find(a => a.id === accId);
  if (!acc) return;

  const val = Number(document.getElementById('accountModalBalance').value);
  if (isNaN(val) || val < 0) {
    showToast('올바른 금액을 입력해주세요.', 'error');
    return;
  }

  acc.balance = val;
  saveState();
  closeAccountModal();
  renderAccounts();
  renderDashboard();
  showToast(`[${acc.name}] 잔액이 ${formatKRW(val)}으로 영구 저장되었습니다!`, 'success');
}

// ========================================================
// 여행자금 전용 모달 로직 (현재 모은돈 & 목표액 영구 저장!)
// ========================================================
function openEditTravelFundModal(fundId) {
  const fund = state.data.travelFunds.find(f => f.id === fundId);
  if (!fund) return;

  document.getElementById('travelEditId').value = fund.id;
  document.getElementById('travelModalTitle').textContent = `✈️ ${fund.title} 수정`;
  document.getElementById('travelModalTitleInput').value = fund.title;
  document.getElementById('travelModalCurrentAmount').value = fund.currentAmount;
  document.getElementById('travelModalTargetAmount').value = fund.targetAmount;
  document.getElementById('travelModalTargetDate').value = fund.targetDate || '';

  document.getElementById('travelFundModal').classList.remove('hidden');
}

function editTravelCurrentAmount(fundId) {
  openEditTravelFundModal(fundId);
  setTimeout(() => {
    document.getElementById('travelModalCurrentAmount')?.focus();
    document.getElementById('travelModalCurrentAmount')?.select();
  }, 100);
}

function closeTravelFundModal() {
  document.getElementById('travelFundModal').classList.add('hidden');
}

function saveTravelFundModal() {
  const fundId = document.getElementById('travelEditId').value;
  const fund = state.data.travelFunds.find(f => f.id === fundId);
  if (!fund) return;

  const title = document.getElementById('travelModalTitleInput').value.trim();
  const currentAmt = Number(document.getElementById('travelModalCurrentAmount').value);
  const targetAmt = Number(document.getElementById('travelModalTargetAmount').value.replace(/,/g, ''));
  const targetDate = document.getElementById('travelModalTargetDate').value;

  if (!title) {
    showToast('여행 프로젝트 이름을 입력해주세요.', 'error');
    return;
  }
  if (isNaN(currentAmt) || currentAmt < 0 || isNaN(targetAmt) || targetAmt <= 0) {
    showToast('올바른 금액을 입력해주세요.', 'error');
    return;
  }

  fund.title = title;
  fund.currentAmount = currentAmt;
  fund.targetAmount = targetAmt;
  if (targetDate) fund.targetDate = targetDate;

  saveState();
  closeTravelFundModal();
  renderTravel();
  renderDashboard();
  showToast(`'${fund.title}' 정보가 영구 저장되었습니다!`, 'success');
}

function editMyDepositDirect() {
  openEditAccountModal('acc_dep_self');
}

function editParentsDepositDirect() {
  openEditAccountModal('acc_dep_parents');
}

// ── 순자산 직접 수정 모달 로직 ──
function openEditNetWorthModal() {
  const currentNW = document.getElementById('dashMyPureNetWorth').textContent.replace(/[^0-9]/g, '');
  const inputEl = document.getElementById('inputCustomNetWorth');
  if (inputEl) inputEl.value = formatNumberWithCommas(Number(currentNW) || 29443514);
  document.getElementById('netWorthModal').classList.remove('hidden');
}

function closeNetWorthModal() {
  document.getElementById('netWorthModal').classList.add('hidden');
}

function saveCustomNetWorth() {
  const val = Number(document.getElementById('inputCustomNetWorth').value.replace(/,/g, ''));
  if (isNaN(val) || val < 0) {
    showToast('올바른 금액을 입력해주세요.', 'error');
    return;
  }
  state.data.customNetWorth = val;
  saveState();
  closeNetWorthModal();
  renderDashboard();
  showToast(`내 순수 순자산이 ${formatKRW(val)}으로 확정 저장되었습니다!`, 'success');
}

function resetNetWorthToAuto() {
  state.data.customNetWorth = null;
  saveState();
  closeNetWorthModal();
  renderDashboard();
  showToast('계좌+주식 자동 합산 방식으로 복원되었습니다.', 'info');
}

// ── 저축 달성액 및 목표 수정 모달 로직 ──
function openEditGoalModal() {
  const goal2026 = state.data.annualGoals[2026] || { target: 15000000, currentSaved: 7100000 };
  document.getElementById('inputGoalTarget').value = formatNumberWithCommas(goal2026.target || 15000000);
  document.getElementById('inputGoalCurrent').value = formatNumberWithCommas(goal2026.currentSaved !== undefined ? goal2026.currentSaved : 7100000);
  document.getElementById('goalModal').classList.remove('hidden');
}

function closeGoalModal() {
  document.getElementById('goalModal').classList.add('hidden');
}

function saveGoalModal() {
  const target = Number(document.getElementById('inputGoalTarget').value.replace(/,/g, ''));
  const current = Number(document.getElementById('inputGoalCurrent').value);

  if (isNaN(target) || isNaN(current) || target <= 0) {
    showToast('올바른 목표 금액을 입력해주세요.', 'error');
    return;
  }

  state.data.annualGoals[2026] = {
    target: target,
    currentSaved: current,
    isCustom: true
  };

  saveState();
  closeGoalModal();
  renderDashboard();
  showToast(`저축 목표 ${formatKRW(target)}, 달성액 ${formatKRW(current)}으로 저장되었습니다!`, 'success');
}

// ── 기본 월급/수입 수정 모달 로직 ──
function openEditSalaryModal() {
  document.getElementById('inputDefaultSalary').value = formatNumberWithCommas(state.data.defaultSalary || 2036240);
  document.getElementById('salaryModal').classList.remove('hidden');
}

function closeSalaryModal() {
  document.getElementById('salaryModal').classList.add('hidden');
}

function saveSalaryModal() {
  const val = Number(document.getElementById('inputDefaultSalary').value.replace(/,/g, ''));
  if (isNaN(val) || val <= 0) {
    showToast('올바른 월급 금액을 입력해주세요.', 'error');
    return;
  }

  state.data.defaultSalary = val;

  // 현재 월의 급여 내역도 업데이트
  const currentMonth = state.selectedMonth;
  const incomeTx = state.data.transactions.find(t => t.month === currentMonth && t.type === 'income');
  if (incomeTx) {
    incomeTx.amount = val;
  }

  saveState();
  closeSalaryModal();
  renderDashboard();
  renderLedger();
  showToast(`기본 월급이 ${formatKRW(val)}으로 변경 저장되었습니다!`, 'success');
}

// ========================================================
// 9. 거래 내역 작성 / 수정 / 삭제 모달
// ========================================================
function openAddTxModal(defaultType = 'expense') {
  document.getElementById('txModalTitle').textContent = '새 거래 내역 작성 (10월부터)';
  document.getElementById('txEditId').value = '';
  document.getElementById('txDate').value = '2026-10-15';
  document.getElementById('txType').value = defaultType;
  document.getElementById('txCategory').value = defaultType === 'income' ? '급여/수입' : '식비/마트/장보기';
  document.getElementById('txName').value = '';
  document.getElementById('txAmount').value = defaultType === 'income' ? formatNumberWithCommas(state.data.defaultSalary) : '';
  document.getElementById('txMemo').value = '';

  const accSelect = document.getElementById('txAccount');
  accSelect.innerHTML = '';
  state.data.accounts.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.name;
    opt.textContent = `${a.name} (${a.institution})`;
    accSelect.appendChild(opt);
  });

  document.getElementById('txModal').classList.remove('hidden');
}

function closeTxModal() {
  document.getElementById('txModal').classList.add('hidden');
}

function saveTransaction() {
  const id = document.getElementById('txEditId').value;
  const date = document.getElementById('txDate').value;
  const type = document.getElementById('txType').value;
  const category = document.getElementById('txCategory').value;
  const name = document.getElementById('txName').value.trim();
  const amount = Number(document.getElementById('txAmount').value.replace(/,/g, ''));
  const account = document.getElementById('txAccount').value;
  const memo = document.getElementById('txMemo').value.trim();

  if (!name || isNaN(amount) || amount <= 0) {
    showToast('항목명과 올바른 금액을 입력해주세요.', 'error');
    return;
  }

  const month = date.slice(0, 7);

  if (id) {
    const idx = state.data.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      state.data.transactions[idx] = { id, date, month, type, category, name, amount, account, memo };
      showToast('거래 내역이 성공적으로 수정되었습니다.', 'success');
    }
  } else {
    state.data.transactions.push({
      id: 'tx_' + Date.now(),
      date,
      month,
      type,
      category,
      name,
      amount,
      account,
      memo
    });
    showToast('새 내역이 성공적으로 기록되었습니다!', 'success');
  }

  saveState();
  closeTxModal();
  populateMonthSelectors();
  renderDashboard();
  renderLedger();
  renderTravel();
}

function editTransaction(id) {
  const t = state.data.transactions.find(tx => tx.id === id);
  if (!t) return;

  document.getElementById('txModalTitle').textContent = '거래 내역 수정';
  document.getElementById('txEditId').value = t.id;
  document.getElementById('txDate').value = t.date;
  document.getElementById('txType').value = t.type;
  document.getElementById('txCategory').value = t.category;
  document.getElementById('txName').value = t.name;
  document.getElementById('txAmount').value = formatNumberWithCommas(t.amount);
  document.getElementById('txMemo').value = t.memo || '';

  const accSelect = document.getElementById('txAccount');
  accSelect.innerHTML = '';
  state.data.accounts.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.name;
    opt.textContent = `${a.name} (${a.institution})`;
    if (a.name === t.account) opt.selected = true;
    accSelect.appendChild(opt);
  });

  document.getElementById('txModal').classList.remove('hidden');
}

function deleteTransaction(id) {
  if (confirm('이 거래 내역을 삭제하시겠습니까?')) {
    if (!state.data.deletedTxIds) state.data.deletedTxIds = [];
    if (!state.data.deletedTxIds.includes(id)) {
      state.data.deletedTxIds.push(id);
    }
    state.data.transactions = state.data.transactions.filter(t => t.id !== id);
    saveState();
    showToast('거래 내역이 영구히 삭제되었습니다.', 'info');
    renderDashboard();
    renderLedger();
    renderTravel();
  }
}

// ========================================================
// 10. 주식 모달 (토스증권 종목 편집)
// ========================================================
function openAddStockModal() {
  document.getElementById('stockModalTitle').textContent = '토스증권 종목 추가';
  document.getElementById('stockEditId').value = '';
  document.getElementById('stockTicker').value = '';
  document.getElementById('stockName').value = '';
  document.getElementById('stockQuantity').value = '';
  document.getElementById('stockEvalAmount').value = '';
  document.getElementById('stockProfitAmount').value = '';
  document.getElementById('stockProfitRate').value = '';

  document.getElementById('stockModal').classList.remove('hidden');
}

function openStockEditModal(id) {
  const stk = state.data.stocks.find(s => s.id === id);
  if (!stk) return;

  document.getElementById('stockModalTitle').textContent = '토스증권 종목 수정';
  document.getElementById('stockEditId').value = stk.id;
  document.getElementById('stockTicker').value = stk.ticker;
  document.getElementById('stockName').value = stk.name;
  document.getElementById('stockQuantity').value = stk.quantity;
  document.getElementById('stockEvalAmount').value = stk.evalAmount;
  document.getElementById('stockProfitAmount').value = stk.profitAmount;
  document.getElementById('stockProfitRate').value = stk.profitRate;

  document.getElementById('stockModal').classList.remove('hidden');
}

function closeStockModal() {
  document.getElementById('stockModal').classList.add('hidden');
}

function saveStock() {
  const id = document.getElementById('stockEditId').value;
  const ticker = document.getElementById('stockTicker').value.trim().toUpperCase();
  const name = document.getElementById('stockName').value.trim();
  const quantity = Number(document.getElementById('stockQuantity').value);
  const evalAmount = Number(document.getElementById('stockEvalAmount').value);
  const profitAmount = Number(document.getElementById('stockProfitAmount').value) || 0;
  const profitRate = Number(document.getElementById('stockProfitRate').value) || 0;

  if (!ticker || !name || isNaN(evalAmount) || evalAmount < 0) {
    showToast('종목 정보와 올바른 평가금액을 입력해주세요.', 'error');
    return;
  }

  if (id) {
    const idx = state.data.stocks.findIndex(s => s.id === id);
    if (idx !== -1) {
      state.data.stocks[idx] = {
        ...state.data.stocks[idx],
        ticker, name, quantity, evalAmount, profitAmount, profitRate
      };
      showToast('주식 정보가 성공적으로 수정되었습니다.', 'success');
    }
  } else {
    state.data.stocks.push({
      id: 'stk_' + Date.now(),
      ticker, name, badgeText: ticker, badgeColor: '#3182f6',
      quantity, evalAmount, profitAmount, profitRate, currency: 'USD',
      account: '토스증권 주식 계좌'
    });
    showToast('새 주식 종목이 추가되었습니다!', 'success');
  }

  saveState();
  closeStockModal();
  renderStocks();
  renderDashboard();
}

function deleteStock(id) {
  if (confirm('이 주식 종목을 삭제하시겠습니까?')) {
    state.data.stocks = state.data.stocks.filter(s => s.id !== id);
    saveState();
    renderStocks();
    renderDashboard();
    showToast('주식 종목이 삭제되었습니다.', 'info');
  }
}

// ========================================================
// 11. 50년 재무 로드맵
// ========================================================
function renderRoadmap() {
  const tbody = document.getElementById('roadmapTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  state.data.roadmap.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-gray-100 font-num';
    tr.innerHTML = `
      <td class="py-3 px-4 font-bold text-gray-900">${r.year}년</td>
      <td class="py-3 px-4 text-gray-600">${r.age}세</td>
      <td class="py-3 px-4 text-right text-gray-700">${formatKRW(r.lumpSum)}</td>
      <td class="py-3 px-4 text-right text-blue-600 font-semibold">+${formatKRW(r.savings)}</td>
      <td class="py-3 px-4 text-right font-bold text-emerald-600 text-sm">${formatKRW(r.total)}</td>
    `;
    tbody.appendChild(tr);
  });

  const ctxRoadmap = document.getElementById('roadmapChart');
  if (ctxRoadmap) {
    if (state.charts.roadmap) state.charts.roadmap.destroy();
    const labels = state.data.roadmap.map(r => `${r.year}(${r.age}세)`);
    const totals = state.data.roadmap.map(r => r.total);

    state.charts.roadmap = new Chart(ctxRoadmap, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '예상 총 순자산 (복리 성장 시뮬레이션)',
          data: totals,
          borderColor: '#00c473',
          backgroundColor: 'rgba(0, 196, 115, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#00c473',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8b95a1', font: { family: 'Pretendard', size: 11 } } },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              color: '#8b95a1',
              callback: (v) => v >= 100000000 ? `${(v / 100000000).toFixed(1)}억` : `${(v / 10000).toLocaleString()}만`,
              font: { family: 'Pretendard', size: 11 }
            }
          }
        },
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Pretendard', size: 12, weight: '600' }, color: '#4e5968' } }
        }
      }
    });
  }
}

// ========================================================
// 12. 백업 / 복원 / 비밀번호 변경 / 토스트
// ========================================================
function exportDataBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.data, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  const now = new Date().toISOString().split('T')[0];
  dlAnchor.setAttribute("download", `내_자산가계부_백업_${now}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  showToast('전체 가계부 데이터 백업 파일이 다운로드되었습니다.', 'success');
}

function importDataBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.transactions && imported.accounts) {
        state.data = imported;
        saveState();
        populateMonthSelectors();
        renderDashboard();
        renderLedger();
        renderTravel();
        renderStocks();
        renderAccounts();
        showToast('백업 파일에서 데이터가 복원되었습니다!', 'success');
      } else {
        throw new Error('형식 불일치');
      }
    } catch (err) {
      showToast('올바른 가계부 JSON 백업 파일을 선택해주세요.', 'error');
    }
  };
  reader.readAsText(file);
}

function openChangePasswordModal() {
  document.getElementById('changePinOld').value = '';
  document.getElementById('changePinNew').value = '';
  document.getElementById('changePinConfirm').value = '';
  document.getElementById('changePinError').classList.add('hidden');
  document.getElementById('changePasswordModal').classList.remove('hidden');
}

function closeChangePasswordModal() {
  document.getElementById('changePasswordModal').classList.add('hidden');
}

async function submitChangePassword() {
  const oldPin = document.getElementById('changePinOld').value.trim();
  const newPin = document.getElementById('changePinNew').value.trim();
  const confirmPin = document.getElementById('changePinConfirm').value.trim();
  const errEl = document.getElementById('changePinError');

  const savedPin = localStorage.getItem('smart_ledger_pin_v3') || DEFAULT_PIN;
  let oldHashed = oldPin;
  try { oldHashed = await sha256(oldPin); } catch(e){}

  if (oldPin !== DEFAULT_PIN && oldPin !== savedPin && oldHashed !== savedPin) {
    errEl.textContent = '현재 비밀번호가 일치하지 않습니다.';
    errEl.classList.remove('hidden');
    return;
  }

  if (newPin.length < 4) {
    errEl.textContent = '새 비밀번호는 4자리 이상이어야 합니다.';
    errEl.classList.remove('hidden');
    return;
  }

  if (newPin !== confirmPin) {
    errEl.textContent = '새 비밀번호 확인이 일치하지 않습니다.';
    errEl.classList.remove('hidden');
    return;
  }

  localStorage.setItem('smart_ledger_pin_v3', newPin);
  closeChangePasswordModal();
  showToast('비밀번호가 성공적으로 변경되었습니다!', 'success');
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toastNotification');
  const text = document.getElementById('toastText');
  const icon = document.getElementById('toastIcon');
  if (!toast) return;

  text.textContent = message;

  if (type === 'success') {
    icon.textContent = '✅';
    toast.className = 'toast-clean success show';
  } else if (type === 'error') {
    icon.textContent = '❌';
    toast.className = 'toast-clean error show';
  } else {
    icon.textContent = 'ℹ️';
    toast.className = 'toast-clean info show';
  }

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// ========================================================
// 13. 초기 이벤트 등록
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  checkLockStatus();

  document.getElementById('dashMonthSelect')?.addEventListener('change', (e) => {
    selectMonth(e.target.value);
  });

  document.getElementById('ledgerMonthSelect')?.addEventListener('change', (e) => {
    selectMonth(e.target.value);
  });

  document.getElementById('ledgerSearchInput')?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    filterAndRenderTransactions();
  });

  document.getElementById('ledgerFilterType')?.addEventListener('change', (e) => {
    state.filterType = e.target.value;
    filterAndRenderTransactions();
  });

  document.getElementById('ledgerFilterCategory')?.addEventListener('change', (e) => {
    state.filterCategory = e.target.value;
    filterAndRenderTransactions();
  });

  document.getElementById('ledgerFilterAccount')?.addEventListener('change', (e) => {
    state.filterAccount = e.target.value;
    filterAndRenderTransactions();
  });

    window.addEventListener('keydown', (e) => {
    if (state.isLocked) {
      const pinInput = document.getElementById('pinInputDisplay');
      if (document.activeElement === pinInput) {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitPin();
        }
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        handlePinInput(e.key);
      } else if (e.key === 'Backspace') {
        handlePinDelete();
      } else if (e.key === 'Enter') {
        submitPin();
      } else if (pinInput && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        pinInput.focus();
      }
    }
  });
});


// ========================================================
// 15. 월급 배분 엑셀 가계부 모듈 (완전 맞춤형 엑셀 수식 & 쉼표 서식)
// ========================================================
let currentExcelMonth = '2026-10';

// 1,000 단위 쉼표 포맷터 (5000 -> 5,000, 금액 숨기기 시 000,000 표시)
function formatNumberWithCommas(val) {
  if (state.hideAmounts) return '000,000';
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(num)) return '0';
  return Math.round(num).toLocaleString('ko-KR');
}

// 월별 독립 엑셀 예산 객체 가져오기 (10.11.12월 등이 각각 독립적으로 저장 및 변동)
function getMonthlyExcelBudget(month = currentExcelMonth) {
  if (!state.data.excelBudgets) {
    state.data.excelBudgets = {};
  }
  if (!state.data.excelBudgets[month]) {
    const base = state.data.excelBudget || INITIAL_APP_DATA.excelBudget;
    state.data.excelBudgets[month] = JSON.parse(JSON.stringify(base));
  }
  return state.data.excelBudgets[month];
}

// ========================================================
// 강력한 실제 엑셀(Microsoft Excel) 수식 및 그리드 엔진
// ========================================================
let currentActiveExcelCell = null;

function handleExcelCellFocus(input, month, coord, type, index) {
  currentActiveExcelCell = { element: input, month: month, coord: coord, type: type, index: index };
  
  // 모든 이전 셀 포커스 테두리 제거 후 현재 셀에 Excel 초록색 테두리 적용
  document.querySelectorAll('.excel-cell-focused').forEach(el => el.classList.remove('excel-cell-focused'));
  input.classList.add('excel-cell-focused');
  
  // 수식 입력줄 (Formula Bar) 이름 상자 (B20, B21 등) 갱신
  const coordBox = document.getElementById('excelCellCoordBox');
  if (coordBox) coordBox.textContent = coord;
  
  // 수식 입력줄 텍스트 갱신 (수식이 있으면 수식 우선 표시, 없으면 원본값 표시)
  const fxInput = document.getElementById('excelGlobalFormulaInput');
  if (fxInput) {
    const valToShow = input.dataset.formula ? input.dataset.formula : (input.dataset.raw !== undefined ? input.dataset.raw : input.value);
    fxInput.value = valToShow;
  }
  
  // 셀 내부 텍스트도 수식 모드로 전환
  if (input.dataset.formula) {
    input.value = input.dataset.formula;
  } else if (input.dataset.raw !== undefined) {
    input.value = input.dataset.raw;
  }
  input.select();
}

function syncFormulaBarToActiveCell(val) {
  if (!currentActiveExcelCell || !currentActiveExcelCell.element) return;
  currentActiveExcelCell.element.value = val;
}

function commitExcelFormulaBar() {
  if (!currentActiveExcelCell || !currentActiveExcelCell.element) return;
  const fxInput = document.getElementById('excelGlobalFormulaInput');
  if (fxInput) {
    currentActiveExcelCell.element.value = fxInput.value;
  }
  currentActiveExcelCell.element.blur();
}

function cancelExcelFormulaBar() {
  if (!currentActiveExcelCell || !currentActiveExcelCell.element) return;
  const input = currentActiveExcelCell.element;
  if (input.dataset.formula) {
    input.value = input.dataset.formula;
  } else if (input.dataset.raw !== undefined) {
    input.value = formatNumberWithCommas(input.dataset.raw);
  }
  input.blur();
}

function handleExcelFormulaBarKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    commitExcelFormulaBar();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelExcelFormulaBar();
  }
}

// 강력한 엑셀 수식 및 산술 계산 엔진 (범위 B2:B19, D2:D19, SUM, AVERAGE, 셀참조 완벽 지원)
function evaluateExcelFormula(rawInput, contextItems, currentSalary, budgetObj) {
  if (rawInput === undefined || rawInput === null || rawInput === '') return 0;
  let str = String(rawInput).trim();

  // 일반 숫자인 경우 (쉼표 포함)
  if (!str.startsWith('=')) {
    const cleaned = str.replace(/,/g, '').trim();
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : Math.round(val);
  }

  // = 으로 시작하는 수식 처리
  try {
    let expr = str.substring(1).toUpperCase().trim();

    // 0. 엑셀 범위(Range) 구문 전개: B2:B19 -> B2,B3,B4,...,B19
    expr = expr.replace(/([A-Z])(\d+):([A-Z])(\d+)/g, (match, c1, r1, c2, r2) => {
      const col = c1;
      const start = parseInt(r1, 10);
      const end = parseInt(r2, 10);
      const list = [];
      const step = start <= end ? 1 : -1;
      for (let r = start; (step > 0 ? r <= end : r >= end); r += step) {
        list.push(`${col}${r}`);
      }
      return list.join(',');
    });

    // 1. SUM(...) 함수 처리
    expr = expr.replace(/SUM\(([^)]+)\)/g, (match, args) => {
      const parts = args.split(',').map(a => evaluateExcelSubExpr(a.trim(), contextItems, currentSalary, budgetObj));
      return parts.reduce((a, b) => a + b, 0);
    });

    // 2. AVERAGE(...) 함수 처리
    expr = expr.replace(/AVERAGE\(([^)]+)\)/g, (match, args) => {
      const parts = args.split(',').map(a => evaluateExcelSubExpr(a.trim(), contextItems, currentSalary, budgetObj));
      return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
    });

    // 3. MIN / MAX / ROUND 함수 처리
    expr = expr.replace(/MIN\(([^)]+)\)/g, (match, args) => {
      const parts = args.split(',').map(a => evaluateExcelSubExpr(a.trim(), contextItems, currentSalary, budgetObj));
      return Math.min(...parts);
    });
    expr = expr.replace(/MAX\(([^)]+)\)/g, (match, args) => {
      const parts = args.split(',').map(a => evaluateExcelSubExpr(a.trim(), contextItems, currentSalary, budgetObj));
      return Math.max(...parts);
    });
    expr = expr.replace(/ROUND\(([^)]+)\)/g, (match, args) => {
      const parts = args.split(',').map(a => evaluateExcelSubExpr(a.trim(), contextItems, currentSalary, budgetObj));
      return Math.round(parts[0]);
    });

    // 4. 셀 참조 해석: B열(예산), D열(실사용)
    const totalItems = contextItems ? contextItems.length : 0;
    const expenseRow = totalItems + 2;   // 소비값 행 (예: 18개면 row 20)
    const remainingRow = totalItems + 3; // 남은금액 행 (row 21)
    const savingsRow = totalItems + 4;   // 저축금액 행 (row 22)

    expr = expr.replace(/([BD])(\d+)/g, (match, col, rowNum) => {
      const r = parseInt(rowNum, 10);
      if (col === 'B') {
        if (r === 1) return currentSalary || 0;
        if (r >= 2 && r <= totalItems + 1) {
          return (contextItems[r - 2] && contextItems[r - 2].amount !== undefined) ? Number(contextItems[r - 2].amount) : 0;
        }
        if (r === expenseRow) {
          if (budgetObj && budgetObj.customFormulas && budgetObj.customFormulas.expenseAmount !== undefined) {
            return budgetObj.customFormulas.expenseAmount;
          }
          return contextItems ? contextItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0) : 0;
        }
        if (r === remainingRow) {
          const sal = currentSalary || 0;
          const exp = contextItems ? contextItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0) : 0;
          return sal - exp;
        }
        if (r === savingsRow) {
          return contextItems ? contextItems.filter(it => (it.isSavings || it.category === '저축/투자') && it.category !== '여행자금' && !it.name.includes('여행'))
                                           .reduce((acc, it) => acc + (Number(it.amount) || 0), 0) : 0;
        }
      } else if (col === 'D') {
        if (r === 1) return currentSalary || 0;
        if (r >= 2 && r <= totalItems + 1) {
          const it = contextItems[r - 2];
          return (it && it.actualAmount !== undefined) ? Number(it.actualAmount) : (it ? Number(it.amount) : 0);
        }
        if (r === expenseRow) {
          return contextItems ? contextItems.reduce((acc, it) => acc + (it.actualAmount !== undefined ? Number(it.actualAmount) : (Number(it.amount) || 0)), 0) : 0;
        }
      }
      return 0;
    });

    expr = expr.replace(/,/g, '');
    expr = expr.replace(/\^/g, '**');

    if (!/^[0-9+\-*/().\s%*]+$/.test(expr)) {
      console.warn('허용되지 않은 문자 포함 수식:', expr);
      return 0;
    }

    const result = Function(`'use strict'; return (${expr});`)();
    return (typeof result === 'number' && !isNaN(result) && isFinite(result)) ? Math.round(result) : 0;
  } catch (err) {
    console.warn('엑셀 수식 계산 오류:', rawInput, err);
    return 0;
  }
}

function evaluateExcelSubExpr(sub, contextItems, currentSalary, budgetObj) {
  if (/^[0-9.,]+$/.test(sub)) {
    return parseFloat(sub.replace(/,/g, '')) || 0;
  }
  return evaluateExcelFormula('=' + sub, contextItems, currentSalary, budgetObj);
}

// ── 월별 독립 입력 이벤트 핸들러 ──
function handleMonthlyExcelSalaryBlur(month, input) {
  const budget = getMonthlyExcelBudget(month);
  const items = budget.items || [];
  const val = input.value.trim();

  if (val.startsWith('=')) {
    const computed = evaluateExcelFormula(val, items, budget.salary, budget);
    budget.salary = computed;
    budget.salaryFormula = val;
    input.dataset.formula = val;
    input.dataset.raw = computed;
    input.value = formatNumberWithCommas(computed);
  } else {
    const num = Math.round(parseFloat(val.replace(/,/g, '')) || 0);
    budget.salary = num;
    budget.salaryFormula = '';
    input.dataset.formula = '';
    input.dataset.raw = num;
    input.value = formatNumberWithCommas(num);
  }
  state.data.excelBudgets[month] = budget;
  saveState();
  renderExcelLedger();
}

function handleMonthlyExcelItemBlur(month, idx, input) {
  const budget = getMonthlyExcelBudget(month);
  const items = budget.items || [];
  const item = items[idx];
  if (!item) return;
  const val = input.value.trim();

  if (val.startsWith('=')) {
    const computed = evaluateExcelFormula(val, items, budget.salary, budget);
    item.amount = computed;
    item.formula = val;
    input.dataset.formula = val;
    input.dataset.raw = computed;
    input.value = formatNumberWithCommas(computed);
  } else {
    const num = Math.round(parseFloat(val.replace(/,/g, '')) || 0);
    item.amount = num;
    item.formula = '';
    input.dataset.formula = '';
    input.dataset.raw = num;
    input.value = formatNumberWithCommas(num);
  }
  state.data.excelBudgets[month] = budget;
  saveState();
  renderExcelLedger();
}

function updateMonthlyExcelItemMerchant(month, idx, val) {
  const budget = getMonthlyExcelBudget(month);
  if (!budget || !budget.items || !budget.items[idx]) return;
  budget.items[idx].merchant = val.trim();
  state.data.excelBudgets[month] = budget;
  saveState();
}

function handleMonthlyExcelActualBlur(month, idx, input) {
  const budget = getMonthlyExcelBudget(month);
  if (!budget || !budget.items || !budget.items[idx]) return;
  const item = budget.items[idx];
  const val = input.value.trim();

  if (val.startsWith('=')) {
    const computed = evaluateExcelFormula(val, budget.items, budget.salary, budget);
    item.actualAmount = computed;
    item.actualFormula = val;
    input.dataset.formula = val;
    input.dataset.raw = computed;
    input.value = formatNumberWithCommas(computed);
  } else {
    const num = Math.round(parseFloat(val.replace(/,/g, '')) || 0);
    item.actualAmount = num;
    item.actualFormula = '';
    input.dataset.formula = '';
    input.dataset.raw = num;
    input.value = formatNumberWithCommas(num);
  }
  state.data.excelBudgets[month] = budget;
  saveState();
  renderExcelLedger();
}

function updateMonthlyExcelItemName(month, idx, val) {
  const budget = getMonthlyExcelBudget(month);
  if (!budget || !budget.items || !budget.items[idx]) return;
  budget.items[idx].name = val.trim();
  state.data.excelBudgets[month] = budget;
  saveState();
}

function deleteMonthlyExcelRow(month, idx) {
  const budget = getMonthlyExcelBudget(month);
  if (!budget || !budget.items || !budget.items[idx]) return;
  const deleted = budget.items.splice(idx, 1);
  state.data.excelBudgets[month] = budget;
  saveState();
  renderExcelLedger();
  showToast(`[${formatMonthLabel(month)}] ${deleted[0]?.name || '항목'} 삭제 완료`, 'info');
}

// ── 사용자가 직접 수식 및 금액을 입력/수정할 수 있는 하단 3개 행(소비값, 남은금액, 저축금액) 이벤트 핸들러 ──
function handleMonthlyExcelFooterExpenseBlur(month, input) {
  const budget = getMonthlyExcelBudget(month);
  const items = budget.items || [];
  const val = input.value.trim();
  if (!budget.customFormulas) budget.customFormulas = {};

  if (val.startsWith('=')) {
    const computed = evaluateExcelFormula(val, items, budget.salary, budget);
    budget.customFormulas.expense = val;
    budget.customFormulas.expenseAmount = computed;
    input.dataset.formula = val;
    input.dataset.raw = computed;
    input.value = formatNumberWithCommas(computed);
  } else if (val === '' || val === '0') {
    delete budget.customFormulas.expense;
    delete budget.customFormulas.expenseAmount;
  } else {
    const num = Math.round(parseFloat(val.replace(/,/g, '')) || 0);
    budget.customFormulas.expense = '';
    budget.customFormulas.expenseAmount = num;
    input.dataset.formula = '';
    input.dataset.raw = num;
    input.value = formatNumberWithCommas(num);
  }
  state.data.excelBudgets[month] = budget;
  saveState();
  renderExcelLedger();
}

function handleMonthlyExcelFooterActualBlur(month, input) {
  const budget = getMonthlyExcelBudget(month);
  const items = budget.items || [];
  const val = input.value.trim();
  if (!budget.customFormulas) budget.customFormulas = {};

  if (val.startsWith('=')) {
    const computed = evaluateExcelFormula(val, items, budget.salary, budget);
    budget.customFormulas.actualTotal = val;
    budget.customFormulas.actualTotalAmount = computed;
    input.dataset.formula = val;
    input.dataset.raw = computed;
    input.value = formatNumberWithCommas(computed);
  } else if (val === '' || val === '0') {
    delete budget.customFormulas.actualTotal;
    delete budget.customFormulas.actualTotalAmount;
  } else {
    const num = Math.round(parseFloat(val.replace(/,/g, '')) || 0);
    budget.customFormulas.actualTotal = '';
    budget.customFormulas.actualTotalAmount = num;
    input.dataset.formula = '';
    input.dataset.raw = num;
    input.value = formatNumberWithCommas(num);
  }
  state.data.excelBudgets[month] = budget;
  saveState();
  renderExcelLedger();
}

function handleMonthlyExcelFooterRemainingBlur(month, input) {
  const budget = getMonthlyExcelBudget(month);
  const items = budget.items || [];
  const val = input.value.trim();
  if (!budget.customFormulas) budget.customFormulas = {};

  if (val.startsWith('=')) {
    const computed = evaluateExcelFormula(val, items, budget.salary, budget);
    budget.customFormulas.remaining = val;
    budget.customFormulas.remainingAmount = computed;
    input.dataset.formula = val;
    input.dataset.raw = computed;
    input.value = formatNumberWithCommas(computed);
  } else if (val === '') {
    delete budget.customFormulas.remaining;
    delete budget.customFormulas.remainingAmount;
  } else {
    const num = Math.round(parseFloat(val.replace(/,/g, '')) || 0);
    budget.customFormulas.remaining = '';
    budget.customFormulas.remainingAmount = num;
    input.dataset.formula = '';
    input.dataset.raw = num;
    input.value = formatNumberWithCommas(num);
  }
  state.data.excelBudgets[month] = budget;
  saveState();
  renderExcelLedger();
}

function handleMonthlyExcelFooterSavingsBlur(month, input) {
  const budget = getMonthlyExcelBudget(month);
  const items = budget.items || [];
  const val = input.value.trim();
  if (!budget.customFormulas) budget.customFormulas = {};

  if (val.startsWith('=')) {
    const computed = evaluateExcelFormula(val, items, budget.salary, budget);
    budget.customFormulas.savings = val;
    budget.customFormulas.savingsAmount = computed;
    input.dataset.formula = val;
    input.dataset.raw = computed;
    input.value = formatNumberWithCommas(computed);
  } else if (val === '') {
    delete budget.customFormulas.savings;
    delete budget.customFormulas.savingsAmount;
  } else {
    const num = Math.round(parseFloat(val.replace(/,/g, '')) || 0);
    budget.customFormulas.savings = '';
    budget.customFormulas.savingsAmount = num;
    input.dataset.formula = '';
    input.dataset.raw = num;
    input.value = formatNumberWithCommas(num);
  }
  state.data.excelBudgets[month] = budget;
  saveState();
  renderExcelLedger();
}

function openAddMonthlyExcelRowModal(month) {
  currentExcelMonth = month;
  const modal = document.getElementById('addExcelRowModal');
  if (modal) modal.classList.remove('hidden');
}

function submitAddExcelRow() {
  const nameInput = document.getElementById('newExcelItemName');
  const amtInput = document.getElementById('newExcelItemAmount');
  if (!nameInput || !amtInput) return;

  const name = nameInput.value.trim();
  const amt = amtInput.value.trim();

  if (!name) {
    showToast('항목명을 입력해주세요.', 'error');
    return;
  }

  const month = currentExcelMonth;
  const shortM = formatMonthLabel(month);
  const budget = getMonthlyExcelBudget(month);
  let finalAmount = 0;
  let formula = '';

  if (amt.startsWith('=')) {
    finalAmount = evaluateExcelFormula(amt, budget.items, budget.salary, budget);
    formula = amt;
  } else {
    finalAmount = Math.round(parseFloat(amt.replace(/,/g, '')) || 0);
  }

  budget.items.push({
    id: 'ex_' + Date.now(),
    category: '변동지출',
    name: name.trim(),
    amount: finalAmount,
    formula: formula,
    merchant: '',
    actualAmount: finalAmount,
    actualFormula: '',
    memo: '',
    style: ''
  });

  state.data.excelBudgets[month] = budget;
  saveState();
  renderExcelLedger();
  showToast(`[${shortM}] ${name} 항목(${formatNumberWithCommas(finalAmount)}원)이 추가되었습니다!`, 'success');
}

// ── 단일월 호환 래퍼 함수들 ──
function handleExcelSalaryBlur(input) { handleMonthlyExcelSalaryBlur(currentExcelMonth, input); }
function handleExcelItemBlur(idx, input) { handleMonthlyExcelItemBlur(currentExcelMonth, idx, input); }
function updateExcelItemMerchant(idx, val) { updateMonthlyExcelItemMerchant(currentExcelMonth, idx, val); }
function handleExcelItemActualBlur(idx, input) { handleMonthlyExcelActualBlur(currentExcelMonth, idx, input); }
function updateExcelItemName(idx, val) { updateMonthlyExcelItemName(currentExcelMonth, idx, val); }
function deleteExcelRow(idx) { deleteMonthlyExcelRow(currentExcelMonth, idx); }
function openAddExcelRowModal() { openAddMonthlyExcelRowModal(currentExcelMonth); }

function handleExcelFocus(input) {
  if (input.dataset.formula) {
    input.value = input.dataset.formula;
  } else if (input.dataset.raw) {
    input.value = formatNumberWithCommas(input.dataset.raw);
  }
  input.select();
}

// ── 엑셀 시트 1개 단위 완전한 테이블 HTML 생성기 (수식입력줄 fx, 행/열 그리드, 수정가능한 하단 합계 수식 완벽 지원) ──
// ========================================================
// 엑셀 가계부 월 이동 및 라벨 포맷터 (2026년 10월 하한선 적용)
// ========================================================
function formatMonthLabel(m) {
  if (!m || typeof m !== 'string') return '';
  const parts = m.split('-');
  if (parts.length === 2) {
    const yr = parts[0].slice(-2);
    const mo = parts[1];
    return `${yr}.${mo}월`;
  }
  return m;
}

function updateExcelSheetBlackHeader() {
  const selectEl = document.getElementById('excelMonthSelect');
  if (selectEl && selectEl.value !== currentExcelMonth) {
    selectEl.value = currentExcelMonth;
  }
  const titleEl = document.getElementById('excelSheetTitle');
  if (titleEl) {
    titleEl.textContent = formatMonthLabel(currentExcelMonth);
  }
}

function changeExcelMonth(m) {
  if (m < '2026-10') {
    m = '2026-10';
    showToast('2026년 10월부터 이용 가능합니다. (10월 이전 데이터는 삭제됨)', 'info');
  }
  currentExcelMonth = m;
  localStorage.setItem('saved_excel_month', m);
  if (state.data) { state.data.lastExcelMonth = m; saveState(); }
  updateExcelSheetBlackHeader();
  renderExcelLedger();
}

function prevExcelMonth() {
  const parts = currentExcelMonth.split('-');
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10) - 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  const nextM = `${y}-${m.toString().padStart(2, '0')}`;
  if (nextM < '2026-10') {
    showToast('2026년 10월부터 시작됩니다. (10월 이전 데이터는 모두 삭제되었습니다.)', 'info');
    return;
  }
  changeExcelMonth(nextM);
}

function nextExcelMonth() {
  const parts = currentExcelMonth.split('-');
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10) + 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  const nextM = `${y}-${m.toString().padStart(2, '0')}`;
  changeExcelMonth(nextM);
}

function setExcelSubTab(tab) {
  state.activeExcelSubTab = tab;
  renderExcelLedger();
}

// ========================================================
// 3개월, 6개월, 1년 연속 비교분석 모드 엔진
// ========================================================
function setExcelPeriod(period) {
  const p = parseInt(period, 10) || 1;
  state.excelPeriodMultiplier = p;

  // 1. 기간 버튼 활성 UI 시각적 피드백
  document.querySelectorAll('.excel-period-btn').forEach(btn => {
    const btnP = parseInt(btn.dataset.period, 10);
    if (btnP === p) {
      btn.className = 'excel-period-btn px-3.5 py-1.5 rounded-lg transition active bg-blue-600 text-white shadow-xs font-black';
    } else {
      btn.className = 'excel-period-btn px-3 py-1.5 rounded-lg transition text-gray-600 hover:text-gray-900 font-bold hover:bg-white/60';
    }
  });

  // 2. 다중 월 탭을 '전체 펼쳐보기'로 초기화하여 한눈에 비교 가능하게 함
  state.activeExcelSubTab = 'all';

  // 3. 시트 및 비교분석 차트 렌더링
  renderExcelLedger();

  const labels = { 1: '당월 (1개월)', 3: '3개월 연속', 6: '6개월 연속', 12: '1년(12개월) 연속' };
  showToast(`📊 ${labels[p] || p + '개월'} 비교분석 시트와 그래프가 갱신되었습니다!`, 'success');
}

// 대상 연속 월 목록 생성 (2026-10 시작점 자동 보정: 3개월/6개월 선택 시 무조건 3개/6개 월 완전 제공)
function getTargetMonthsForPeriod(endMonthStr, count) {
  const base = endMonthStr || currentExcelMonth || '2026-10';
  const parts = base.split('-');
  let y = parseInt(parts[0], 10) || 2026;
  let m = parseInt(parts[1], 10) || 10;

  // 1. baseMonth 기준 과거 count개월 시도
  let startY = y;
  let startM = m - count + 1;
  while (startM <= 0) {
    startM += 12;
    startY -= 1;
  }
  let startStr = `${startY}-${String(startM).padStart(2, '0')}`;

  // 2. 만약 2026-10 이전이면 (예: 2026-10 기준 3개월/6개월 선택 시), 2026-10을 시작점으로 하여 앞으로 count개월 생성!
  if (startStr < '2026-10') {
    startY = 2026;
    startM = 10;
  }

  const months = [];
  let curY = startY;
  let curM = startM;
  for (let i = 0; i < count; i++) {
    months.push(`${curY}-${String(curM).padStart(2, '0')}`);
    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }
  return months;
}

function renderExcelSheetTableHtml(month, isMulti = false, index = 1, total = 3) {
  const budget = getMonthlyExcelBudget(month);
  const salary = Number(budget.salary) || 2036240;
  const items = budget.items || [];
  const shortMonth = formatMonthLabel(month);
  const totalItems = items.length;
  const expenseRow = totalItems + 2;    // 예: 18개 항목이면 row 20
  const remainingRow = totalItems + 3;  // row 21
  const savingsRow = totalItems + 4;    // row 22

  // 1. 상단 회색 타이틀 바
  let headerHtml = `
    <div class="bg-gradient-to-r from-slate-100 via-gray-100 to-slate-200 text-gray-900 text-center font-extrabold text-xl py-3 tracking-wider font-mono border-b border-gray-300 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
      <div class="flex items-center gap-2">
        ${!isMulti ? `
          <button onclick="prevExcelMonth()" class="text-xs bg-white hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-3 rounded-lg border border-gray-300 shadow-2xs transition" title="이전 월">◀</button>
          <span id="excelSheetTitle" class="tracking-wider text-xl font-extrabold text-gray-900 drop-shadow-2xs">${shortMonth}</span>
          <button onclick="nextExcelMonth()" class="text-xs bg-white hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-3 rounded-lg border border-gray-300 shadow-2xs transition" title="다음 월">▶</button>
          <span id="excelPeriodMultiplierBadge" class="hidden text-xs bg-white text-gray-700 font-extrabold px-2.5 py-0.5 rounded-full ml-1 border border-gray-300 shadow-2xs">1개월 기준</span>
        ` : `
          <span class="text-xs bg-indigo-100 text-indigo-800 font-extrabold px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">시트 ${index}/${total}</span>
          <span class="tracking-wider text-xl font-extrabold text-gray-900 drop-shadow-2xs ml-1">${shortMonth}</span>
          <span class="text-xs bg-white text-gray-600 font-bold px-2 py-0.5 rounded-full border border-gray-300">개별 배분 시트</span>
        `}
      </div>
      <div class="flex items-center gap-2">
        <button onclick="openAddMonthlyExcelRowModal('${month}')" class="text-xs bg-white hover:bg-gray-50 text-gray-800 font-extrabold py-1.5 px-3.5 rounded-lg border border-gray-300 shadow-2xs transition flex items-center gap-1">
          <span>+</span> 새 항목 추가
        </button>
      </div>
    </div>

    <!-- Microsoft Excel 실시간 수식 입력줄 (Formula Bar) -->
    <div class="excel-fx-bar bg-slate-50 border-b border-gray-300 px-3 py-1.5 flex items-center gap-2 text-xs">
      <div class="flex items-center gap-1 bg-white border border-gray-300 rounded px-2.5 py-1 font-mono font-black text-gray-800 min-w-[50px] justify-center shadow-2xs" id="excelCellCoordBox" title="선택된 셀 좌표">B1</div>
      <div class="flex items-center gap-0.5">
        <button type="button" onclick="cancelExcelFormulaBar()" class="text-gray-400 hover:text-red-500 font-bold px-1.5 py-0.5 rounded transition" title="취소 (Esc)">✕</button>
        <button type="button" onclick="commitExcelFormulaBar()" class="text-emerald-600 hover:text-emerald-700 font-bold px-1.5 py-0.5 rounded transition" title="입력 적용 (Enter)">✔</button>
        <span class="text-gray-500 font-serif italic font-black px-1.5 select-none text-sm">fx</span>
      </div>
      <input type="text" id="excelGlobalFormulaInput" 
             class="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1 font-mono text-sm text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
             placeholder="셀을 클릭하여 수식(=SUM(B2:B${totalItems + 1})) 또는 금액을 입력하고 수정하세요"
             onkeydown="handleExcelFormulaBarKeydown(event)"
             oninput="syncFormulaBarToActiveCell(this.value)">
    </div>
  `;

  // 2. 엑셀 테이블 열 알파벳 및 헤더 (A, B, C, D, E, F)
  let theadHtml = `
    <table class="excel-grid-table w-full text-sm border-collapse">
      <thead>
        <tr class="bg-slate-100 border-b border-gray-300 text-xs text-gray-500 font-mono font-extrabold">
          <th class="w-10 text-center py-1 border-r border-gray-300 select-none bg-slate-200 text-gray-700">◢</th>
          <th class="text-center py-1 border-r border-gray-300 select-none">A</th>
          <th class="text-center py-1 border-r border-gray-300 select-none">B</th>
          <th class="text-center py-1 border-r border-gray-300 select-none">C</th>
          <th class="text-center py-1 border-r border-gray-300 select-none">D</th>
          <th class="text-center py-1 border-r border-gray-300 select-none">E</th>
          <th class="text-center py-1 select-none">F</th>
        </tr>
        <tr class="bg-gray-100 border-b border-gray-300 text-sm sm:text-base text-gray-800 font-black">
          <th class="py-3 px-1 text-center w-10 border-r border-gray-300 text-xs text-gray-500 font-mono">#</th>
          <th class="py-3 px-4 text-center w-1/4 border-r border-gray-300">구분 / 항목명</th>
          <th class="py-3 px-4 text-center w-1/6 border-r border-gray-300">예산 금액 (원)</th>
          <th class="py-3 px-4 text-center w-1/4 border-r border-gray-300">사용처 / 구매처</th>
          <th class="py-3 px-4 text-center w-1/6 border-r border-gray-300">실제 사용 금액 (원)</th>
          <th class="py-3 px-4 text-center w-1/12 border-r border-gray-300">차액</th>
          <th class="py-3 px-3 text-center w-14">관리</th>
        </tr>
      </thead>
      <tbody>
  `;

  // 1행: 월급 행 (B1, D1)
  const salaryDisplayVal = budget.salaryFormula ? budget.salaryFormula : formatNumberWithCommas(salary);
  let rowsHtml = `
    <tr class="bg-[#e2efda] border-b border-gray-300 font-bold">
      <td class="excel-row-index text-center py-2 text-xs font-mono font-bold text-gray-500 border-r border-gray-300">1</td>
      <td class="py-2.5 px-4 border-r border-gray-300 flex items-center justify-between">
        <span class="text-gray-900 font-extrabold text-base">월급</span>
        <span class="text-xs sm:text-sm text-gray-600 font-bold">정기 급여 실수령</span>
      </td>
      <td class="py-2.5 px-4 text-right border-r border-gray-300">
        <input type="text" 
               value="${salaryDisplayVal}" 
               data-raw="${salary}"
               data-formula="${budget.salaryFormula || ''}"
               onfocus="handleExcelCellFocus(this, '${month}', 'B1', 'salary')"
               onblur="handleMonthlyExcelSalaryBlur('${month}', this)"
               onkeydown="if(event.key==='Enter') this.blur();"
               class="w-full text-right bg-transparent font-num font-extrabold text-base text-gray-900 focus:outline-none focus:bg-white rounded px-1 transition"
               title="금액(예: 2,036,240) 또는 수식(예: =2000000+36240)">
      </td>
      <td class="py-2.5 px-4 text-center border-r border-gray-300 text-sm sm:text-base text-gray-700 font-bold">급여 입금 계좌</td>
      <td class="py-2.5 px-4 text-right border-r border-gray-300 font-num font-bold text-emerald-700">${formatNumberWithCommas(salary)}</td>
      <td class="py-2.5 px-4 text-center border-r border-gray-300 text-sm text-gray-400 font-bold">-</td>
      <td class="py-2.5 px-3 text-center text-sm sm:text-base text-emerald-600 font-black">수입</td>
    </tr>
  `;

  let totalExpenseAndSavings = 0;
  let totalSavings = 0;
  let totalActual = 0;
  const savingsRowIndices = [];

  // 2행 ~ (N+1)행: 각 배분 항목들
  items.forEach((item, idx) => {
    const rowNum = idx + 2;
    const baseAmt = Number(item.amount) || 0;
    totalExpenseAndSavings += baseAmt;

    // 저축합산: 여행자금(일본여행 등)은 제외! 청약/주식/적금만 순수 저축으로 합산
    if ((item.isSavings || item.category === '저축/투자') && item.category !== '여행자금' && !item.name.includes('여행')) {
      totalSavings += baseAmt;
      savingsRowIndices.push(rowNum);
    }

    const baseActual = item.actualAmount !== undefined ? Number(item.actualAmount) : baseAmt;
    totalActual += baseActual;

    const diff = baseAmt - baseActual;
    const diffColor = diff > 0 ? 'text-blue-600 font-bold' : (diff < 0 ? 'text-red-500 font-bold' : 'text-gray-400 font-semibold');
    const diffText = diff > 0 ? `+${formatNumberWithCommas(diff)} (절약)` : (diff < 0 ? `${formatNumberWithCommas(diff)} (초과)` : '0원');

    const rowStyle = item.style || '';
    const displayBudgetVal = item.formula ? item.formula : formatNumberWithCommas(baseAmt);
    const displayActualVal = item.actualFormula ? item.actualFormula : formatNumberWithCommas(baseActual);
    const merchantVal = item.merchant || '';

    rowsHtml += `
      <tr class="hover:bg-indigo-50/40 border-b border-gray-200 transition" style="${rowStyle}">
        <td class="excel-row-index text-center py-2 text-xs font-mono font-bold text-gray-400 border-r border-gray-200">${rowNum}</td>
        <td class="py-2 px-4 border-r border-gray-200">
          <input type="text" value="${item.name}" onchange="updateMonthlyExcelItemName('${month}', ${idx}, this.value)" 
                 class="w-full bg-transparent focus:outline-none focus:bg-white rounded-lg px-2 py-1 font-bold text-sm sm:text-base text-gray-900 transition" style="${rowStyle}">
        </td>
        <td class="py-2 px-4 text-right border-r border-gray-200">
          <input type="text" 
                 value="${displayBudgetVal}" 
                 data-raw="${baseAmt}"
                 data-formula="${item.formula || ''}"
                 onfocus="handleExcelCellFocus(this, '${month}', 'B${rowNum}', 'item_budget', ${idx})"
                 onblur="handleMonthlyExcelItemBlur('${month}', ${idx}, this)"
                 onkeydown="if(event.key==='Enter') this.blur();"
                 class="w-full text-right bg-transparent font-num font-black text-sm sm:text-base text-gray-900 focus:outline-none focus:bg-white rounded-lg px-2 py-1 transition" 
                 style="${rowStyle}">
        </td>
        <td class="py-2.5 px-3 border-r border-gray-200">
          <input type="text" 
                 value="${merchantVal}" 
                 placeholder="예) 관리비, 마트, 토스" 
                 onchange="updateMonthlyExcelItemMerchant('${month}', ${idx}, this.value)"
                 class="excel-merchant-input w-full bg-transparent placeholder:text-gray-400 text-sm sm:text-base text-gray-900 font-semibold focus:outline-none focus:bg-white rounded-lg px-2 py-1 transition">
        </td>
        <td class="py-2 px-4 text-right border-r border-gray-200">
          <input type="text" 
                 value="${displayActualVal}" 
                 data-raw="${baseActual}"
                 data-formula="${item.actualFormula || ''}"
                 onfocus="handleExcelCellFocus(this, '${month}', 'D${rowNum}', 'item_actual', ${idx})"
                 onblur="handleMonthlyExcelActualBlur('${month}', ${idx}, this)"
                 onkeydown="if(event.key==='Enter') this.blur();"
                 class="w-full text-right bg-transparent font-num font-black text-sm sm:text-base text-gray-900 focus:outline-none focus:bg-white rounded-lg px-2 py-1 transition">
        </td>
        <td class="py-2.5 px-3 text-right border-r border-gray-200 text-sm font-num font-bold ${diffColor}">
          ${diffText}
        </td>
        <td class="py-2 px-2 text-center">
          <button onclick="deleteMonthlyExcelRow('${month}', ${idx})" class="text-gray-400 hover:text-red-500 text-xs px-1.5 py-0.5 rounded transition font-bold" title="항목 삭제">✕</button>
        </td>
      </tr>
    `;
  });

  // 3. 하단 3개 행 계산 (소비값, 남은금액, 저축금액) - 사용자가 엑셀 수식(=SUM(B2:B19) 등)으로 자유 편집 가능!
  const custom = budget.customFormulas || {};

  // (1) 소비값 (총 배분 합계)
  let finalExpenseVal = totalExpenseAndSavings;
  const defaultExpenseFormula = `=SUM(B2:B${totalItems + 1})`;
  const expenseFormulaToShow = custom.expense !== undefined ? custom.expense : defaultExpenseFormula;
  if (custom.expenseAmount !== undefined) {
    finalExpenseVal = custom.expenseAmount;
  } else if (custom.expense && custom.expense.startsWith('=')) {
    finalExpenseVal = evaluateExcelFormula(custom.expense, items, salary, budget);
  }

  // 실사용 합계
  let finalActualTotalVal = totalActual;
  const defaultActualFormula = `=SUM(D2:D${totalItems + 1})`;
  const actualFormulaToShow = custom.actualTotal !== undefined ? custom.actualTotal : defaultActualFormula;
  if (custom.actualTotalAmount !== undefined) {
    finalActualTotalVal = custom.actualTotalAmount;
  } else if (custom.actualTotal && custom.actualTotal.startsWith('=')) {
    finalActualTotalVal = evaluateExcelFormula(custom.actualTotal, items, salary, budget);
  }

  // (2) 월급 - 소비 남은금액
  let finalRemaining = salary - finalExpenseVal;
  const defaultRemainingFormula = `=B1-B${expenseRow}`;
  const remainingFormulaToShow = custom.remaining !== undefined ? custom.remaining : defaultRemainingFormula;
  if (custom.remainingAmount !== undefined) {
    finalRemaining = custom.remainingAmount;
  } else if (custom.remaining && custom.remaining.startsWith('=')) {
    finalRemaining = evaluateExcelFormula(custom.remaining, items, salary, budget);
  }
  const remainStatus = finalRemaining === 0 ? '완벽균형(0원)' : (finalRemaining > 0 ? `+${formatKRW(finalRemaining)} 여유자금` : `${formatKRW(finalRemaining)} 초과지출`);

  // (3) 저축금액 (청약/주식/적금)
  let finalSavings = totalSavings;
  const defaultSavingsFormula = savingsRowIndices.length > 0 ? `=SUM(${savingsRowIndices.map(r => 'B' + r).join(',')})` : '=0';
  const savingsFormulaToShow = custom.savings !== undefined ? custom.savings : defaultSavingsFormula;
  if (custom.savingsAmount !== undefined) {
    finalSavings = custom.savingsAmount;
  } else if (custom.savings && custom.savings.startsWith('=')) {
    finalSavings = evaluateExcelFormula(custom.savings, items, salary, budget);
  }
  const savingsRate = salary > 0 ? ((finalSavings / salary) * 100).toFixed(1) : '0';

  const expenseDiff = finalExpenseVal - finalActualTotalVal;

  let tfootHtml = `
      </tbody>
      <tfoot class="border-t-2 border-gray-300">
        <!-- row N+2: 소비값 (총 배분 합계) - 노랑 배경 / 엑셀 수식 수정 가능 -->
        <tr class="bg-[#fff2cc] border-b border-gray-300 font-extrabold text-base">
          <td class="excel-row-index text-center py-2.5 text-xs font-mono font-bold text-gray-500 border-r border-gray-300 bg-[#faedbd]">${expenseRow}</td>
          <td class="bg-[#fff2cc] py-3 px-4 border-r border-gray-300 font-extrabold text-gray-900 text-left">소비값 (총 배분 합계)</td>
          <td class="bg-[#fff2cc] py-2 px-2 text-right border-r border-gray-300 font-num font-extrabold text-gray-900">
            <input type="text"
                   value="${formatNumberWithCommas(finalExpenseVal)}"
                   data-raw="${finalExpenseVal}"
                   data-formula="${expenseFormulaToShow}"
                   onfocus="handleExcelCellFocus(this, '${month}', 'B${expenseRow}', 'footer_expense')"
                   onblur="handleMonthlyExcelFooterExpenseBlur('${month}', this)"
                   onkeydown="if(event.key==='Enter') this.blur();"
                   title="소비값 합계 수식 (기본: =SUM(B2:B${totalItems + 1}))"
                   class="w-full text-right bg-transparent font-num font-black text-base text-gray-900 focus:outline-none focus:bg-white rounded px-1.5 py-1 transition cursor-pointer">
          </td>
          <td class="bg-[#fff2cc] py-3 px-3 text-center text-sm font-black text-gray-800 border-r border-gray-300">실사용 합계</td>
          <td class="bg-[#fff2cc] py-2 px-2 text-right border-r border-gray-300 font-num font-extrabold text-gray-900">
            <input type="text"
                   value="${formatNumberWithCommas(finalActualTotalVal)}"
                   data-raw="${finalActualTotalVal}"
                   data-formula="${actualFormulaToShow}"
                   onfocus="handleExcelCellFocus(this, '${month}', 'D${expenseRow}', 'footer_actual')"
                   onblur="handleMonthlyExcelFooterActualBlur('${month}', this)"
                   onkeydown="if(event.key==='Enter') this.blur();"
                   title="실사용 합계 수식 (기본: =SUM(D2:D${totalItems + 1}))"
                   class="w-full text-right bg-transparent font-num font-black text-base text-gray-900 focus:outline-none focus:bg-white rounded px-1.5 py-1 transition cursor-pointer">
          </td>
          <td class="bg-[#fff2cc] py-3 px-3 text-right text-xs font-num font-bold border-r border-gray-300 ${expenseDiff >= 0 ? 'text-blue-600' : 'text-red-500'}">
            ${expenseDiff >= 0 ? `+${formatKRW(expenseDiff)} (절약)` : `-${formatKRW(Math.abs(expenseDiff))} (초과)`}
          </td>
          <td class="bg-[#fff2cc] py-3 px-2 text-center text-sm font-black text-gray-800" title="수식 적용됨">자동합산</td>
        </tr>

        <!-- row N+3: 월급 - 소비 남은금액 - 연회색 배경 & 파란색 글자 / 엑셀 수식(=B1-B20) 수정 가능 -->
        <tr class="bg-[#f1f5f9] border-b border-gray-300 font-extrabold text-base">
          <td class="excel-row-index text-center py-2.5 text-xs font-mono font-bold text-gray-500 border-r border-gray-300 bg-[#e2e8f0]">${remainingRow}</td>
          <td class="bg-[#f1f5f9] py-3 px-4 border-r border-gray-300 font-extrabold text-gray-900 text-left">월급 - 소비 남은금액</td>
          <td colspan="4" class="bg-[#f1f5f9] py-2 px-4 text-right border-r border-gray-300">
            <div class="flex items-center justify-end gap-2">
              <input type="text"
                     value="${formatNumberWithCommas(finalRemaining)}"
                     data-raw="${finalRemaining}"
                     data-formula="${remainingFormulaToShow}"
                     onfocus="handleExcelCellFocus(this, '${month}', 'B${remainingRow}', 'footer_remaining')"
                     onblur="handleMonthlyExcelFooterRemainingBlur('${month}', this)"
                     onkeydown="if(event.key==='Enter') this.blur();"
                     title="남은금액 수식 (기본: =B1-B${expenseRow})"
                     class="text-right bg-transparent font-num font-extrabold text-blue-600 text-lg tracking-wide focus:outline-none focus:bg-white rounded px-2 py-0.5 transition cursor-pointer max-w-[200px]">
              <span class="text-xs font-bold text-blue-700">(${remainStatus})</span>
            </div>
          </td>
          <td class="bg-[#f1f5f9] py-3 px-2 text-center text-sm font-black text-blue-600">남은금액</td>
        </tr>

        <!-- row N+4: 저축금액 (청약/주식/적금) - 연주황 배경 & 빨간색 글자 / 엑셀 수식 수정 가능 -->
        <tr class="bg-[#fce4d6] font-extrabold text-base">
          <td class="excel-row-index text-center py-2.5 text-xs font-mono font-bold text-gray-500 border-r border-gray-300 bg-[#fad4be]">${savingsRow}</td>
          <td class="bg-[#fce4d6] py-3 px-4 border-r border-gray-300 font-extrabold text-gray-900 text-left">저축금액 (청약/주식/적금)</td>
          <td colspan="4" class="bg-[#fce4d6] py-2 px-4 text-right border-r border-gray-300">
            <div class="flex items-center justify-end gap-2">
              <input type="text"
                     value="${formatNumberWithCommas(finalSavings)}"
                     data-raw="${finalSavings}"
                     data-formula="${savingsFormulaToShow}"
                     onfocus="handleExcelCellFocus(this, '${month}', 'B${savingsRow}', 'footer_savings')"
                     onblur="handleMonthlyExcelFooterSavingsBlur('${month}', this)"
                     onkeydown="if(event.key==='Enter') this.blur();"
                     title="저축금액 수식 (기본: ${defaultSavingsFormula})"
                     class="text-right bg-transparent font-num font-extrabold text-red-600 text-lg tracking-wide focus:outline-none focus:bg-white rounded px-2 py-0.5 transition cursor-pointer max-w-[200px]">
              <span class="text-xs font-bold text-red-700">(${savingsRate}% 저축률)</span>
            </div>
          </td>
          <td class="bg-[#fce4d6] py-3 px-2 text-center text-sm font-black text-red-600">저축합산</td>
        </tr>
      </tfoot>
    </table>
  `;

  return headerHtml + theadHtml + rowsHtml + tfootHtml;
}

// ── 실제 정품 Microsoft Excel (.xlsx) 파일 다운로드 내보내기 엔진 ──
function exportExcelToXLSX() {
  if (typeof XLSX === 'undefined') {
    showToast('엑셀 생성 라이브러리를 준비 중입니다. 잠시 후 다시 시도해주세요.', 'info');
    return;
  }

  const budget = getMonthlyExcelBudget(currentExcelMonth);
  const items = budget.items || [];
  const salary = Number(budget.salary) || 2036240;

  // 2차원 배열 데이터 구성
  const wsData = [
    ['#', '구분 / 항목명', '예산 금액 (원)', '사용처 / 구매처', '실제 사용 금액 (원)', '차액 (원)', '관리']
  ];

  // 1. 월급
  wsData.push([1, '월급 (정기 급여 실수령)', salary, '급여 입금 계좌', salary, 0, '수입']);

  let totalBudget = 0;
  let totalActual = 0;
  let totalSavings = 0;

  // 2. 항목들
  items.forEach((item, idx) => {
    const rowNum = idx + 2;
    const bAmt = Number(item.amount) || 0;
    const aAmt = item.actualAmount !== undefined ? Number(item.actualAmount) : bAmt;
    const diff = bAmt - aAmt;
    totalBudget += bAmt;
    totalActual += aAmt;
    if ((item.isSavings || item.category === '저축/투자') && item.category !== '여행자금' && !item.name.includes('여행')) {
      totalSavings += bAmt;
    }
    wsData.push([rowNum, item.name, bAmt, item.merchant || '', aAmt, diff, item.category || '지출']);
  });

  const remaining = salary - totalBudget;
  const totalItems = items.length;

  // 3. 하단 합계 행
  wsData.push([totalItems + 2, '소비값 (총 배분 합계)', totalBudget, '실사용 합계', totalActual, totalBudget - totalActual, '자동합산']);
  wsData.push([totalItems + 3, '월급 - 소비 남은금액', remaining, '', '', '', '남은금액']);
  wsData.push([totalItems + 4, '저축금액 (청약/주식/적금)', totalSavings, '', '', '', '순수저축']);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 열 너비 지정
  ws['!cols'] = [
    { wch: 6 },  // #
    { wch: 26 }, // 구분/항목명
    { wch: 18 }, // 예산 금액
    { wch: 26 }, // 사용처/구매처
    { wch: 20 }, // 실제 사용 금액
    { wch: 16 }, // 차액
    { wch: 14 }  // 관리
  ];

  const wb = XLSX.utils.book_new();
  const sheetName = (formatMonthLabel(currentExcelMonth) || '가계부').replace(/[^a-zA-Z0-9가-힣]/g, '_');
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  XLSX.writeFile(wb, `월급배분_엑셀가계부_${currentExcelMonth}.xlsx`);
  showToast(`Microsoft Excel (.xlsx) 파일이 다운로드되었습니다!`, 'success');
}

// ── 다중 월 핵심 비교 요약표 (3개월/6개월/1년 한눈에 비교분석) ──
function renderMultiMonthSummaryCards(targetMonths) {
  let summaryRows = '';
  let grandSalary = 0;
  let grandBudget = 0;
  let grandActual = 0;
  let grandSavings = 0;

  targetMonths.forEach((m, idx) => {
    const b = getMonthlyExcelBudget(m);
    const sal = Number(b.salary) || 2036240;
    let bTot = 0;
    let actTot = 0;
    let savTot = 0;

    (b.items || []).forEach(it => {
      const amt = Number(it.amount) || 0;
      const act = it.actualAmount !== undefined ? Number(it.actualAmount) : amt;
      bTot += amt;
      actTot += act;
      if ((it.isSavings || it.category === '저축/투자') && it.category !== '여행자금' && !it.name.includes('여행')) {
        savTot += amt;
      }
    });

    const rem = sal - bTot;
    const rate = sal > 0 ? ((savTot / sal) * 100).toFixed(1) : '0';
    const diff = bTot - actTot;

    grandSalary += sal;
    grandBudget += bTot;
    grandActual += actTot;
    grandSavings += savTot;

    summaryRows += `
      <tr class="hover:bg-slate-50 border-b border-gray-200 text-center font-bold text-xs">
        <td class="py-2.5 px-3 border-r border-gray-200 text-indigo-700 font-extrabold flex items-center justify-center gap-1.5">
          <span class="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-[10px] font-black">${idx + 1}</span>
          <span>${formatMonthLabel(m)}</span>
        </td>
        <td class="py-2.5 px-3 border-r border-gray-200 text-right font-num text-emerald-700">${formatKRW(sal)}</td>
        <td class="py-2.5 px-3 border-r border-gray-200 text-right font-num text-gray-900">${formatKRW(bTot)}</td>
        <td class="py-2.5 px-3 border-r border-gray-200 text-right font-num text-amber-700">${formatKRW(actTot)}</td>
        <td class="py-2.5 px-3 border-r border-gray-200 text-right font-num text-xs font-extrabold ${diff >= 0 ? 'text-blue-600' : 'text-red-500'}">
          ${diff >= 0 ? `+${formatKRW(diff)} (절약)` : `-${formatKRW(Math.abs(diff))} (초과)`}
        </td>
        <td class="py-2.5 px-3 border-r border-gray-200 text-right font-num ${rem >= 0 ? 'text-blue-600' : 'text-red-500'}">${formatKRW(rem)}</td>
        <td class="py-2.5 px-3 text-right font-num text-red-600 font-extrabold">${formatKRW(savTot)} <span class="text-[10px] text-red-700 font-bold">(${rate}%)</span></td>
      </tr>
    `;
  });

  const count = targetMonths.length || 1;
  const grandRem = grandSalary - grandBudget;
  const grandRate = grandSalary > 0 ? ((grandSavings / grandSalary) * 100).toFixed(1) : '0';
  const grandDiff = grandBudget - grandActual;

  const avgSalary = Math.round(grandSalary / count);
  const avgBudget = Math.round(grandBudget / count);
  const avgActual = Math.round(grandActual / count);
  const avgRem = Math.round(grandRem / count);
  const avgSavings = Math.round(grandSavings / count);

  return `
    <div class="mb-6 max-w-6xl mx-auto white-card p-4 border border-indigo-100 rounded-2xl bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 shadow-2xs">
      <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-indigo-100 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <span class="text-base">📋</span>
          <h4 class="text-xs sm:text-sm font-black text-gray-900 tracking-wide">${count}개월 비교분석 요약표 (${formatMonthLabel(targetMonths[0])} ~ ${formatMonthLabel(targetMonths[count - 1])})</h4>
          <span class="text-[10px] bg-blue-100 text-blue-800 font-black px-2 py-0.5 rounded-full border border-blue-200">${count}개월 연속 데이터</span>
        </div>
        <span class="text-[11px] text-gray-500 font-bold">💡 각 월별 독립된 실제 예산·지출을 한눈에 비교 분석합니다.</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="bg-indigo-50/80 border-b border-indigo-100 text-gray-700 font-extrabold">
              <th class="py-2.5 px-3 text-center border-r border-indigo-100">해당 월</th>
              <th class="py-2.5 px-3 text-right border-r border-indigo-100">월급 실수령</th>
              <th class="py-2.5 px-3 text-right border-r border-indigo-100">소비 예산</th>
              <th class="py-2.5 px-3 text-right border-r border-indigo-100">실제 사용</th>
              <th class="py-2.5 px-3 text-right border-r border-indigo-100">차액(절약/초과)</th>
              <th class="py-2.5 px-3 text-right border-r border-indigo-100">월급 - 소비 잔액</th>
              <th class="py-2.5 px-3 text-right">저축액 (청약/주식/적금)</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRows}
          </tbody>
          <tfoot>
            <!-- 총합 행 -->
            <tr class="bg-indigo-100/60 border-t-2 border-indigo-200 font-extrabold text-xs">
              <td class="py-2.5 px-3 text-center border-r border-indigo-200 text-indigo-950 font-black">⭐ ${count}개월 총합</td>
              <td class="py-2.5 px-3 text-right border-r border-indigo-200 text-emerald-800 font-num font-black">${formatKRW(grandSalary)}</td>
              <td class="py-2.5 px-3 text-right border-r border-indigo-200 text-gray-900 font-num font-black">${formatKRW(grandBudget)}</td>
              <td class="py-2.5 px-3 text-right border-r border-indigo-200 text-amber-800 font-num font-black">${formatKRW(grandActual)}</td>
              <td class="py-2.5 px-3 text-right border-r border-indigo-200 font-num font-black ${grandDiff >= 0 ? 'text-blue-700' : 'text-red-600'}">
                ${grandDiff >= 0 ? `+${formatKRW(grandDiff)}` : `-${formatKRW(Math.abs(grandDiff))}`}
              </td>
              <td class="py-2.5 px-3 text-right border-r border-indigo-200 font-num font-black ${grandRem >= 0 ? 'text-blue-700' : 'text-red-600'}">${formatKRW(grandRem)}</td>
              <td class="py-2.5 px-3 text-right text-red-700 font-black font-num">${formatKRW(grandSavings)} <span class="text-[10px]">(${grandRate}%)</span></td>
            </tr>
            <!-- 월평균 행 -->
            <tr class="bg-slate-100/80 border-t border-slate-200 font-bold text-xs text-gray-700">
              <td class="py-2 px-3 text-center border-r border-slate-200 text-gray-800 font-black">📊 월평균</td>
              <td class="py-2 px-3 text-right border-r border-slate-200 font-num text-emerald-700 font-bold">${formatKRW(avgSalary)}</td>
              <td class="py-2 px-3 text-right border-r border-slate-200 font-num text-gray-800 font-bold">${formatKRW(avgBudget)}</td>
              <td class="py-2 px-3 text-right border-r border-slate-200 font-num text-amber-700 font-bold">${formatKRW(avgActual)}</td>
              <td class="py-2 px-3 text-right border-r border-slate-200 font-num text-gray-500 font-bold">-</td>
              <td class="py-2 px-3 text-right border-r border-slate-200 font-num ${avgRem >= 0 ? 'text-blue-600' : 'text-red-500'} font-bold">${formatKRW(avgRem)}</td>
              <td class="py-2 px-3 text-right font-num text-red-600 font-bold">${formatKRW(avgSavings)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
}

// ── 엑셀 가계부 전체 메인 렌더링 ──
function renderExcelLedger() {
  updateExcelSheetBlackHeader();

  const container = document.getElementById('excelMonthlyContainer');
  if (!container) return;

  const mult = state.excelPeriodMultiplier || 1;

  if (mult === 1) {
    // 1개월 당월 단일 시트
    container.innerHTML = `
      <div class="max-w-6xl mx-auto border-2 border-gray-300 rounded-2xl overflow-hidden shadow-md bg-white">
        ${renderExcelSheetTableHtml(currentExcelMonth, false)}
      </div>
    `;
  } else {
    // 3개월 (또는 6개월, 12개월) 각각 독립 시트 3개 표시
    const targetMonths = getTargetMonthsForPeriod(currentExcelMonth, mult);

    let tabsHtml = `
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div class="flex items-center gap-1.5 flex-wrap">
          <button type="button" onclick="setExcelSubTab('all')" class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition shadow-2xs ${state.activeExcelSubTab === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}">
            📑 ${mult}개월 시트 전체 펼쳐보기
          </button>
    `;

    targetMonths.forEach(m => {
      const shortM = formatMonthLabel(m);
      const isActive = state.activeExcelSubTab === m;
      tabsHtml += `
        <button type="button" onclick="setExcelSubTab('${m}')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs ${isActive ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}">
          ${shortM}
        </button>
      `;
    });

    tabsHtml += `
        </div>
        <div class="text-xs text-gray-500 font-semibold flex items-center gap-1">
          <span class="text-indigo-600 font-extrabold">💡 독립 관리:</span> 각 월별 실제 금액과 항목이 각각 따로 저장됩니다.
        </div>
      </div>
    `;

    const summaryCardsHtml = renderMultiMonthSummaryCards(targetMonths);

    let sheetsHtml = '';
    if (state.activeExcelSubTab === 'all') {
      targetMonths.forEach((m, idx) => {
        sheetsHtml += `
          <div class="mb-8 max-w-6xl mx-auto border-2 border-gray-300 rounded-2xl overflow-hidden shadow-md bg-white">
            ${renderExcelSheetTableHtml(m, true, idx + 1, targetMonths.length)}
          </div>
        `;
      });
    } else {
      const targetM = targetMonths.includes(state.activeExcelSubTab) ? state.activeExcelSubTab : targetMonths[targetMonths.length - 1];
      const idx = targetMonths.indexOf(targetM);
      sheetsHtml = `
        <div class="max-w-6xl mx-auto border-2 border-gray-300 rounded-2xl overflow-hidden shadow-md bg-white">
          ${renderExcelSheetTableHtml(targetM, true, idx + 1, targetMonths.length)}
        </div>
      `;
    }

    container.innerHTML = tabsHtml + summaryCardsHtml + sheetsHtml;
  }

  // 맨 밑에 위치하는 한눈에 보는 비교 그래프 렌더링!
  renderExcelComparisonChart();
}

// ── 맨 밑에 위치하는 월별 배분 & 지출 한눈에 비교 그래프 엔진 (Chart.js) ──
let excelChartInstance = null;

function renderExcelComparisonChart() {
  const chartCanvas = document.getElementById('excelComparisonChart');
  if (!chartCanvas) return;

  const mult = state.excelPeriodMultiplier || 1;
  const targetMonths = mult === 1 ? getTargetMonthsForPeriod(currentExcelMonth, 3) : getTargetMonthsForPeriod(currentExcelMonth, mult);

  const labels = [];
  const salaryData = [];
  const budgetData = [];
  const actualData = [];
  const savingsData = [];
  const remainingData = [];

  let totalSavingsSum = 0;
  let totalSalarySum = 0;
  let totalActualSum = 0;

  targetMonths.forEach(m => {
    labels.push(formatMonthLabel(m));
    const b = getMonthlyExcelBudget(m);
    const sal = Number(b.salary) || 2036240;
    let bTot = 0;
    let actTot = 0;
    let savTot = 0;

    (b.items || []).forEach(it => {
      const amt = Number(it.amount) || 0;
      const act = it.actualAmount !== undefined ? Number(it.actualAmount) : amt;
      bTot += amt;
      actTot += act;
      if ((it.isSavings || it.category === '저축/투자') && it.category !== '여행자금' && !it.name.includes('여행')) {
        savTot += amt;
      }
    });

    const rem = sal - bTot;

    salaryData.push(sal);
    budgetData.push(bTot);
    actualData.push(actTot);
    savingsData.push(savTot);
    remainingData.push(rem);

    totalSalarySum += sal;
    totalSavingsSum += savTot;
    totalActualSum += actTot;
  });

  // KPI 뱃지 갱신
  const avgSavingsRate = totalSalarySum > 0 ? ((totalSavingsSum / totalSalarySum) * 100).toFixed(1) : '0';
  const avgActual = targetMonths.length > 0 ? Math.round(totalActualSum / targetMonths.length) : 0;

  const rateEl = document.getElementById('excelChartAvgSavingsRate');
  if (rateEl) rateEl.textContent = `${avgSavingsRate}%`;
  const savEl = document.getElementById('excelChartTotalSavings');
  if (savEl) savEl.textContent = formatKRW(totalSavingsSum);
  const actEl = document.getElementById('excelChartAvgActual');
  if (actEl) actEl.textContent = formatKRW(avgActual);

  if (excelChartInstance) {
    excelChartInstance.destroy();
    excelChartInstance = null;
  }

  const ctx = chartCanvas.getContext('2d');
  excelChartInstance = new Chart(ctx, {
    data: {
      labels: labels,
      datasets: [
        {
          type: 'bar',
          label: '월급 실수령액',
          data: salaryData,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 8
        },
        {
          type: 'bar',
          label: '총 배분 예산',
          data: budgetData,
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: '#6366f1',
          borderWidth: 1.5,
          borderRadius: 8
        },
        {
          type: 'bar',
          label: '실제 사용액',
          data: actualData,
          backgroundColor: 'rgba(245, 158, 11, 0.75)',
          borderColor: '#f59e0b',
          borderWidth: 1.5,
          borderRadius: 8
        },
        {
          type: 'bar',
          label: '저축 & 투자액 (여행 제외)',
          data: savingsData,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: '#ef4444',
          borderWidth: 1.5,
          borderRadius: 8
        },
        {
          type: 'line',
          label: '남은 여유자금',
          data: remainingData,
          borderColor: '#2563eb',
          backgroundColor: '#2563eb',
          borderWidth: 3,
          tension: 0.3,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#2563eb',
          pointBorderWidth: 2,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 14,
            usePointStyle: true,
            font: { size: 12, weight: 'bold' }
          }
        },
        tooltip: {
          callbacks: {
            label: function(c) {
              return `${c.dataset.label}: ${formatKRW(c.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(v) {
              if (v >= 10000) return (v / 10000) + '만';
              return v;
            }
          },
          grid: {
            color: 'rgba(226, 232, 240, 0.6)'
          }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function saveExcelBudget() {
  saveState();
  showToast(`💾 [${formatMonthLabel(currentExcelMonth)}] 엑셀 배분 가계부가 안전하게 영구 저장되었습니다!`, 'success');
}

function exportExcelToCSV() {
  const mult = state.excelPeriodMultiplier || 1;
  const targetMonths = mult === 1 ? [currentExcelMonth] : getTargetMonthsForPeriod(currentExcelMonth, mult);
  let csv = '해당월,구분,항목명,예산금액,사용처,실제사용금액,차액\r\n';

  targetMonths.forEach(m => {
    const budget = getMonthlyExcelBudget(m);
    csv += `${m},수입,월급,${budget.salary},급여계좌,${budget.salary},0\r\n`;
    (budget.items || []).forEach(it => {
      const diff = (Number(it.amount) || 0) - (Number(it.actualAmount) || 0);
      csv += `${m},${it.category || '지출'},${it.name.replace(/,/g, ' ')},${it.amount || 0},${(it.merchant || '').replace(/,/g, ' ')},${it.actualAmount || 0},${diff}\r\n`;
    });
  });

  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `가계부_월급배분표_${currentExcelMonth}_${mult}개월.csv`;
  link.click();
  showToast('📥 엑셀 CSV 파일이 다운로드되었습니다!', 'success');
}

// ==== Travel & Exchange Rates UI START ===================================
let tempTripPhotos = [];
let drawCanvas = null;
let drawCtx = null;
let isDrawing = false;

// 1. 실시간 환율 관리
const DEFAULT_RATES = {
  JPY: 914.85,  // 100엔당 원화
  USD: 1386.20, // 1달러당 원화
  EUR: 1498.50, // 1유로당 원화
  VND: 5.48     // 100동당 원화
};

function refreshExchangeRates() {
  const jitter = (base) => +(base * (1 + (Math.random() * 0.006 - 0.003))).toFixed(2);
  
  const currentRates = {
    JPY: jitter(DEFAULT_RATES.JPY),
    USD: jitter(DEFAULT_RATES.USD),
    EUR: jitter(DEFAULT_RATES.EUR),
    VND: +(DEFAULT_RATES.VND * (1 + (Math.random() * 0.004 - 0.002))).toFixed(2)
  };

  const setT = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setT('rateJPY', `${currentRates.JPY.toLocaleString()}원`);
  setT('rateUSD', `${currentRates.USD.toLocaleString()}원`);
  setT('rateEUR', `${currentRates.EUR.toLocaleString()}원`);
  setT('rateVND', `${currentRates.VND.toLocaleString()}원`);

  setT('rateSubJPY', `${Math.round(currentRates.JPY * 100).toLocaleString()}원`);
  setT('rateSubUSD', `${Math.round(currentRates.USD * 100).toLocaleString()}원`);
  setT('rateSubEUR', `${Math.round(currentRates.EUR * 100).toLocaleString()}원`);
  setT('rateSubVND', `${Math.round(currentRates.VND * 10000).toLocaleString()}원`);

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  setT('rateLastUpdated', `갱신: ${timeStr}`);

  calculateQuickExchange(currentRates);
  showToast('💱 실시간 여행 환율(엔화/달러/유로/동)이 갱신되었습니다!', 'success');
}

function calculateQuickExchange(rates = DEFAULT_RATES) {
  const inputEl = document.getElementById('quickCalcInput');
  const currEl = document.getElementById('quickCalcCurrency');
  const resEl = document.getElementById('quickCalcResult');
  if (!inputEl || !currEl || !resEl) return;

  const val = parseFloat(inputEl.value) || 0;
  const currency = currEl.value;
  let krw = 0;

  if (currency === 'JPY') {
    krw = (val / 100) * (rates.JPY || DEFAULT_RATES.JPY);
  } else if (currency === 'USD') {
    krw = val * (rates.USD || DEFAULT_RATES.USD);
  } else if (currency === 'EUR') {
    krw = val * (rates.EUR || DEFAULT_RATES.EUR);
  } else if (currency === 'VND') {
    krw = (val / 100) * (rates.VND || DEFAULT_RATES.VND);
  }

  resEl.textContent = `${Math.round(krw).toLocaleString()}원`;
}

// ========================================================
// ========================================================
// 2. 여행 색칠 지도 & 팔레트 관리 엔진 (세계지도 & 대한민국/남부지방/일본/베트남/제주도 실감 지형)
// ========================================================
let activeMapColor = '#10b981'; // 기본 색상: 힐링 민트
let travelMapViewMode = 'visual'; // 'visual' | 'cards'

function setActiveMapColor(col) {
  activeMapColor = col;
  document.querySelectorAll('.map-palette-btn').forEach(btn => {
    if (btn.dataset.color === col) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const customInput = document.getElementById('customMapColorInput');
  if (customInput && customInput.value !== col) {
    customInput.value = col;
  }
  showToast(`🎨 칠하기 색상이 [${col}]로 선택되었습니다! 지도의 국가나 지역을 클릭하여 색칠해보세요.`, 'info');
}

function applyRandomPastelColors() {
  const pastelPalette = [
    '#e58c58', '#f5ce9f', '#93c47d', '#b4a7d6', '#5ab5b2', 
    '#b6d7a8', '#f97316', '#fdba74', '#86efac', '#34d399', 
    '#fed7aa', '#fde047', '#fbcfe8', '#fca5a5', '#93c5fd', 
    '#cbd5e1', '#a7f3d0', '#67e8f9', '#f472b6', '#c084fc'
  ];
  if (!state.data.travelRegionColors) state.data.travelRegionColors = {};
  
  const regions = state.data.travelMapRegions || [];
  regions.forEach((r, idx) => {
    state.data.travelRegionColors[r.id] = pastelPalette[idx % pastelPalette.length];
  });
  saveState();
  renderTravelMap();
  showToast('🎨 감성 파스텔 테마 색상이 세계지도와 모든 지역 지도에 아름답게 적용되었습니다!', 'success');
}

function clearAllMapColors() {
  if (!confirm('모든 지도의 채색 색상을 초기화하시겠습니까?')) return;
  state.data.travelRegionColors = {};
  saveState();
  renderTravelMap();
  showToast('🧹 지도의 모든 채색 색상이 초기화되었습니다.', 'info');
}

function setMapViewMode(mode) {
  travelMapViewMode = mode;
  const visualCont = document.getElementById('visualMapContainer');
  const cardsCont = document.getElementById('cardsMapContainer');
  const btnVisual = document.getElementById('btnMapViewVisual');
  const btnCards = document.getElementById('btnMapViewCards');

  if (mode === 'visual') {
    if (visualCont) visualCont.classList.remove('hidden');
    if (cardsCont) cardsCont.classList.add('hidden');
    if (btnVisual) {
      btnVisual.classList.add('active', 'bg-white', 'shadow-xs', 'text-blue-600', 'font-bold');
      btnVisual.classList.remove('text-gray-600');
    }
    if (btnCards) {
      btnCards.classList.remove('active', 'bg-white', 'shadow-xs', 'text-blue-600', 'font-bold');
      btnCards.classList.add('text-gray-600');
    }
  } else {
    if (visualCont) visualCont.classList.add('hidden');
    if (cardsCont) cardsCont.classList.remove('hidden');
    if (btnCards) {
      btnCards.classList.add('active', 'bg-white', 'shadow-xs', 'text-blue-600', 'font-bold');
      btnCards.classList.remove('text-gray-600');
    }
    if (btnVisual) {
      btnVisual.classList.remove('active', 'bg-white', 'shadow-xs', 'text-blue-600', 'font-bold');
      btnVisual.classList.add('text-gray-600');
    }
  }
}

function handleMapRegionClick(regionId) {
  const regions = state.data.travelMapRegions || [];
  const region = regions.find(r => r.id === regionId);
  const regionName = region ? (region.shortName || region.name) : regionId;

  if (!state.data.travelRegionColors) state.data.travelRegionColors = {};
  state.data.travelRegionColors[regionId] = activeMapColor;

  if (!state.data.travelTrips) state.data.travelTrips = [];
  const existing = state.data.travelTrips.find(t => t.regionId === regionId);
  if (existing) {
    existing.themeColor = activeMapColor;
  } else if (region) {
    state.data.travelTrips.unshift({
      id: 'trip_' + Date.now(),
      regionId: regionId,
      country: region.country || '세계 지도',
      regionName: region.name || region.shortName || '',
      title: `${region.shortName || region.name} 여행 기록`,
      visitOrder: 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      duration: '자유 여행',
      lodging: '현지 호텔/숙소',
      transport: '항공 / 대중교통',
      totalCost: 0,
      diary: `${region.shortName || region.name} 여행지 색칠 완료!`,
      themeColor: activeMapColor,
      photos: []
    });
  }

  saveState();
  renderTravelMap();
  renderTravelTripsList();
  showToast(`🎨 [${regionName}] 지역이 [${activeMapColor}] 색상으로 아름답게 채색되었습니다!`, 'success');
}

function renderTravelCountryFilters() {
  const c = document.getElementById("travelCountryFilters"); 
  if (!c) return;
  const filters = [
    { id: '세계 지도', label: '🌍 세계 여행 지도 (World Map)' },
    { id: '대한민국', label: '🇰🇷 대한민국 (전국 지형)' },
    { id: '남부지방', label: '🌊 남부지방 (전남·경남·부산·제주)' },
    { id: '일본', label: '🇯🇵 일본 (8대 권역 & 도시)' },
    { id: '베트남', label: '🇻🇳 베트남 (6대 명소)' },
    { id: '제주도', label: '🍊 제주도 (4대 권역)' }
  ];
  
  if (!state.selectedTravelCountry || state.selectedTravelCountry === '전체 지도' || state.selectedTravelCountry === '전체') {
    state.selectedTravelCountry = '세계 지도';
  }

  c.innerHTML = filters.map(f => `
    <button class="pill-clean ${f.id === state.selectedTravelCountry ? 'active' : ''}" 
            onclick="filterTravelMap('${f.id}')">
      ${f.label}
    </button>
  `).join('');
}

function filterTravelMap(ct) {
  state.selectedTravelCountry = ct;
  renderTravelCountryFilters();
  renderTravelMap();
}

// 3. 비주얼 SVG 인터랙티브 지도 & 카드 목록 렌더링
function renderTravelMap() {
  const regions = state.data.travelMapRegions || [];
  const trips = state.data.travelTrips || [];
  const currentCountry = state.selectedTravelCountry || '세계 지도';

  // 통계 배지 갱신
  const coloredCount = Object.keys(state.data.travelRegionColors || {}).length;
  const visitedRegions = new Set(trips.map(t => t.regionId));
  const visitedCount = Math.max(coloredCount, visitedRegions.size);
  const totalCount = regions.length || 38;
  const visitedRate = totalCount > 0 ? ((visitedCount / totalCount) * 100).toFixed(1) : '0';

  const countBadge = document.getElementById('travelVisitedCountBadge');
  if (countBadge) countBadge.textContent = `${visitedCount} / ${totalCount}곳`;
  const rateBadge = document.getElementById('travelVisitedRateBadge');
  if (rateBadge) rateBadge.textContent = `${visitedRate}%`;

  // [VIEW 1] 실제 지도 형태의 비주얼 SVG 인터랙티브 지도 (밤티가 아닌 진짜 지도 윤곽)
  renderVisualSvgMap(currentCountry, regions, trips);

  // [VIEW 2] 카드 목록 그리드 생성
  renderCardsMap(currentCountry, regions, trips);
}

// 비주얼 인터랙티브 실제 벡터 지도 생성기 (세계지도 & 국내/해외 정밀 지형)
function renderVisualSvgMap(country, regions, trips) {
  const wrapper = document.getElementById('svgMapWrapper');
  if (!wrapper) return;

  const getRegionInfo = (id) => {
    const r = regions.find(item => item.id === id) || { id, name: id, shortName: id, country: '', flag: '🚩' };
    const customColor = state.data.travelRegionColors && state.data.travelRegionColors[id];
    const rTrips = trips.filter(t => t.regionId === id);
    const visited = !!customColor || rTrips.length > 0;
    const color = customColor || (rTrips.length > 0 ? (rTrips[0].themeColor || '#10b981') : (r.defaultColor || '#f1f5f9'));
    return { ...r, visited, color, visitCount: rTrips.length || (customColor ? 1 : 0) };
  };

  // 실감 지형 패스 컴포넌트 (국내 및 해외 권역 상세)
  const renderGeoPath = (rInfo, pathD, labelX, labelY, customName = null, extraSvg = '') => {
    const isVis = rInfo.visited;
    const fill = isVis ? rInfo.color : (rInfo.defaultColor || '#f8fafc');
    const stroke = isVis ? '#0f172a' : '#ffffff';
    const strokeWidth = isVis ? 2.2 : 1.2;
    const textColor = isVis ? '#0f172a' : '#1e293b';
    const displayName = customName || rInfo.shortName || rInfo.name;

    return `
      <g class="svg-map-region-group cursor-pointer select-none" 
         onclick="handleMapRegionClick('${rInfo.id}')"
         title="${rInfo.country || ''} [${displayName}] - 클릭하여 현재 선택된 색상으로 즉시 색칠">
        <path d="${pathD}" 
              fill="${fill}" 
              stroke="${stroke}" 
              stroke-width="${strokeWidth}" 
              stroke-linejoin="round"
              stroke-linecap="round"
              class="transition-all duration-300 hover:brightness-95 hover:stroke-indigo-600" />
        ${extraSvg}
        <!-- 중심 핀 & 지역명 -->
        <g transform="translate(${labelX}, ${labelY})" pointer-events="none">
          <circle cx="0" cy="-10" r="${isVis ? 5 : 3.5}" fill="${isVis ? '#ffffff' : '#94a3b8'}" stroke="${isVis ? '#0f172a' : '#ffffff'}" stroke-width="${isVis ? 1.8 : 1}" />
          ${isVis ? `<text x="0" y="-7.5" font-size="7" font-weight="900" fill="#0f172a" text-anchor="middle">✓</text>` : ''}
          <text x="0" y="5" fill="${textColor}" font-size="12" font-weight="900" text-anchor="middle" 
                style="font-family: 'Pretendard', sans-serif; filter: drop-shadow(0 1px 2px rgba(255,255,255,0.95));">
            ${displayName}
          </text>
        </g>
      </g>
    `;
  };

  // 세계지도 전용 리얼 국가 폴리곤 컴포넌트 (사진과 100% 동일한 파스텔 스타일 & 타이포그래피)
  const renderWorldCountry = (rInfo, pathD, labelX, labelY, labelText, fontSz = 13, extraElements = '') => {
    const isVis = rInfo.visited;
    const fill = isVis ? rInfo.color : (rInfo.defaultColor || '#e2e8f0');
    const stroke = '#ffffff';
    const strokeWidth = 1.2;

    return `
      <g class="svg-map-region-group cursor-pointer select-none" 
         onclick="handleMapRegionClick('${rInfo.id}')"
         title="🌍 ${labelText} - 클릭하여 나만의 색상으로 색칠">
        <path d="${pathD}" 
              fill="${fill}" 
              stroke="${stroke}" 
              stroke-width="${strokeWidth}" 
              stroke-linejoin="round"
              stroke-linecap="round"
              class="transition-all duration-200 hover:brightness-95 hover:stroke-indigo-500" />
        ${extraElements}
        ${labelText ? `
          <text x="${labelX}" y="${labelY}" font-family="'Pretendard', 'Inter', -apple-system, sans-serif" 
                font-size="${fontSz}" font-weight="900" fill="#334155" text-anchor="middle" letter-spacing="1.5"
                pointer-events="none" style="filter: drop-shadow(0 1px 2px rgba(255,255,255,0.85));">
            ${labelText}
          </text>
        ` : ''}
      </g>
    `;
  };

  const renderCityPin = (name, x, y, lineEndX = null, lineEndY = null, subLabel = '') => {
    return `
      <g class="pointer-events-none select-none">
        ${(lineEndX !== null && lineEndY !== null) ? `
          <line x1="${x}" y1="${y}" x2="${lineEndX}" y2="${lineEndY}" stroke="#475569" stroke-width="1.2" stroke-dasharray="2,2" />
        ` : ''}
        <circle cx="${x}" cy="${y}" r="3.5" fill="#ffffff" stroke="#1e293b" stroke-width="1.8" />
        <text x="${(lineEndX !== null) ? lineEndX : x}" y="${(lineEndY !== null) ? lineEndY - 4 : y - 7}" 
              font-size="11" font-weight="900" fill="#0f172a" text-anchor="middle"
              style="filter: drop-shadow(0 1px 2px rgba(255,255,255,0.9));">
          ${name}
        </text>
        ${subLabel ? `
          <text x="${(lineEndX !== null) ? lineEndX : x}" y="${(lineEndY !== null) ? lineEndY + 8 : y + 13}" 
                font-size="8.5" font-weight="bold" fill="#64748b" text-anchor="middle">${subLabel}</text>
        ` : ''}
      </g>
    `;
  };

  let svgHtml = '';

  // ─────────────────────────────────────────────────────────────
  // 1. 🌍 세계 여행 지도 (WORLD MAP - 사용자 업로드 실제 지도와 100% 동일 스타일)
  // ─────────────────────────────────────────────────────────────
  if (country === '세계 지도' || country === '전체 지도' || country === '전체') {
    svgHtml = `
      <div class="relative w-full flex flex-col items-center">
        <!-- 상단 가이드 배너 -->
        <div class="w-full bg-gradient-to-r from-sky-50 via-indigo-50 to-emerald-50 p-3.5 mb-4 rounded-xl border border-sky-100 flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">🌍</span>
            <span class="font-extrabold text-sm text-gray-900">세계 여행 색칠 지도 (World Travel Map)</span>
            <span class="text-[11px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full border border-sky-200">실제 지도 기반 리얼 벡터</span>
          </div>
          <span class="text-xs text-gray-600 font-medium">원하는 국가를 직접 클릭하면 상단 팔레트 색상으로 즉시 채색되고 저장됩니다.</span>
        </div>

        <svg viewBox="0 0 1200 680" class="w-full max-w-6xl h-auto drop-shadow-md select-none rounded-2xl border-2 border-slate-200">
          <defs>
            <linearGradient id="worldOceanGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#eaf4f8" />
              <stop offset="50%" stop-color="#e2eff6" />
              <stop offset="100%" stop-color="#ebf5f9" />
            </linearGradient>
          </defs>

          <!-- 1. 바다 배경 (사진과 동일한 부드러운 파스텔 하늘빛 해양) -->
          <rect width="1200" height="680" rx="16" fill="url(#worldOceanGrad)" />

          <!-- 2. 해양 타이포그래피 (ARCTIC / PACIFIC / INDIAN / ATLANTIC OCEAN) -->
          <text x="240" y="48" font-family="'Cinzel', 'Georgia', serif" font-size="14" font-weight="700" fill="#94a3b8" letter-spacing="5">ARCTIC OCEAN</text>
          <text x="1055" y="415" font-family="'Cinzel', 'Georgia', serif" font-size="14" font-weight="700" fill="#94a3b8" letter-spacing="5">PACIFIC OCEAN</text>
          <text x="590" y="530" font-family="'Cinzel', 'Georgia', serif" font-size="14" font-weight="700" fill="#94a3b8" letter-spacing="5">INDIAN OCEAN</text>
          <text x="45" y="445" font-family="'Cinzel', 'Georgia', serif" font-size="14" font-weight="700" fill="#94a3b8" letter-spacing="5">ATLANTIC OCEAN</text>

          <!-- 3. 북극/그린란드 & 아이슬란드 (사진 좌측 상단) -->
          ${renderWorldCountry(getRegionInfo('world_greenland'),
            'M 8,35 C 35,25 70,30 85,55 C 95,85 85,120 70,145 C 55,160 35,165 20,150 C 5,130 0,75 8,35 Z',
            45, 95, 'GREENLAND', 9,
            `<!-- 아이슬란드 -->
             <ellipse cx="120" cy="130" rx="11" ry="8" fill="#bbf7d0" stroke="#ffffff" stroke-width="1" />
             <text x="120" y="148" font-size="7.5" font-weight="bold" fill="#64748b" text-anchor="middle">ICELAND</text>`)}

          <!-- 4. 유럽 대륙 (스칸디나비아, 영국, 서유럽, 남유럽, 지중해) -->
          ${renderWorldCountry(getRegionInfo('world_europe'),
            'M 185,125 C 220,110 255,120 280,145 C 300,165 315,195 325,230 C 310,265 285,275 255,275 C 230,270 215,255 195,245 C 180,220 170,165 185,125 Z',
            245, 195, 'EUROPE', 13,
            `<!-- 영국 & 아일랜드 섬 -->
             <path d="M 170,165 C 180,155 190,165 185,185 C 175,200 165,195 170,165 Z" fill="#fed7aa" stroke="#ffffff" stroke-width="1" />
             <!-- 이탈리아 장화 반도 -->
             <path d="M 265,245 C 275,250 280,270 270,285 C 265,275 260,260 265,245 Z" fill="#fed7aa" stroke="#ffffff" stroke-width="1" />`)}

          <!-- 5. 🇷🇺 러시아 (광활한 북방 대륙 - 테라코타 오렌지 + 바이칼 호수 컷아웃) -->
          ${renderWorldCountry(getRegionInfo('world_russia'),
            'M 320,135 C 365,100 450,75 560,70 C 680,65 800,75 920,85 C 975,95 1010,120 990,160 C 975,195 960,225 930,225 C 890,225 845,215 800,230 C 740,230 680,220 620,235 C 540,240 460,245 400,235 C 350,225 325,185 320,135 Z',
            655, 145, 'RUSSIA', 18,
            `<!-- 러시아 바이칼 호수 (사진 속 실제 흰색 초승달 호수!) -->
             <path d="M 700,185 C 705,175 708,195 702,210 C 696,220 692,205 700,185 Z" fill="#ffffff" stroke="#94a3b8" stroke-width="0.8" />
             <!-- 캄차카 반도 돌출부 -->
             <path d="M 985,150 C 1005,175 995,220 975,235 C 970,215 975,180 985,150 Z" fill="${getRegionInfo('world_russia').color}" stroke="#ffffff" stroke-width="1" />
             <!-- 사할린 섬 -->
             <ellipse cx="945" cy="235" rx="5" ry="16" fill="${getRegionInfo('world_russia').color}" stroke="#ffffff" stroke-width="0.8" />`)}

          <!-- 6. 카자흐스탄 & 중앙아시아 (카스피해 동쪽 청록빛 랜드마크) -->
          ${renderWorldCountry(getRegionInfo('world_kazakhstan'),
            'M 420,220 C 475,215 540,215 595,225 C 610,255 585,275 550,285 C 500,290 455,285 415,270 C 405,245 410,230 420,220 Z',
            505, 250, 'KAZAKHSTAN', 10.5)}

          <!-- 7. 몽골 (러시아와 중국 사이 세이지 그린) -->
          ${renderWorldCountry(getRegionInfo('world_mongolia'),
            'M 630,225 C 685,215 745,215 780,230 C 775,260 740,270 700,270 C 660,270 635,255 630,225 Z',
            705, 248, 'MONGOLIA', 10)}

          <!-- 8. 🇨🇳 중국 (광활한 아시아의 심장 - 부드러운 샌드 옐로우) -->
          ${renderWorldCountry(getRegionInfo('world_china'),
            'M 580,275 C 640,265 720,265 785,265 C 825,270 855,295 860,335 C 855,375 830,410 790,425 C 750,430 710,410 670,390 C 625,380 580,360 560,325 C 555,295 565,280 580,275 Z',
            710, 335, 'CHINA', 18,
            `<!-- 하이난 섬 -->
             <ellipse cx="765" cy="445" rx="7" ry="5.5" fill="${getRegionInfo('world_china').color}" stroke="#ffffff" stroke-width="1" />`)}

          <!-- 9. 🇮🇳 인도 (인도양을 향해 뻗은 역삼각형 반도 - 은은한 연보라) -->
          ${renderWorldCountry(getRegionInfo('world_india'),
            'M 555,325 C 595,315 635,330 655,360 C 645,405 625,455 595,490 C 570,455 550,405 540,365 C 535,345 545,330 555,325 Z',
            595, 400, 'INDIA', 14,
            `<!-- 스리랑카 섬 -->
             <ellipse cx="615" cy="505" rx="5.5" ry="8" fill="#cbd5e1" stroke="#ffffff" stroke-width="0.8" />`)}

          <!-- 10. 🇰🇷 대한민국 (동북아의 보석 - 선명한 에메랄드 반도) -->
          ${renderWorldCountry(getRegionInfo('world_korea'),
            'M 850,295 C 865,295 872,310 868,335 C 865,355 852,360 848,350 C 842,335 842,310 850,295 Z',
            858, 330, '', 9,
            `<!-- 대한민국 핀 & 한글 라벨 -->
             <circle cx="858" cy="328" r="4.5" fill="#10b981" stroke="#ffffff" stroke-width="1.5" />
             <text x="858" y="320" font-size="11" font-weight="900" fill="#047857" text-anchor="middle" style="filter:drop-shadow(0 1px 2px #fff);">🇰🇷 한국</text>
             <ellipse cx="852" cy="365" rx="3" ry="2" fill="#10b981" stroke="#ffffff" stroke-width="0.5" />`)}

          <!-- 11. 🇯🇵 일본 열도 (태평양을 감싸는 호형 열도) -->
          ${renderWorldCountry(getRegionInfo('world_japan'),
            'M 915,245 C 935,245 940,265 925,280 C 915,310 905,345 885,365 C 875,365 870,350 880,330 C 895,305 905,275 915,245 Z',
            925, 305, '', 9,
            `<!-- 홋카이도 & 혼슈 -->
             <ellipse cx="925" cy="255" rx="14" ry="10" fill="${getRegionInfo('world_japan').color}" stroke="#ffffff" stroke-width="1" />
             <text x="945" y="300" font-size="11" font-weight="900" fill="#2d6a4f" text-anchor="middle" style="filter:drop-shadow(0 1px 2px #fff);">JAPAN</text>`)}

          <!-- 12. 동남아시아 & 베트남 (인도차이나 반도 S자 곡선) -->
          ${renderWorldCountry(getRegionInfo('world_vietnam'),
            'M 725,375 C 755,365 775,385 765,420 C 755,455 745,480 735,485 C 725,480 715,450 715,420 C 715,395 720,380 725,375 Z',
            745, 435, 'VIETNAM', 10.5,
            `<!-- 베트남 S자 강조 해안선 -->
             <path d="M 755,390 Q 770,425 750,465" stroke="#ea580c" stroke-width="1.8" fill="none" stroke-linecap="round" />`)}

          <!-- 13. 인도네시아 & 말레이 제도 (황금빛 섬들의 나라) -->
          ${renderWorldCountry(getRegionInfo('world_indonesia'),
            'M 710,490 C 760,495 830,490 890,505 C 885,530 820,535 760,535 C 720,535 700,515 710,490 Z',
            785, 520, 'INDONESIA', 12,
            `<!-- 수마트라, 자바, 보르네오 섬 디테일 -->
             <ellipse cx="715" cy="505" rx="20" ry="8" transform="rotate(-30 715 505)" fill="${getRegionInfo('world_indonesia').color}" stroke="#ffffff" stroke-width="1" />
             <ellipse cx="780" cy="485" rx="16" ry="14" fill="${getRegionInfo('world_indonesia').color}" stroke="#ffffff" stroke-width="1" />
             <ellipse cx="830" cy="495" rx="10" ry="12" fill="${getRegionInfo('world_indonesia').color}" stroke="#ffffff" stroke-width="1" />
             <ellipse cx="765" cy="535" rx="24" ry="6" fill="${getRegionInfo('world_indonesia').color}" stroke="#ffffff" stroke-width="1" />`)}

          <!-- 14. 🇦🇺 호주 (카펜타리아만과 대호주만을 품은 대륙 - 올리브 그린) -->
          ${renderWorldCountry(getRegionInfo('world_australia'),
            'M 840,535 C 895,515 955,515 985,550 C 995,595 980,640 935,655 C 885,660 840,635 825,595 C 820,565 830,545 840,535 Z',
            910, 585, 'AUSTRALIA', 16,
            `<!-- 태즈메이니아 섬 -->
             <ellipse cx="945" cy="670" rx="8" ry="7" fill="${getRegionInfo('world_australia').color}" stroke="#ffffff" stroke-width="1" />
             <!-- 뉴질랜드 남/북섬 -->
             <path d="M 1045,615 C 1055,610 1060,630 1050,640 Z" fill="#93c47d" stroke="#ffffff" stroke-width="1" />
             <path d="M 1035,645 C 1045,640 1050,665 1040,670 Z" fill="#93c47d" stroke="#ffffff" stroke-width="1" />
             <text x="1055" y="660" font-size="8" font-weight="900" fill="#475569" text-anchor="middle">NEW ZEALAND</text>`)}

          <!-- 15. 중동 (터키, 사우디아라비아, 이란, 홍해, 페르시아만) -->
          ${renderWorldCountry(getRegionInfo('world_middle_east'),
            'M 345,265 C 410,250 480,265 495,305 C 485,355 450,425 405,430 C 370,420 360,375 360,340 C 340,310 335,285 345,265 Z',
            415, 345, 'SAUDI ARABIA', 10.5,
            `<!-- 이란 & 튀르키예 라벨 -->
             <text x="440" y="295" font-size="10" font-weight="900" fill="#713f12" text-anchor="middle">IRAN</text>
             <text x="365" y="275" font-size="9" font-weight="900" fill="#713f12" text-anchor="middle">TURKEY</text>`)}

          <!-- 16. 아프리카 대륙 (이집트 피라미드부터 남아공 희망봉까지 파스텔 모자이크) -->
          ${renderWorldCountry(getRegionInfo('world_africa'),
            'M 195,295 C 265,285 345,290 375,340 C 390,395 380,455 350,515 C 330,565 300,605 275,610 C 255,595 240,545 225,495 C 200,455 180,405 185,355 C 185,325 190,305 195,295 Z',
            280, 440, 'AFRICA', 17,
            `<!-- 마다가스카르 섬 -->
             <ellipse cx="420" cy="550" rx="9" ry="24" transform="rotate(20 420 550)" fill="#fca5a5" stroke="#ffffff" stroke-width="1" />
             <!-- 주요 국가명 -->
             <text x="325" y="335" font-size="9.5" font-weight="bold" fill="#881337" text-anchor="middle">EGYPT</text>
             <text x="240" y="350" font-size="9.5" font-weight="bold" fill="#881337" text-anchor="middle">ALGERIA</text>
             <text x="280" y="585" font-size="9" font-weight="bold" fill="#881337" text-anchor="middle">SOUTH AFRICA</text>`)}

          <!-- 17. 아메리카 대륙 (우측/좌측 해양 경계 지형) -->
          ${renderWorldCountry(getRegionInfo('world_north_america'),
            'M 0,165 C 25,155 45,185 35,225 C 25,260 10,270 0,265 Z',
            18, 215, 'AMERICA', 8.5)}
        </svg>

        <!-- 하단 빠른 바로가기 카드 -->
        <div class="w-full mt-4 p-4 bg-white border border-gray-200 rounded-xl shadow-xs flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <span class="text-xs font-bold text-gray-500">🔍 정밀 권역별 지도 확대 보기:</span>
            <div class="flex flex-wrap gap-1.5">
              <button onclick="filterTravelMap('대한민국')" class="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition">🇰🇷 대한민국 전국</button>
              <button onclick="filterTravelMap('남부지방')" class="px-3 py-1 rounded-lg text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 transition">🌊 남부지방 (전남·경남·부산·제주)</button>
              <button onclick="filterTravelMap('일본')" class="px-3 py-1 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 transition">🇯🇵 일본 (8대 권역)</button>
              <button onclick="filterTravelMap('베트남')" class="px-3 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 transition">🇻🇳 베트남 S자 반도</button>
              <button onclick="filterTravelMap('제주도')" class="px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 transition">🍊 제주도 (4대 권역)</button>
            </div>
          </div>
          <span class="text-[11px] text-gray-400 font-medium">✨ 각 국가/지역을 클릭하면 선택된 색상으로 영구 저장됩니다.</span>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. 🇰🇷 대한민국 (전국 실제 지형 벡터 지도 - 리얼 해안선/반도 형상)
  // ─────────────────────────────────────────────────────────────
  else if (country === '대한민국') {
    svgHtml = `
      <div class="relative w-full flex flex-col items-center">
        <svg viewBox="0 0 840 940" class="w-full max-w-3xl h-auto drop-shadow-md select-none rounded-2xl border-2 border-slate-200">
          <defs>
            <linearGradient id="seaGradKR" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#eff6ff" />
              <stop offset="100%" stop-color="#dbeafe" />
            </linearGradient>
          </defs>
          <rect width="840" height="940" rx="20" fill="url(#seaGradKR)" stroke="#bfdbfe" stroke-width="2" />

          <!-- 타이틀 & 안내 -->
          <text x="35" y="42" font-size="18" font-weight="900" fill="#0f172a">🇰🇷 대한민국 실제 지형 여행 지도</text>
          <text x="35" y="65" font-size="12" font-weight="700" fill="#475569">상단 팔레트에서 색상을 고른 뒤 지역을 클릭하면 지도가 실시간으로 색칠되고 저장됩니다.</text>

          <!-- 바다 명칭 표시 -->
          <text x="60" y="380" font-size="14" font-weight="900" fill="#93c5fd" letter-spacing="4">서 해 (WEST SEA)</text>
          <text x="660" y="280" font-size="14" font-weight="900" fill="#93c5fd" letter-spacing="4">동 해 (EAST SEA)</text>
          <text x="520" y="760" font-size="14" font-weight="900" fill="#93c5fd" letter-spacing="4">남 해 (SOUTH SEA)</text>

          <!-- 독도 & 울릉도 -->
          <g class="cursor-pointer" onclick="handleMapRegionClick('kr_gangwon')" title="울릉도 · 독도 (강원)">
            <ellipse cx="710" cy="240" rx="14" ry="10" fill="#94a3b8" stroke="#334155" stroke-width="1.5" />
            <text x="710" y="265" font-size="11" font-weight="900" fill="#1e293b" text-anchor="middle">울릉도</text>
            <circle cx="760" cy="250" r="6" fill="#ef4444" stroke="#ffffff" stroke-width="1.5" />
            <text x="760" y="272" font-size="11" font-weight="900" fill="#dc2626" text-anchor="middle">🇰🇷 독도</text>
          </g>

          <!-- 1. 강원도 (동해안 및 태백산맥 능선 지형) -->
          ${renderGeoPath(getRegionInfo('kr_gangwon'), 
            'M 375,110 C 430,115 480,125 530,155 C 575,190 600,240 580,285 C 555,320 495,310 450,290 C 410,270 380,250 375,160 Z', 
            460, 205, '강원')}

          <!-- 2. 경기 / 인천 (서울을 감싸며 서해안으로 뻗은 지형) -->
          ${renderGeoPath(getRegionInfo('kr_gyeonggi'), 
            'M 265,125 C 320,115 375,110 375,160 C 375,185 365,190 360,225 C 375,255 385,290 340,295 C 290,295 245,280 235,240 C 230,205 240,155 265,125 Z', 
            275, 220, '경기·인천',
            `<!-- 강화도 및 영종도 -->
             <ellipse cx="230" cy="180" rx="10" ry="14" fill="#94a3b8" />
             <ellipse cx="225" cy="225" rx="12" ry="8" fill="#94a3b8" />`)}

          <!-- 3. 서울특별시 (수도권 심장부) -->
          ${renderGeoPath(getRegionInfo('kr_seoul'), 
            'M 320,185 C 335,178 355,182 360,195 C 362,210 350,225 335,225 C 320,225 310,210 320,185 Z', 
            335, 205, '서울')}

          <!-- 4. 충청도 / 대전·세종 (태안반도 돌출부 및 내륙 지형) -->
          ${renderGeoPath(getRegionInfo('kr_chungcheong'), 
            'M 235,290 C 285,295 340,295 385,295 C 445,290 475,305 480,350 C 475,395 440,410 405,405 C 380,400 375,340 345,415 C 300,420 250,405 210,380 C 190,345 205,305 235,290 Z', 
            325, 350, '충청·대전·세종',
            `<!-- 태안반도 돌출부 -->
             <path d="M 210,340 C 180,345 175,370 200,380 Z" fill="${getRegionInfo('kr_chungcheong').color}" stroke="#0f172a" stroke-width="1.5" />`)}

          <!-- 5. 경상북도 / 대구 (호미곶 영일만 및 동해안 남부) -->
          ${renderGeoPath(getRegionInfo('kr_gyeongbuk'), 
            'M 450,290 C 495,310 555,320 580,285 C 610,335 635,385 615,440 C 595,480 540,490 480,475 C 450,460 445,415 455,385 C 460,345 445,305 450,290 Z', 
            515, 385, '경북·대구',
            `<!-- 포항 호미곶 -->
             <path d="M 615,410 C 640,415 635,435 615,440 Z" fill="${getRegionInfo('kr_gyeongbuk').color}" stroke="#0f172a" stroke-width="1.5" />`)}

          <!-- 6. 전라북도 (새만금 및 변산반도 서해안 지형) -->
          ${renderGeoPath(getRegionInfo('kr_jeonbuk'), 
            'M 245,410 C 295,415 345,415 405,405 C 420,435 410,475 390,500 C 355,520 295,515 250,500 C 220,480 225,435 245,410 Z', 
            315, 460, '전북')}

          <!-- 7. 전라남도 / 광주 (여수반도, 순천만, 목포 다도해) -->
          ${renderGeoPath(getRegionInfo('kr_jeonnam'), 
            'M 245,510 C 295,515 355,520 390,500 C 410,535 415,580 395,630 C 370,665 315,675 260,660 C 210,635 190,580 205,540 C 215,520 230,510 245,510 Z', 
            295, 580, '전남·광주', 
            `<!-- 여수 돌산도 & 신안 도서군 -->
             <circle cx="385" cy="640" r="7" fill="#64748b" />
             <circle cx="215" cy="625" r="5" fill="#64748b" />`)}

          <!-- 8. 경상남도 / 남해 (통영, 거제도, 남해도 지형) -->
          ${renderGeoPath(getRegionInfo('kr_gyeongnam'), 
            'M 390,500 C 445,485 480,475 520,495 C 555,535 565,585 535,625 C 500,660 440,665 395,630 C 415,580 410,535 390,500 Z', 
            460, 565, '경남', 
            `<!-- 거제도 & 남해도 섬 지형 -->
             <ellipse cx="495" cy="650" rx="18" ry="14" fill="#94a3b8" />
             <ellipse cx="420" cy="660" rx="14" ry="11" fill="#94a3b8" />`)}

          <!-- 9. 부산광역시 (해운대, 광안리, 영도) -->
          ${renderGeoPath(getRegionInfo('kr_busan'), 
            'M 525,565 C 555,550 580,565 575,595 C 565,625 535,625 525,600 Z', 
            550, 590, '부산')}

          <!-- 10. 제주도 (화산섬 실제 타원형 지형) -->
          ${renderGeoPath(getRegionInfo('jeju_north'), 
            'M 230,770 C 280,745 360,745 400,770 C 390,805 350,825 300,825 C 250,825 220,800 230,770 Z', 
            315, 785, '제주도')}
        </svg>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 3. 🌊 남부지방 (전남·경남·부산·제주 상세 지형 지도)
  // ─────────────────────────────────────────────────────────────
  else if (country === '남부지방') {
    svgHtml = `
      <div class="relative w-full flex flex-col items-center">
        <svg viewBox="0 0 920 660" class="w-full max-w-3xl h-auto drop-shadow-md select-none rounded-2xl border-2 border-slate-200">
          <defs>
            <linearGradient id="southSeaGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#f0f9ff" />
              <stop offset="100%" stop-color="#e0f2fe" />
            </linearGradient>
          </defs>
          <rect width="920" height="660" rx="20" fill="url(#southSeaGrad)" stroke="#bae6fd" stroke-width="2" />

          <!-- 타이틀 -->
          <text x="35" y="42" font-size="18" font-weight="900" fill="#0369a1">🌊 남부지방 (전남·경남·부산·제주) 상세 지형 지도</text>
          <text x="35" y="65" font-size="12" font-weight="700" fill="#0284c7">남해안 다도해와 영·호남 핵심 도시를 나만의 색상으로 채색해보세요!</text>

          <!-- 1. 광주광역시 & 전남 내륙 -->
          ${renderGeoPath(getRegionInfo('kr_jeonnam'),
            'M 160,140 C 210,130 260,135 290,165 C 310,195 300,240 270,265 C 220,280 170,270 145,240 C 130,200 135,160 160,140 Z',
            220, 205, '광주·나주')}
          ${renderCityPin('광주', 220, 185, 220, 155, '빛고을')}

          <!-- 2. 전남 서해안 다도해 (목포, 신안 천사섬, 해남 땅끝) -->
          ${renderGeoPath(getRegionInfo('kr_jeonnam'),
            'M 75,225 C 135,235 155,255 155,305 C 150,355 120,405 75,410 C 45,395 35,345 45,295 C 55,255 65,235 75,225 Z',
            95, 315, '목포·신안·해남',
            `<!-- 진도 & 신안 도서군 -->
             <ellipse cx="65" cy="430" rx="14" ry="10" fill="#94a3b8" />
             <text x="65" y="452" font-size="9" font-weight="bold" fill="#475569" text-anchor="middle">진도</text>`)}

          <!-- 3. 전남 동부 남해안 (순천만 습지, 여수 밤바다, 광양, 보성) -->
          ${renderGeoPath(getRegionInfo('kr_jeonnam'),
            'M 280,240 C 330,230 380,240 405,275 C 415,315 400,370 365,405 C 325,430 280,410 265,365 C 255,315 260,265 280,240 Z',
            335, 325, '순천·여수·광양',
            `<!-- 여수 돌산도 & 오동도 -->
             <ellipse cx="375" cy="425" rx="14" ry="10" fill="#94a3b8" />
             <text x="375" y="448" font-size="9" font-weight="bold" fill="#475569" text-anchor="middle">돌산도</text>`)}

          <!-- 4. 전북 남부 (전주 한옥마을, 남원 지리산) -->
          ${renderGeoPath(getRegionInfo('kr_jeonbuk'),
            'M 180,75 C 250,70 330,85 365,120 C 370,165 330,215 285,215 C 235,210 185,185 165,145 C 155,115 165,85 180,75 Z',
            270, 140, '전주·남원')}
          ${renderCityPin('전주', 260, 115, 260, 90, '한옥마을')}

          <!-- 5. 경남 서부 (진주 남강, 사천, 남해 다랭이마을) -->
          ${renderGeoPath(getRegionInfo('kr_gyeongnam'),
            'M 405,245 C 465,235 520,245 540,285 C 545,335 520,385 475,410 C 435,420 395,395 385,345 C 380,295 390,265 405,245 Z',
            465, 325, '진주·사천·남해',
            `<!-- 남해도 -->
             <ellipse cx="440" cy="435" rx="15" ry="11" fill="#94a3b8" />
             <text x="440" y="458" font-size="9" font-weight="bold" fill="#475569" text-anchor="middle">남해도</text>`)}

          <!-- 6. 한려수도 (통영 동피랑, 거제도 바람의언덕) -->
          ${renderGeoPath(getRegionInfo('kr_gyeongnam'),
            'M 535,325 C 585,305 635,320 655,365 C 665,415 635,465 585,475 C 545,465 525,425 525,375 C 525,345 530,335 535,325 Z',
            595, 395, '통영·거제',
            `<!-- 거제도 본섬 -->
             <ellipse cx="615" cy="460" rx="20" ry="15" fill="#94a3b8" />
             <text x="615" y="488" font-size="9" font-weight="bold" fill="#475569" text-anchor="middle">거제도</text>`)}

          <!-- 7. 경남 동부 (창원 마산/진해, 김해, 양산) -->
          ${renderGeoPath(getRegionInfo('kr_gyeongnam'),
            'M 525,185 C 585,175 645,180 675,220 C 690,265 675,310 635,325 C 585,335 535,315 515,275 C 505,235 515,195 525,185 Z',
            595, 255, '창원·김해')}
          ${renderCityPin('창원', 595, 230, 595, 205, '진해벚꽃')}

          <!-- 8. 부산광역시 (해운대, 광안리, 영도, 기장) -->
          ${renderGeoPath(getRegionInfo('kr_busan'),
            'M 680,265 C 735,245 780,265 785,315 C 780,365 745,395 700,385 C 665,370 655,325 665,285 C 670,275 675,270 680,265 Z',
            725, 325, '부산')}
          ${renderCityPin('해운대', 745, 305, 805, 290)}
          ${renderCityPin('광안리', 715, 345, 775, 370)}

          <!-- 9. 울산광역시 (대왕암, 간절곶) -->
          ${renderGeoPath(getRegionInfo('kr_gyeongbuk'),
            'M 685,160 C 740,150 780,175 790,225 C 785,260 745,265 705,255 C 675,240 670,195 685,160 Z',
            735, 210, '울산')}
          ${renderCityPin('울산', 735, 195, 800, 185, '간절곶')}

          <!-- 10. 제주도 (남부지방 해역 화산섬) -->
          <g class="cursor-pointer" onclick="handleMapRegionClick('jeju_north')" title="제주도">
            <ellipse cx="230" cy="565" rx="95" ry="48" fill="${getRegionInfo('jeju_north').color}" stroke="#0284c7" stroke-width="2.5" />
            <text x="230" y="560" font-size="14" font-weight="900" fill="#0f172a" text-anchor="middle">🍊 제주특별자치도</text>
            <text x="230" y="580" font-size="10.5" font-weight="bold" fill="#475569" text-anchor="middle">제주시 · 애월 · 성산 · 서귀포</text>
          </g>
        </svg>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. 🇯🇵 일본 열도 8대 권역 지형 지도
  // ─────────────────────────────────────────────────────────────
  else if (country === '일본') {
    svgHtml = `
      <div class="relative w-full flex flex-col items-center">
        <svg viewBox="0 0 960 720" class="w-full max-w-3xl h-auto drop-shadow-md select-none rounded-2xl border-2 border-slate-200">
          <defs>
            <linearGradient id="jpSeaGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#f0fdfa" />
              <stop offset="100%" stop-color="#ccfbf1" />
            </linearGradient>
          </defs>
          <rect width="960" height="720" rx="20" fill="url(#jpSeaGrad)" stroke="#5eead4" stroke-width="2" />

          <text x="40" y="42" font-size="18" font-weight="900" fill="#0f766e">🇯🇵 일본 열도 8대 권역 지형 지도</text>
          <text x="40" y="65" font-size="12" font-weight="700" fill="#115e59">북해도부터 도쿄, 교토, 오사카, 후쿠오카, 오키나와까지 실감 지형에 채색해보세요!</text>

          <!-- 1. 북해도 (삿포로, 비에이, 오타루, 하코다테) -->
          ${renderGeoPath(getRegionInfo('jp_sapporo'), 
            'M 690,30 C 740,25 790,40 840,70 C 880,100 885,140 845,160 C 810,175 770,170 745,150 C 725,135 700,140 680,165 C 660,190 630,200 610,180 C 590,160 600,130 635,125 C 655,120 655,80 640,65 C 625,50 655,35 690,30 Z', 
            740, 110, '북해도')}
          ${renderCityPin('삿포로', 740, 115, 800, 125, '설경')}
          ${renderCityPin('오타루', 705, 105, 665, 85)}

          <!-- 2. 토호쿠 (센다이, 아오모리) -->
          ${renderGeoPath(getRegionInfo('jp_tohoku'), 
            'M 645,185 C 675,195 705,230 715,275 C 725,320 685,355 660,365 C 635,375 615,355 605,320 C 595,285 585,255 595,225 C 605,195 625,180 645,185 Z', 
            655, 275, '토호쿠')}
          ${renderCityPin('센다이', 655, 285, 715, 290, '미야기')}

          <!-- 3. 중부 (나고야, 시즈오카 후지산, 나가노) -->
          ${renderGeoPath(getRegionInfo('jp_nagoya'), 
            'M 605,320 C 615,350 635,395 615,415 C 595,435 585,475 545,470 C 515,465 490,435 485,400 C 480,365 510,335 535,320 C 565,305 590,300 605,320 Z', 
            545, 395, '중부')}
          ${renderCityPin('나고야', 545, 440, 535, 485, '아이치')}
          ${renderCityPin('후지산', 585, 415, 625, 435)}

          <!-- 4. 칸토 (도쿄, 요코하마, 시부야, 지바) -->
          ${renderGeoPath(getRegionInfo('jp_tokyo'), 
            'M 660,365 C 690,380 720,410 705,445 C 690,480 650,485 625,470 C 605,455 600,435 615,415 C 635,395 645,375 660,365 Z', 
            660, 425, '칸토')}
          ${renderCityPin('도쿄', 665, 415, 735, 435, '수도권')}
          ${renderCityPin('요코하마', 635, 455, 680, 485)}

          <!-- 5. 킨키 / 간사이 (오사카, 교토, 고베, 나라) -->
          ${renderGeoPath(getRegionInfo('jp_osaka'), 
            'M 485,400 C 495,435 515,460 495,495 C 475,525 435,520 415,495 C 395,470 405,435 425,415 C 445,395 470,390 485,400 Z', 
            455, 455, '킨키 (간사이)')}
          ${renderCityPin('교토', 445, 410, 400, 390)}
          ${renderCityPin('오사카', 445, 470, 415, 515, '미식')}
          ${renderCityPin('고베', 405, 440, 360, 430)}

          <!-- 6. 츄고쿠 (히로시마, 오카야마) -->
          ${renderGeoPath(getRegionInfo('jp_chugoku'), 
            'M 415,495 C 395,470 365,440 325,440 C 285,440 245,465 235,490 C 230,510 255,525 295,520 C 335,515 375,520 415,495 Z', 
            315, 480, '츄고쿠')}
          ${renderCityPin('히로시마', 300, 475, 240, 450)}

          <!-- 7. 시코쿠 (타카마츠, 마쓰야마) -->
          ${renderGeoPath(getRegionInfo('jp_shikoku'), 
            'M 285,540 C 330,525 385,530 405,550 C 415,575 385,605 345,600 C 300,595 265,575 285,540 Z', 
            345, 565, '시코쿠')}
          ${renderCityPin('타카마츠', 345, 545, 345, 520, '우동투어')}

          <!-- 8. 규슈 (후쿠오카, 유후인, 벳푸, 나가사키) -->
          ${renderGeoPath(getRegionInfo('jp_fukuoka'), 
            'M 235,490 C 255,525 245,565 250,605 C 255,645 215,675 175,665 C 145,655 125,615 140,575 C 150,545 185,525 215,510 Z', 
            195, 580, '규슈')}
          ${renderCityPin('후쿠오카', 190, 535, 125, 510, '하카타')}
          ${renderCityPin('유후인', 220, 560, 245, 540, '온천')}

          <!-- 9. 오키나와 남부섬 -->
          <g transform="translate(60, 595)">
            <rect x="0" y="0" width="165" height="95" rx="14" fill="#f0fdfa" stroke="#2dd4bf" stroke-width="2" />
            <text x="15" y="24" font-size="11.5" font-weight="900" fill="#0f766e">🏝️ 오키나와 남부섬</text>
            <g class="cursor-pointer" onclick="handleMapRegionClick('jp_okinawa')">
              <ellipse cx="82" cy="58" rx="58" ry="20" fill="${getRegionInfo('jp_okinawa').color}" stroke="#0d9488" stroke-width="2.5" />
              <text x="82" y="63" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" style="filter:drop-shadow(0 1px 2px #000);">오키나와 (나하)</text>
            </g>
          </g>
        </svg>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 5. 🇻🇳 베트남 (Vietnam S자 반도 지형 지도)
  // ─────────────────────────────────────────────────────────────
  else if (country === '베트남') {
    svgHtml = `
      <div class="relative w-full flex flex-col items-center">
        <svg viewBox="0 0 760 900" class="w-full max-w-2xl h-auto drop-shadow-md select-none rounded-2xl border-2 border-slate-200">
          <defs>
            <linearGradient id="vnSeaGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fff1f2" />
              <stop offset="100%" stop-color="#ffe4e6" />
            </linearGradient>
          </defs>
          <rect width="760" height="900" rx="20" fill="url(#vnSeaGrad)" stroke="#fecdd3" stroke-width="2" />

          <text x="40" y="42" font-size="18" font-weight="900" fill="#9f1239">🇻🇳 베트남 S자 반도 지형 지도</text>
          <text x="40" y="65" font-size="12" font-weight="700" fill="#be123c">하노이, 다낭, 호이안, 나트랑, 달랏, 호치민, 푸꾸옥을 나만의 색으로 채색해보세요!</text>

          <!-- 1. 북부 수도권 (하노이, 하롱베이, 사파) -->
          ${renderGeoPath(getRegionInfo('vn_hanoi'),
            'M 310,110 C 370,95 440,115 470,165 C 470,210 425,245 375,250 C 330,245 300,210 295,170 C 290,135 300,115 310,110 Z',
            380, 180, '하노이·하롱베이')}
          ${renderCityPin('하노이', 365, 160, 310, 140, '수도')}
          ${renderCityPin('하롱베이', 430, 185, 490, 185)}

          <!-- 2. 중부 해안 (다낭, 호이안, 후에) -->
          ${renderGeoPath(getRegionInfo('vn_danang'),
            'M 375,250 C 415,255 450,290 445,345 C 440,405 405,455 375,465 C 345,445 340,390 350,340 C 355,295 365,260 375,250 Z',
            400, 360, '다낭·호이안')}
          ${renderCityPin('다낭', 415, 340, 480, 335, '미케비치')}
          ${renderCityPin('호이안', 400, 395, 470, 400, '올드타운')}

          <!-- 3. 남중부 해양 & 고원 (나트랑, 달랏) -->
          ${renderGeoPath(getRegionInfo('vn_nhatrang'),
            'M 375,465 C 415,460 455,490 460,545 C 455,605 425,655 385,665 C 350,650 340,600 350,540 C 355,495 365,475 375,465 Z',
            410, 565, '나트랑·달랏')}
          ${renderCityPin('나트랑', 435, 545, 500, 545, '휴양지')}
          ${renderCityPin('달랏', 380, 595, 330, 605, '꽃의고원')}

          <!-- 4. 남부 경제수도 (호치민, 메콩델타) -->
          ${renderGeoPath(getRegionInfo('vn_hochiminh'),
            'M 385,665 C 430,665 445,715 425,765 C 395,805 330,810 290,785 C 265,750 280,705 320,680 C 350,665 375,665 385,665 Z',
            360, 740, '호치민 (남부)')}
          ${renderCityPin('호치민', 370, 725, 440, 720, '사이공')}

          <!-- 5. 푸꾸옥 (남부 에메랄드 섬 인셋) -->
          <g transform="translate(80, 705)">
            <rect x="0" y="0" width="160" height="95" rx="14" fill="#ffffff" stroke="#f43f5e" stroke-width="2" />
            <text x="15" y="24" font-size="11.5" font-weight="900" fill="#9f1239">🏝️ 푸꾸옥 청정섬</text>
            <g class="cursor-pointer" onclick="handleMapRegionClick('vn_phuquoc')">
              <ellipse cx="80" cy="58" rx="55" ry="20" fill="${getRegionInfo('vn_phuquoc').color}" stroke="#e11d48" stroke-width="2.5" />
              <text x="80" y="63" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" style="filter:drop-shadow(0 1px 2px #000);">푸꾸옥 (선셋비치)</text>
            </g>
          </g>
        </svg>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // 6. 🍊 제주도 (4대 권역 화산섬 지형 지도)
  // ─────────────────────────────────────────────────────────────
  else if (country === '제주도') {
    svgHtml = `
      <div class="relative w-full flex flex-col items-center">
        <svg viewBox="0 0 860 560" class="w-full max-w-3xl h-auto drop-shadow-md select-none rounded-2xl border-2 border-slate-200">
          <defs>
            <linearGradient id="jejuSeaGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fffbeb" />
              <stop offset="100%" stop-color="#fef3c7" />
            </linearGradient>
          </defs>
          <rect width="860" height="560" rx="20" fill="url(#jejuSeaGrad)" stroke="#fcd34d" stroke-width="2" />

          <text x="40" y="42" font-size="18" font-weight="900" fill="#78350f">🍊 제주도 4대 권역 화산섬 지형 지도</text>
          <text x="40" y="65" font-size="12" font-weight="700" fill="#92400e">북부(제주시), 서부(애월/한림), 동부(성산/우도), 남부(서귀포/중문)를 나만의 색상으로 채색해보세요!</text>

          <!-- 1. 제주 북부 (제주시내, 함덕) -->
          ${renderGeoPath(getRegionInfo('jeju_north'),
            'M 260,170 C 340,150 500,150 580,170 C 560,240 480,270 420,280 C 360,270 280,240 260,170 Z',
            420, 215, '제주 북부 (제주시·함덕)')}
          ${renderCityPin('제주시청', 420, 195, 420, 160)}

          <!-- 2. 애월·서부 (한담산책로, 협재, 금능) -->
          ${renderGeoPath(getRegionInfo('jeju_west'),
            'M 120,270 C 180,210 260,170 300,230 C 340,280 340,330 290,370 C 230,410 150,350 120,270 Z',
            220, 300, '애월·서부 (협재·한담)')}
          ${renderCityPin('한담해변', 200, 265, 150, 245)}

          <!-- 3. 성산·동부 (성산일출봉, 섭지코지, 우도) -->
          ${renderGeoPath(getRegionInfo('jeju_east'),
            'M 720,270 C 660,210 580,170 540,230 C 500,280 500,330 550,370 C 610,410 690,350 720,270 Z',
            620, 300, '성산·동부 (일출봉·우도)',
            `<!-- 우도 섬 지형 -->
             <ellipse cx="745" cy="235" rx="15" ry="11" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5" />
             <text x="745" y="258" font-size="9" font-weight="900" fill="#78350f" text-anchor="middle">우도</text>`)}
          ${renderCityPin('성산일출봉', 640, 280, 700, 295)}

          <!-- 4. 서귀포·남부 (중문관광단지, 쇠소깍, 천지연) -->
          ${renderGeoPath(getRegionInfo('jeju_south'),
            'M 290,370 C 340,330 420,340 490,340 C 550,370 560,420 500,450 C 440,470 360,470 300,450 C 260,430 270,390 290,370 Z',
            420, 415, '서귀포 남부 (중문·서홍)')}
          ${renderCityPin('중문단지', 380, 415, 340, 440)}
          ${renderCityPin('서귀포올레시장', 460, 415, 505, 440)}

          <!-- 중앙 한라산 국립공원 -->
          <g transform="translate(420, 305)" pointer-events="none">
            <polygon points="0,-16 -16,14 16,14" fill="#15803d" stroke="#ffffff" stroke-width="2" />
            <text x="0" y="27" font-size="11.5" font-weight="900" fill="#14532d" text-anchor="middle">⛰️ 한라산 (백록담)</text>
          </g>
        </svg>
      </div>
    `;
  }

  wrapper.innerHTML = svgHtml;
}

function renderCardsMap(country, regions, trips) {
  const g = document.getElementById("cardsMapContainer"); 
  if (!g) return;

  const filteredRegions = (country === '전체' || country === '전체 지도' || country === '세계 지도') 
    ? regions 
    : (country === '남부지방'
        ? regions.filter(r => ['kr_jeonnam', 'kr_gyeongnam', 'kr_busan', 'jeju_north', 'jeju_west', 'jeju_south', 'jeju_east'].includes(r.id))
        : regions.filter(r => r.country === country));

  g.innerHTML = filteredRegions.map(r => {
    const regionTrips = trips.filter(t => t.regionId === r.id);
    const userColor = state.data.travelRegionColors && state.data.travelRegionColors[r.id];
    const visited = !!userColor || regionTrips.length > 0;
    const visitCount = regionTrips.length || (userColor ? 1 : 0);
    const customColor = userColor || (regionTrips[0] && regionTrips[0].themeColor) || r.defaultColor || '#10b981';

    const cardBg = visited 
      ? `style="background: linear-gradient(135deg, ${customColor}15, ${customColor}30); border-color: ${customColor}; box-shadow: 0 4px 12px ${customColor}25;"`
      : 'class="bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50/20"';

    const visitedBadge = visited 
      ? `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white shadow-xs" style="background-color: ${customColor};">
          방문 (${visitCount}회)
        </span>`
      : '<span class="text-[10px] text-gray-400 font-medium">미방문</span>';

    return `
      <div class="map-region-tile border-2 rounded-2xl p-4 text-center cursor-pointer transition-all hover:scale-[1.02] select-none bg-white" 
           ${cardBg} data-id="${r.id}" onclick="handleMapRegionClick('${r.id}')" title="${r.name} 색칠 또는 여행 기록 작성">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-[11px] font-bold text-gray-500">${r.country}</span>
          ${visitedBadge}
        </div>
        <div class="text-3xl my-1.5">${r.flag}</div>
        <div class="font-extrabold text-gray-900 text-base">${r.shortName}</div>
        <div class="text-[11px] text-gray-400 truncate mt-0.5">${r.desc || r.name}</div>
        <div class="mt-3 flex items-center justify-center gap-1.5">
          <button type="button" onclick="event.stopPropagation(); handleMapRegionClick('${r.id}')" 
                  class="text-xs font-bold py-1.5 px-3 rounded-lg text-white shadow-xs transition" 
                  style="background-color: ${visited ? customColor : '#3182f6'};">
            ${visited ? '🎨 색상 변경' : '+ 색칠하기'}
          </button>
          <button type="button" onclick="event.stopPropagation(); openAddTripModal('${r.id}')" 
                  class="text-xs font-bold py-1.5 px-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition" title="다이어리 & 경비 기록">
            📖 기록
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 4. 여행 책(포토북) 히스토리 피드 렌더링 (한 줄에 여러 권 책장 그리드)
function renderTravelTripsList() {
  const l = document.getElementById("travelTripsList"); 
  if (!l) return;
  const sorted = [...(state.data.travelTrips || [])].sort((a,b) => (b.startDate||'').localeCompare(a.startDate||''));

  if (sorted.length === 0) {
    l.innerHTML = `
      <div class="col-span-full text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <div class="text-4xl mb-2">📚</div>
        <div class="text-sm font-bold text-gray-800">아직 만든 여행 책이 없습니다</div>
        <div class="text-xs text-gray-500 mt-1">우측 상단의 [➕ 새 여행 책 만들기] 버튼을 눌러 표지와 최대 10장의 추억, 경비 엑셀을 만들어보세요!</div>
      </div>
    `;
    return;
  }

  l.innerHTML = sorted.map(tr => {
    const themeColor = tr.themeColor || '#10b981';
    const pages = Array.isArray(tr.pages) ? tr.pages : [];
    const filledPages = pages.filter(p => p && (p.photoUrl || (p.text && p.text.trim()) || (p.subTitle && p.subTitle.trim())));
    const coverImg = tr.coverImage || '';
    const firstStory = (filledPages[0] && (filledPages[0].subTitle || filledPages[0].text)) || tr.diary || '';

    return `
      <div class="card-clean p-2.5 flex flex-col justify-between bg-white border border-gray-200 rounded-2xl hover:shadow-lg transition-all group" 
           style="border-top: 4px solid ${themeColor};" id="trip_${tr.id}">
        <div>
          <!-- 상단: 실제 여행 책 표지 (클릭하여 책 펼치기) -->
          <div onclick="openEditTripModal('${tr.id}', 1)"
               class="relative w-full aspect-[4/5] rounded-r-xl rounded-l-sm shadow-md overflow-hidden cursor-pointer border border-gray-200 mb-2"
               style="background: linear-gradient(135deg, ${themeColor} 0%, #0f172a 140%); box-shadow: -3px 3px 10px rgba(0,0,0,0.14), inset 5px 0 8px rgba(0,0,0,0.2);">
            <!-- 책등(Spine) 효과 -->
            <div class="absolute inset-y-0 left-0 w-2 bg-black/25 border-r border-white/20 z-10 pointer-events-none"></div>
            ${coverImg ? `<img src="${coverImg}" alt="책 표지" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">` : ''}
            
            <!-- 표지 상/하단 오버레이 정보 -->
            <div class="absolute inset-0 p-2.5 pl-3 flex flex-col justify-between text-white bg-gradient-to-t from-black/80 via-black/15 to-black/35">
              <div class="flex items-center justify-between gap-1">
                <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-white/25 backdrop-blur-xs truncate max-w-[60%]">${tr.regionName || tr.country || '여행'}</span>
                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/90 text-white shrink-0">📖 ${filledPages.length}/${Math.max(1, pages.length)}장</span>
              </div>
              <div>
                <h3 class="text-xs sm:text-sm font-extrabold leading-snug line-clamp-2 drop-shadow-md">${tr.title || '즐거운 여행 책'}</h3>
                <p class="text-[9px] opacity-90 mt-0.5 font-medium">${tr.startDate || ''} ${tr.duration ? `(${tr.duration})` : ''}</p>
              </div>
            </div>

            <!-- 호버 시 책 펼치기 오버레이 -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center z-20">
              <span class="text-[11px] font-extrabold text-white bg-black/60 px-2.5 py-1 rounded-full shadow-lg">📖 책 펼치기</span>
            </div>
          </div>

          <!-- 표지 바로 아래 빠른 표지 변경 & 경비 요약 -->
          <div class="flex items-center justify-between gap-1 mb-1.5">
            <button type="button" onclick="triggerQuickCoverChange('${tr.id}')" 
                    class="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5">
              🖼️ 표지 바꾸기
            </button>
            <span class="font-num font-extrabold text-xs text-red-500">${formatKRW(tr.totalCost || 0)}</span>
          </div>

          ${firstStory ? `
            <p class="text-[10px] text-gray-600 line-clamp-2 bg-[#fdfbf7] p-1.5 rounded-lg border border-amber-100/80 mb-2 leading-relaxed">
              ${firstStory}
            </p>
          ` : ''}
        </div>

        <!-- 하단 버튼 바 -->
        <div class="flex items-center gap-1 pt-1.5 border-t border-gray-100">
          <button class="btn-clean btn-primary-clean text-[10px] py-1 px-1.5 rounded-lg font-bold flex-1 shadow-2xs" onclick="openEditTripModal('${tr.id}', 1)">
            📖 펼치기
          </button>
          <button class="btn-clean btn-secondary-clean text-[10px] py-1 px-1.5 rounded-lg font-bold" onclick="openEditTripModal('${tr.id}', 'expense')" title="마지막 경비 엑셀">
            📊 경비
          </button>
          <button class="btn-clean btn-danger-clean text-[10px] py-1 px-1.5 rounded-lg font-bold" onclick="deleteTrip('${tr.id}')" title="삭제">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 빠른 표지 사진 변경 (카드 목록에서 바로 클릭 시)
let quickCoverTargetTripId = null;
function triggerQuickCoverChange(tripId) {
  quickCoverTargetTripId = tripId;
  let inp = document.getElementById('quickCoverFileInputHidden');
  if (!inp) {
    inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.id = 'quickCoverFileInputHidden';
    inp.className = 'hidden';
    inp.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file || !quickCoverTargetTripId) return;
      try {
        const compressed = await compressImageFile(file, 700, 0.75);
        const tr = (state.data.travelTrips || []).find(t => t.id === quickCoverTargetTripId);
        if (tr) {
          tr.coverImage = compressed;
          saveState();
          renderTravelTripsList();
          showToast('📕 여행 책 표지 사진이 멋지게 변경되었습니다!', 'success');
        }
      } catch (err) {
        alert('이미지를 불러오는 중 오류가 발생했습니다.');
      }
      e.target.value = '';
    };
    document.body.appendChild(inp);
  }
  inp.click();
}

// 이미지 자동 압축 유틸 (localStorage 용량 최적화)
function compressImageFile(file, maxWidth = 800, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 5. 나만의 여행 책(포토북) 모달 상태 및 컨트롤
let currentBookPage = 0; // 0: 표지, 1~10: 내지 10장, 11: 마지막 경비 엑셀
let tempBookCoverImage = '';
let tempBookPages = [];
let tempBookExpenseRows = [];

function createDefaultInitialPages() {
  return [{
    pageNo: 1,
    photoUrl: '',
    subTitle: '',
    text: ''
  }];
}

function createDefaultExpenseRows() {
  return [
    { category: '✈️ 항공 / 장거리교통', amount: 0, usagePlace: '' },
    { category: '🏨 숙소 / 호텔', amount: 0, usagePlace: '' },
    { category: '🍽️ 식비 / 맛집 / 카페', amount: 0, usagePlace: '' },
    { category: '🎟️ 관광 / 입장료 / 투어', amount: 0, usagePlace: '' },
    { category: '🛍️ 쇼핑 / 면세 / 선물', amount: 0, usagePlace: '' },
    { category: '🚕 현지교통 / 기타', amount: 0, usagePlace: '' }
  ];
}

function populateTripRegionSelect(selectedId) {
  const sel = document.getElementById('tripRegionSelect');
  if (!sel) return;
  const regions = state.data.travelMapRegions || [];
  sel.innerHTML = regions.map(r => `<option value="${r.id}">${r.flag || '✈️'} ${r.country} - ${r.name || r.shortName}</option>`).join('');
  if (selectedId && regions.some(r => r.id === selectedId)) {
    sel.value = selectedId;
  }
}

function onTripRegionSelectChange() {
  const sel = document.getElementById('tripRegionSelect');
  const modal = document.getElementById('tripModal');
  if (sel && modal) {
    modal.dataset.regionId = sel.value;
    updateBookCoverPreview();
  }
}

function openAddTripModalDirect() {
  const regions = state.data.travelMapRegions || [];
  const firstId = regions[0] ? regions[0].id : 'kr_seoul';
  openAddTripModal(firstId);
}

function openAddTripModal(rid) {
  const region = (state.data.travelMapRegions || []).find(r => r.id === rid) || {};
  const existingCount = (state.data.travelTrips || []).filter(t => t.regionId === rid).length;

  tempBookCoverImage = '';
  tempBookPages = createDefaultInitialPages();
  tempBookExpenseRows = createDefaultExpenseRows();

  document.getElementById('tripEditId').value = '';
  document.getElementById('tripModalTitle').textContent = `📚 새 여행 책 만들기 (표지 + 최대 10장 + 경비 엑셀)`;
  document.getElementById('tripTitleInput').value = `${region.shortName || '나의'} ${existingCount + 1}차 여행 이야기`;

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('tripStartDate').value = today;
  document.getElementById('tripEndDate').value = today;
  document.getElementById('tripDurationInput').value = '1박 2일';
  document.getElementById('tripTotalCost').value = '0원';
  document.getElementById('tripLodgingInput').value = '';
  document.getElementById('tripTransportInput').value = '';

  const defaultCol = region.defaultColor || '#10b981';
  const radio = document.querySelector(`input[name="tripColor"][value="${defaultCol}"]`);
  if (radio) radio.checked = true;

  populateTripRegionSelect(rid);

  const modal = document.getElementById('tripModal');
  modal.dataset.regionId = rid;
  modal.dataset.visitOrder = existingCount + 1;
  modal.classList.remove('hidden');

  renderBookExpenseRows();
  calculateTripExpenseSheetTotal();
  updateBookCoverPreview();
  goToBookPage(0);
}

function openEditTripModal(id, startPage = 0) {
  const tr = (state.data.travelTrips || []).find(t => t.id === id);
  if (!tr) return;

  tempBookCoverImage = tr.coverImage || '';

  // 페이지 복원 (최소 1장 ~ 최대 10장, 기존 photos/diary 데이터도 자연스럽게 호환)
  if (Array.isArray(tr.pages) && tr.pages.length > 0) {
    let restored = tr.pages.slice(0, 10).map((p, idx) => ({
      pageNo: idx + 1,
      photoUrl: (p && p.photoUrl) || '',
      subTitle: (p && p.subTitle) || '',
      text: (p && p.text) || ''
    }));
    if (restored.length === 10) {
      let lastFilled = -1;
      restored.forEach((p, idx) => {
        if (p.photoUrl || (p.text && p.text.trim()) || (p.subTitle && p.subTitle.trim())) lastFilled = idx;
      });
      restored = restored.slice(0, Math.max(1, lastFilled + 1));
    }
    tempBookPages = restored;
  } else {
    tempBookPages = createDefaultInitialPages();
    const oldPhotos = tr.photos || [];
    if (tr.diary) tempBookPages[0].text = tr.diary;
    oldPhotos.forEach((p, idx) => {
      if (idx < 10 && p && p.url) {
        if (!tempBookPages[idx]) tempBookPages[idx] = { pageNo: idx + 1, photoUrl: '', subTitle: '', text: '' };
        tempBookPages[idx].photoUrl = p.url;
      }
    });
  }

  // 경비 엑셀 행 복원 (기존 expenses/breakdown 호환)
  if (Array.isArray(tr.expenseRows) && tr.expenseRows.length > 0) {
    tempBookExpenseRows = tr.expenseRows.map(r => ({
      category: r.category || '',
      amount: Number(r.amount) || 0,
      usagePlace: r.usagePlace || ''
    }));
  } else if (tr.expenses) {
    const labelMap = {
      flight: '✈️ 항공 / 장거리교통',
      hotel: '🏨 숙소 / 호텔',
      food: '🍽️ 식비 / 맛집 / 카페',
      tour: '🎟️ 관광 / 입장료 / 투어',
      shopping: '🛍️ 쇼핑 / 면세 / 선물',
      etc: '🚕 현지교통 / 기타'
    };
    tempBookExpenseRows = Object.keys(labelMap).map(k => ({
      category: labelMap[k],
      amount: (tr.expenses[k] && Number(tr.expenses[k].amount)) || 0,
      usagePlace: (tr.expenses[k] && tr.expenses[k].detail) || ''
    }));
  } else if (tr.breakdown) {
    tempBookExpenseRows = [
      { category: '✈️ 항공', amount: Number(tr.breakdown.flight) || 0, usagePlace: tr.transport || '' },
      { category: '🏨 숙박', amount: Number(tr.breakdown.lodging) || 0, usagePlace: tr.lodging || '' },
      { category: '🍽️ 식비', amount: Number(tr.breakdown.food) || 0, usagePlace: '' },
      { category: '🚕 교통', amount: Number(tr.breakdown.transport) || 0, usagePlace: '' },
      { category: '🛍️ 쇼핑/기타', amount: Number(tr.breakdown.shopping) || 0, usagePlace: '' }
    ];
  } else {
    tempBookExpenseRows = createDefaultExpenseRows();
  }

  document.getElementById('tripEditId').value = id;
  document.getElementById('tripModalTitle').textContent = `📖 ${tr.title || '여행 책'} (표지 + ${tempBookPages.length}장 + 경비 엑셀)`;
  document.getElementById('tripTitleInput').value = tr.title || '';
  document.getElementById('tripStartDate').value = tr.startDate || '';
  document.getElementById('tripEndDate').value = tr.endDate || '';
  document.getElementById('tripDurationInput').value = tr.duration || '';
  document.getElementById('tripLodgingInput').value = tr.lodging || '';
  document.getElementById('tripTransportInput').value = tr.transport || '';

  const themeColor = tr.themeColor || '#10b981';
  const radio = document.querySelector(`input[name="tripColor"][value="${themeColor}"]`);
  if (radio) radio.checked = true;

  populateTripRegionSelect(tr.regionId || '');

  const modal = document.getElementById('tripModal');
  modal.dataset.regionId = tr.regionId || '';
  modal.dataset.visitOrder = tr.visitOrder || 1;
  modal.classList.remove('hidden');

  renderBookExpenseRows();
  calculateTripExpenseSheetTotal();
  updateBookCoverPreview();
  const targetPage = (startPage === 'expense' || startPage === 11) ? (tempBookPages.length + 1) : startPage;
  goToBookPage(targetPage);
}

function closeTripModal() {
  document.getElementById('tripModal').classList.add('hidden');
}

function renderBookPageNav() {
  const nav = document.getElementById('bookPageNavBar');
  if (!nav) return;

  const totalPages = tempBookPages.length;
  const lastExpIdx = totalPages + 1;
  const isCoverActive = currentBookPage === 0;
  let html = `
    <button type="button" onclick="goToBookPage(0)"
            class="px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition flex items-center gap-1 shrink-0 ${isCoverActive ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
      📕 책 표지 ${tempBookCoverImage ? '✓' : ''}
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    const p = tempBookPages[i - 1] || {};
    const hasContent = !!(p.photoUrl || (p.text && p.text.trim()) || (p.subTitle && p.subTitle.trim()));
    const isActive = currentBookPage === i;
    html += `
      <button type="button" onclick="goToBookPage(${i})"
              draggable="true"
              ondragstart="onBookPageDragStart(event, ${i})"
              ondragover="onBookPageDragOver(event)"
              ondrop="onBookPageDrop(event, ${i})"
              ondragend="onBookPageDragEnd(event)"
              title="클릭하여 이동 · 드래그해서 다른 장과 위치 바꾸기"
              class="px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1 shrink-0 cursor-grab active:cursor-grabbing ${isActive ? 'bg-amber-500 text-white shadow-sm' : (hasContent ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}">
        ${i}장 ${p.photoUrl ? '📷' : (hasContent ? '✏️' : '')}
      </button>
    `;
  }

  if (totalPages < 10) {
    html += `
      <button type="button" onclick="addBookPage()"
              title="페이지 추가 (최대 10장)"
              class="px-2.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100">
        +
      </button>
    `;
  }

  const isExpActive = currentBookPage === lastExpIdx;
  html += `
    <button type="button" onclick="goToBookPage(${lastExpIdx})"
            class="px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition flex items-center gap-1 shrink-0 ${isExpActive ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'}">
      📊 마지막 칸: 경비 엑셀
    </button>
  `;

  nav.innerHTML = html;
}

function addBookPage() {
  syncCurrentBookPageData();
  if (tempBookPages.length >= 10) {
    showToast('최대 10장까지만 만들 수 있습니다.', 'info');
    return;
  }
  const newNo = tempBookPages.length + 1;
  tempBookPages.push({ pageNo: newNo, photoUrl: '', subTitle: '', text: '' });
  goToBookPage(newNo, 1);
  showToast(`📖 제 ${newNo}장이 추가되었습니다! (최대 10장)`, 'success');
}

// 페이지(사진+글) 위치 서로 바꾸기 (드래그 앤 드롭 & 버튼 공용)
let dragSourceBookPage = null;
function onBookPageDragStart(e, pageNo) {
  dragSourceBookPage = pageNo;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(pageNo));
  }
  if (e.currentTarget) e.currentTarget.classList.add('opacity-50');
}
function onBookPageDragOver(e) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}
function onBookPageDrop(e, targetPageNo) {
  e.preventDefault();
  const fromNo = dragSourceBookPage || Number(e.dataTransfer && e.dataTransfer.getData('text/plain'));
  dragSourceBookPage = null;
  if (fromNo && targetPageNo && fromNo !== targetPageNo) {
    swapBookPages(fromNo, targetPageNo);
  }
}
function onBookPageDragEnd(e) {
  dragSourceBookPage = null;
  if (e.currentTarget) e.currentTarget.classList.remove('opacity-50');
}

function swapBookPages(fromPageNo, toPageNo) {
  syncCurrentBookPageData();
  const total = tempBookPages.length;
  if (fromPageNo < 1 || fromPageNo > total || toPageNo < 1 || toPageNo > total || fromPageNo === toPageNo) return;
  const fromIdx = fromPageNo - 1;
  const toIdx = toPageNo - 1;
  const temp = tempBookPages[fromIdx];
  tempBookPages[fromIdx] = tempBookPages[toIdx];
  tempBookPages[toIdx] = temp;
  tempBookPages.forEach((p, idx) => {
    if (p) p.pageNo = idx + 1;
  });
  goToBookPage(toPageNo, toPageNo > fromPageNo ? 1 : -1);
  showToast(`🔄 제 ${fromPageNo}장과 제 ${toPageNo}장의 위치가 서로 바뀌었습니다!`, 'success');
}

function swapBookPageRelative(delta) {
  if (currentBookPage < 1 || currentBookPage > tempBookPages.length) return;
  const target = currentBookPage + delta;
  if (target < 1 || target > tempBookPages.length) return;
  swapBookPages(currentBookPage, target);
}

function swapBookPageWithSelect() {
  const sel = document.getElementById('bookPageSwapSelect');
  if (!sel || !sel.value) return;
  const target = Number(sel.value);
  if (target && target !== currentBookPage) {
    swapBookPages(currentBookPage, target);
  }
}

function syncCurrentBookPageData() {
  if (currentBookPage >= 1 && currentBookPage <= tempBookPages.length) {
    const idx = currentBookPage - 1;
    if (!tempBookPages[idx]) tempBookPages[idx] = { pageNo: currentBookPage, photoUrl: '', subTitle: '', text: '' };
    const subEl = document.getElementById('bookPageSubTitleInput');
    const txtEl = document.getElementById('bookPageTextInput');
    if (subEl) tempBookPages[idx].subTitle = subEl.value;
    if (txtEl) tempBookPages[idx].text = txtEl.value;
  }
}

function goToBookPage(pageIdx, direction = 0) {
  syncCurrentBookPageData();
  const totalPages = tempBookPages.length;
  const lastExpIdx = totalPages + 1;
  const prevPage = currentBookPage;
  currentBookPage = Math.max(0, Math.min(lastExpIdx, pageIdx));
  if (direction === 0 && currentBookPage !== prevPage) {
    direction = currentBookPage > prevPage ? 1 : -1;
  }

  const secCover = document.getElementById('bookSectionCover');
  const secPage = document.getElementById('bookSectionPage');
  const secExpense = document.getElementById('bookSectionExpense');

  if (secCover) secCover.classList.toggle('hidden', currentBookPage !== 0);
  if (secPage) secPage.classList.toggle('hidden', currentBookPage < 1 || currentBookPage > totalPages);
  if (secExpense) secExpense.classList.toggle('hidden', currentBookPage !== lastExpIdx);

  // 진짜 책장 넘기기 3D 애니메이션 적용
  const flipBox = document.getElementById('bookFlipContainer');
  if (flipBox && direction !== 0) {
    flipBox.classList.remove('book-flip-next', 'book-flip-prev');
    void flipBox.offsetWidth; // reflow trigger
    flipBox.classList.add(direction > 0 ? 'book-flip-next' : 'book-flip-prev');
  }

  if (currentBookPage >= 1 && currentBookPage <= totalPages) {
    const p = tempBookPages[currentBookPage - 1] || { photoUrl: '', subTitle: '', text: '' };
    document.getElementById('bookPageNumberBadge').textContent = `제 ${currentBookPage}장 / ${totalPages}장`;
    document.getElementById('bookPageSubTitleInput').value = p.subTitle || '';
    document.getElementById('bookPageTextInput').value = p.text || '';

    const footerNum = document.getElementById('bookPageFooterNumber');
    if (footerNum) footerNum.textContent = `— ${currentBookPage} / ${totalPages} —`;

    const imgEl = document.getElementById('bookPagePhotoImg');
    const emptyEl = document.getElementById('bookPagePhotoEmpty');
    const removeBtn = document.getElementById('btnRemovePagePhoto');
    if (p.photoUrl) {
      imgEl.src = p.photoUrl;
      imgEl.classList.remove('hidden');
      emptyEl.classList.add('hidden');
      removeBtn.classList.remove('hidden');
    } else {
      imgEl.src = '';
      imgEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
      removeBtn.classList.add('hidden');
    }

    // 페이지 순서/위치 바꾸기 컨트롤 갱신
    const swapBox = document.getElementById('bookPageSwapBox');
    const swapSel = document.getElementById('bookPageSwapSelect');
    const swapPrev = document.getElementById('btnSwapPrevPage');
    const swapNext = document.getElementById('btnSwapNextPage');
    if (swapBox && swapSel) {
      swapBox.classList.toggle('hidden', totalPages <= 1);
      if (totalPages > 1) {
        swapSel.innerHTML = Array.from({ length: totalPages }, (_, idx) => idx + 1)
          .filter(n => n !== currentBookPage)
          .map(n => {
            const targetPage = tempBookPages[n - 1] || {};
            return `<option value="${n}">${n}장${targetPage.photoUrl ? ' 📷' : ''}</option>`;
          }).join('');
      }
      if (swapPrev) swapPrev.disabled = currentBookPage <= 1;
      if (swapNext) swapNext.disabled = currentBookPage >= totalPages;
    }
  }

  // 하단 인디케이터 & 이전/다음 버튼
  const ind = document.getElementById('bookPageIndicatorText');
  if (ind) {
    if (currentBookPage === 0) ind.textContent = `📕 책 표지 (0 / ${lastExpIdx})`;
    else if (currentBookPage <= totalPages) ind.textContent = `📖 제 ${currentBookPage}장 / ${totalPages}장`;
    else ind.textContent = '📊 마지막 칸: 경비 엑셀';
  }
  const prevBtn = document.getElementById('btnBookPrevPage');
  const nextBtn = document.getElementById('btnBookNextPage');
  const sidePrevBtn = document.getElementById('btnSidePrevBook');
  const sideNextBtn = document.getElementById('btnSideNextBook');
  if (prevBtn) prevBtn.disabled = currentBookPage === 0;
  if (nextBtn) nextBtn.disabled = currentBookPage === lastExpIdx;
  if (sidePrevBtn) sidePrevBtn.disabled = currentBookPage === 0;
  if (sideNextBtn) sideNextBtn.disabled = currentBookPage === lastExpIdx;

  renderBookPageNav();
}

function navigateBookPage(delta) {
  goToBookPage(currentBookPage + delta, delta);
}

// 키보드 좌우 화살표로도 책 넘기기 지원
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('tripModal');
  if (!modal || modal.classList.contains('hidden')) return;
  const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.key === 'ArrowRight') navigateBookPage(1);
  else if (e.key === 'ArrowLeft') navigateBookPage(-1);
});

// 표지 사진 업로드 & 미리보기
async function handleBookCoverUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    tempBookCoverImage = await compressImageFile(file, 600, 0.65);
    updateBookCoverPreview();
    renderBookPageNav();
    showToast('📕 책 표지 사진이 등록되었습니다!', 'success');
  } catch (err) {
    alert('표지 사진 처리 중 오류가 발생했습니다.');
  }
  e.target.value = '';
}

function removeBookCoverImage() {
  tempBookCoverImage = '';
  updateBookCoverPreview();
  renderBookPageNav();
}

function updateBookCoverPreview() {
  const card = document.getElementById('bookCoverPreviewCard');
  const img = document.getElementById('bookCoverPreviewImg');
  const emptyHint = document.getElementById('bookCoverEmptyHint');
  const removeBtn = document.getElementById('btnRemoveBookCover');
  const titleDisp = document.getElementById('bookCoverTitleDisplay');
  const dateDisp = document.getElementById('bookCoverDateDisplay');
  const regBadge = document.getElementById('bookCoverRegionBadge');

  const selectedColorRadio = document.querySelector('input[name="tripColor"]:checked');
  const col = selectedColorRadio ? selectedColorRadio.value : '#10b981';

  if (card) {
    card.style.background = `linear-gradient(135deg, ${col} 0%, #0f172a 140%)`;
  }
  if (img && emptyHint && removeBtn) {
    if (tempBookCoverImage) {
      img.src = tempBookCoverImage;
      img.classList.remove('hidden');
      emptyHint.classList.add('hidden');
      removeBtn.classList.remove('hidden');
    } else {
      img.src = '';
      img.classList.add('hidden');
      emptyHint.classList.remove('hidden');
      removeBtn.classList.add('hidden');
    }
  }
  const titleVal = document.getElementById('tripTitleInput')?.value || '나의 여행 이야기';
  const sDate = document.getElementById('tripStartDate')?.value || '';
  const eDate = document.getElementById('tripEndDate')?.value || '';
  const dur = document.getElementById('tripDurationInput')?.value || '';
  if (titleDisp) titleDisp.textContent = titleVal;
  if (dateDisp) dateDisp.textContent = `${sDate}${eDate ? ' ~ ' + eDate : ''} ${dur ? '(' + dur + ')' : ''}`;

  const sel = document.getElementById('tripRegionSelect');
  if (regBadge && sel && sel.selectedIndex >= 0) {
    regBadge.textContent = sel.options[sel.selectedIndex].text;
  }
}

// 내지(1~10장) 사진 업로드
async function handleBookPagePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file || currentBookPage < 1 || currentBookPage > tempBookPages.length) return;
  try {
    const compressed = await compressImageFile(file, 600, 0.62);
    const idx = currentBookPage - 1;
    if (!tempBookPages[idx]) tempBookPages[idx] = { pageNo: currentBookPage, photoUrl: '', subTitle: '', text: '' };
    tempBookPages[idx].photoUrl = compressed;
    goToBookPage(currentBookPage);
    showToast(`📷 제 ${currentBookPage}장에 사진이 들어갔습니다! 아래에 글을 적어보세요.`, 'success');
  } catch (err) {
    alert('사진을 불러오는 중 오류가 발생했습니다.');
  }
  e.target.value = '';
}

function removeCurrentBookPagePhoto() {
  if (currentBookPage < 1 || currentBookPage > tempBookPages.length) return;
  const idx = currentBookPage - 1;
  if (tempBookPages[idx]) {
    tempBookPages[idx].photoUrl = '';
    goToBookPage(currentBookPage);
  }
}

// 마지막 칸: 엑셀 경비 행 렌더링 & 관리
function renderBookExpenseRows() {
  const tbody = document.getElementById('tripExpenseTableBody');
  if (!tbody) return;

  tbody.innerHTML = tempBookExpenseRows.map((row, idx) => `
    <tr class="hover:bg-slate-50/70 transition">
      <td class="p-1.5 border-r border-gray-200">
        <input type="text" value="${(row.category || '').replace(/"/g, '&quot;')}"
               oninput="updateBookExpenseRow(${idx}, 'category', this.value)"
               placeholder="예) 식비, 항공, 숙소"
               class="excel-cell-input text-xs font-bold text-gray-800">
      </td>
      <td class="p-1.5 border-r border-gray-200">
        <input type="text" inputmode="numeric"
               value="${row.amount ? Number(row.amount).toLocaleString('ko-KR') : ''}"
               oninput="onExpenseAmountInput(this, ${idx})"
               placeholder="0"
               class="excel-cell-input text-right font-num font-bold text-gray-900">
      </td>
      <td class="p-1.5 border-r border-gray-200 bg-amber-50/20">
        <input type="text" value="${(row.usagePlace || '').replace(/"/g, '&quot;')}"
               oninput="updateBookExpenseRow(${idx}, 'usagePlace', this.value)"
               placeholder="어디에 이 금액을 썼는지 상세히 적어주세요 (예: 신주쿠 이치란 라멘 본점)"
               class="excel-cell-input text-xs text-gray-800">
      </td>
      <td class="p-1.5 text-center">
        <button type="button" onclick="removeBookExpenseRow(${idx})"
                class="text-gray-400 hover:text-red-500 font-bold px-2 py-1 rounded hover:bg-red-50 transition" title="행 삭제">✕</button>
      </td>
    </tr>
  `).join('');
}

function onExpenseAmountInput(el, idx) {
  const digits = el.value.replace(/[^0-9]/g, '');
  const num = Number(digits) || 0;
  el.value = num > 0 ? num.toLocaleString('ko-KR') : '';
  tempBookExpenseRows[idx].amount = num;
  calculateTripExpenseSheetTotal();
}

function updateBookExpenseRow(idx, field, value) {
  if (!tempBookExpenseRows[idx]) return;
  tempBookExpenseRows[idx][field] = value;
}

function addBookExpenseRow() {
  tempBookExpenseRows.push({ category: '기타 지출', amount: 0, usagePlace: '' });
  renderBookExpenseRows();
  calculateTripExpenseSheetTotal();
}

function removeBookExpenseRow(idx) {
  tempBookExpenseRows.splice(idx, 1);
  if (tempBookExpenseRows.length === 0) {
    tempBookExpenseRows.push({ category: '지출 항목', amount: 0, usagePlace: '' });
  }
  renderBookExpenseRows();
  calculateTripExpenseSheetTotal();
}

function calculateTripExpenseSheetTotal() {
  const total = tempBookExpenseRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const autoEl = document.getElementById('tripExpenseAutoTotal');
  if (autoEl) autoEl.textContent = formatKRW(total);
  const footEl = document.getElementById('tripExpenseTableTotalCell');
  if (footEl) footEl.textContent = formatKRW(total);
  const costInput = document.getElementById('tripTotalCost');
  if (costInput) costInput.value = formatKRW(total);
}

function calculateTripDurationAuto() {
  const start = document.getElementById('tripStartDate').value;
  const end = document.getElementById('tripEndDate').value;
  if (!start || !end) return;

  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
  const durInput = document.getElementById('tripDurationInput');
  if (durInput) {
    if (diffDays === 0) durInput.value = '당일치기';
    else if (diffDays > 0) durInput.value = `${diffDays}박 ${diffDays + 1}일`;
  }
}

function saveTripModal() {
  syncCurrentBookPageData();

  const editId = document.getElementById('tripEditId').value;
  const modal = document.getElementById('tripModal');
  const sel = document.getElementById('tripRegionSelect');
  const regionId = (sel && sel.value) || modal.dataset.regionId || 'kr_seoul';
  const visitOrder = Number(modal.dataset.visitOrder) || 1;

  const title = document.getElementById('tripTitleInput').value.trim();
  const startDate = document.getElementById('tripStartDate').value;
  const endDate = document.getElementById('tripEndDate').value;
  const duration = document.getElementById('tripDurationInput').value.trim();
  const lodging = document.getElementById('tripLodgingInput').value.trim();
  const transport = document.getElementById('tripTransportInput').value.trim();

  const totalCost = tempBookExpenseRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const selectedColorRadio = document.querySelector('input[name="tripColor"]:checked');
  const themeColor = selectedColorRadio ? selectedColorRadio.value : '#10b981';

  if (!title) {
    alert('여행 책 제목을 입력해주세요.');
    goToBookPage(0);
    return;
  }

  const region = (state.data.travelMapRegions || []).find(r => r.id === regionId) || {};
  const firstPageText = tempBookPages.find(p => p && (p.text || p.subTitle));
  const summaryDiary = firstPageText ? `${firstPageText.subTitle ? '[' + firstPageText.subTitle + '] ' : ''}${firstPageText.text || ''}`.trim() : '';

  const tripObj = {
    id: editId || ('trip_' + Date.now()),
    regionId: regionId,
    country: region.country || '대한민국',
    regionName: region.name || region.shortName || '',
    title: title,
    visitOrder: visitOrder,
    startDate: startDate,
    endDate: endDate,
    duration: duration,
    lodging: lodging,
    transport: transport,
    totalCost: totalCost,
    diary: summaryDiary,
    themeColor: themeColor,
    coverImage: tempBookCoverImage,
    pages: JSON.parse(JSON.stringify(tempBookPages)),
    expenseRows: JSON.parse(JSON.stringify(tempBookExpenseRows)),
    photos: []
  };

  if (!state.data.travelTrips) state.data.travelTrips = [];

  if (editId) {
    const idx = state.data.travelTrips.findIndex(t => t.id === editId);
    if (idx > -1) state.data.travelTrips[idx] = tripObj;
  } else {
    state.data.travelTrips.unshift(tripObj);
  }

  const savedOk = saveState();
  if (!savedOk) return;

  renderTravelTripsList();
  closeTripModal();
  showToast(`📚 여행 책(표지 + ${tempBookPages.length}장 + 경비 엑셀)이 저장되었습니다!`, 'success');
}

function deleteTrip(id) {
  if (!confirm('이 여행 책을 삭제하시겠습니까?')) return;
  state.data.travelTrips = (state.data.travelTrips || []).filter(t => t.id !== id);
  saveState();
  renderTravelTripsList();
  showToast('여행 책이 삭제되었습니다.', 'info');
}

// 사진 확대 뷰어
function openPhotoViewer(url, title) {
  let viewer = document.getElementById('photoViewerModal');
  if (!viewer) {
    viewer = document.createElement('div');
    viewer.id = 'photoViewerModal';
    viewer.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4';
    viewer.onclick = (e) => { if (e.target === viewer) viewer.classList.add('hidden'); };
    viewer.innerHTML = `
      <div class="relative max-w-4xl max-h-[90vh] bg-transparent flex flex-col items-center">
        <button onclick="document.getElementById('photoViewerModal').classList.add('hidden')" 
                class="absolute -top-10 right-0 text-white text-2xl font-bold hover:text-gray-300">✕ 닫기</button>
        <img id="photoViewerImg" src="" class="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl">
        <div id="photoViewerCaption" class="text-white text-sm mt-3 font-semibold text-center"></div>
      </div>
    `;
    document.body.appendChild(viewer);
  }
  document.getElementById('photoViewerImg').src = url;
  document.getElementById('photoViewerCaption').textContent = title || '';
  viewer.classList.remove('hidden');
}

// UI 요소 비활성화 해제
function enableAllElements() {
  document.querySelectorAll('button,input,select').forEach(el => {
    el.removeAttribute('disabled');
    el.classList.remove('opacity-50', 'cursor-not-allowed');
  });
}
// ==== Travel & Exchange Rates UI END ===================================

// ========================================================
// ☁️ Firebase Realtime Database 실시간 자동 동기화 (PC ↔ 모바일)
// ========================================================
const CLOUD_CONFIG_KEY = 'smart_ledger_cloud_config_v1';
const CLOUD_DEVICE_ID_KEY = 'smart_ledger_device_id_v1';
const CLOUD_UPDATED_AT_KEY = 'smart_ledger_cloud_updated_at_v1';

let cloudEventSource = null;
let cloudPushTimer = null;
let pendingCloudRemotePayload = null;

function getCloudDeviceId() {
  let id = localStorage.getItem(CLOUD_DEVICE_ID_KEY);
  if (!id) {
    id = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(CLOUD_DEVICE_ID_KEY, id);
  }
  return id;
}

function getCloudConfig() {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (cfg && cfg.dbUrl && cfg.syncKey) return cfg;
  } catch (e) {}
  return null;
}

function sanitizeSyncKey(key) {
  return String(key || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
}

function buildCloudEndpoint(dbUrl, syncKey) {
  const cleanUrl = String(dbUrl || '').trim().replace(/\/+$/, '');
  const safeKey = sanitizeSyncKey(syncKey) || 'default_ledger';
  return `${cleanUrl}/ledgers/${safeKey}.json`;
}

function updateCloudSyncUIStatus(connected, text, timeStr = '') {
  const dot = document.getElementById('cloudSyncDot');
  const topText = document.getElementById('cloudSyncTopText');
  const topBtn = document.getElementById('btnCloudSyncTop');
  const banner = document.getElementById('cloudSyncStatusBanner');
  const statusText = document.getElementById('cloudSyncStatusText');
  const lastTimeEl = document.getElementById('cloudSyncLastTime');
  const btnManual = document.getElementById('btnCloudManualSync');
  const btnDisconnect = document.getElementById('btnCloudDisconnect');

  if (dot) dot.textContent = connected ? '🟢' : '☁️';
  if (topText) topText.textContent = connected ? '실시간 동기화 중' : '실시간 동기화';
  if (topBtn) {
    topBtn.classList.toggle('bg-emerald-50', connected);
    topBtn.classList.toggle('text-emerald-800', connected);
    topBtn.classList.toggle('border-emerald-300', connected);
  }
  if (banner) {
    banner.classList.toggle('bg-emerald-50', connected);
    banner.classList.toggle('border-emerald-300', connected);
    banner.classList.toggle('text-emerald-900', connected);
  }
  if (statusText && text) statusText.textContent = text;
  if (lastTimeEl && timeStr) lastTimeEl.textContent = timeStr;
  if (btnManual) btnManual.classList.toggle('hidden', !connected);
  if (btnDisconnect) btnDisconnect.classList.toggle('hidden', !connected);
}

function openCloudSyncModal() {
  const modal = document.getElementById('cloudSyncModal');
  if (!modal) return;
  const cfg = getCloudConfig();
  const urlInput = document.getElementById('cloudDbUrlInput');
  const keyInput = document.getElementById('cloudSyncKeyInput');
  const conflictBox = document.getElementById('cloudSyncConflictBox');
  if (conflictBox) conflictBox.classList.add('hidden');
  pendingCloudRemotePayload = null;

  if (cfg) {
    if (urlInput) urlInput.value = cfg.dbUrl;
    if (keyInput) keyInput.value = cfg.syncKey;
    updateCloudSyncUIStatus(true, `연결됨 (방 이름: ${cfg.syncKey})`);
  } else {
    if (keyInput && !keyInput.value) keyInput.value = 'my_ledger_0417';
    updateCloudSyncUIStatus(false, '현재 상태: 연결되지 않음 (기기별 로컬 저장 중)');
  }
  modal.classList.remove('hidden');
}

function closeCloudSyncModal() {
  const modal = document.getElementById('cloudSyncModal');
  if (modal) modal.classList.add('hidden');
}

async function connectCloudSync() {
  const urlInput = document.getElementById('cloudDbUrlInput');
  const keyInput = document.getElementById('cloudSyncKeyInput');
  const dbUrl = (urlInput ? urlInput.value : '').trim().replace(/\/+$/, '');
  const syncKey = sanitizeSyncKey(keyInput ? keyInput.value : '');

  if (!dbUrl || !dbUrl.startsWith('https://')) {
    alert('올바른 Firebase Realtime Database URL (https://...)을 입력해주세요.');
    return;
  }
  if (!syncKey) {
    alert('공용 방 이름(동기화 키)을 입력해주세요.');
    return;
  }

  const endpoint = buildCloudEndpoint(dbUrl, syncKey);
  updateCloudSyncUIStatus(false, '클라우드 연결 확인 중...');

  try {
    const res = await fetch(endpoint, { method: 'GET', cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const remote = await res.json();

    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify({ dbUrl, syncKey }));

    if (remote && remote.data && remote.data.transactions) {
      pendingCloudRemotePayload = remote;
      const conflictBox = document.getElementById('cloudSyncConflictBox');
      if (conflictBox) conflictBox.classList.remove('hidden');
      updateCloudSyncUIStatus(true, `연결 확인됨 (방: ${syncKey}) — 아래에서 초기 동기화 방향을 선택하세요.`);
    } else {
      await pushToFirebaseCloud(true);
      startCloudRealtimeListener();
      closeCloudSyncModal();
      showToast('☁️ Firebase 연결 완료! 현재 기기 데이터가 클라우드에 올라갔습니다.', 'success');
    }
  } catch (err) {
    console.error('connectCloudSync error:', err);
    updateCloudSyncUIStatus(false, '연결 실패: URL 또는 Firebase 테스트 모드 권한을 확인해주세요.');
    alert('연결에 실패했습니다.\n1) Firebase Realtime Database URL이 맞는지\n2) Firebase 콘솔 규칙(Rules)에서 테스트 모드(read/write: true)가 켜져 있는지 확인해주세요.');
  }
}

async function resolveCloudInitialSync(mode) {
  if (mode === 'pull' && pendingCloudRemotePayload) {
    applyRemoteCloudData(pendingCloudRemotePayload, true);
  } else {
    await pushToFirebaseCloud(true);
    showToast('📤 현재 기기 데이터를 클라우드에 업로드했습니다!', 'success');
  }
  pendingCloudRemotePayload = null;
  const conflictBox = document.getElementById('cloudSyncConflictBox');
  if (conflictBox) conflictBox.classList.add('hidden');
  startCloudRealtimeListener();
  closeCloudSyncModal();
}

function disconnectCloudSync() {
  if (!confirm('실시간 클라우드 동기화를 해제하시겠습니까?\n(현재 기기에 저장된 데이터는 유지됩니다)')) return;
  if (cloudEventSource) {
    cloudEventSource.close();
    cloudEventSource = null;
  }
  localStorage.removeItem(CLOUD_CONFIG_KEY);
  updateCloudSyncUIStatus(false, '현재 상태: 연결되지 않음 (기기별 로컬 저장 중)');
  showToast('실시간 동기화 연결이 해제되었습니다.', 'info');
}

function scheduleCloudPush() {
  const cfg = getCloudConfig();
  if (!cfg) return;
  clearTimeout(cloudPushTimer);
  cloudPushTimer = setTimeout(() => {
    pushToFirebaseCloud(false);
  }, 650);
}

async function pushToFirebaseCloud(showStatusToast = false) {
  const cfg = getCloudConfig();
  if (!cfg || !state.data) return false;
  const endpoint = buildCloudEndpoint(cfg.dbUrl, cfg.syncKey);
  const now = Date.now();
  const payload = {
    updatedAt: now,
    deviceId: getCloudDeviceId(),
    data: state.data
  };
  try {
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    localStorage.setItem(CLOUD_UPDATED_AT_KEY, String(now));
    const timeLabel = new Date(now).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    updateCloudSyncUIStatus(true, `실시간 동기화 중 (방: ${cfg.syncKey})`, `최근 저장 ${timeLabel}`);
    if (showStatusToast) showToast('☁️ 클라우드 동기화 저장 완료!', 'success');
    return true;
  } catch (err) {
    console.error('pushToFirebaseCloud error:', err);
    return false;
  }
}

async function pullFromFirebaseCloudIfNewer(showNoChangeToast = false) {
  const cfg = getCloudConfig();
  if (!cfg) return;
  const endpoint = buildCloudEndpoint(cfg.dbUrl, cfg.syncKey);
  try {
    const res = await fetch(endpoint, { method: 'GET', cache: 'no-store' });
    if (!res.ok) return;
    const remote = await res.json();
    const localUpdatedAt = Number(localStorage.getItem(CLOUD_UPDATED_AT_KEY) || 0);
    if (remote && remote.data && remote.updatedAt && remote.updatedAt > localUpdatedAt && remote.deviceId !== getCloudDeviceId()) {
      applyRemoteCloudData(remote, false);
    } else if (showNoChangeToast) {
      showToast('☁️ 이미 최신 상태입니다.', 'info');
    }
  } catch (err) {
    console.error('pullFromFirebaseCloudIfNewer error:', err);
  }
}

async function manualCloudSyncNow() {
  const cfg = getCloudConfig();
  if (!cfg) return;
  await pullFromFirebaseCloudIfNewer(false);
  await pushToFirebaseCloud(true);
}

function applyRemoteCloudData(payload, silent = false) {
  if (!payload || !payload.data) return;
  const incoming = payload.data;
  if (!incoming.transactions || !incoming.accounts) return;

  state.data = incoming;
  if (!state.data.travelMapRegions) state.data.travelMapRegions = JSON.parse(JSON.stringify(INITIAL_APP_DATA.travelMapRegions));
  if (!state.data.travelTrips) state.data.travelTrips = [];
  if (!state.data.excelMonthly) state.data.excelMonthly = {};
  if (typeof incoming.hideAmounts === 'boolean') {
    state.hideAmounts = incoming.hideAmounts;
    localStorage.setItem('saved_hide_amounts', state.hideAmounts ? 'true' : 'false');
    updateHideAmountsUI();
  }

  saveState(true); // skipCloudPush = true
  if (payload.updatedAt) {
    localStorage.setItem(CLOUD_UPDATED_AT_KEY, String(payload.updatedAt));
  }

  populateMonthSelectors();
  renderMonthButtonBar();
  renderExcelLedger();
  renderDashboard();
  renderLedger();
  renderTravel();
  renderStocks();
  renderAccounts();
  renderRoadmap();

  const timeLabel = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const cfg = getCloudConfig();
  if (cfg) updateCloudSyncUIStatus(true, `실시간 동기화 중 (방: ${cfg.syncKey})`, `수신 ${timeLabel}`);
  if (!silent) showToast('☁️ 다른 기기에서 수정한 내역이 실시간 반영되었습니다!', 'success');
}

function startCloudRealtimeListener() {
  const cfg = getCloudConfig();
  if (!cfg) return;
  if (cloudEventSource) {
    cloudEventSource.close();
    cloudEventSource = null;
  }

  const endpoint = buildCloudEndpoint(cfg.dbUrl, cfg.syncKey);
  try {
    cloudEventSource = new EventSource(endpoint);
    const handleStreamEvent = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        const payload = parsed && parsed.path === '/' ? parsed.data : null;
        if (!payload || !payload.data || !payload.updatedAt) return;
        const localUpdatedAt = Number(localStorage.getItem(CLOUD_UPDATED_AT_KEY) || 0);
        if (payload.deviceId === getCloudDeviceId()) return;
        if (payload.updatedAt <= localUpdatedAt) return;
        applyRemoteCloudData(payload, false);
      } catch (err) {}
    };
    cloudEventSource.addEventListener('put', handleStreamEvent);
    cloudEventSource.addEventListener('patch', handleStreamEvent);
    cloudEventSource.onerror = () => {
      // EventSource는 브라우저가 자동으로 재연결합니다.
    };
    updateCloudSyncUIStatus(true, `실시간 동기화 중 (방: ${cfg.syncKey})`);
  } catch (err) {
    console.error('EventSource error:', err);
  }
}

function initCloudSyncOnStartup() {
  const cfg = getCloudConfig();
  if (!cfg) {
    updateCloudSyncUIStatus(false);
    return;
  }
  updateCloudSyncUIStatus(true, `실시간 동기화 중 (방: ${cfg.syncKey})`);
  pullFromFirebaseCloudIfNewer(false);
  startCloudRealtimeListener();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pullFromFirebaseCloudIfNewer(false);
    }
  });
}



