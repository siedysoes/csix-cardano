/* CSIX Cardano — SPA: renders Markdown topics with language toggle (EN/ID). */
"use strict";

const LS_LANG = "csix-cardano-lang";
let MANIFEST = null;
let LANG = localStorage.getItem(LS_LANG) === "id" ? "id_lang" : "en";
let currentPath = null;   // path of the article currently shown (e.g. en/fundamentals/utxo-model.md)
const mdCache = new Map(); // path -> markdown text

const $ = (id) => document.getElementById(id);
const langKey = () => (LANG === "id_lang" ? "id_lang" : "en");

/* ---------- routing ---------- */
// hash format: #/<path without .md>, e.g. #/en/fundamentals/utxo-model
function parseHash() {
  const h = location.hash.replace(/^#\/?/, "").trim();
  return h.length ? decodeURIComponent(h) + ".md" : null;
}

function navigate(path) {
  location.hash = "#/" + path.replace(/\.md$/, "");
}

/* ---------- sidebar ---------- */
function renderSidebar(filter = "") {
  const nav = $("sidebar");
  nav.innerHTML = "";
  const q = filter.trim().toLowerCase();
  for (const sec of MANIFEST.sections) {
    const items = MANIFEST.topics.filter(
      (t) => t.section === sec.id &&
        (!q || (t[langKey()].title || "").toLowerCase().includes(q))
    );
    if (q && items.length === 0) continue;
    const h = document.createElement("div");
    h.className = "sec-title";
    h.textContent = sec[langKey()];
    nav.appendChild(h);
    if (items.length === 0) {
      const e = document.createElement("div");
      e.className = "side-empty";
      e.textContent = "— no match —";
      nav.appendChild(e);
      continue;
    }
    for (const t of items) {
      const a = document.createElement("a");
      a.className = "side-link" + (t[langKey()].path === currentPath ? " active" : "");
      a.href = "#/" + t[langKey()].path.replace(/\.md$/, "");
      a.textContent = t[langKey()].title;
      a.addEventListener("click", () => $("sidebar").classList.remove("open"));
      nav.appendChild(a);
    }
  }
}

/* ---------- article loading ---------- */
async function fetchMd(path) {
  if (mdCache.has(path)) return mdCache.get(path);
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(res.status + " " + res.statusText);
  const text = await res.text();
  mdCache.set(path, text);
  return text;
}

function interceptLinks(root) {
  // Internal relative .md links become SPA navigations.
  root.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || /^(https?:|mailto:|#)/.test(href)) {
      if (href && href.startsWith("http")) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      return;
    }
    if (href.endsWith(".md") || href.includes(".md#")) {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        const [file, anchor] = href.split("#");
        const resolved = new URL(file, "https://x/" + currentPath).pathname.slice(1);
        if (anchor) {
          navigate(resolved);
          setTimeout(() => {
            const el = document.getElementById(anchor);
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }, 120);
        } else {
          navigate(resolved);
        }
      });
    }
  });
}

async function showArticle(path) {
  const mdEl = $("md");
  currentPath = path;
  renderSidebar($("search").value);
  updateEditLink();

  // language fallback: if requested file missing, show notice + EN version
  let text;
  try {
    text = await fetchMd(path);
  } catch (e) {
    mdEl.innerHTML = "";
    const alt = path.replace(/^id\//, "en/");
    const p = document.createElement("p");
    p.className = "error";
    if (alt !== path) {
      p.innerHTML = 'This article is not available in Indonesian yet. <a href="#/' +
        alt.replace(/\.md$/, "") + '">Read it in English</a>.';
    } else {
      p.textContent = "Failed to load article (" + e.message + ").";
    }
    mdEl.appendChild(p);
    document.title = "Not found — CSIX Cardano";
    return;
  }

  mdEl.innerHTML = marked.parse(text);
  interceptLinks(mdEl);
  addAnchorIds(mdEl);

  const h1 = mdEl.querySelector("h1");
  document.title = (h1 ? h1.textContent : "Article") + " — CSIX Cardano";
  window.scrollTo({ top: 0 });

  localStorage.setItem(LS_LANG, LANG === "id_lang" ? "id" : "en");
}

function addAnchorIds(root) {
  const seen = new Set();
  root.querySelectorAll("h2, h3").forEach((h) => {
    let id = h.textContent.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
    if (!id) id = "sec";
    let n = 1;
    while (seen.has(id)) id = id + "-" + n++;
    seen.add(id);
    h.id = id;
  });
}

function updateEditLink() {
  const el = $("editLink");
  if (!currentPath) { el.innerHTML = ""; return; }
  const url = "https://github.com/siedysoes/csix-cardano/edit/main/" + currentPath;
  el.innerHTML = '<a href="' + url + '" target="_blank" rel="noopener">Edit this page</a>';
}

/* ---------- language toggle ---------- */
function otherLangPath(path) {
  if (path.startsWith("id/")) return "en/" + path.slice(3);
  if (path.startsWith("en/")) return "id/" + path.slice(3);
  return null;
}

async function toggleLang() {
  const btn = $("langBtn");
  if (LANG === "en") {
    LANG = "id_lang";
    btn.textContent = "EN";
    if (currentPath) {
      const alt = otherLangPath(currentPath);
      if (alt) { navigate(alt); return; }
    }
  } else {
    LANG = "en";
    btn.textContent = "ID";
    if (currentPath) {
      const alt = otherLangPath(currentPath);
      if (alt) { navigate(alt); return; }
    }
  }
  localStorage.setItem(LS_LANG, LANG === "id_lang" ? "id" : "en");
  if (!currentPath) renderSidebar($("search").value);
}

/* ---------- boot ---------- */
async function route() {
  let path = parseHash();
  if (!path) {
    path = MANIFEST.topics[0][langKey()].path;
    navigate(path);
    return;
  }
  const wantsId = path.startsWith("id/");
  if (wantsId && LANG !== "id_lang") { LANG = "id_lang"; $("langBtn").textContent = "EN"; }
  if (!wantsId && path.startsWith("en/") && LANG !== "en") { LANG = "en"; $("langBtn").textContent = "ID"; }
  await showArticle(path);
}

async function boot() {
  try {
    const res = await fetch("topics.json", { cache: "no-cache" });
    MANIFEST = await res.json();
  } catch (e) {
    $("md").innerHTML = '<p class="error">Failed to load topics.json.</p>';
    return;
  }
  $("langBtn").textContent = LANG === "id_lang" ? "EN" : "ID";
  renderSidebar();
  await route();

  window.addEventListener("hashchange", route);

  $("search").addEventListener("input", (e) => renderSidebar(e.target.value));

  $("langBtn").addEventListener("click", toggleLang);

  $("menuBtn").addEventListener("click", () => {
    const sb = $("sidebar");
    const open = sb.classList.toggle("open");
    $("menuBtn").setAttribute("aria-expanded", String(open));
  });

  // back-to-top button
  const toTop = document.createElement("button");
  toTop.id = "toTop";
  toTop.textContent = "\u2191";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(toTop);
  window.addEventListener("scroll", () => {
    toTop.style.display = window.scrollY > 500 ? "block" : "none";
  });
}

boot();
