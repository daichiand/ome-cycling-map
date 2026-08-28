/* global L */
(function () {
  "use strict";
  const config = window.OME_MAP_CONFIG || {};
  const state = { spots: [], markers: new Map(), categories: new Set(), locationMarker: null };
  const map = L.map("map").setView([35.7876, 139.2756], 12);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
  const $ = (selector) => document.querySelector(selector);
  const el = { search: $("#spot-search"), filters: $("#category-filters"), list: $("#spot-list"), count: $("#result-count"), data: $("#data-status"), locate: $("#locate-button"), location: $("#location-status"), dialog: $("#spot-detail"), close: $("#detail-close"), category: $("#detail-category"), title: $("#detail-title"), description: $("#detail-description"), fields: $("#detail-fields"), sample: $("#detail-sample"), route: $("#detail-route"), website: $("#detail-website"), empty: $("#empty-state-template") };
  const meaningful = (value) => Boolean(value) && value !== "要確認";
  function safeUrl(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol); } catch (_) { return false; } }
  function normalise(raw) {
    const tags = Array.isArray(raw.tags) ? raw.tags : String(raw.tags || raw["タグ"] || "").split(/[,、]/).map((v) => v.trim()).filter(Boolean);
    return { id: String(raw.id || raw.spot_id || ""), public: raw.public === true || raw.public === "true" || raw.publicStatus === "公開" || raw["公開状態"] === "公開", isSample: raw.isSample === true || raw.isSample === "true" || raw["サンプル"] === "はい", name: String(raw.name || raw.spotName || raw["スポット名"] || "名称未設定"), category: String(raw.category || raw["カテゴリ"] || "その他"), description: String(raw.description || raw["説明"] || ""), lat: Number(raw.lat || raw.latitude || raw["緯度"]), lng: Number(raw.lng || raw.longitude || raw["経度"]), address: String(raw.address || raw["住所"] || ""), businessHours: String(raw.businessHours || raw["営業時間"] || ""), closedDays: String(raw.closedDays || raw["定休日"] || ""), parkingAvailable: String(raw.parkingAvailable || raw["駐車場"] || ""), parkingDetails: String(raw.parkingDetails || raw["駐車場詳細"] || ""), carAccess: String(raw.carAccess || raw["車アクセス"] || ""), website: String(raw.website || raw["公式サイト"] || ""), phone: String(raw.phone || raw["電話番号"] || ""), tags };
  }
  async function load(url) { const response = await fetch(url, { cache: "no-store" }); if (!response.ok) throw new Error("data"); const payload = await response.json(); const rows = Array.isArray(payload) ? payload : payload.spots; if (!Array.isArray(rows)) throw new Error("format"); return rows.map(normalise).filter((spot) => spot.public && Number.isFinite(spot.lat) && Number.isFinite(spot.lng)); }
  function dataStatus(message, warning) { el.data.textContent = message; el.data.classList.toggle("is-warning", Boolean(warning)); }
  function filterButtons() {
    const categories = [...new Set(state.spots.map((spot) => spot.category))].sort((a, b) => a.localeCompare(b, "ja")); state.categories = new Set(categories); el.filters.replaceChildren();
    categories.forEach((category) => { const button = document.createElement("button"); button.type = "button"; button.className = "category-filter"; button.textContent = category; button.setAttribute("aria-pressed", "true"); button.addEventListener("click", () => { state.categories.has(category) ? state.categories.delete(category) : state.categories.add(category); button.setAttribute("aria-pressed", String(state.categories.has(category))); render(); }); el.filters.append(button); });
  }
  function filtered() { const query = el.search.value.trim().toLocaleLowerCase("ja"); return state.spots.filter((spot) => state.categories.has(spot.category) && (!query || [spot.name, spot.category, spot.description, spot.address, ...spot.tags].join(" ").toLocaleLowerCase("ja").includes(query))); }
  function updateMarkers(spots) {
    const visible = new Set(spots.map((spot) => spot.id)); state.markers.forEach((marker, id) => { if (!visible.has(id)) map.removeLayer(marker); });
    spots.forEach((spot) => { let marker = state.markers.get(spot.id); if (!marker) { marker = L.marker([spot.lat, spot.lng]).bindTooltip(spot.name, { direction: "top", offset: [0, -28] }); marker.on("click", () => showDetail(spot)); state.markers.set(spot.id, marker); } if (!map.hasLayer(marker)) marker.addTo(map); });
  }
  function card(spot) {
    const button = document.createElement("button"); button.type = "button"; button.className = "spot-card"; button.addEventListener("click", () => showDetail(spot));
    const header = document.createElement("div"); header.className = "spot-card-header"; const text = document.createElement("div"); const title = document.createElement("h3"); title.textContent = spot.name; const category = document.createElement("p"); category.className = "spot-category"; category.textContent = spot.category; text.append(title, category); header.append(text);
    if (spot.parkingAvailable) { const parking = document.createElement("span"); parking.className = "parking-badge"; parking.textContent = `駐車場：${spot.parkingAvailable}`; header.append(parking); } button.append(header);
    if (spot.description) { const description = document.createElement("p"); description.className = "spot-description"; description.textContent = spot.description; button.append(description); } return button;
  }
  function render() { const spots = filtered(); el.count.textContent = `${spots.length}件`; el.list.replaceChildren(); if (spots.length) spots.forEach((spot) => el.list.append(card(spot))); else el.list.append(el.empty.content.cloneNode(true)); updateMarkers(spots); }
  function detailField(label, value) { if (!meaningful(value)) return; const term = document.createElement("dt"), definition = document.createElement("dd"); term.textContent = label; definition.textContent = value; el.fields.append(term, definition); }
  function showDetail(spot) {
    el.category.textContent = spot.category; el.title.textContent = spot.name; el.description.textContent = spot.description || "説明は準備中です。"; el.sample.hidden = !spot.isSample; el.fields.replaceChildren();
    [["住所", spot.address], ["営業時間", spot.businessHours], ["定休日", spot.closedDays], ["駐車場", spot.parkingAvailable], ["駐車場詳細", spot.parkingDetails], ["車でのアクセス", spot.carAccess], ["電話番号", spot.phone], ["タグ", spot.tags.join("・")]].forEach(([label, value]) => detailField(label, value));
    el.route.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${spot.lat},${spot.lng}`)}&travelmode=driving`;
    if (safeUrl(spot.website)) { el.website.href = spot.website; el.website.hidden = false; } else { el.website.hidden = true; el.website.removeAttribute("href"); }
    map.setView([spot.lat, spot.lng], Math.max(map.getZoom(), 15)); if (!el.dialog.open) el.dialog.showModal();
  }
  function locate() {
    if (!navigator.geolocation) { el.location.textContent = "この端末では現在地を利用できません。"; return; } el.location.textContent = "現在地を取得しています…";
    navigator.geolocation.getCurrentPosition((position) => { const { latitude, longitude } = position.coords; if (state.locationMarker) map.removeLayer(state.locationMarker); state.locationMarker = L.circleMarker([latitude, longitude], { radius: 9, color: "#0b65c2", fillColor: "#2a8df0", fillOpacity: 1, weight: 3 }).addTo(map).bindTooltip("現在地", { direction: "top" }); map.setView([latitude, longitude], 14); el.location.textContent = "現在地を地図に表示しました。"; }, (error) => { const messages = { 1: "位置情報が許可されていません。端末またはブラウザの設定を確認してください。", 2: "現在地を取得できませんでした。通信状況を確認して、もう一度お試しください。", 3: "現在地の取得が時間切れになりました。もう一度お試しください。" }; el.location.textContent = messages[error.code] || "現在地を取得できませんでした。"; }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 });
  }
  async function initialise() {
    try { const endpoint = String(config.sheetApiUrl || "").trim(); state.spots = await load(endpoint || config.sampleDataUrl || "data/sightseeing.json"); const samples = state.spots.some((spot) => spot.isSample); dataStatus(samples ? "サンプルデータを表示しています。公開前に実在情報へ置き換えてください。" : "最新の公開スポット情報を表示しています。", samples); }
    catch (_) { try { state.spots = await load(config.sampleDataUrl || "data/sightseeing.json"); dataStatus("観光情報の取得に失敗したため、サンプルデータを表示しています。", true); } catch (_) { dataStatus("観光情報を表示できません。時間をおいて再度お試しください。", true); } }
    filterButtons(); render();
  }
  el.search.addEventListener("input", render); el.locate.addEventListener("click", locate); el.close.addEventListener("click", () => el.dialog.close()); el.dialog.addEventListener("click", (event) => { if (event.target === el.dialog) el.dialog.close(); }); initialise();
}());
