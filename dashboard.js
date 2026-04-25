"use strict";

const DATA_URL = `./data/commodities.json?v=${Date.now()}`;

fetch(DATA_URL)
    .then(response => response.json())
    .then(data => {
        window.dashboardData = data;
        startDashboard(data);
    })
    .catch(error => {
        console.error(error);
        showLoadError("Failed to load commodity data.");
    });

const DATA_URL = "./data/commodities.json";
const PERIODS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "YTD", ytd: true },
  { label: "1Y", years: 1 },
  { label: "3Y", years: 3 },
  { label: "5Y", years: 5 },
];

const SAMPLE_DATA = {
  generated_at: "2026-04-25T08:30:00+08:00",
  source: "Sample fallback data. Replace by running scripts/fetch_data.py.",
  commodities: {
    aluminium: {
      name: "Aluminium",
      ticker: "ALI=F",
      unit: "USD / tonne",
      color: "#38bdf8",
      observations: 8,
      start_date: "2025-09-01",
      end_date: "2026-04-24",
      prices: [
        { date: "2025-09-01", timestamp: 1756684800000, close: 2508.5 },
        { date: "2025-10-01", timestamp: 1759276800000, close: 2566.25 },
        { date: "2025-11-03", timestamp: 1762128000000, close: 2634.1 },
        { date: "2025-12-01", timestamp: 1764547200000, close: 2588.8 },
        { date: "2026-01-02", timestamp: 1767312000000, close: 2668.2 },
        { date: "2026-02-02", timestamp: 1769990400000, close: 2716.4 },
        { date: "2026-03-02", timestamp: 1772409600000, close: 2689.75 },
        { date: "2026-04-24", timestamp: 1776988800000, close: 2754.9 }
      ]
    },
    brent_crude: {
      name: "Brent Crude",
      ticker: "BZ=F",
      unit: "USD / barrel",
      color: "#f59e0b",
      observations: 8,
      start_date: "2025-09-01",
      end_date: "2026-04-24",
      prices: [
        { date: "2025-09-01", timestamp: 1756684800000, close: 76.2 },
        { date: "2025-10-01", timestamp: 1759276800000, close: 79.55 },
        { date: "2025-11-03", timestamp: 1762128000000, close: 81.1 },
        { date: "2025-12-01", timestamp: 1764547200000, close: 78.64 },
        { date: "2026-01-02", timestamp: 1767312000000, close: 82.36 },
        { date: "2026-02-02", timestamp: 1769990400000, close: 84.92 },
        { date: "2026-03-02", timestamp: 1772409600000, close: 83.1 },
        { date: "2026-04-24", timestamp: 1776988800000, close: 86.45 }
      ]
    },
    copper: {
      name: "Copper",
      ticker: "HG=F",
      unit: "USD / lb",
      color: "#fb7185",
      observations: 8,
      start_date: "2025-09-01",
      end_date: "2026-04-24",
      prices: [
        { date: "2025-09-01", timestamp: 1756684800000, close: 4.22 },
        { date: "2025-10-01", timestamp: 1759276800000, close: 4.31 },
        { date: "2025-11-03", timestamp: 1762128000000, close: 4.46 },
        { date: "2025-12-01", timestamp: 1764547200000, close: 4.38 },
        { date: "2026-01-02", timestamp: 1767312000000, close: 4.52 },
        { date: "2026-02-02", timestamp: 1769990400000, close: 4.63 },
        { date: "2026-03-02", timestamp: 1772409600000, close: 4.58 },
        { date: "2026-04-24", timestamp: 1776988800000, close: 4.71 }
      ]
    },
    steel_hrc: {
      name: "Steel HRC",
      ticker: "HRC=F",
      unit: "USD / short ton",
      color: "#34d399",
      observations: 8,
      start_date: "2025-09-01",
      end_date: "2026-04-24",
      prices: [
        { date: "2025-09-01", timestamp: 1756684800000, close: 842 },
        { date: "2025-10-01", timestamp: 1759276800000, close: 858 },
        { date: "2025-11-03", timestamp: 1762128000000, close: 872 },
        { date: "2025-12-01", timestamp: 1764547200000, close: 855 },
        { date: "2026-01-02", timestamp: 1767312000000, close: 881 },
        { date: "2026-02-02", timestamp: 1769990400000, close: 904 },
        { date: "2026-03-02", timestamp: 1772409600000, close: 892 },
        { date: "2026-04-24", timestamp: 1776988800000, close: 918 }
      ]
    }
  },
  errors: {}
};

