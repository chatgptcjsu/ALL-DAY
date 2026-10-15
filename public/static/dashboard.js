const moneyFull = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const numberFull = new Intl.NumberFormat('ko-KR');
const colors = { blue: '#c8f169', orange: '#ff906d', green: '#59d8b2', grid: '#2b3939', text: '#98a8a1' };
let data;
let trendChart;
let elementChart;
let activeFilter = { year: 2025, month: 'all', center: 'all', search: '' };

const byId = (id) => document.getElementById(id);
const sum = (rows) => rows.reduce((total, row) => total + row.amount, 0);
const formatFull = (value) => `${moneyFull.format(Math.round(value))}원`;
const formatShort = (value) => {
  const absolute = Math.abs(value);
  const prefix = value < 0 ? '−' : '';
  if (absolute >= 100000000) return `${prefix}${(absolute / 100000000).toFixed(1)}억`;
  if (absolute >= 10000) return `${prefix}${(absolute / 10000).toFixed(0)}만`;
  return `${prefix}${numberFull.format(Math.round(absolute))}`;
};
const roundedRate = (current, previous) => previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;
const isPositive = (value) => value > 0.5;
const isNegative = (value) => value < -0.5;
const yearTitle = (year) => `${year}년`;
const monthTitle = (month) => month === 'all' ? '연간 합계' : `${Number(month)}월`;

function aggregate(rows, keyName) {
  const result = new Map();
  for (const row of rows) {
    const key = row[keyName];
    const current = result.get(key) || { amount: 0, count: 0 };
    current.amount += row.amount;
    current.count += row.count;
    result.set(key, current);
  }
  return result;
}

function rowsFor(year, month, center = activeFilter.center) {
  return data.rows.filter((row) => row.year === year && (month === 'all' || row.month === Number(month)) && (center === 'all' || row.costCenter === center));
}

function monthRows(year, month, center = activeFilter.center) {
  return data.rows.filter((row) => row.year === year && row.month === month && (center === 'all' || row.costCenter === center));
}

