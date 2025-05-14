// js/views/newsView.js - Lógica para el Motor de Búsqueda de Noticias

import * as DOM from '../ui/domElements.js';
import { state } from '../state.js';
import { createElement, parseDateString } from '../utils.js';
const moment = window.moment;
import { setupTooltipListeners } from '../ui/tooltip.js';

// --- Funciones Principales ---

/** Función central: Filtra, ordena, pagina y renderiza. Exportada. */
export function performSearchAndRender() {
    const resultsContainer = DOM.getSearchResultsContainer(); const paginationContainer = DOM.getPaginationControls(); const countSpan = DOM.getResultsCountSpan();
    if (!resultsContainer || !paginationContainer || !countSpan) { console.error("[performSearchAndRender] Faltan elementos DOM críticos."); return; }
    console.log('[performSearchAndRender] Ejecutando...');
    try {
        state.filteredArticles = filterArticles();
        if (!Array.isArray(state.filteredArticles)) { console.error("filterArticles no devolvió array!"); state.filteredArticles = []; }
        console.log(`[performSearchAndRender] Después de filterArticles: ${state.filteredArticles.length} artículos.`);
        sortFilteredArticles();
        console.log("[performSearchAndRender] Después de sortFilteredArticles.");
        paginateResults();
        console.log(`[performSearchAndRender] Después de paginateResults: ${state.paginatedResults.length} para pág ${state.currentPage}.`);
        console.log("[performSearchAndRender] Actualizando UI...");
        updateResultsHeader(countSpan); renderSearchResults(state.paginatedResults, resultsContainer); renderPagination(paginationContainer);
        console.log(`[performSearchAndRender] Búsqueda/Renderizado completado.`);
    } catch (error) { console.error("[performSearchAndRender] ERROR INESPERADO:", error); if (resultsContainer) resultsContainer.innerHTML = `<p class="error-message">Error al buscar/mostrar.</p>`; }
}

/** Filtra state.allArticles. (Interna) */
function filterArticles() {
    const currentSearchTermLower = (state.searchTerm || '').toLowerCase().trim();
    const currentSectionLower = (state.selectedSection || '').toLowerCase();
    if (!Array.isArray(state.allArticles)) { console.warn("[filterArticles] state.allArticles no es array."); return []; }
    console.log(`[filterArticles] Filtrando ${state.allArticles.length} artículos con: Término='${currentSearchTermLower}', Sección='${currentSectionLower}', FiltroFecha='${state.selectedDateFilter}'`);
    try {
        const filtered = state.allArticles.filter(article => {
            if (!article) return false;
            const dateMatch = isDateInRange(article.fecha_hora, state.selectedDateFilter, state.customStartDate, state.customEndDate);
            if (!dateMatch) return false; // Descartar por fecha primero
            if (currentSectionLower !== '' && (typeof article.seccion !== 'string' || article.seccion.trim().toLowerCase() !== currentSectionLower)) return false; // Descartar por sección
            if (currentSearchTermLower !== '') { const title = (typeof article.titulo === 'string' ? article.titulo : '').toLowerCase(); const body = (typeof article.cuerpo === 'string' ? article.cuerpo : '').toLowerCase(); if (!title.includes(currentSearchTermLower) && !body.includes(currentSearchTermLower)) return false; } // Descartar por término
            return true; // Pasa todos los filtros activos
        });
        console.log("[filterArticles] Filtrado completado exitosamente."); return filtered;
    } catch (error) { console.error("[filterArticles] ERROR durante el filtrado:", error); return []; }
}

/** Ordena state.filteredArticles in-place. (Interna) */
function sortFilteredArticles() {
    if (!Array.isArray(state.filteredArticles)) { console.warn("[sort] filteredArticles no es array."); state.filteredArticles = []; return; }
    const field = state.currentSort.field; const ascending = state.currentSort.ascending; console.log(`[sort] Ordenando ${state.filteredArticles.length} por ${field} ${ascending?'ASC':'DESC'}`);
    try { state.filteredArticles.sort((a, b) => { if (field === 'date') { const dA = parseDateString(a?.fecha_hora), dB = parseDateString(b?.fecha_hora); if (!dA && !dB) return 0; if (!dA) return 1; if (!dB) return -1; return ascending ? dA.getTime() - dB.getTime() : dB.getTime() - dA.getTime(); } return 0; }); console.log("[sort] Ordenación completada."); } catch (e) { console.error("[sort] ERROR:", e); }
}