let dashboardData = null;
let usingFallbackData = false;
const selectedPeriods = new Map();
const chartRegistry = new Map();

document.addEventListener("DOMContentLoaded", () => {
  startDashboard();
});

async function startDashboard() {
  try {
    dashboardData = await loadData();
    normalizeData(dashboardData);
    renderHeaderMeta();
    renderCards();
    setupCalculator();
    initCharts();
    calc();
  } catch (error) {
    showFatalError(error);
  }
}

async function loadData() {
  let response;
  try {
    response = await fetch(DATA_URL, { cache: "no-store" });
  } catch (error) {
    throw new Error(
      `Unable to load ${DATA_URL}. GitHub Pages will serve this file normally; browser file previews may block fetch(). ${error.message}`
    );
  }

  if (response.status === 404) {
    usingFallbackData = true;
    return structuredClone(SAMPLE_DATA);
  }

  if (!response.ok) {
    throw new Error(`Unable to load ${DATA_URL}. Server returned ${response.status}.`);
  }

  return response.json();
}

function normalizeData(data) {
  Object.values(data.commodities || {}).forEach((commodity) => {
    commodity.prices = (commodity.prices || [])
      .map((point) => ({
        date: point.date,
        timestamp: Number(point.timestamp),
        close: Number(point.close),
      }))
      .filter((point) => point.date && Number.isFinite(point.timestamp) && Number.isFinite(point.close))
      .sort((a, b) => a.timestamp - b.timestamp);

    commodity.observations = commodity.prices.length;
    if (commodity.prices.length > 0) {
      commodity.start_date = commodity.prices[0].date;
      commodity.end_date = commodity.prices[commodity.prices.length - 1].date;
    }
  });
}

function renderHeaderMeta() {
  const generatedCopy = document.querySelector("#generatedCopy");
  const notices = [];

  if (generatedCopy) {
    const generated = dashboardData.generated_at
      ? formatGeneratedTime(dashboardData.generated_at)
      : "Generated time unavailable";
    generatedCopy.textContent = `${generated} · ${commodityList().length} tracked contracts`;
  }

  const sourceText = String(dashboardData.source || "");
  if (usingFallbackData || /sample fallback/i.test(sourceText)) {
    notices.push({
      type: "warning",
      text: usingFallbackData
        ? "data/commodities.json was not found, so this page is showing sample fallback data. Run the GitHub Action or scripts/fetch_data.py to publish live Yahoo Finance data."
        : "This bundled data/commodities.json file contains sample fallback data. Run the GitHub Action or scripts/fetch_data.py to replace it with live Yahoo Finance data.",
    });
  }

  const errors = dashboardData.errors || {};
  Object.entries(errors).forEach(([key, message]) => {
    notices.push({
      type: "error",
      text: `${humanizeKey(key)} data update warning: ${message}`,
    });
  });

  renderNotices(notices);
}

function renderNotices(notices) {
  const region = document.querySelector("#noticeRegion");
  if (!region) {
    return;
  }

  region.innerHTML = notices
    .map((notice) => `<div class="notice ${notice.type === "error" ? "error" : ""}">${escapeHtml(notice.text)}</div>`)
    .join("");
}

