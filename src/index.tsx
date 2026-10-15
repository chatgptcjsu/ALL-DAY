import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.html(`
  <!doctype html>
  <html lang="ko">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#f4f6f8" />
      <link rel="icon" href="data:," />
      <title>소모품 원가 트렌드</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="/static/style.css" rel="stylesheet" />
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js" defer></script>
      <script src="/static/dashboard.js" defer></script>
    </head>
    <body>
      <div class="app-shell">
        <header class="topbar">
          <a class="brand" href="/" aria-label="소모품 원가 트렌드 홈">
            <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></span>
            <span class="brand-copy"><strong>Cost<span>scope</span></strong><small>SUPPLIES SPEND INTELLIGENCE</small></span>
          </a>
          <div class="topbar-meta"><span class="live-dot"></span><span>거래 데이터 분석</span><span class="meta-divider"></span><span>24–25</span></div>
        </header>

        <main class="dashboard">
          <section class="intro-row" aria-labelledby="page-title">
            <div>
              <p class="eyebrow">COST CENTER · COST ELEMENT · MONTHLY</p>
              <h1 id="page-title">소모품 원가 트렌드</h1>
              <p class="intro-copy">코스트센터와 원가요소별 지출 변화를 한눈에 비교하고, 새로 발생하거나 사라진 항목을 확인하세요.</p>
            </div>
            <div class="data-stamp"><span class="stamp-icon">↗</span><span><b>원본 기준</b><small>정산년월 · 거래금액</small></span></div>
          </section>

          <section class="filter-panel" aria-label="분석 필터">
            <div class="filter-title"><span class="filter-icon">☷</span><strong>분석 조건</strong><span class="filter-hint">조건을 바꾸면 모든 지표가 업데이트됩니다</span></div>
            <div class="filter-controls">
              <label class="filter-field"><span>비교 기준연도</span><select id="year-filter" aria-label="비교 기준연도"></select></label>
              <label class="filter-field"><span>분석 월</span><select id="month-filter" aria-label="분석 월"></select></label>
              <label class="filter-field filter-wide"><span>코스트센터</span><select id="center-filter" aria-label="코스트센터"></select></label>
              <label class="filter-field search-field"><span>원가요소 검색</span><span class="search-wrap"><span aria-hidden="true">⌕</span><input id="element-search" type="search" placeholder="항목명 입력" autocomplete="off" /></span></label>
            </div>
          </section>

          <section class="metric-grid" aria-label="핵심 지표">
            <article class="metric-card metric-primary"><div class="metric-heading"><span>기준연도 원가</span><span class="metric-icon icon-blue">₩</span></div><strong class="metric-value" id="metric-current">—</strong><div class="metric-foot"><span class="metric-year" id="metric-current-year"></span><span class="metric-note">거래금액 합계</span></div></article>
            <article class="metric-card"><div class="metric-heading"><span>전년 대비 증감</span><span class="metric-icon icon-orange">↕</span></div><strong class="metric-value" id="metric-change">—</strong><div class="metric-foot"><span id="metric-change-rate" class="change-pill">—</span><span id="metric-previous-year" class="metric-note"></span></div></article>
            <article class="metric-card"><div class="metric-heading"><span>신규 원가요소</span><span class="metric-icon icon-purple">＋</span></div><strong class="metric-value" id="metric-new-elements">—</strong><div class="metric-foot"><span class="status-dot new-dot"></span><span class="metric-note">기준연도에 새로 발생</span></div></article>
            <article class="metric-card"><div class="metric-heading"><span>미사용 원가요소</span><span class="metric-icon icon-mint">−</span></div><strong class="metric-value" id="metric-unused-elements">—</strong><div class="metric-foot"><span class="status-dot unused-dot"></span><span class="metric-note">전년 발생, 기준연도 미발생</span></div></article>
          </section>

          <section class="chart-grid" aria-label="원가 추이 차트">
            <article class="panel trend-panel">
              <div class="panel-heading"><div><p class="section-kicker">MONTHLY SPEND</p><h2>월별 원가 추이</h2><p class="panel-subtitle" id="trend-subtitle">전년과 기준연도 월별 합계 비교</p></div><span class="panel-badge">연도 비교</span></div>
              <div class="chart-area trend-chart-area"><canvas id="trend-chart" aria-label="연도별 월간 거래금액 추이" role="img"></canvas></div>
              <div class="chart-footnote"><span class="legend-marker"></span><span>그래프 위에 마우스를 올리면 해당 월의 정확한 금액을 확인할 수 있습니다.</span></div>
            </article>
            <article class="panel change-panel">
              <div class="panel-heading"><div><p class="section-kicker">COST ELEMENT MOVEMENT</p><h2>원가요소별 증감</h2><p class="panel-subtitle" id="element-chart-subtitle">전년 대비 금액 변화</p></div><span class="panel-badge badge-warm">증가 / 감소</span></div>
              <div class="chart-area element-chart-area"><canvas id="element-chart" aria-label="원가요소별 전년 대비 증감 차트" role="img"></canvas></div>
              <div class="change-legend"><span><i class="legend-square increase"></i>증가</span><span><i class="legend-square decrease"></i>감소</span><span><i class="legend-square neutral"></i>신규 / 미사용</span></div>
            </article>
          </section>

          <section class="panel element-panel">
            <div class="panel-heading table-heading"><div><p class="section-kicker">ELEMENT BREAKDOWN</p><h2>원가요소 상세 비교</h2><p class="panel-subtitle" id="detail-subtitle">원가요소별 기준연도·전년 금액과 상태</p></div><span class="table-count" id="element-count">—개 항목</span></div>
            <div class="table-scroll"><table><thead><tr><th>원가요소명</th><th>상태</th><th class="numeric">전년 금액</th><th class="numeric">기준연도 금액</th><th class="numeric">증감액</th><th class="numeric">증감률</th></tr></thead><tbody id="element-table-body"></tbody></table></div>
          </section>

          <section class="panel center-panel">
            <div class="panel-heading table-heading"><div><p class="section-kicker">COST CENTER COMPARISON</p><h2>코스트센터별 원가 비교</h2><p class="panel-subtitle">계정 기준은 비용이체부서명이며, 값이 없으면 부서명을 사용합니다.</p></div><span class="table-count" id="center-count">—개 센터</span></div>
            <div class="table-scroll"><table><thead><tr><th>코스트센터</th><th class="numeric">전년 금액</th><th class="numeric">기준연도 금액</th><th class="numeric">증감액</th><th>상태</th></tr></thead><tbody id="center-table-body"></tbody></table></div>
          </section>

          <footer class="page-footer"><span>분석 데이터는 거래내역의 정산년월·계정명·거래금액을 기준으로 집계했습니다.</span><span id="excluded-note" class="excluded-note"></span><span>거래 건수 기준 <b id="record-count">—</b>건</span></footer>
        </main>
      </div>
    </body>
  </html>
`))

export default app