/** Calcula el slice para la paginación actual. (Interna) */
function paginateResults() { if (!Array.isArray(state.filteredArticles)) state.filteredArticles = []; const rpp = state.resultsPerPage || 10; const start = (state.currentPage - 1) * rpp; state.paginatedResults = state.filteredArticles.slice(start, start + rpp); }

// --- Funciones de Renderizado de UI (Internas) ---
function updateResultsHeader(countSpan) { const filtered = Array.isArray(state.filteredArticles)?state.filteredArticles:[]; const count=filtered.length; let msg=''; if (state.searchTerm) msg=`${count} resultado${count!==1?'s':''} para "${state.searchTerm}"`; else if(state.selectedSection||state.selectedDateFilter!=='all') msg=`${count} resultado${count!==1?'s':''} con filtros`; else msg=`Mostrando ${count} artículo${count!==1?'s':''}`; countSpan.textContent=msg; }
function renderSearchResults(articlesToShow, container) { container.innerHTML = ''; if (!articlesToShow || articlesToShow.length === 0) { container.innerHTML = '<p class="placeholder-message">No se encontraron noticias.</p>'; return; } const frag = document.createDocumentFragment(); articlesToShow.forEach(a => { try { const card = createSearchResultElement(a); if (card) frag.appendChild(card); } catch (e) { console.error("Error creando tarjeta:", e); }}); container.appendChild(frag); if (typeof setupTooltipListeners === 'function' && articlesToShow.length > 0) setupTooltipListeners(container); }
function createSearchResultElement(article) { if (!article) return null; const card = createElement('div', { className: 'search-result-card' }); const snippet = createSnippet(article.cuerpo, state.searchTerm, 180); const pDate = parseDateString(article.fecha_hora); const dDate = pDate ? moment(pDate).format('DD MMM YYYY') : 'Fecha N/A'; const img = article.link_img ? `<img src="${article.link_img}" alt="" class="result-image" loading="lazy">` : '<div class="result-image-placeholder"><i class="fas fa-image"></i></div>'; const cont = `<div class="result-content"><h4 class="result-title">${article.titulo || 'Sin Título'}</h4><p class="result-snippet">${snippet}</p><div class="result-meta"><span class="result-section">${typeof article.seccion === 'string' ? article.seccion.trim() : 'N/A'}</span> <span class="result-date">${dDate}</span></div></div>`; card.innerHTML = img + cont; if (state.searchTerm && snippet !== 'Descripción no disponible.') { const snipEl = card.querySelector('.result-snippet'); if (snipEl) try { const esc = state.searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); snipEl.innerHTML = snipEl.textContent.replace(new RegExp(`(${esc})`, 'gi'), '<mark>$1</mark>'); } catch(e){} } return card; }
function createSnippet(text, term = '', max = 180) { const clean = (typeof text === 'string' ? text : '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); if (!clean) return 'Descripción no disponible.'; term = (term || '').trim(); if (term) { const tL = term.toLowerCase(); const cL = clean.toLowerCase(); const idx = cL.indexOf(tL); if (idx !== -1) { const m = Math.floor((max - term.length*1.5)/2); let s = Math.max(0, idx - m); let e = Math.min(clean.length, s + max); if (s > 0) s = clean.lastIndexOf(' ', s) + 1; if (e < clean.length) e = clean.indexOf(' ', e) === -1 ? clean.length : clean.indexOf(' ', e); let snip = clean.substring(s, e); if (s > 0) snip = '...' + snip; if (e < clean.length) snip = snip + '...'; return snip; }} return clean.length > max ? clean.substring(0, max) + '...' : clean; }
function renderPagination(container) { container.innerHTML = ''; const total = state.filteredArticles.length; const rpp = state.resultsPerPage || 10; const pages = Math.ceil(total / rpp); const current = state.currentPage; if (pages <= 1) return; const frag = document.createDocumentFragment(); frag.appendChild(createElement('button', { className: 'page-button prev', innerHTML: '<i class="fas fa-chevron-left"></i> Ant.', disabled: current === 1, 'aria-label': 'Anterior', 'data-page': current - 1 })); const show = []; const d = 1; if (pages <= 5+(d*2)) { for(let i=1; i<=pages; i++) show.push(i); } else { show.push(1); if(current > d+2) show.push('...'); const s = Math.max(2, current-d); const e = Math.min(pages-1, current+d); for(let i=s; i<=e; i++) show.push(i); if(current < pages-d-1) show.push('...'); show.push(pages); } show.forEach(p => { if(p === '...') frag.appendChild(createElement('span', {className:'page-ellipsis',textContent:'...'})); else frag.appendChild(createElement('button', {className:`page-button number ${p===current?'active':''}`, textContent:p.toString(), 'aria-label':`Pág ${p}`, 'data-page':p}));}); frag.appendChild(createElement('button', { className: 'page-button next', innerHTML: 'Sig. <i class="fas fa-chevron-right"></i>', disabled: current === pages, 'aria-label': 'Siguiente', 'data-page': current + 1 })); container.appendChild(frag); }
function populateSectionFilter() { const list = DOM.getSectionFilterList(); if (!list || !Array.isArray(state.allArticles)) return; console.log("[populateSectionFilter] Poblando..."); const sections = new Set(); state.allArticles.forEach(a => { if(typeof a?.seccion === 'string' && a.seccion.trim()) sections.add(a.seccion.trim()); }); const sorted = Array.from(sections).sort((a,b) => a.localeCompare(b)); let allLi = list.querySelector('li:first-child button[data-section=""]')?.parentElement; list.innerHTML = ''; if(allLi){ allLi.querySelector('button').classList.add('active'); list.appendChild(allLi); } else { const li=createElement('li'); li.appendChild(createElement('button', {className:'filter-button active',dataset:{section:''}, textContent:'Todas'})); list.appendChild(li); } const frag = document.createDocumentFragment(); sorted.forEach(s => { const li=createElement('li'); li.appendChild(createElement('button', {className:'filter-button', dataset:{section:s}, textContent:s})); frag.appendChild(li); }); list.appendChild(frag); console.log("[populateSectionFilter] Poblado."); }

// --- Funciones de Ayuda (Helpers) (Internas) ---
/** Verifica si la fecha está en rango. ¡CORREGIDO! */
function isDateInRange(articleDateStr, filterType, customStartDate, customEndDate) {
    if (filterType === 'all') return true; // <-- CORRECCIÓN CLAVE
    const articleDate = parseDateString(articleDateStr); if (!articleDate) return false;
    const mArticleDate = moment.utc(articleDate); if (!mArticleDate.isValid()) return false;
    const now = moment.utc();
    try { switch (filterType) { case 'today': return mArticleDate.isSame(now, 'day'); case 'week': return mArticleDate.isSameOrAfter(now.clone().startOf('isoWeek')); case 'month': return mArticleDate.isSameOrAfter(now.clone().startOf('month')); case 'year': return mArticleDate.isSameOrAfter(now.clone().startOf('year'));
            case 'custom': if (!customStartDate || !customEndDate) return true; const mS=moment.utc(customStartDate).startOf('day'); const mE=moment.utc(customEndDate).endOf('day'); if(!mS.isValid()||!mE.isValid()||mE.isBefore(mS)) return false; return mArticleDate.isBetween(mS, mE, 'day', '[]');
            default: return true; }
    } catch (e) { console.error("Error en isDateInRange:", e); return false; }
}

// --- Manejadores de Eventos (Internos) ---
function handleSearchAction() { const input = DOM.getMainSearchInput(); if(!input) return; const term = input.value || ''; if (term !== state.searchTerm) { state.searchTerm = term; state.currentPage = 1; performSearchAndRender(); }}
function handleDateFilterClick(event) { const btn = event.target.closest('button[data-range]'); if (!btn) return; const range = btn.dataset.range; if (range === state.selectedDateFilter) return; state.selectedDateFilter=range; state.customStartDate=null; state.customEndDate=null; const startIn=DOM.getDateStartInput(); const endIn=DOM.getDateEndInput(); if(startIn) startIn.value=''; if(endIn) endIn.value=''; state.currentPage=1; const list=DOM.getDateFilterList(); list?.querySelectorAll('button.filter-button').forEach(b => b.classList.remove('active')); btn.classList.add('active'); performSearchAndRender(); }
function handleApplyDateRange() { const startIn=DOM.getDateStartInput(); const endIn=DOM.getDateEndInput(); if(!startIn || !endIn) return; const sVal=startIn.value; const eVal=endIn.value; if(!sVal || !eVal || !/^\d{4}-\d{2}-\d{2}$/.test(sVal) || !/^\d{4}-\d{2}-\d{2}$/.test(eVal)){alert("Fechas inválidas."); return;} const sD=moment.utc(sVal).toDate(); const eD=moment.utc(eVal).toDate(); if(!moment(sD).isValid() || !moment(eD).isValid() || moment(eD).isBefore(moment(sD))){alert("Rango inválido."); return;} state.selectedDateFilter='custom'; state.customStartDate=sD; state.customEndDate=eD; state.currentPage=1; const list=DOM.getDateFilterList(); list?.querySelectorAll('button.filter-button').forEach(b => b.classList.remove('active')); performSearchAndRender(); }
function handleSectionFilterClick(event) { const btn = event.target.closest('button[data-section]'); if (!btn) return; const sect = btn.dataset.section; if (sect === state.selectedSection) return; state.selectedSection=sect; state.currentPage=1; const list=DOM.getSectionFilterList(); list?.querySelectorAll('button.filter-button').forEach(b => b.classList.remove('active')); btn.classList.add('active'); performSearchAndRender(); }
function handleSortChange() { const sel = DOM.getSortOrderSelect(); if(!sel) return; const val = sel.value; const [f, d] = val.split('_'); const newAsc = d === 'asc'; if (state.currentSort.field !== f || state.currentSort.ascending !== newAsc) { state.currentSort.field=f; state.currentSort.ascending=newAsc; state.currentPage=1; performSearchAndRender(); }}
function handlePaginationClick(event) { const btn = event.target.closest('button[data-page]'); if (!btn || btn.disabled || btn.classList.contains('active')) return; const newP = parseInt(btn.dataset.page, 10); if (!isNaN(newP)) handlePageChange(newP); }
function handlePageChange(newPage) { const totalP = Math.ceil(state.filteredArticles.length / (state.resultsPerPage || 10)); if (newPage < 1 || newPage > totalP || newPage === state.currentPage) return; state.currentPage = newPage; const rCont = DOM.getSearchResultsContainer(); const pCont = DOM.getPaginationControls(); if(!rCont || !pCont) return; paginateResults(); renderSearchResults(state.paginatedResults, rCont); renderPagination(pCont); const sArea = DOM.getSearchResultsArea(); sArea?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function handleEnterKeyPress(event) { if (event.key === 'Enter') { event.preventDefault(); handleSearchAction(); }}

// --- Inicialización de la Vista ---
/** Función principal para inicializar la vista de búsqueda. Exportada. */
export function initializeSearchView() { // ¡EXPORTADA!
    console.log("[initializeSearchView] Inicializando vista de búsqueda...");
    const requiredDOMElements = [ DOM.getMainSearchInput(), DOM.getMainSearchButton(), DOM.getDateFilterList(), DOM.getDateStartInput(), DOM.getDateEndInput(), DOM.getApplyDateRangeButton(), DOM.getSectionFilterList(), DOM.getSearchResultsContainer(), DOM.getPaginationControls(), DOM.getSortOrderSelect(), DOM.getResultsCountSpan() ];
    if (requiredDOMElements.some(el => !el)) { console.error("[initializeSearchView] Error Crítico: Faltan elementos DOM. Abortando."); const nvCont = DOM.getNewsFeedView(); if(nvCont) nvCont.innerHTML = `<p class="error-message">Error al cargar interfaz.</p>`; return; }
    if (Array.isArray(state.allArticles) && state.allArticles.length > 0) populateSectionFilter(); else console.warn("[initializeSearchView] No hay artículos para poblar filtro.");
    // --- Añadir Listeners (una sola vez) ---
    const searchBtn = DOM.getMainSearchButton(); const searchInput = DOM.getMainSearchInput(); const dateList = DOM.getDateFilterList(); const applyRangeBtn = DOM.getApplyDateRangeButton(); const sectionList = DOM.getSectionFilterList(); const sortSelect = DOM.getSortOrderSelect(); const paginationContainer = DOM.getPaginationControls();
    searchBtn.removeEventListener('click', handleSearchAction); searchInput.removeEventListener('search', handleSearchAction); searchInput.removeEventListener('keypress', handleEnterKeyPress); dateList.removeEventListener('click', handleDateFilterClick); applyRangeBtn.removeEventListener('click', handleApplyDateRange); sectionList.removeEventListener('click', handleSectionFilterClick); sortSelect.removeEventListener('change', handleSortChange); paginationContainer.removeEventListener('click', handlePaginationClick);
    searchBtn.addEventListener('click', handleSearchAction); searchInput.addEventListener('search', handleSearchAction); searchInput.addEventListener('keypress', handleEnterKeyPress); dateList.addEventListener('click', handleDateFilterClick); applyRangeBtn.addEventListener('click', handleApplyDateRange); sectionList.addEventListener('click', handleSectionFilterClick); sortSelect.addEventListener('change', handleSortChange); paginationContainer.addEventListener('click', handlePaginationClick);
    console.log("[initializeSearchView] Listeners configurados.");
    performSearchAndRender(); // Renderizado Inicial
    console.log("[initializeSearchView] Vista de búsqueda inicializada.");
}

// Asegurarse que NINGUNA OTRA función tenga 'export'
console.log("[newsView.js] Módulo cargado.");