function renderCards() {
  const cards = document.querySelector("#cards");
  if (!cards) {
    return;
  }

  cards.innerHTML = commodityList()
    .map((commodity) => {
      const id = idForTicker(commodity.ticker);
      selectedPeriods.set(commodity.ticker, selectedPeriods.get(commodity.ticker) || "1Y");
      const latest = latestPoint(commodity);
      const periodButtons = PERIODS.map((period) => {
        const active = period.label === selectedPeriods.get(commodity.ticker) ? " active" : "";
        return [
          `<button class="period-button${active}"`,
          `type="button" data-ticker="${escapeHtml(commodity.ticker)}" data-period="${period.label}"`,
          `style="--series-color: ${escapeHtml(commodity.color)}">`,
          `${period.label}</button>`
        ].join(" ");
      }).join("");

      return `
        <article class="chart-card" data-ticker="${escapeHtml(commodity.ticker)}" style="--series-color: ${escapeHtml(commodity.color)}">
          <header class="card-header">
            <div>
              <div class="commodity-title">
                <h2>${escapeHtml(commodity.name)}</h2>
                <span class="ticker-pill">${escapeHtml(commodity.ticker)}</span>
              </div>
              <p class="unit-line">${escapeHtml(commodity.unit)}</p>
            </div>
            <div class="price-block">
              <span class="latest-price" id="latest-${id}">${latest ? formatPrice(latest.close) : "N/A"}</span>
              <span class="period-change" id="change-${id}">N/A</span>
            </div>
          </header>
          <div class="period-controls" aria-label="${escapeHtml(commodity.name)} period filters">
            ${periodButtons}
          </div>
          <div class="chart-stage" data-ticker="${escapeHtml(commodity.ticker)}">
            <svg id="chart-${id}" class="price-chart" viewBox="0 0 640 300" role="img" aria-label="${escapeHtml(commodity.name)} price chart"></svg>
            <div id="tooltip-${id}" class="tooltip hidden" role="presentation"></div>
          </div>
          <footer class="card-footer">
            <span>Yahoo Finance via GitHub Actions · ${commodity.observations || 0} observations · ${escapeHtml(commodity.start_date || "N/A")} to ${escapeHtml(commodity.end_date || "N/A")}</span>
            <button type="button" class="download-button" data-download="${escapeHtml(commodity.ticker)}">Download CSV</button>
          </footer>
        </article>
      `;
    })
    .join("");
}

function initCharts() {
  document.querySelectorAll(".period-button").forEach((button) => {
    button.addEventListener("click", () => {
      const ticker = button.dataset.ticker;
      const period = button.dataset.period;
      selectedPeriods.set(ticker, period);
      document
        .querySelectorAll(`.period-button[data-ticker="${cssEscape(ticker)}"]`)
        .forEach((periodButton) => {
          periodButton.classList.toggle("active", periodButton.dataset.period === period);
        });
      updateChart(ticker);
    });
  });

  document.querySelectorAll(".download-button").forEach((button) => {
    button.addEventListener("click", () => {
      downloadCsv(button.dataset.download);
    });
  });

  document.querySelectorAll(".chart-stage").forEach((stage) => {
    stage.addEventListener("pointermove", (event) => handleChartPointer(event, stage.dataset.ticker));
    stage.addEventListener("pointerleave", () => hideTooltip(stage.dataset.ticker));
  });

  commodityList().forEach((commodity) => updateChart(commodity.ticker));

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      commodityList().forEach((commodity) => updateChart(commodity.ticker));
    }, 120);
  });
}

function updateChart(ticker) {
  const commodity = commodityByTicker(ticker);
  if (!commodity) {
    return;
  }

  const period = selectedPeriods.get(ticker) || "1Y";
  const points = getFilteredPrices(commodity.prices, period);
  const id = idForTicker(ticker);
  const latest = latestPoint(commodity);
  const latestEl = document.querySelector(`#latest-${id}`);
  const changeEl = document.querySelector(`#change-${id}`);
  const chart = document.querySelector(`#chart-${id}`);

  if (latestEl) {
    latestEl.textContent = latest ? formatPrice(latest.close) : "N/A";
  }

  if (changeEl) {
    const first = points[0];
    const last = points[points.length - 1];
    const change = first && last && first.close !== 0 ? ((last.close - first.close) / first.close) * 100 : null;
    changeEl.textContent = change === null ? "N/A" : `${formatSignedPercent(change)} ${period}`;
    changeEl.classList.toggle("positive", change !== null && change >= 0);
    changeEl.classList.toggle("negative", change !== null && change < 0);
  }

  if (chart) {
    chart.innerHTML = renderSvgChart(commodity, points, period);
  }
}