function initFilters() {
  const yearSelect = byId('year-filter');
  const monthSelect = byId('month-filter');
  const centerSelect = byId('center-filter');
  const years = [...data.years].sort((a, b) => b - a);
  activeFilter.year = years[0];
  yearSelect.innerHTML = years.map((year) => `<option value="${year}">${year}년</option>`).join('');
  monthSelect.innerHTML = '<option value="all">연간 합계</option>' + data.months.slice(0, 12).map((month) => `<option value="${month}">${month}월</option>`).join('');
  centerSelect.innerHTML = '<option value="all">전체 코스트센터</option>' + data.costCenters.map((center) => `<option value="${escapeHtml(center)}">${escapeHtml(center)}</option>`).join('');
  yearSelect.value = String(activeFilter.year);
  yearSelect.addEventListener('change', () => { activeFilter.year = Number(yearSelect.value); render(); });
  monthSelect.addEventListener('change', () => { activeFilter.month = monthSelect.value; render(); });
  centerSelect.addEventListener('change', () => { activeFilter.center = centerSelect.value; render(); });
  byId('element-search').addEventListener('input', (event) => { activeFilter.search = event.target.value.trim().toLocaleLowerCase('ko-KR'); renderElements(); });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function compareElements() {
  const previousYear = activeFilter.year - 1;
  const hasPreviousYear = data.years.includes(previousYear);
  const selectedMonth = activeFilter.month;
  const previous = aggregate(rowsFor(previousYear, selectedMonth), 'element');
  const current = aggregate(rowsFor(activeFilter.year, selectedMonth), 'element');
  const all = [...new Set([...previous.keys(), ...current.keys()])];
  return all.map((element) => {
    const prev = previous.get(element) || { amount: 0, count: 0 };
    const curr = current.get(element) || { amount: 0, count: 0 };
    const delta = hasPreviousYear ? curr.amount - prev.amount : null;
    const status = !hasPreviousYear ? 'unknown' : prev.amount === 0 && curr.amount > 0 ? 'new' : prev.amount > 0 && curr.amount === 0 ? 'unused' : 'active';
    return { element, previous: hasPreviousYear ? prev.amount : null, current: curr.amount, delta, rate: hasPreviousYear ? roundedRate(curr.amount, prev.amount) : null, status, currentCount: curr.count, previousCount: prev.count };
  }).sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
}

function compareCenters() {
  const previousYear = activeFilter.year - 1;
  const hasPreviousYear = data.years.includes(previousYear);
  const month = activeFilter.month;
  const previous = aggregate(rowsFor(previousYear, month, 'all'), 'costCenter');
  const current = aggregate(rowsFor(activeFilter.year, month, 'all'), 'costCenter');
  return [...new Set([...previous.keys(), ...current.keys()])].map((center) => {
    const prev = previous.get(center) || { amount: 0, count: 0 };
    const curr = current.get(center) || { amount: 0, count: 0 };
    const delta = hasPreviousYear ? curr.amount - prev.amount : null;
    const status = !hasPreviousYear ? 'unknown' : prev.amount === 0 && curr.amount > 0 ? 'new' : prev.amount > 0 && curr.amount === 0 ? 'unused' : 'active';
    return { center, previous: hasPreviousYear ? prev.amount : null, current: curr.amount, delta, status };
  }).sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
}

function updateMetrics(elements) {
  const previous = sum(rowsFor(activeFilter.year - 1, activeFilter.month));
  const current = sum(rowsFor(activeFilter.year, activeFilter.month));
  const hasPreviousYear = data.years.includes(activeFilter.year - 1);
  const delta = hasPreviousYear ? current - previous : null;
  const rate = hasPreviousYear ? roundedRate(current, previous) : null;
  const newCount = hasPreviousYear ? elements.filter((item) => item.status === 'new').length : null;
  const unusedCount = hasPreviousYear ? elements.filter((item) => item.status === 'unused').length : null;
  byId('metric-current').textContent = formatShort(current);
  byId('metric-current-year').textContent = yearTitle(activeFilter.year);
  byId('metric-change').textContent = delta === null ? '—' : `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${formatShort(Math.abs(delta))}`;
  const rateNode = byId('metric-change-rate');
  rateNode.className = `change-pill ${isPositive(delta || 0) ? 'is-up' : isNegative(delta || 0) ? 'is-down' : 'is-flat'}`;
  rateNode.textContent = !hasPreviousYear ? '비교 자료 없음' : rate === null ? (current > 0 ? '신규' : '—') : `${rate > 0 ? '+' : ''}${rate.toFixed(1)}%`;
  byId('metric-previous-year').textContent = hasPreviousYear ? `${activeFilter.year - 1}년 대비` : `${activeFilter.year - 1}년 데이터 없음`;
  byId('metric-new-elements').textContent = newCount === null ? '—' : numberFull.format(newCount);
  byId('metric-unused-elements').textContent = unusedCount === null ? '—' : numberFull.format(unusedCount);
  const excluded = data.excluded || { count: 0, amount: 0, missingElementCount: 0, missingCostCenterCount: 0 };
  byId('excluded-note').textContent = excluded.count ? `전체 기간: 계정명 공란 ${numberFull.format(excluded.missingElementCount)}건 · ${formatFull(excluded.amount)} 제외 (코스트센터 공란 ${numberFull.format(excluded.missingCostCenterCount)}건 포함)` : '';
  byId('trend-subtitle').textContent = `${activeFilter.center === 'all' ? '전체 코스트센터' : activeFilter.center} · 월별 합계 · ${monthTitle(activeFilter.month)} 선택 시 해당 월 강조`;
  byId('element-chart-subtitle').textContent = `${yearTitle(activeFilter.year - 1)} 대비 ${monthTitle(activeFilter.month)} · 금액 기준`;
  byId('detail-subtitle').textContent = `${yearTitle(activeFilter.year - 1)} 대비 ${yearTitle(activeFilter.year)} · ${monthTitle(activeFilter.month)} · 증감액 순`;
  byId('record-count').textContent = numberFull.format(rowsFor(activeFilter.year, activeFilter.month).reduce((count, row) => count + row.count, 0));
}

function renderTrend() {
  const labels = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);
  const previousYear = activeFilter.year - 1;
  const annualSeries = (year) => labels.map((_, index) => sum(monthRows(year, index + 1)));
  const hasPreviousYear = data.years.includes(previousYear);
  const previousValues = annualSeries(previousYear);
  const currentValues = annualSeries(activeFilter.year);
  const selected = activeFilter.month === 'all' ? -1 : Number(activeFilter.month) - 1;
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(byId('trend-chart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        ...(hasPreviousYear ? [{ label: `${previousYear}년`, data: previousValues, borderColor: '#71847e', backgroundColor: '#71847e', borderWidth: 2, pointRadius: labels.map((_, i) => i === selected ? 4 : 2.5), pointHoverRadius: 5, pointBackgroundColor: '#fff', pointBorderWidth: 2, tension: .34 }] : []),
        { label: `${activeFilter.year}년`, data: currentValues, borderColor: colors.blue, backgroundColor: colors.blue, borderWidth: 2.5, pointRadius: labels.map((_, i) => i === selected ? 5 : 3), pointHoverRadius: 6, pointBackgroundColor: '#fff', pointBorderWidth: 2.5, tension: .34 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', align: 'start', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7, padding: 17, color: '#a1b0aa', font: { family: "'DM Sans','Noto Sans KR',sans-serif", size: 10 } } },
        tooltip: { backgroundColor: '#0c1314', titleFont: { family: "'Noto Sans KR',sans-serif", size: 10 }, bodyFont: { family: "'Noto Sans KR',sans-serif", size: 10 }, padding: 11, callbacks: { title: (items) => `${items[0].label} ${monthTitle(activeFilter.month) === items[0].label ? '선택' : ''}`, label: (item) => `${item.dataset.label} · ${formatFull(item.raw)}`, footer: (items) => { const values = items.map((item) => item.raw); return values.length === 2 ? `전년 대비 ${values[1] - values[0] >= 0 ? '+' : '−'}${formatFull(Math.abs(values[1] - values[0]))}` : ''; } } }
      },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: colors.text, font: { size: 9 } } },
        y: { beginAtZero: true, border: { display: false }, grid: { color: colors.grid, drawTicks: false }, ticks: { color: colors.text, font: { size: 9 }, padding: 8, callback: (value) => formatShort(value) } }
      }
    }
  });
}

