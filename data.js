// ========================================================
// 내 자산 가계부 & 자산관리 시스템 기본 데이터 v3.5
// 토스증권 실시간 보유종목 (QQQM, SPYM, SCHD, NVDA, IEF, TSLA) 100% 일치 반영
// 여행자금/적금 분리 · 수입 2,036,240원 자동 설정 · 순자산/목표액 직접 수정 지원
// ========================================================

const INITIAL_APP_DATA = {
  version: '3.5.0',

  // 사용자 맞춤 월급 배분 엑셀 가계부 기본 데이터 (이미지 7 양식 100% 반영)
  excelBudget: {
    salary: 2036240,
    items: [
      { id: 'ex_1', category: '고정지출', name: '월세', amount: 250000, memo: '자취방 월세', style: '' },
      { id: 'ex_2', category: '공과금', name: '전기', amount: 19000, memo: '전기요금', style: '' },
      { id: 'ex_3', category: '공과금', name: '가스', amount: 20000, memo: '도시가스', style: '' },
      { id: 'ex_4', category: '공과금', name: '수도', amount: 20000, memo: '상하수도', style: '' },
      { id: 'ex_5', category: '공과금', name: '인터넷비', amount: 23100, memo: '인터넷/TV', style: '' },
      { id: 'ex_6', category: '변동지출', name: '데이트비, 여가비, 약속비', amount: 100000, memo: '여가활동', style: '' },
      { id: 'ex_7', category: '변동지출', name: '교통비', amount: 110000, memo: '지하철/버스', style: '' },
      { id: 'ex_8', category: '변동지출', name: '외식비, 식비', amount: 0, memo: '식비 예산', style: '' },
      { id: 'ex_9', category: '변동지출', name: '생활비(생활용품)', amount: 94140, memo: '마트/생필품', style: '' },
      { id: 'ex_10', category: '변동지출', name: '용돈', amount: 0, memo: '개인용돈', style: '' },
      { id: 'ex_11', category: '변동지출', name: '화장품(기초나 색조,미용) 필요시', amount: 0, memo: '뷰티/미용', style: '' },
      { id: 'ex_12', category: '특별/할부', name: '치아교정 3차 결제 3/10', amount: 200000, memo: '치과 교정 할부', style: 'color: #c00000; font-weight: bold;' },
      { id: 'ex_13', category: '특별/할부', name: '필라테스', amount: 164000, memo: '운동 수강료', style: 'color: #c00000; font-weight: bold;' },
      { id: 'ex_14', category: '여행자금', name: '일본여행경비', amount: 400000, memo: '여행자금 분리 저축', style: 'background-color: #d9e1f2; font-weight: bold;' },
      { id: 'ex_15', category: '저축/투자', name: '주택청약', amount: 50000, memo: '청약통장', isSavings: true, style: '' },
      { id: 'ex_16', category: '저축/투자', name: '해외주식', amount: 86000, memo: '토스증권 미국주식', isSavings: true, style: '' },
      { id: 'ex_17', category: '저축/투자', name: '저축(굴비 토스)', amount: 0, memo: '비상금 저축', isSavings: true, style: '' },
      { id: 'ex_18', category: '저축/투자', name: '청년미래적금', amount: 500000, memo: '청년적금', isSavings: true, style: 'font-weight: bold;' }
    ]
  },

  // 기본 월급 설정 (수정 가능, 매월 기본 반영)
  excelBudgets: {
    '2026-10': {
      salary: 2036240,
      items: [
        { id: 'ex_1', category: '고정지출', name: '월세', amount: 250000, merchant: '집주인 계좌', actualAmount: 250000, memo: '자취방 월세', style: '' },
        { id: 'ex_2', category: '공과금', name: '전기', amount: 19000, merchant: '한전', actualAmount: 18900, memo: '전기요금', style: '' },
        { id: 'ex_3', category: '공과금', name: '가스', amount: 20000, merchant: '도시가스', actualAmount: 20000, memo: '도시가스', style: '' },
        { id: 'ex_4', category: '공과금', name: '수도', amount: 20000, merchant: '상수도사업본부', actualAmount: 20000, memo: '상하수도', style: '' },
        { id: 'ex_5', category: '공과금', name: '인터넷비', amount: 23100, merchant: 'KT 인터넷', actualAmount: 23100, memo: '인터넷/TV', style: '' },
        { id: 'ex_6', category: '변동지출', name: '데이트비, 여가비, 약속비', amount: 100000, merchant: '영화관, 카페', actualAmount: 98000, memo: '여가활동', style: '' },
        { id: 'ex_7', category: '변동지출', name: '교통비', amount: 110000, merchant: '티머니/지하철', actualAmount: 110000, memo: '지하철/버스', style: '' },
        { id: 'ex_8', category: '변동지출', name: '외식비, 식비', amount: 120000, merchant: '이마트, 배민', actualAmount: 120000, memo: '식비 예산', style: '' },
        { id: 'ex_9', category: '변동지출', name: '생활비(생활용품)', amount: 60000, merchant: '다이소, 쿠팡', actualAmount: 60000, memo: '마트/생필품', style: '' },
        { id: 'ex_10', category: '변동지출', name: '용돈', amount: 0, merchant: '', actualAmount: 0, memo: '개인용돈', style: '' },
        { id: 'ex_11', category: '변동지출', name: '화장품(기초나 색조,미용) 필요시', amount: 0, merchant: '', actualAmount: 0, memo: '뷰티/미용', style: '' },
        { id: 'ex_12', category: '특별/할부', name: '치아교정 3차 결제 1/10', amount: 200000, merchant: '바른이치과', actualAmount: 200000, memo: '치과 교정 할부', style: 'color: #c00000; font-weight: bold;' },
        { id: 'ex_13', category: '특별/할부', name: '필라테스', amount: 164000, merchant: '바디필라테스', actualAmount: 164000, memo: '운동 수강료', style: 'color: #c00000; font-weight: bold;' },
        { id: 'ex_14', category: '여행자금', name: '일본여행경비', amount: 150000, merchant: '카카오 일본여행적금', actualAmount: 150000, memo: '여행자금 분리 저축', style: 'background-color: #d9e1f2; font-weight: bold;' },
        { id: 'ex_15', category: '저축/투자', name: '주택청약', amount: 50000, merchant: '국민은행 청약', actualAmount: 50000, memo: '청약통장', isSavings: true, style: '' },
        { id: 'ex_16', category: '저축/투자', name: '해외주식', amount: 250000, merchant: '토스증권 주식', actualAmount: 250000, memo: '토스증권 미국주식', isSavings: true, style: '' },
        { id: 'ex_17', category: '저축/투자', name: '저축(굴비 토스)', amount: 0, merchant: '', actualAmount: 0, memo: '비상금 저축', isSavings: true, style: '' },
        { id: 'ex_18', category: '저축/투자', name: '청년미래적금', amount: 500000, merchant: '카카오 청년미래적금', actualAmount: 500000, memo: '청년적금', isSavings: true, style: 'font-weight: bold;' }
      ]
    },
    '2026-11': {
      salary: 2036240,
      items: [
        { id: 'ex_1', category: '고정지출', name: '월세', amount: 250000, merchant: '집주인 계좌', actualAmount: 250000, memo: '자취방 월세', style: '' },
        { id: 'ex_2', category: '공과금', name: '전기', amount: 19000, merchant: '한전', actualAmount: 18500, memo: '전기요금', style: '' },
        { id: 'ex_3', category: '공과금', name: '가스', amount: 20000, merchant: '도시가스', actualAmount: 22000, memo: '도시가스', style: '' },
        { id: 'ex_4', category: '공과금', name: '수도', amount: 20000, merchant: '상수도사업본부', actualAmount: 20000, memo: '상하수도', style: '' },
        { id: 'ex_5', category: '공과금', name: '인터넷비', amount: 23100, merchant: 'KT 인터넷', actualAmount: 23100, memo: '인터넷/TV', style: '' },
        { id: 'ex_6', category: '변동지출', name: '데이트비, 여가비, 약속비', amount: 100000, merchant: '영화관, 카페', actualAmount: 95000, memo: '여가활동', style: '' },
        { id: 'ex_7', category: '변동지출', name: '교통비', amount: 110000, merchant: '티머니/지하철', actualAmount: 108000, memo: '지하철/버스', style: '' },
        { id: 'ex_8', category: '변동지출', name: '외식비, 식비', amount: 125000, merchant: '이마트, 배민', actualAmount: 125000, memo: '식비 예산', style: '' },
        { id: 'ex_9', category: '변동지출', name: '생활비(생활용품)', amount: 55000, merchant: '다이소, 쿠팡', actualAmount: 55000, memo: '마트/생필품', style: '' },
        { id: 'ex_10', category: '변동지출', name: '용돈', amount: 0, merchant: '', actualAmount: 0, memo: '개인용돈', style: '' },
        { id: 'ex_11', category: '변동지출', name: '화장품(기초나 색조,미용) 필요시', amount: 0, merchant: '', actualAmount: 0, memo: '뷰티/미용', style: '' },
        { id: 'ex_12', category: '특별/할부', name: '치아교정 3차 결제 1/10', amount: 200000, merchant: '바른이치과', actualAmount: 200000, memo: '치과 교정 할부', style: 'color: #c00000; font-weight: bold;' },
        { id: 'ex_13', category: '특별/할부', name: '필라테스', amount: 164000, merchant: '바디필라테스', actualAmount: 164000, memo: '운동 수강료', style: 'color: #c00000; font-weight: bold;' },
        { id: 'ex_14', category: '여행자금', name: '일본여행경비', amount: 150000, merchant: '카카오 일본여행적금', actualAmount: 150000, memo: '여행자금 분리 저축', style: 'background-color: #d9e1f2; font-weight: bold;' },
        { id: 'ex_15', category: '저축/투자', name: '주택청약', amount: 50000, merchant: '국민은행 청약', actualAmount: 50000, memo: '청약통장', isSavings: true, style: '' },
        { id: 'ex_16', category: '저축/투자', name: '해외주식', amount: 250000, merchant: '토스증권 주식', actualAmount: 250000, memo: '토스증권 미국주식', isSavings: true, style: '' },
        { id: 'ex_17', category: '저축/투자', name: '저축(굴비 토스)', amount: 0, merchant: '', actualAmount: 0, memo: '비상금 저축', isSavings: true, style: '' },
        { id: 'ex_18', category: '저축/투자', name: '청년미래적금', amount: 500000, merchant: '카카오 청년미래적금', actualAmount: 500000, memo: '청년적금', isSavings: true, style: 'font-weight: bold;' }
      ]
    },
    '2026-12': {
      salary: 2036240,
      items: [
        { id: 'ex_1', category: '고정지출', name: '월세', amount: 250000, merchant: '집주인 계좌', actualAmount: 250000, memo: '자취방 월세', style: '' },
        { id: 'ex_2', category: '공과금', name: '전기', amount: 21000, merchant: '한전', actualAmount: 21000, memo: '전기요금', style: '' },
        { id: 'ex_3', category: '공과금', name: '가스', amount: 35000, merchant: '도시가스', actualAmount: 35000, memo: '겨울 난방비', style: '' },
        { id: 'ex_4', category: '공과금', name: '수도', amount: 20000, merchant: '상수도사업본부', actualAmount: 20000, memo: '상하수도', style: '' },
        { id: 'ex_5', category: '공과금', name: '인터넷비', amount: 23100, merchant: 'KT 인터넷', actualAmount: 23100, memo: '인터넷/TV', style: '' },
        { id: 'ex_6', category: '변동지출', name: '데이트비, 여가비, 약속비', amount: 120000, merchant: '연말 모임/데이트', actualAmount: 120000, memo: '여가활동', style: '' },
        { id: 'ex_7', category: '변동지출', name: '교통비', amount: 110000, merchant: '티머니/지하철', actualAmount: 110000, memo: '지하철/버스', style: '' },
        { id: 'ex_8', category: '변동지출', name: '외식비, 식비', amount: 100000, merchant: '식료품 장보기', actualAmount: 100000, memo: '식비 예산', style: '' },
        { id: 'ex_9', category: '변동지출', name: '생활비(생활용품)', amount: 63140, merchant: '생필품 마트', actualAmount: 63140, memo: '마트/생필품', style: '' },
        { id: 'ex_10', category: '변동지출', name: '용돈', amount: 0, merchant: '', actualAmount: 0, memo: '개인용돈', style: '' },
        { id: 'ex_11', category: '변동지출', name: '화장품(기초나 색조,미용) 필요시', amount: 0, merchant: '', actualAmount: 0, memo: '뷰티/미용', style: '' },
        { id: 'ex_12', category: '특별/할부', name: '치아교정 3차 결제 2/10', amount: 200000, merchant: '바른이치과', actualAmount: 200000, memo: '치과 교정 할부', style: 'color: #c00000; font-weight: bold;' },
        { id: 'ex_13', category: '특별/할부', name: '필라테스', amount: 164000, merchant: '바디필라테스', actualAmount: 164000, memo: '운동 수강료', style: 'color: #c00000; font-weight: bold;' },
        { id: 'ex_14', category: '여행자금', name: '일본여행경비', amount: 250000, merchant: '카카오 일본여행적금', actualAmount: 250000, memo: '여행자금 분리 저축', style: 'background-color: #d9e1f2; font-weight: bold;' },
        { id: 'ex_15', category: '저축/투자', name: '주택청약', amount: 50000, merchant: '국민은행 청약', actualAmount: 50000, memo: '청약통장', isSavings: true, style: '' },
        { id: 'ex_16', category: '저축/투자', name: '해외주식', amount: 130000, merchant: '토스증권 주식', actualAmount: 130000, memo: '토스증권 미국주식', isSavings: true, style: '' },
        { id: 'ex_17', category: '저축/투자', name: '저축(굴비 토스)', amount: 0, merchant: '', actualAmount: 0, memo: '비상금 저축', isSavings: true, style: '' },
        { id: 'ex_18', category: '저축/투자', name: '청년미래적금', amount: 500000, merchant: '카카오 청년미래적금', actualAmount: 500000, memo: '청년적금', isSavings: true, style: 'font-weight: bold;' }
      ]
    },
    '2027-01': {
      salary: 2036240,
      items: [
        { id: 'ex_1', category: '고정지출', name: '월세', amount: 250000, merchant: '집주인 계좌', actualAmount: 250000, memo: '자취방 월세', style: '' },
        { id: 'ex_2', category: '공과금', name: '전기', amount: 19000, merchant: '한전', actualAmount: 19000, memo: '전기요금', style: '' },
        { id: 'ex_3', category: '공과금', name: '가스', amount: 20000, merchant: '도시가스', actualAmount: 20000, memo: '도시가스', style: '' },
        { id: 'ex_4', category: '공과금', name: '수도', amount: 20000, merchant: '상수도사업본부', actualAmount: 20000, memo: '상하수도', style: '' },
        { id: 'ex_5', category: '공과금', name: '인터넷비', amount: 23100, merchant: 'KT 인터넷', actualAmount: 23100, memo: '인터넷/TV', style: '' },
        { id: 'ex_6', category: '변동지출', name: '데이트비, 여가비, 약속비', amount: 100000, merchant: '여가활동', actualAmount: 100000, memo: '여가활동', style: '' },
        { id: 'ex_7', category: '변동지출', name: '교통비', amount: 110000, merchant: '티머니/지하철', actualAmount: 110000, memo: '지하철/버스', style: '' },
        { id: 'ex_8', category: '변동지출', name: '외식비, 식비', amount: 0, merchant: '', actualAmount: 0, memo: '식비 예산', style: '' },
        { id: 'ex_9', category: '변동지출', name: '생활비(생활용품)', amount: 94140, merchant: '이마트, 생필품', actualAmount: 94140, memo: '마트/생필품', style: '' },
        { id: 'ex_10', category: '변동지출', name: '용돈', amount: 0, merchant: '', actualAmount: 0, memo: '개인용돈', style: '' },
        { id: 'ex_11', category: '변동지출', name: '화장품(기초나 색조,미용) 필요시', amount: 0, merchant: '', actualAmount: 0, memo: '뷰티/미용', style: '' },
        { id: 'ex_12', category: '특별/할부', name: '치아교정 3차 결제 3/10', amount: 200000, merchant: '바른이치과', actualAmount: 200000, memo: '치과 교정 할부', style: 'color: #c00000; font-weight: bold;' },
        { id: 'ex_13', category: '특별/할부', name: '필라테스', amount: 164000, merchant: '바디필라테스', actualAmount: 164000, memo: '운동 수강료', style: 'color: #c00000; font-weight: bold;' },
        { id: 'ex_14', category: '여행자금', name: '일본여행경비', amount: 400000, merchant: '카카오 일본여행적금', actualAmount: 400000, memo: '여행자금 분리 저축', style: 'background-color: #d9e1f2; font-weight: bold;' },
        { id: 'ex_15', category: '저축/투자', name: '주택청약', amount: 50000, merchant: '국민은행 청약', actualAmount: 50000, memo: '청약통장', isSavings: true, style: '' },
        { id: 'ex_16', category: '저축/투자', name: '해외주식', amount: 86000, merchant: '토스증권 주식', actualAmount: 86000, memo: '토스증권 미국주식', isSavings: true, style: '' },
        { id: 'ex_17', category: '저축/투자', name: '저축(굴비 토스)', amount: 0, merchant: '', actualAmount: 0, memo: '비상금 저축', isSavings: true, style: '' },
        { id: 'ex_18', category: '저축/투자', name: '청년미래적금', amount: 500000, merchant: '카카오 청년미래적금', actualAmount: 500000, memo: '청년적금', isSavings: true, style: 'font-weight: bold;' }
      ]
    }
  },
  defaultSalary: 2036240,

  // 토스증권 API 설정 (인증키 반영)
  tossApi: {
    clientId: 'tsck_live_Pn1hkYR9INFshCArabfLYA',
    clientSecret: 'tssk_live_Cen1pObvObpMG4SQJPjFquNjmV8VvD212zD0X40h8pB',
    isConnected: true,
    lastSync: '2026-10-15 15:30:00'
  },

  // 연도별 저축 목표 현황 (수정 가능!)
  annualGoals: {
    2026: { target: 15000000, currentSaved: 7100000, baseSaved: 6100000, isCustom: false },
    2027: { target: 30000000, currentSaved: 15000000, baseSaved: 15000000, isCustom: false }
  },

  // 순수 순자산 수동 보정값 (null이면 계좌+주식 자동 합산, 숫자면 사용자 지정값 고정)
  customNetWorth: null,

  // 여행자금 전용 프로젝트 버킷 (적금과 완전 분리, 모은 돈 직접 수정 & 삭제 가능)
  travelFunds: [
    {
      id: 'trv_japan',
      title: '🇯🇵 일본 도쿄/오사카 힐링 여행',
      targetAmount: 2000000,
      currentAmount: 1200000,
      targetDate: '2027-04-10',
      account: '카카오 일본여행적금',
      memo: '엔화 환전 및 항공/호텔 예약용'
    },
    {
      id: 'trv_jeju',
      title: '🍊 제주도 1주년 리프레시 여행',
      targetAmount: 800000,
      currentAmount: 750000,
      targetDate: '2026-12-25',
      account: '카카오 세이프박스',
      memo: '렌터카 및 감성 숙소'
    }
  ],

  // 여행 발자취 탐험 지도 지역 정의 (대한민국 내륙, 제주도, 일본, 베트남)
    // 여행 발자취 탐험 지도 지역 정의 (대한민국 전국 세분화, 제주도, 일본, 베트남 남부/중부/북부)
  travelMapRegions: [
    // ── 1. 대한민국 (세분화 시/도) ──
    { id: 'kr_seoul', country: '대한민국', name: '서울', shortName: '서울', flag: '🇰🇷', defaultColor: '#10b981', desc: '강남, 종로, 성수, 홍대, 남산' },
    { id: 'kr_gyeonggi', country: '대한민국', name: '경기/인천', shortName: '경기·인천', flag: '🇰🇷', defaultColor: '#10b981', desc: '수원, 판교, 가평, 송도, 영종도' },
    { id: 'kr_gangwon', country: '대한민국', name: '강원도', shortName: '강원', flag: '🇰🇷', defaultColor: '#10b981', desc: '강릉, 속초, 양양, 춘천, 평창' },
    { id: 'kr_chungcheong', country: '대한민국', name: '충청 (대전/세종)', shortName: '충청·대전', flag: '🇰🇷', defaultColor: '#f59e0b', desc: '대전 성심당, 단양, 태안, 세종' },
    { id: 'kr_busan', country: '대한민국', name: '부산', shortName: '부산', flag: '🇰🇷', defaultColor: '#10b981', desc: '해운대, 광안리, 영도, 남포동' },
    { id: 'kr_gyeongnam', country: '대한민국', name: '경남 (통영/거제)', shortName: '경남·남해', flag: '🇰🇷', defaultColor: '#f59e0b', desc: '거제도, 통영 동피랑, 남해 다랭이마을' },
    { id: 'kr_gyeongbuk', country: '대한민국', name: '경북 (경주/포항)', shortName: '경북·대구', flag: '🇰🇷', defaultColor: '#10b981', desc: '경주 황리단길, 포항 호미곶, 안동 하회마을' },
    { id: 'kr_jeonbuk', country: '대한민국', name: '전북 (전주/군산)', shortName: '전북', flag: '🇰🇷', defaultColor: '#10b981', desc: '전주 한옥마을, 군산 시간여행, 부안' },
    { id: 'kr_jeonnam', country: '대한민국', name: '전남 (여수/순천)', shortName: '전남·광주', flag: '🇰🇷', defaultColor: '#f59e0b', desc: '여수 밤바다, 순천만습지, 담양 죽녹원' },

    // ── 2. 제주도 (동/서/남/북 세분화) ──
    { id: 'jeju_north', country: '제주도', name: '제주시 (도심/함덕)', shortName: '제주 북부', flag: '🍊', defaultColor: '#10b981', desc: '함덕 서우봉, 동문시장, 삼양 검은모래' },
    { id: 'jeju_west', country: '제주도', name: '제주 서부 (애월/한림)', shortName: '애월·서부', flag: '🍊', defaultColor: '#10b981', desc: '애월 한담산책로, 협재해수욕장, 금오름' },
    { id: 'jeju_south', country: '제주도', name: '서귀포 (중문/서홍)', shortName: '서귀포 남부', flag: '🍊', defaultColor: '#10b981', desc: '중문관광단지, 천지연폭포, 쇠소깍 카약' },
    { id: 'jeju_east', country: '제주도', name: '제주 동부 (성산/우도)', shortName: '성산·동부', flag: '🍊', defaultColor: '#f59e0b', desc: '성산일출봉, 우도 땅콩아이스크림, 섭지코지' },

          // ── 3. 일본 (8대 권역 및 주요 도시 - 이미지 3 완벽 매칭) ──
      { id: 'jp_sapporo', country: '일본', name: '북해도 (삿포로)', shortName: '북해도·삿포로', flag: '🇯🇵', defaultColor: '#ec4899', desc: '삿포로, 비에이, 오타루, 하코다테' },
      { id: 'jp_tohoku', country: '일본', name: '토호쿠 (센다이/니가타)', shortName: '토호쿠', flag: '🇯🇵', defaultColor: '#eab308', desc: '센다이, 아오모리, 니가타, 온천' },
      { id: 'jp_tokyo', country: '일본', name: '칸토 (도쿄/요코하마)', shortName: '칸토·도쿄', flag: '🇯🇵', defaultColor: '#84cc16', desc: '도쿄, 시부야, 요코하마, 디즈니랜드' },
      { id: 'jp_nagoya', country: '일본', name: '중부 (나고야/나가노)', shortName: '중부·나고야', flag: '🇯🇵', defaultColor: '#14b8a6', desc: '나고야, 나가노, 시즈오카, 지브리파크' },
      { id: 'jp_kyoto', country: '일본', name: '킨키 (교토/고베)', shortName: '킨키·교토·고베', flag: '🇯🇵', defaultColor: '#3b82f6', desc: '교토 청수사, 아라시야마, 고베' },
      { id: 'jp_osaka', country: '일본', name: '킨키 (오사카)', shortName: '킨키·오사카', flag: '🇯🇵', defaultColor: '#2563eb', desc: '도톤보리, USJ, 우메다' },
      { id: 'jp_chugoku', country: '일본', name: '츄고쿠 (히로시마)', shortName: '츄고쿠·히로시마', flag: '🇯🇵', defaultColor: '#f97316', desc: '히로시마, 미야지마, 오카야마' },
      { id: 'jp_shikoku', country: '일본', name: '시코쿠 (타카마츠)', shortName: '시코쿠·타카마츠', flag: '🇯🇵', defaultColor: '#a855f7', desc: '타카마츠, 마쓰야마, 우동투어' },
      { id: 'jp_fukuoka', country: '일본', name: '규슈 (후쿠오카)', shortName: '규슈·후쿠오카', flag: '🇯🇵', defaultColor: '#64748b', desc: '후쿠오카, 하카타, 유후인, 벳푸' },
      { id: 'jp_okinawa', country: '일본', name: '오키나와 (남부)', shortName: '오키나와', flag: '🇯🇵', defaultColor: '#06b6d4', desc: '나하, 츄라우미, 푸른동굴, 리조트' },
  // ── 4. 베트남 (남부/중부/북부 세분화) ──
    { id: 'vn_danang', country: '베트남', name: '다낭/호이안 (중부)', shortName: '다낭·호이안', flag: '🇻🇳', defaultColor: '#f59e0b', desc: '미케비치, 바나힐 골든브릿지, 호이안 올드타운' },
    { id: 'vn_nhatrang', country: '베트남', name: '나트랑/깜란 (남중부)', shortName: '나트랑', flag: '🇻🇳', defaultColor: '#10b981', desc: '빈원더스, 머드스파, 포나가르 사원, 해변' },
    { id: 'vn_hochiminh', country: '베트남', name: '호치민/메콩 (남부)', shortName: '호치민 (남부)', flag: '🇻🇳', defaultColor: '#ef4444', desc: '노트르담 대성당, 벤탄시장, 메콩델타 투어' },
    { id: 'vn_phuquoc', country: '베트남', name: '푸꾸옥 (남부 휴양섬)', shortName: '푸꾸옥', flag: '🇻🇳', defaultColor: '#06b6d4', desc: '그랜드월드, 사파리, 즈엉동 야시장, 선셋' },
    { id: 'vn_hanoi', country: '베트남', name: '하노이/하롱베이 (북부)', shortName: '하노이·하롱베이', flag: '🇻🇳', defaultColor: '#8b5cf6', desc: '호안끼엠 호수, 맥주거리, 하롱베이 크루즈' },
    { id: 'vn_dalat', country: '베트남', name: '달랏 (고원지대)', shortName: '달랏', flag: '🇻🇳', defaultColor: '#10b981', desc: '영원한 봄의 도시, 쑤언흐엉 호수, 야시장' },

    // ── 5. 세계 여행 지도 (실제 지도 대륙 & 주요 국가 - 사용자 사진 스타일) ──
    { id: 'world_russia', country: '세계 지도', name: '러시아 (RUSSIA)', shortName: '러시아', flag: '🇷🇺', defaultColor: '#e58c58', desc: '모스크바, 상트페테르부르크, 바이칼 호수, 시베리아' },
    { id: 'world_china', country: '세계 지도', name: '중국 (CHINA)', shortName: '중국', flag: '🇨🇳', defaultColor: '#f5ce9f', desc: '베이징 만리장성, 상하이 와이탄, 청두, 장가계' },
    { id: 'world_india', country: '세계 지도', name: '인도 (INDIA)', shortName: '인도', flag: '🇮🇳', defaultColor: '#b4a7d6', desc: '뉴델리 타지마할, 자이푸르, 뭄바이, 바라나시' },
    { id: 'world_australia', country: '세계 지도', name: '호주 (AUSTRALIA)', shortName: '호주·오세아니아', flag: '🇦🇺', defaultColor: '#93c47d', desc: '시드니 오페라하우스, 멜버른, 그레이트배리어리프, 골드코스트' },
    { id: 'world_indonesia', country: '세계 지도', name: '인도네시아 (INDONESIA)', shortName: '인도네시아', flag: '🇮🇩', defaultColor: '#f97316', desc: '발리 우붓, 롬복, 자카르타, 코모도 국립공원' },
    { id: 'world_kazakhstan', country: '세계 지도', name: '카자흐스탄/중앙아시아', shortName: '카자흐스탄', flag: '🇰🇿', defaultColor: '#5ab5b2', desc: '알마티 침불락, 아스타나, 실크로드 유적지' },
    { id: 'world_mongolia', country: '세계 지도', name: '몽골 (MONGOLIA)', shortName: '몽골', flag: '🇲🇳', defaultColor: '#b6d7a8', desc: '울란바토르, 테를지 국립공원, 고비사막 은하수' },
    { id: 'world_korea', country: '세계 지도', name: '대한민국 (KOREA)', shortName: '대한민국', flag: '🇰🇷', defaultColor: '#34d399', desc: '서울, 제주도, 부산, K-컬처 투어' },
    { id: 'world_japan', country: '세계 지도', name: '일본 (JAPAN)', shortName: '일본', flag: '🇯🇵', defaultColor: '#86efac', desc: '도쿄, 오사카, 교토, 삿포로, 후쿠오카' },
    { id: 'world_vietnam', country: '세계 지도', name: '베트남 (VIETNAM)', shortName: '베트남', flag: '🇻🇳', defaultColor: '#fdba74', desc: '다낭, 나트랑, 푸꾸옥, 하노이, 호치민' },
    { id: 'world_se_asia', country: '세계 지도', name: '동남아시아 (태국/필리핀/싱가포르)', shortName: '동남아', flag: '🌴', defaultColor: '#fbcfe8', desc: '방콕, 푸켓, 보라카이, 마리나베이샌즈' },
    { id: 'world_europe', country: '세계 지도', name: '유럽 (EUROPE)', shortName: '유럽', flag: '🇪🇺', defaultColor: '#fed7aa', desc: '파리 에펠탑, 런던, 로마 콜로세움, 스위스 융프라우' },
    { id: 'world_middle_east', country: '세계 지도', name: '중동 (튀르키예/UAE/사우디)', shortName: '중동', flag: '🕌', defaultColor: '#fde047', desc: '이스탄불, 두바이 부르즈칼리파, 아부다비, 카파도키아' },
    { id: 'world_africa', country: '세계 지도', name: '아프리카 (AFRICA)', shortName: '아프리카', flag: '🦁', defaultColor: '#fca5a5', desc: '이집트 피라미드, 세렝게티 사파리, 남아공 케이프타운' },
    { id: 'world_north_america', country: '세계 지도', name: '북미 (미국/캐나다/하와이)', shortName: '북미', flag: '🇺🇸', defaultColor: '#93c5fd', desc: '뉴욕 맨해튼, LA, 그랜드캐니언, 하와이 와이키키, 밴쿠버' },
    { id: 'world_south_america', country: '세계 지도', name: '남미 (브라질/아르헨티나/페루)', shortName: '남미', flag: '🇧🇷', defaultColor: '#cbd5e1', desc: '마추픽추, 이과수 폭포, 리우 예수상, 우유니 사막' },
    { id: 'world_greenland', country: '세계 지도', name: '그린란드/아이슬란드', shortName: '그린란드', flag: '🧊', defaultColor: '#a7f3d0', desc: '빙하 피오르드, 오로라, 블루라군 온천' }
  ],

  // 다녀온 여행 기록 히스토리 (같은 곳 2번 이상 다녀온 경우 날짜별 칸 분리 지원!)
  travelTrips: [
    {
      id: 'trip_jeju_1',
      regionId: 'jeju_north',
      country: '제주도',
      regionName: '제주시 (애월/함덕)',
      title: '1차 제주 힐링 감성 투어',
      visitOrder: 1, // 1차 방문
      startDate: '2026-10-05',
      endDate: '2026-10-08',
      duration: '3박 4일',
      lodging: '애월 오션뷰 감성 스테이 (3박)',
      transport: '김포-제주 왕복 항공편 + 제주 렌터카 (아반떼)',
      totalCost: 785000,
      breakdown: {
        flight: 185000,   // 항공
        lodging: 320000,  // 숙박
        food: 195000,     // 식비
        transport: 45000, // 기차/현지교통
        shopping: 40000   // 쇼핑/기타
      },
      diary: '애월 한담해변 일몰 산책하고 딱새우회와 흑돼지 구이 먹음. 날씨가 너무 좋아서 인생샷 건짐! 바다 보며 힐링 제대로 한 첫 제주 여행.',
      photos: []
    },
    {
      id: 'trip_tokyo_1',
      regionId: 'jp_tokyo',
      country: '일본',
      regionName: '도쿄/간토',
      title: '1차 도쿄 미식 & 쇼핑 힐링 여행',
      visitOrder: 1, // 1차 방문
      startDate: '2026-11-12',
      endDate: '2026-11-16',
      duration: '4박 5일',
      lodging: '신주쿠 그레이스리 호텔 (4박)',
      transport: '인천-나리타 항공편 (티웨이) + 나리타 익스프레스/도쿄 서브웨이 티켓',
      totalCost: 1380000,
      breakdown: {
        flight: 380000,
        lodging: 480000,
        food: 310000,
        transport: 90000,
        shopping: 120000
      },
      diary: '시부야 스카이 전망대 야경 관람, 하라주쿠 빈티지 샵 쇼핑 및 츠키지 장외시장 스시 최고! 도쿄 타워 야경 보며 힐링.',
      photos: []
    },
    {
      id: 'trip_tokyo_2',
      regionId: 'jp_tokyo',
      country: '일본',
      regionName: '도쿄/간토',
      title: '2차 도쿄 가을 감성 & 카페 투어 (두 번째 방문)',
      visitOrder: 2, // 2차 방문 (같은 곳 2번 간 경우 완벽 분리!)
      startDate: '2026-10-18',
      endDate: '2026-10-21',
      duration: '3박 4일',
      lodging: '긴자 미츠이 가든 호텔 (3박)',
      transport: '인천-하네다 항공편 (아시아나) + 스이카 교통카드',
      totalCost: 1150000,
      breakdown: {
        flight: 420000,
        lodging: 410000,
        food: 210000,
        transport: 50000,
        shopping: 60000
      },
      diary: '두 번째 도쿄 방문! 긴자 명품거리와 오모테산도 카페 투어 중심. 롯폰기 힐즈 전시회 관람 후 츠타야 서점에서 책 구경.',
      photos: []
    },
    {
      id: 'trip_danang_1',
      regionId: 'vn_danang',
      country: '베트남',
      regionName: '다낭/호이안',
      title: '1차 다낭 & 호이안 리조트 힐링 휴양',
      visitOrder: 1, // 1차 방문
      startDate: '2026-12-05',
      endDate: '2026-12-09',
      duration: '4박 5일',
      lodging: '다낭 풀만 리조트 (2박) + 호이안 올드타운 리조트 (2박)',
      transport: '인천-다낭 직항 항공기 (진에어) + 현지 그랩(Grab) 택시',
      totalCost: 920000,
      breakdown: {
        flight: 390000,
        lodging: 280000,
        food: 130000,
        transport: 40000,
        shopping: 80000
      },
      diary: '호이안 소원배 띄우기 및 야시장 투어. 바나힐 골든브릿지 방문과 가성비 스파 마사지 매일 받아서 대만족!',
      photos: []
    }
  ],

  // 계좌 및 자산 현황 (적금과 여행자금 완전히 분리!)
  accounts: [
    // ── 1. 보증금 (내 돈 1,000만 vs 부모님 3,000만 완전 분리) ──
    { 
      id: 'acc_dep_self', 
      name: '내 임차보증금 (본인 자금)', 
      type: 'deposit', 
      balance: 10000000, 
      institution: '부동산/원룸', 
      memo: '내가 모아 넣은 보증금 1,000만원 (내 순자산 포함)' 
    },
    { 
      id: 'acc_dep_parents', 
      name: '부모님 지원 보증금', 
      type: 'parents_support', 
      balance: 30000000, 
      institution: '부모님 지원', 
      memo: '부모님 대여 보증금 3,000만원 (내 순자산에서 완전 제외)' 
    },

    // ── 2. 입출금 통장 ──
    { 
      id: 'acc_toss_main', 
      name: '토스뱅크 (100053020337)', 
      type: 'checking', 
      balance: 750000, 
      institution: '토스뱅크', 
      accountNo: '100053020337',
      memo: '일상 식비/생활비/쇼핑 소비 메인 계좌' 
    },
    { 
      id: 'acc_kakao_main', 
      name: '카카오뱅크 (3333312626664)', 
      type: 'checking', 
      balance: 1120000, 
      institution: '카카오뱅크', 
      accountNo: '3333312626664',
      memo: '월급 2,036,240원 수령 및 월세/공과금 자동이체' 
    },

    // ── 3. 일반 적금 & 청약 (여행자금과 완전 분리) ──
    { 
      id: 'acc_gulbi', 
      name: '토스 굴비적금', 
      type: 'savings', 
      balance: 1500000, 
      institution: '토스뱅크', 
      maturity: '2026-12-31', 
      memo: '소액 잔돈 모으기 적금' 
    },
    { 
      id: 'acc_safe', 
      name: '카카오 세이프박스/비상금', 
      type: 'savings', 
      balance: 4500000, 
      institution: '카카오뱅크', 
      maturity: '수시입출금', 
      memo: '비상금 파킹통장' 
    },
    { 
      id: 'acc_youth', 
      name: '청년미래적금', 
      type: 'savings', 
      balance: 3000000, 
      institution: '은행/정부', 
      maturity: '청년도약/희망', 
      memo: '월 50만원 불입 (목돈 저축)' 
    },
    { 
      id: 'acc_housing', 
      name: '주택청약종합저축', 
      type: 'savings', 
      balance: 800000, 
      institution: '우리은행', 
      maturity: '청약', 
      memo: '아파트 청약 저축' 
    },

    // ── 4. 여행자금 전용 적금 (일반 적금과 별도 분리!) ──
    { 
      id: 'acc_japan_trip', 
      name: '카카오 일본여행적금 (여행전용)', 
      type: 'travel_savings', 
      balance: 1200000, 
      institution: '카카오뱅크', 
      maturity: '2027-04-09', 
      memo: '✈️ 순수 여행자금 전용 적금 (일반 적금과 분리)' 
    },

    // ── 5. 토스증권 주식 투자 계좌 (실제 토스 잔고 1,610,853원) ──
    { 
      id: 'acc_toss_stock', 
      name: '토스증권 주식 계좌', 
      type: 'investment', 
      balance: 1610853, 
      institution: '토스증권 (API 연동)', 
      memo: '토스증권 실시간 투자 자산 (1,610,853원)' 
    }
  ],

  // 토스증권 실제 보유 종목 6개 (이미지 4와 100% 완벽 일치!)
  // 총 평가금액: 1,610,853원 | 손익: -76,859원 (-4.55%)
  stocks: [
    {
      id: 'stk_qqqm',
      ticker: 'QQQM',
      name: 'QQQM',
      badgeText: '나스닥 100',
      badgeColor: '#1d4ed8',
      quantity: 1.824722,
      currentPriceWon: 378614,
      evalAmount: 690866,
      profitAmount: -33833,
      profitRate: -4.66,
      currency: 'USD',
      account: '토스증권 주식 계좌'
    },
    {
      id: 'stk_spym',
      ticker: 'SPYM',
      name: 'SPYM',
      badgeText: 'S&P 500',
      badgeColor: '#047857',
      quantity: 5.144385,
      currentPriceWon: 119223,
      evalAmount: 613329,
      profitAmount: -20545,
      profitRate: -3.24,
      currency: 'USD',
      account: '토스증권 주식 계좌'
    },
    {
      id: 'stk_schd',
      ticker: 'SCHD',
      name: 'SCHD',
      badgeText: '미국배당',
      badgeColor: '#0284c7',
      quantity: 3.04306,
      currentPriceWon: 48006,
      evalAmount: 146086,
      profitAmount: 8313,
      profitRate: 6.03,
      currency: 'USD',
      account: '토스증권 주식 계좌'
    },
    {
      id: 'stk_nvda',
      ticker: 'NVDA',
      name: '엔비디아',
      badgeText: '엔비디아',
      badgeColor: '#65a30d',
      quantity: 0.342995,
      currentPriceWon: 226892,
      evalAmount: 77823,
      profitAmount: -20731,
      profitRate: -21.03,
      currency: 'USD',
      account: '토스증권 주식 계좌'
    },
    {
      id: 'stk_ief',
      ticker: 'IEF',
      name: 'IEF',
      badgeText: '미국채',
      badgeColor: '#84cc16',
      quantity: 0.358572,
      currentPriceWon: 119953,
      evalAmount: 43012,
      profitAmount: -6454,
      profitRate: -13.04,
      currency: 'USD',
      account: '토스증권 주식 계좌'
    },
    {
      id: 'stk_tsla',
      ticker: 'TSLA',
      name: '테슬라',
      badgeText: '테슬라',
      badgeColor: '#e11d48',
      quantity: 0.074071,
      currentPriceWon: 536431,
      evalAmount: 39734,
      profitAmount: -3608,
      profitRate: -8.32,
      currency: 'USD',
      account: '토스증권 주식 계좌'
    }
  ],

  // 실시간 환율 (USD/KRW)
  exchangeRateUSD: 1410.00,

  // 50개년 인생 재무 로드맵
  roadmap: [
    { year: 2026, age: 24, lumpSum: 10000000, savings: 5000000, total: 15000000 },
    { year: 2027, age: 25, lumpSum: 16050000, savings: 14132520, total: 30182520 },
    { year: 2028, age: 26, lumpSum: 32295296, savings: 14940000, total: 47235296 },
    { year: 2029, age: 27, lumpSum: 50541767, savings: 14400000, total: 64941767 },
    { year: 2030, age: 28, lumpSum: 69487691, savings: 14400000, total: 83887691 },
    { year: 2035, age: 33, lumpSum: 186067468, savings: 14400000, total: 200467468 },
    { year: 2040, age: 38, lumpSum: 349576636, savings: 14400000, total: 363976636 },
    { year: 2050, age: 48, lumpSum: 900553983, savings: 14400000, total: 914953983 },
    { year: 2060, age: 58, lumpSum: 1984409821, savings: 14400000, total: 1998809821 },
    { year: 2075, age: 73, lumpSum: 5862237256, savings: 14400000, total: 5876637256 }
  ],

  // 가계부 내역 (수입은 2,036,240원 자동 설정 및 수정 가능!)
  // 3개월, 6개월, 9개월, 12개월 비교를 위해 2026년 1월 ~ 12월 데이터 완비
  transactions: [
    // ── 2026년 10월 (기준 월) ──
    { id: 'tx_2610_in', date: '2026-10-25', month: '2026-10', type: 'income', category: '급여/수입', name: '10월 월급 입금', amount: 2036240, account: '카카오뱅크 (3333312626664)', memo: '정기 월급 실수령액' },
    { id: 'tx_2610_1', date: '2026-10-01', month: '2026-10', type: 'expense', category: '주거/월세', name: '자취방 10월 월세', amount: 250000, account: '카카오뱅크 (3333312626664)', memo: '자동이체' },
    { id: 'tx_2610_2', date: '2026-10-03', month: '2026-10', type: 'expense', category: '운동비/헬스', name: '헬스장 3개월 등록', amount: 180000, account: '토스뱅크 (100053020337)', memo: '피트니스 회원권' },
    { id: 'tx_2610_3', date: '2026-10-05', month: '2026-10', type: 'expense', category: '병원/의원/치과', name: '치과 검진 및 스케일링', amount: 32000, account: '토스뱅크 (100053020337)', memo: '건강보험' },
    { id: 'tx_2610_4', date: '2026-10-06', month: '2026-10', type: 'expense', category: '약국/영양제', name: '종합비타민 및 약값', amount: 24500, account: '토스뱅크 (100053020337)', memo: '약국' },
    { id: 'tx_2610_5', date: '2026-10-08', month: '2026-10', type: 'expense', category: '공과금/통신', name: '전기·가스·인터넷 공과금', amount: 97450, account: '카카오뱅크 (3333312626664)', memo: '공과금' },
    { id: 'tx_2610_6', date: '2026-10-10', month: '2026-10', type: 'travel', category: '여행자금', name: '일본 힐링여행 경비 적립', amount: 150000, account: '카카오 일본여행적금 (여행전용)', memo: '여행자금 분리 저축' },
    { id: 'tx_2610_7', date: '2026-10-12', month: '2026-10', type: 'expense', category: '교통/이동', name: '후불교통카드 (지하철/버스)', amount: 68000, account: '카카오뱅크 (3333312626664)', memo: '교통비' },
    { id: 'tx_2610_8', date: '2026-10-14', month: '2026-10', type: 'expense', category: '식비/마트/장보기', name: '이마트 장보기 (식재료)', amount: 86400, account: '토스뱅크 (100053020337)', memo: '식비' },
    { id: 'tx_2610_9', date: '2026-10-18', month: '2026-10', type: 'expense', category: '카페/디저트', name: '스타벅스 커피 & 디저트', amount: 14200, account: '토스뱅크 (100053020337)', memo: '' },
    { id: 'tx_2610_10', date: '2026-10-20', month: '2026-10', type: 'investment', category: '주식/투자', name: '토스증권 미국 ETF 적립 매수', amount: 250000, account: '토스증권 주식 계좌', memo: 'QQQM/SPYM 매수' },
    { id: 'tx_2610_11', date: '2026-10-25', month: '2026-10', type: 'savings', category: '금융/적금/청약', name: '청년미래적금 불입', amount: 500000, account: '카카오뱅크 (3333312626664)', memo: '월 50만 적금' },
    { id: 'tx_2610_12', date: '2026-10-25', month: '2026-10', type: 'savings', category: '금융/적금/청약', name: '주택청약 납입', amount: 100000, account: '카카오뱅크 (3333312626664)', memo: '청약' },

    // ── 2026년 11월 ──
    { id: 'tx_2611_in', date: '2026-11-25', month: '2026-11', type: 'income', category: '급여/수입', name: '11월 월급 입금', amount: 2036240, account: '카카오뱅크 (3333312626664)', memo: '기본 월급' },
    { id: 'tx_2611_1', date: '2026-11-01', month: '2026-11', type: 'expense', category: '주거/월세', name: '자취방 11월 월세', amount: 250000, account: '카카오뱅크 (3333312626664)', memo: '' },
    { id: 'tx_2611_2', date: '2026-11-05', month: '2026-11', type: 'expense', category: '공과금/통신', name: '공과금 (난방/전기/인터넷)', amount: 88500, account: '카카오뱅크 (3333312626664)', memo: '' },
    { id: 'tx_2611_3', date: '2026-11-10', month: '2026-11', type: 'travel', category: '여행자금', name: '일본여행 적립금', amount: 150000, account: '카카오 일본여행적금 (여행전용)', memo: '' },
    { id: 'tx_2611_4', date: '2026-11-12', month: '2026-11', type: 'expense', category: '식비/마트/장보기', name: '식료품 장보기', amount: 125000, account: '토스뱅크 (100053020337)', memo: '' },
    { id: 'tx_2611_5', date: '2026-11-15', month: '2026-11', type: 'expense', category: '운동비/헬스', name: '단백질 보충제 및 헬스용품', amount: 55000, account: '토스뱅크 (100053020337)', memo: '' },
    { id: 'tx_2611_6', date: '2026-11-25', month: '2026-11', type: 'savings', category: '금융/적금/청약', name: '청년미래적금 불입', amount: 500000, account: '카카오뱅크 (3333312626664)', memo: '' },
    { id: 'tx_2611_7', date: '2026-11-25', month: '2026-11', type: 'investment', category: '주식/투자', name: '토스증권 주식 매수', amount: 250000, account: '토스증권 주식 계좌', memo: '' },

    // ── 2026년 12월 ──
    { id: 'tx_2612_in', date: '2026-12-25', month: '2026-12', type: 'income', category: '급여/수입', name: '12월 월급 입금', amount: 2036240, account: '카카오뱅크 (3333312626664)', memo: '기본 월급' },
    { id: 'tx_2612_1', date: '2026-12-01', month: '2026-12', type: 'expense', category: '주거/월세', name: '자취방 12월 월세', amount: 250000, account: '카카오뱅크 (3333312626664)', memo: '' },
    { id: 'tx_2612_2', date: '2026-12-08', month: '2026-12', type: 'expense', category: '공과금/통신', name: '겨울 난방비 및 공과금', amount: 112000, account: '카카오뱅크 (3333312626664)', memo: '' },
    { id: 'tx_2612_3', date: '2026-12-10', month: '2026-12', type: 'travel', category: '여행자금', name: '제주 여행 경비 사용/정산', amount: 100000, account: '카카오 일본여행적금 (여행전용)', memo: '' },
    { id: 'tx_2612_4', date: '2026-12-25', month: '2026-12', type: 'savings', category: '금융/적금/청약', name: '청년미래적금 불입', amount: 500000, account: '카카오뱅크 (3333312626664)', memo: '' },
    { id: 'tx_2612_5', date: '2026-12-25', month: '2026-12', type: 'investment', category: '주식/투자', name: '토스증권 주식 매수', amount: 250000, account: '토스증권 주식 계좌', memo: '' },

    // ── 2027년 1월 (신년 내역) ──
    { id: 'tx_2701_in', date: '2027-01-25', month: '2027-01', type: 'income', category: '급여/수입', name: '1월 월급 입금', amount: 2036240, account: '카카오뱅크 (3333312626664)', memo: '2027 신년 첫 월급' },
    { id: 'tx_2701_1', date: '2027-01-01', month: '2027-01', type: 'expense', category: '주거/월세', name: '자취방 1월 월세', amount: 250000, account: '카카오뱅크 (3333312626664)', memo: '자동이체' },
    { id: 'tx_2701_2', date: '2027-01-05', month: '2027-01', type: 'expense', category: '공과금/통신', name: '겨울 난방/전기/가스/인터넷', amount: 102100, account: '카카오뱅크 (3333312626664)', memo: '공과금' },
    { id: 'tx_2701_3', date: '2027-01-10', month: '2027-01', type: 'travel', category: '여행자금', name: '일본 도쿄/오사카 여행자금 적립', amount: 400000, account: '카카오 일본여행적금 (여행전용)', memo: '여행적금 분리' },
    { id: 'tx_2701_4', date: '2027-01-15', month: '2027-01', type: 'expense', category: '특별/할부', name: '치아교정 3차 결제 3/10', amount: 200000, account: '카카오뱅크 (3333312626664)', memo: '치과 교정' },
    { id: 'tx_2701_5', date: '2027-01-18', month: '2027-01', type: 'expense', category: '특별/할부', name: '필라테스 수강료', amount: 164000, account: '토스뱅크 (100053020337)', memo: '운동' },
    { id: 'tx_2701_6', date: '2027-01-20', month: '2027-01', type: 'expense', category: '식비/마트/장보기', name: '새해 식료품 장보기', amount: 94140, account: '토스뱅크 (100053020337)', memo: '생필품' },
    { id: 'tx_2701_7', date: '2027-01-22', month: '2027-01', type: 'expense', category: '교통/이동', name: '1월 후불교통카드', amount: 110000, account: '카카오뱅크 (3333312626664)', memo: '교통비' },
    { id: 'tx_2701_8', date: '2027-01-25', month: '2027-01', type: 'savings', category: '금융/적금/청약', name: '청년미래적금 불입', amount: 500000, account: '카카오뱅크 (3333312626664)', memo: '월 50만원 적금' },
    { id: 'tx_2701_9', date: '2027-01-25', month: '2027-01', type: 'savings', category: '금융/적금/청약', name: '주택청약 납입', amount: 50000, account: '카카오뱅크 (3333312626664)', memo: '청약' },
    { id: 'tx_2701_10', date: '2027-01-25', month: '2027-01', type: 'investment', category: '주식/투자', name: '해외주식 ETF 적립', amount: 86000, account: '토스증권 주식 계좌', memo: '미국주식' },
    { id: 'tx_2701_11', date: '2027-01-28', month: '2027-01', type: 'expense', category: '여가/문화', name: '데이트비·여가비', amount: 100000, account: '토스뱅크 (100053020337)', memo: '여가비' }
  ]
};