function renderSvgChart(commodity, points, period) {
  const width = 640;
  const height = 300;
  const margin = { top: 22, right: 22, bottom: 48, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const gradientId = `gradient-${idForTicker(commodity.ticker)}`;

  if (!points.length) {
    chartRegistry.set(commodity.ticker, { points: [], margin, width, height, plotWidth, plotHeight });
    return `
      <text class="empty-chart-label" x="${width / 2}" y="${height / 2}">No ${period} data available</text>
    `;
  }

  const closes = points.map((point) => point.close);
  let min = Math.min(...closes);
  let max = Math.max(...closes);
  const spread = max - min || Math.max(Math.abs(max) * 0.08, 1);
  min -= spread * 0.12;
  max += spread * 0.16;

  const xScale = (index) => {
    if (points.length === 1) {
      return margin.left + plotWidth / 2;
    }
    return margin.left + (index / (points.length - 1)) * plotWidth;
  };
  const yScale = (value) => margin.top + ((max - value) / (max - min)) * plotHeight;

  const plotted = points.map((point, index) => ({
    ...point,
    x: xScale(index),
    y: yScale(point.close),
  }));

  chartRegistry.set(commodity.ticker, {
    points: plotted,
    margin,
    width,
    height,
    plotWidth,
    plotHeight,
    min,
    max,
  });

  const linePath = plotted
    .map((point, index) => `${index === 0 ? "M" : "L"} ${round(point.x)} ${round(point.y)}`)
    .join(" ");
  const areaPath = [
    linePath,
    `L ${round(plotted[plotted.length - 1].x)} ${margin.top + plotHeight}`,
    `L ${round(plotted[0].x)} ${margin.top + plotHeight}`,
    "Z",
  ].join(" ");
  const yTicks = makeTicks(min, max, 5);
  const xTicks = makeDateTicks(plotted);

  return `
    <defs>
      <linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${escapeHtml(commodity.color)}" stop-opacity="0.36"></stop>
        <stop offset="72%" stop-color="${escapeHtml(commodity.color)}" stop-opacity="0.08"></stop>
        <stop offset="100%" stop-color="${escapeHtml(commodity.color)}" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    <rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="rgba(2, 6, 23, 0.16)" rx="8"></rect>
    ${yTicks
      .map((tick) => {
        const y = yScale(tick);
        return `
          <line class="grid-line" x1="${margin.left}" x2="${margin.left + plotWidth}" y1="${round(y)}" y2="${round(y)}"></line>
          <text class="axis-label" x="${margin.left - 10}" y="${round(y + 4)}" text-anchor="end">${formatAxisPrice(tick)}</text>
        `;
      })
      .join("")}
    ${xTicks
      .map((point) => `
        <text class="x-label" x="${round(point.x)}" y="${height - 18}">${formatShortDate(point.date)}</text>
      `)
      .join("")}
    <path class="area-path" d="${areaPath}" fill="url(#${gradientId})"></path>
    <path class="line-path" d="${linePath}" stroke="${escapeHtml(commodity.color)}"></path>
    <g id="hover-${idForTicker(commodity.ticker)}" class="hover-layer" visibility="hidden">
      <line class="hover-line" x1="0" x2="0" y1="${margin.top}" y2="${margin.top + plotHeight}"></line>
      <circle class="hover-dot" cx="0" cy="0" r="5" fill="${escapeHtml(commodity.color)}"></circle>
    </g>
  `;
}

function setupCalculator() {
  const latest = getLatestCommonDate();
  const startInput = document.querySelector("#startDate");
  const endInput = document.querySelector("#endDate");
  const button = document.querySelector("#calculateButton");

  if (startInput && endInput && latest) {
    const defaultStart = new Date(`${latest}T00:00:00Z`);
    defaultStart.setUTCFullYear(defaultStart.getUTCFullYear() - 1);
    startInput.value = toDateInputValue(defaultStart);
    endInput.value = latest;

    const earliest = getEarliestDate();
    if (earliest) {
      startInput.min = earliest;
      endInput.min = earliest;
    }
    startInput.max = latest;
    endInput.max = latest;
  }

  if (button) {
    button.addEventListener("click", calc);
  }

  [startInput, endInput].forEach((input) => {
    if (input) {
      input.addEventListener("change", calc);
    }
  });
}

function calc() {
  const startInput = document.querySelector("#startDate");
  const endInput = document.querySelector("#endDate");
  const results = document.querySelector("#calculatorResults");
  const message = document.querySelector("#calculatorMessage");

  if (!startInput || !endInput || !results || !message) {
    return;
  }

  const startValue = startInput.value;
  const endValue = endInput.value;
  message.classList.remove("error");

  if (!startValue || !endValue) {
    message.textContent = "Select both dates to calculate the custom period change.";
    message.classList.add("error");
    results.innerHTML = renderEmptyResults("Missing date");
    return;
  }

  const startMs = Date.parse(`${startValue}T00:00:00Z`);
  const endMs = Date.parse(`${endValue}T23:59:59Z`);
  if (startMs > endMs) {
    message.textContent = "Start date must be on or before end date.";
    message.classList.add("error");
    results.innerHTML = renderEmptyResults("Invalid range");
    return;
  }

  message.textContent = "Calculated using nearest available trading dates in the selected range.";
  const cards = commodityList().map((commodity) => {
    const points = commodity.prices.filter((point) => point.timestamp >= startMs && point.timestamp <= endMs);
    if (!points.length) {
      return renderResultCard(commodity, null);
    }

    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    const change = startPoint.close !== 0 ? ((endPoint.close - startPoint.close) / startPoint.close) * 100 : null;
    return renderResultCard(commodity, { startPoint, endPoint, change });
  });

  results.innerHTML = cards.join("");
}

function renderEmptyResults(reason) {
  return commodityList()
    .map((commodity) => renderResultCard(commodity, null, reason))
    .join("");
}

function renderResultCard(commodity, result, reason = "No data in selected range") {
  const changeClass = result && result.change !== null && result.change >= 0 ? "positive" : "negative";
  const changeText = result && result.change !== null ? formatSignedPercent(result.change) : "N/A";
  const startText = result
    ? `${result.startPoint.date} · ${formatPrice(result.startPoint.close)}`
    : reason;
  const endText = result
    ? `${result.endPoint.date} · ${formatPrice(result.endPoint.close)}`
    : reason;

  return `
    <article class="result-card" style="--series-color: ${escapeHtml(commodity.color)}">
      <div class="result-top">
        <h3>${escapeHtml(commodity.name)}</h3>
        <span class="color-swatch" aria-hidden="true"></span>
      </div>
      <div class="result-change ${result && result.change !== null ? changeClass : ""}">${changeText}</div>
      <div class="result-meta">
        <span><strong>Start close:</strong> ${escapeHtml(startText)}</span>
        <span><strong>End close:</strong> ${escapeHtml(endText)}</span>
        <span><strong>Unit:</strong> ${escapeHtml(commodity.unit)}</span>
      </div>
    </article>
  `;
}

function downloadCsv(ticker) {
  const commodity = commodityByTicker(ticker);
  if (!commodity) {
    return;
  }

  const rows = ["date,close", ...commodity.prices.map((point) => `${point.date},${point.close}`)];
  const blob = new Blob([`${rows.join("\n")}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${commodity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${commodity.ticker.replace(/[^a-z0-9]+/gi, "-")}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function handleChartPointer(event, ticker) {
  const chartState = chartRegistry.get(ticker);
  const commodity = commodityByTicker(ticker);
  if (!chartState || !chartState.points.length || !commodity) {
    return;
  }

  const id = idForTicker(ticker);
  const svg = document.querySelector(`#chart-${id}`);
  const tooltip = document.querySelector(`#tooltip-${id}`);
  const hover = document.querySelector(`#hover-${id}`);
  if (!svg || !tooltip || !hover) {
    return;
  }

  const rect = svg.getBoundingClientRect();
  const viewX = ((event.clientX - rect.left) / rect.width) * chartState.width;
  const nearest = nearestPoint(chartState.points, viewX);
  if (!nearest) {
    return;
  }

  const line = hover.querySelector(".hover-line");
  const dot = hover.querySelector(".hover-dot");
  line.setAttribute("x1", nearest.x);
  line.setAttribute("x2", nearest.x);
  dot.setAttribute("cx", nearest.x);
  dot.setAttribute("cy", nearest.y);
  hover.setAttribute("visibility", "visible");

  const leftPct = (nearest.x / chartState.width) * 100;
  const topPct = (nearest.y / chartState.height) * 100;
  tooltip.style.left = `${leftPct}%`;
  tooltip.style.top = `${topPct}%`;
  tooltip.innerHTML = `<strong>${formatPrice(nearest.close)}</strong><span>${escapeHtml(nearest.date)} · ${escapeHtml(commodity.unit)}</span>`;
  tooltip.classList.remove("hidden");
}

function hideTooltip(ticker) {
  const id = idForTicker(ticker);
  const tooltip = document.querySelector(`#tooltip-${id}`);
  const hover = document.querySelector(`#hover-${id}`);
  if (tooltip) {
    tooltip.classList.add("hidden");
  }
  if (hover) {
    hover.setAttribute("visibility", "hidden");
  }
}

function getFilteredPrices(prices, periodLabel) {
  if (!prices.length) {
    return [];
  }

  const latest = prices[prices.length - 1];
  const start = new Date(latest.timestamp);
  const period = PERIODS.find((item) => item.label === periodLabel) || PERIODS[4];

  if (period.ytd) {
    start.setUTCMonth(0, 1);
    start.setUTCHours(0, 0, 0, 0);
  } else if (period.months) {
    start.setUTCMonth(start.getUTCMonth() - period.months);
  } else if (period.years) {
    start.setUTCFullYear(start.getUTCFullYear() - period.years);
  }

  const filtered = prices.filter((point) => point.timestamp >= start.getTime());
  return filtered.length ? filtered : prices.slice(-1);
}

function commodityList() {
  return Object.values((dashboardData && dashboardData.commodities) || {});
}

function commodityByTicker(ticker) {
  return commodityList().find((commodity) => commodity.ticker === ticker);
}

function latestPoint(commodity) {
  return commodity.prices.length ? commodity.prices[commodity.prices.length - 1] : null;
}

function getLatestCommonDate() {
  const dates = commodityList()
    .map((commodity) => commodity.end_date)
    .filter(Boolean)
    .sort();
  return dates.length ? dates[dates.length - 1] : null;
}

function getEarliestDate() {
  const dates = commodityList()
    .map((commodity) => commodity.start_date)
    .filter(Boolean)
    .sort();
  return dates.length ? dates[0] : null;
}

function makeTicks(min, max, count) {
  if (count <= 1) {
    return [min];
  }
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

function makeDateTicks(points) {
  if (points.length <= 4) {
    return points;
  }

  const indexes = [0, Math.floor((points.length - 1) / 3), Math.floor(((points.length - 1) * 2) / 3), points.length - 1];
  return indexes
    .filter((index, position) => indexes.indexOf(index) === position)
    .map((index) => points[index]);
}

function nearestPoint(points, x) {
  return points.reduce((nearest, point) => {
    if (!nearest) {
      return point;
    }
    return Math.abs(point.x - x) < Math.abs(nearest.x - x) ? point : nearest;
  }, null);
}

function formatPrice(value) {
  if (!Number.isFinite(value)) {
    return "N/A";
  }
  const digits = Math.abs(value) < 20 ? 2 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatAxisPrice(value) {
  if (!Number.isFinite(value)) {
    return "";
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  if (Math.abs(value) >= 100) {
    return `$${Math.round(value)}`;
  }
  return `$${value.toFixed(2)}`;
}

function formatSignedPercent(value) {
  if (!Number.isFinite(value)) {
    return "N/A";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatShortDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
}

function formatGeneratedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `Generated ${value}`;
  }
  return `Generated ${new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(date)} SGT`;
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function idForTicker(ticker) {
  return ticker.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

function humanizeKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function round(value) {
  return Number(value.toFixed(2));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
}

function showFatalError(error) {
  const generatedCopy = document.querySelector("#generatedCopy");
  const cards = document.querySelector("#cards");
  const notices = document.querySelector("#noticeRegion");
  const calculator = document.querySelector(".calculator-panel");

  if (generatedCopy) {
    generatedCopy.textContent = "Market data could not be loaded";
  }
  if (cards) {
    cards.innerHTML = "";
  }
  if (calculator) {
    calculator.style.display = "none";
  }
  if (notices) {
    notices.innerHTML = `<div class="notice error">${escapeHtml(error.message)}</div>`;
  }
}