function renderElements() {
  const allElements = compareElements();
  const filtered = allElements.filter((item) => item.element.toLocaleLowerCase('ko-KR').includes(activeFilter.search));
  byId('element-count').textContent = `${filtered.length}개 항목`;
  renderElementChart(filtered);
  const body = byId('element-table-body');
  if (!filtered.length) {
    body.innerHTML = '<tr><td class="empty-row" colspan="6">검색 결과가 없습니다.</td></tr>';
    return;
  }
  const maxDelta = Math.max(1, ...filtered.map((item) => Math.abs(item.delta)));
  body.innerHTML = filtered.map((item) => {
    const deltaClass = item.delta === null ? 'delta-zero' : isPositive(item.delta) ? 'delta-positive' : isNegative(item.delta) ? 'delta-negative' : 'delta-zero';
    const tag = item.status === 'new' ? '<span class="status-tag new">신규</span>' : item.status === 'unused' ? '<span class="status-tag unused">미사용</span>' : item.status === 'unknown' ? '<span class="status-tag inactive">자료 없음</span>' : '<span class="status-tag active">계속 사용</span>';
    const rate = item.status === 'new' ? '신규' : item.status === 'unused' ? '미사용' : item.status === 'unknown' ? '—' : item.rate === null ? '—' : `${item.rate > 0 ? '+' : ''}${item.rate.toFixed(1)}%`;
    const width = Math.max(4, Math.round(Math.abs(item.delta || 0) / maxDelta * 100));
    const direction = (item.delta || 0) >= 0 ? 'up' : 'down';
    const indicator = item.delta === null || item.delta === 0 ? '' : `<span class="mini-track" aria-label="증감 크기"><i class="${direction}" style="width:${width}%"></i></span>`;
    return `<tr><td><div class="element-name-cell"><i class="rank-dot"></i><span class="element-name">${escapeHtml(item.element)}</span></div></td><td>${tag}</td><td class="numeric amount-cell">${item.previous === null ? '—' : formatFull(item.previous)}</td><td class="numeric amount-cell">${formatFull(item.current)}</td><td class="numeric ${deltaClass}">${item.delta === null ? '—' : `${item.delta > 0 ? '+' : item.delta < 0 ? '−' : ''}${formatFull(Math.abs(item.delta))}${indicator}`}</td><td class="numeric rate-text">${rate}</td></tr>`;
  }).join('');
}

