const SITE_DATA_URL = "./sites.json";
const JOIN_EMAIL = "js5185204@gmail.com";
const STRIP_PROTOCOL_PATTERN = /^https:\/\//;

const windows = [...document.querySelectorAll("[data-window]")];
const siteListPanel = document.getElementById("site-list-panel");
const joinForm = document.getElementById("join-form");
const joinUrlInput = document.getElementById("join-url");
const openRingExamplesButton = document.getElementById("open-ring-examples");
const ringWindow = document.querySelector(".window-ring");

let highestZIndex = windows.length;
let dragState = null;

initializeWindows();
loadSites();

joinForm.addEventListener("submit", handleJoinSubmit);
openRingExamplesButton.addEventListener("click", focusRingWindow);

function initializeWindows() {
  windows.forEach((windowElement, index) => {
    windowElement.style.zIndex = String(windows.length - index);
    windowElement.addEventListener("pointerdown", () => bringToFront(windowElement));

    const dragHandle = windowElement.querySelector("[data-drag-handle]");
    if (dragHandle) {
      dragHandle.addEventListener("pointerdown", (event) => {
        startDrag(event, windowElement, dragHandle);
      });
    }
  });

  window.addEventListener("pointermove", handleDragMove);
  window.addEventListener("pointerup", stopDrag);
  window.addEventListener("pointercancel", stopDrag);
}

function bringToFront(windowElement) {
  highestZIndex += 1;
  windowElement.style.zIndex = String(highestZIndex);
}

function startDrag(event, windowElement, dragHandle) {
  if (window.innerWidth <= 920) {
    return;
  }

  if (event.target.closest("button, a, input")) {
    return;
  }

  const rect = windowElement.getBoundingClientRect();

  dragState = {
    pointerId: event.pointerId,
    windowElement,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };

  windowElement.classList.add("dragging");
  bringToFront(windowElement);
  dragHandle.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function handleDragMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  const { windowElement, offsetX, offsetY } = dragState;
  const maxLeft = Math.max(0, window.innerWidth - windowElement.offsetWidth);
  const maxTop = Math.max(0, window.innerHeight - windowElement.offsetHeight);
  const nextLeft = clamp(event.clientX - offsetX, 0, maxLeft);
  const nextTop = clamp(event.clientY - offsetY, 0, maxTop);

  windowElement.style.left = `${nextLeft}px`;
  windowElement.style.top = `${nextTop}px`;
  windowElement.style.right = "auto";
  windowElement.style.bottom = "auto";
  windowElement.style.transform = "none";
}

function stopDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  dragState.windowElement.classList.remove("dragging");
  dragState = null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function loadSites() {
  try {
    const response = await fetch(SITE_DATA_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const siteData = await response.json();
    renderSiteList(siteData);
    handleWebringNavigation(siteData);
  } catch (error) {
    console.error(error);
    siteListPanel.innerHTML =
      '<p class="status-line">사이트 목록을 불러오지 못했습니다. `sites.json`을 확인해주세요.</p>';
  }
}

function renderSiteList(siteData) {
  if (!Array.isArray(siteData) || siteData.length === 0) {
    siteListPanel.innerHTML =
      '<p class="status-line">등록된 사이트가 아직 없습니다.</p>';
    return;
  }

  const row = document.createElement("div");
  row.className = "site-row";

  siteData.forEach((site) => {
    const link = document.createElement("a");
    link.className = "site-link";
    link.href = site.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = site.url.replace(STRIP_PROTOCOL_PATTERN, "");
    link.title = site.url;
    row.appendChild(link);
  });

  siteListPanel.replaceChildren(row);
}

function handleWebringNavigation(siteData) {
  if (!Array.isArray(siteData) || siteData.length === 0) {
    return;
  }

  const query = new URLSearchParams(window.location.search);
  const currentSite = getCurrentSite(siteData, query.get("site"));
  const targets = getRingTargets(siteData, currentSite.slug);

  const action = query.get("go");
  if (!action) {
    return;
  }

  const redirectMap = {
    prev: targets.previous.url,
    next: targets.next.url,
    random: targets.random.url,
    home: getBaseUrl(),
  };

  const targetUrl = redirectMap[action];
  if (targetUrl) {
    window.location.replace(targetUrl);
  }
}

function getCurrentSite(siteData, slug) {
  return siteData.find((site) => site.slug === slug) ?? siteData[0];
}

function getRingTargets(siteData, slug) {
  const currentIndex = siteData.findIndex((site) => site.slug === slug);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const current = siteData[safeIndex];
  const previous = siteData[(safeIndex - 1 + siteData.length) % siteData.length];
  const next = siteData[(safeIndex + 1) % siteData.length];

  let random = current;
  if (siteData.length > 1) {
    while (random.slug === current.slug) {
      random = siteData[Math.floor(Math.random() * siteData.length)];
    }
  }

  return { previous, next, random };
}

function getBaseUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function handleJoinSubmit(event) {
  event.preventDefault();

  const submittedUrl = joinUrlInput.value.trim();
  if (!submittedUrl) {
    return;
  }

  const subject = encodeURIComponent("독립웹연합 참여 신청");
  const body = encodeURIComponent(
    [
      "안녕하세요, 독립웹연합 참여를 신청합니다.",
      "",
      `웹사이트 URL: ${submittedUrl}`,
    ].join("\n")
  );

  window.location.href = `mailto:${JOIN_EMAIL}?subject=${subject}&body=${body}`;
}

function focusRingWindow() {
  if (!ringWindow) {
    return;
  }

  bringToFront(ringWindow);
}