function renderElementChart(items) {
  const chartItems = items.slice(0, 12);
  const canvas = byId('element-chart');
  if (elementChart) elementChart.destroy();
  elementChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: chartItems.map((item) => item.element),
      datasets: [{
        label: '전년 대비 증감',
        data: chartItems.map((item) => item.delta ?? 0),
        backgroundColor: chartItems.map((item) => item.status === 'new' || item.status === 'unused' || item.status === 'unknown' ? '#a6aeb9' : isPositive(item.delta) ? colors.orange : isNegative(item.delta) ? colors.green : '#a6aeb9'),
        borderRadius: 4, borderSkipped: false, barThickness: 12, maxBarThickness: 15
      }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 12, left: 0 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0c1314', titleFont: { family: "'Noto Sans KR',sans-serif", size: 10 }, bodyFont: { family: "'Noto Sans KR',sans-serif", size: 10 }, footerFont: { family: "'Noto Sans KR',sans-serif", size: 9 }, padding: 11,
          callbacks: {
            title: (items) => items[0].label,
            label: (context) => { const delta = context.raw; const item = chartItems[context.dataIndex]; return item.status === 'unknown' ? '비교 자료 없음' : `${delta > 0 ? '증가' : delta < 0 ? '감소' : '변동 없음'} · ${formatFull(Math.abs(delta))}${item.status === 'new' ? ' (신규)' : item.status === 'unused' ? ' (미사용)' : ''}`; },
            footer: (items) => { const item = chartItems[items[0].dataIndex]; return item.status === 'unknown' ? [`기준 ${formatFull(item.current)}`] : [`전년 ${formatFull(item.previous)}`, `기준 ${formatFull(item.current)}`]; }
          }
        }
      },
      scales: {
        x: { grid: { color: colors.grid, drawTicks: false }, border: { display: false }, ticks: { color: colors.text, font: { size: 8 }, padding: 7, callback: (value) => formatShort(value) } },
        y: { grid: { display: false }, border: { display: false }, ticks: { color: '#aab8b2', font: { family: "'Noto Sans KR',sans-serif", size: 8 }, padding: 7, autoSkip: false } }
      }
    }
  });
}

function renderCenters() {
  const centers = compareCenters();
  byId('center-count').textContent = `${centers.length}개 센터`;
  const body = byId('center-table-body');
  if (!centers.length) {
    body.innerHTML = '<tr><td class="empty-row" colspan="5">선택한 조건의 데이터가 없습니다.</td></tr>';
    return;
  }
  body.innerHTML = centers.map((item) => {
    const deltaClass = item.delta === null ? 'delta-zero' : isPositive(item.delta) ? 'delta-positive' : isNegative(item.delta) ? 'delta-negative' : 'delta-zero';
    const status = item.status === 'new' ? '<span class="status-tag new">신규 센터</span>' : item.status === 'unused' ? '<span class="status-tag unused">미사용</span>' : item.status === 'unknown' ? '<span class="status-tag inactive">자료 없음</span>' : '<span class="status-tag active">계속 사용</span>';
    return `<tr><td><span class="center-name">${escapeHtml(item.center)}</span></td><td class="numeric amount-cell">${item.previous === null ? '—' : formatFull(item.previous)}</td><td class="numeric amount-cell">${formatFull(item.current)}</td><td class="numeric ${deltaClass}">${item.delta === null ? '—' : `${item.delta > 0 ? '+' : item.delta < 0 ? '−' : ''}${formatFull(Math.abs(item.delta))}`}</td><td>${status}</td></tr>`;
  }).join('');
}

function render() {
  const elements = compareElements();
  updateMetrics(elements);
  renderTrend();
  renderElements();
  renderCenters();
}

async function start() {
  try {
    const response = await fetch('/static/data.json');
    if (!response.ok) throw new Error(`데이터를 불러오지 못했습니다 (${response.status})`);
    data = await response.json();
    if (typeof Chart === 'undefined') throw new Error('차트 라이브러리를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.');
    initFilters();
    render();
  } catch (error) {
    console.error(error);
    document.querySelector('.dashboard').innerHTML = `<section class="panel" style="margin-top:40px"><h2>데이터를 표시할 수 없습니다</h2><p>${escapeHtml(error.message || '잠시 후 다시 시도해 주세요.')}</p></section>`;
  }
}

start();
