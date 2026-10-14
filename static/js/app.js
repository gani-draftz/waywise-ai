// WayWise AI - Main Application Controller

import { api } from './api.js';
import { store } from './state.js';
import { components } from './components.js';

class WayWiseApp {
  constructor() {
    this.destinations = [];
    this.searchDebounceTimer = null;
    this.init();
  }

  async init() {
    this.bindDOM();
    this.setupEventListeners();
    this.setupStoreSubscriptions();
    await this.loadInitialData();
    this.renderActiveTab();
    this.updateProfileBadge();
    this.updateCompareCounter();
  }

  bindDOM() {
    this.mainContainer = document.getElementById('main-content');
    this.profileModal = document.getElementById('profile-modal');
    this.settingsModal = document.getElementById('settings-modal');
    this.reportModal = document.getElementById('report-modal');
    this.toastContainer = document.getElementById('toast-container');
    this.compareCounter = document.getElementById('compare-badge-count');
    this.announcer = document.getElementById('a11y-announcer');
  }

  announce(message) {
    if (this.announcer) {
      this.announcer.textContent = message;
    }
  }

  setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('[data-tab]').forEach(tabBtn => {
      tabBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = tabBtn.getAttribute('data-tab');
        store.setActiveTab(tab);
        this.announce(`Switched to ${tab} view`);
      });
    });

    // Profile trigger buttons
    document.querySelectorAll('.btn-open-profile').forEach(btn => {
      btn.addEventListener('click', () => this.openProfileModal());
    });

    // Settings trigger buttons
    document.querySelectorAll('.btn-open-settings').forEach(btn => {
      btn.addEventListener('click', () => this.openSettingsModal());
    });

    // Close modal clicks
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-backdrop');
        if (modal) modal.classList.add('hidden');
      });
    });

    // Escape key to dismiss modals (WCAG Accessibility)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach(modal => {
          modal.classList.add('hidden');
        });
      }
    });

    // 1-Click Persona Buttons
    document.querySelectorAll('.btn-apply-persona').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const persona = btn.getAttribute('data-persona');
        this.applyPersonaPreset(persona);
      });
    });

    // Profile form submit
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProfileFromForm();
      });
    }

    // Reset profile button
    const btnResetProfile = document.getElementById('btn-reset-profile');
    if (btnResetProfile) {
      btnResetProfile.addEventListener('click', () => {
        store.resetProfile();
        this.populateProfileForm();
        this.showToast('Profile reset to default parameters', 'info');
      });
    }

    // Settings form submit
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const keyInput = document.getElementById('settings-gemini-key');
        store.updateSettings({ geminiApiKey: keyInput.value.trim() });
        this.settingsModal.classList.add('hidden');
        this.showToast('WayWise AI settings saved successfully', 'success');
      });
    }

    // Community Report form submit
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
      reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleReportSubmission();
      });
    }

    // Global delegation for Reality Check & Compare buttons
    document.addEventListener('click', async (e) => {
      const realityBtn = e.target.closest('.btn-reality-check');
      if (realityBtn) {
        const destId = realityBtn.getAttribute('data-id');
        if (destId) await this.launchRealityCheck(destId);
        return;
      }

      const compareBtn = e.target.closest('.btn-toggle-compare');
      if (compareBtn) {
        const destId = compareBtn.getAttribute('data-id');
        if (destId) {
          try {
            store.toggleCompare(destId);
            this.showToast('Updated destination comparison list', 'info');
          } catch (err) {
            this.showToast(err.message, 'warning');
          }
        }
        return;
      }

      const removeCompareBtn = e.target.closest('.btn-remove-compare');
      if (removeCompareBtn) {
        const destId = removeCompareBtn.getAttribute('data-id');
        store.toggleCompare(destId);
        return;
      }

      const clearCompareBtn = e.target.closest('#btn-clear-compare');
      if (clearCompareBtn) {
        store.clearCompare();
        this.showToast('Comparison list cleared', 'info');
        return;
      }

      const openReportBtn = e.target.closest('#btn-open-submit-report');
      if (openReportBtn) {
        this.openReportModal();
        return;
      }

      const toggleAdminBtn = e.target.closest('#btn-toggle-admin');
      if (toggleAdminBtn) {
        store.toggleAdminMode();
        return;
      }

      const modBtn = e.target.closest('.btn-moderate-report');
      if (modBtn) {
        const repId = modBtn.getAttribute('data-id');
        const action = modBtn.getAttribute('data-action');
        await this.handleModerateReport(repId, action);
        return;
      }

      const filterRepBtn = e.target.closest('.btn-filter-report');
      if (filterRepBtn) {
        const status = filterRepBtn.getAttribute('data-status');
        await this.filterReportsByStatus(status);
        return;
      }
    });
  }

  applyPersonaPreset(persona) {
    if (persona === 'senior') {
      store.updateProfile({
        step_free_required: true,
        minimize_stairs: true,
        slower_paced_required: true,
        walking_intensity_preference: 'Minimal',
        available_time_hours: 4.0
      });
      this.showToast('Applied Senior & Mobility Persona (Step-Free Mandatory)', 'success');
    } else if (persona === 'family') {
      store.updateProfile({
        traveling_with_children: true,
        minimize_stairs: true,
        walking_intensity_preference: 'Moderate',
        available_time_hours: 3.5
      });
      this.showToast('Applied Family Trip Persona (Child-friendly safety)', 'success');
    } else if (persona === 'quick') {
      store.updateProfile({
        available_time_hours: 1.5,
        walking_intensity_preference: 'Minimal',
        step_free_required: false
      });
      this.showToast('Applied Short Stop Persona (1.5 Hours max)', 'success');
    } else if (persona === 'trekker') {
      store.updateProfile({
        walking_intensity_preference: 'High',
        step_free_required: false,
        available_time_hours: 6.0,
        interests: ['History', 'Nature', 'Architecture']
      });
      this.showToast('Applied Active Trekker Persona (Expansive walks)', 'success');
    }

    this.populateProfileForm();
    this.profileModal.classList.add('hidden');
    store.setActiveTab('explore');
  }

  setupStoreSubscriptions() {
    store.subscribe((changeType, payload) => {
      if (changeType === 'tab_changed') {
        this.updateNavUI(payload);
        this.renderActiveTab();
      } else if (changeType === 'profile_updated') {
        this.updateProfileBadge();
        if (store.state.activeTab === 'explore' || store.state.activeTab === 'home') {
          this.renderActiveTab();
        }
      } else if (changeType === 'compare_updated') {
        this.updateCompareCounter();
        if (store.state.activeTab === 'compare') {
          this.renderCompareView();
        } else {
          this.renderActiveTab();
        }
      } else if (changeType === 'admin_toggled') {
        if (store.state.activeTab === 'community') {
          this.renderCommunityView();
        }
      }
    });
  }

  async loadInitialData() {
    try {
      const data = await api.getDestinations();
      this.destinations = data.destinations || [];
      store.state.destinations = this.destinations;
    } catch (err) {
      console.error('Error loading destinations:', err);
      this.showToast('Could not load destinations. Please refresh.', 'error');
    }
  }

  updateNavUI(activeTab) {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      if (tab === activeTab) {
        btn.classList.add('text-sky-600', 'font-bold');
        btn.classList.remove('text-slate-700', 'font-medium');
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.classList.remove('text-sky-600', 'font-bold');
        btn.classList.add('text-slate-700', 'font-medium');
        btn.removeAttribute('aria-current');
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateCompareCounter() {
    const count = store.state.compareIds.length;
    if (this.compareCounter) {
      this.compareCounter.textContent = count;
      if (count > 0) {
        this.compareCounter.classList.remove('hidden');
      } else {
        this.compareCounter.classList.add('hidden');
      }
    }
  }

  updateProfileBadge() {
    const badge = document.getElementById('active-profile-summary');
    if (!badge) return;

    const p = store.state.profile;
    const parts = [];
    if (p.step_free_required) parts.push('♿ Step-Free Mandatory');
    if (p.walking_intensity_preference) parts.push(`🚶 ${p.walking_intensity_preference}`);
    if (p.available_time_hours) parts.push(`⏱ ${p.available_time_hours}h`);
    if (p.traveling_with_children) parts.push('👶 Children');
    if (p.slower_paced_required) parts.push('🐢 Slower Pace');

    if (parts.length > 0) {
      badge.innerHTML = `
        <button type="button" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-900 border border-sky-300 cursor-pointer btn-open-profile hover:bg-sky-100 transition" aria-label="Active Profile: ${parts.join(', ')}. Click to modify.">
          <span class="w-2 h-2 rounded-full bg-sky-600" aria-hidden="true"></span>
          Profile: ${parts.join(' • ')}
        </button>
      `;
    } else {
      badge.innerHTML = `
        <button type="button" class="btn-open-profile text-xs font-bold text-slate-600 hover:text-sky-600 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-sky-300">
          <span>⚙ Customize Travel Profile</span>
        </button>
      `;
    }
  }

  renderActiveTab() {
    const tab = store.state.activeTab;
    if (tab === 'home') this.renderHomeView();
    else if (tab === 'explore') this.renderExploreView();
    else if (tab === 'compare') this.renderCompareView();
    else if (tab === 'community') this.renderCommunityView();
    else if (tab === 'reality-check') this.renderRealityCheckView();
  }

  renderHomeView() {
    const featured = this.destinations.slice(0, 6);
    const compareIds = store.state.compareIds;

    this.mainContainer.innerHTML = `
      <!-- Hero Section -->
      <section class="py-12 sm:py-20 text-center relative overflow-hidden">
        <div class="max-w-4xl mx-auto px-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-sky-100/90 text-sky-900 mb-6 border border-sky-200">
            <span class="w-2 h-2 rounded-full bg-sky-600 animate-pulse" aria-hidden="true"></span>
            WayWise AI • Factual Destination Intelligence
          </div>

          <h1 class="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-5">
            Know Before You Go.
          </h1>

          <p class="text-base sm:text-xl text-slate-700 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
            Discover what to expect, understand what matters to your mobility and schedule, and choose destinations with total confidence.
          </p>

          <!-- Search & Action Bar -->
          <div class="max-w-2xl mx-auto bg-white p-2.5 rounded-2xl shadow-lg border border-slate-200/90 flex flex-col sm:flex-row gap-2 mb-6" role="search">
            <div class="relative flex-1">
              <label for="hero-search-input" class="sr-only">Search destinations</label>
              <input 
                type="text" 
                id="hero-search-input" 
                placeholder="Search Taj Mahal, Qutub Minar, Hampi, Kerala, Paris..." 
                class="w-full pl-10 pr-4 py-3 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-900"
              />
              <svg class="w-5 h-5 text-slate-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <button id="btn-hero-search" class="bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition flex items-center justify-center gap-2" aria-label="Explore Destinations">
              Explore Destinations
            </button>
          </div>

          <!-- Quick Persona Shortcuts -->
          <div class="inline-flex flex-wrap items-center justify-center gap-2.5 text-xs text-slate-600">
            <span class="font-bold text-slate-800">Quick Personas:</span>
            <button class="btn-persona-quick px-3 py-1 rounded-full bg-white border border-slate-300 hover:border-sky-500 text-slate-800 font-semibold transition" data-persona="senior">♿ Senior / Mobility</button>
            <button class="btn-persona-quick px-3 py-1 rounded-full bg-white border border-slate-300 hover:border-sky-500 text-slate-800 font-semibold transition" data-persona="family">👨‍👩‍👧 Family Trip</button>
            <button class="btn-persona-quick px-3 py-1 rounded-full bg-white border border-slate-300 hover:border-sky-500 text-slate-800 font-semibold transition" data-persona="quick">⏱ Short Stop</button>
            <button class="btn-persona-quick px-3 py-1 rounded-full bg-white border border-slate-300 hover:border-sky-500 text-slate-800 font-semibold transition" data-persona="trekker">🎒 Active Trekker</button>
          </div>
        </div>
      </section>

      <!-- The 4 Core Pillars -->
      <section class="py-12 bg-white border-y border-slate-200/80 -mx-4 sm:-mx-8 px-4 sm:px-8" aria-labelledby="how-it-works-heading">
        <div class="max-w-6xl mx-auto">
          <div class="text-center max-w-2xl mx-auto mb-10">
            <h2 id="how-it-works-heading" class="text-2xl sm:text-3xl font-black text-slate-900 mb-2">The WayWise Reality Check</h2>
            <p class="text-xs sm:text-sm text-slate-600">WayWise AI replaces generic promotional descriptions with four rigorous, evidence-grounded checks for every destination.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="p-6 rounded-2xl bg-blue-50/60 border border-blue-200 flex flex-col justify-between">
              <div>
                <span class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm mb-3" aria-hidden="true">A</span>
                <h3 class="font-bold text-slate-900 text-sm mb-1.5">What We Know</h3>
                <p class="text-xs text-slate-700 leading-relaxed">Factual destination constraints (hours, steps, elevators, transit, fees) backed by identifiable official sources and verification timestamps.</p>
              </div>
            </div>

            <div class="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between">
              <div>
                <span class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm mb-3" aria-hidden="true">B</span>
                <h3 class="font-bold text-slate-900 text-sm mb-1.5">How Well It Matches You</h3>
                <p class="text-xs text-slate-700 leading-relaxed">Personalized evaluation of how verified venue attributes match your walking intensity, accessibility needs, time window, and interests.</p>
              </div>
            </div>

            <div class="p-6 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col justify-between">
              <div>
                <span class="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-sm mb-3" aria-hidden="true">C</span>
                <h3 class="font-bold text-slate-900 text-sm mb-1.5">What Could Be Difficult</h3>
                <p class="text-xs text-slate-700 leading-relaxed">Transparent disclosure of steep stairs, missing elevators, heat, excessive walking distances, or confirmed seasonal disruptions.</p>
              </div>
            </div>

            <div class="p-6 rounded-2xl bg-indigo-50/60 border border-indigo-200 flex flex-col justify-between">
              <div>
                <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm mb-3" aria-hidden="true">D</span>
                <h3 class="font-bold text-slate-900 text-sm mb-1.5">What To Verify</h3>
                <p class="text-xs text-slate-700 leading-relaxed">A pre-departure checklist highlighting critical unconfirmed parameters or date-sensitive conditions before you leave.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Featured Destinations Grid -->
      <section class="py-12 max-w-6xl mx-auto" aria-labelledby="featured-heading">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h2 id="featured-heading" class="text-xl sm:text-2xl font-black text-slate-900">Featured Grounded Destinations</h2>
            <p class="text-xs text-slate-600 mt-0.5">Explore destinations with high factual verification completeness</p>
          </div>
          <button onclick="document.querySelector('[data-tab=explore]').click()" class="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1">
            View All (${this.destinations.length}) →
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          ${featured.map(d => components.renderDestinationCard(d, compareIds.includes(d.id))).join('')}
        </div>
      </section>
    `;

    // Wire up hero search
    const searchInput = document.getElementById('hero-search-input');
    const searchBtn = document.getElementById('btn-hero-search');
    const runSearch = () => {
      const query = searchInput.value.trim();
      store.setFilters({ search: query });
      store.setActiveTab('explore');
    };

    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', runSearch);
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') runSearch();
      });
    }

    // Persona shortcuts in hero
    document.querySelectorAll('.btn-persona-quick').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-persona');
        this.applyPersonaPreset(p);
      });
    });
  }

  async renderExploreView() {
    const f = store.state.filters;
    const compareIds = store.state.compareIds;

    let dests = await api.getDestinations(f);
    let items = dests.destinations || [];

    this.mainContainer.innerHTML = `
      <div class="max-w-6xl mx-auto space-y-6 animate-fadeIn">
        <!-- Filter Controls Card -->
        <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm" role="region" aria-label="Destination Filters">
          <div class="flex flex-col lg:flex-row gap-4 items-center justify-between pb-4 border-b border-slate-100">
            <!-- Search Input -->
            <div class="relative w-full lg:w-96">
              <label for="explore-search-input" class="sr-only">Filter destinations by name or location</label>
              <input 
                type="text" 
                id="explore-search-input" 
                value="${components.escapeHtml(f.search)}" 
                placeholder="Filter by destination, monument, state..." 
                class="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-900"
              />
              <svg class="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>

            <!-- Category Pills -->
            <div class="flex flex-wrap items-center gap-1.5 w-full lg:w-auto" role="group" aria-label="Category Filters">
              ${['All', 'Historical & Heritage', 'Nature & Outdoor', 'Cultural & Spiritual', 'City Experiences'].map(cat => `
                <button 
                  class="btn-cat-filter px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${f.category === cat ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
                  data-cat="${cat}">
                  ${cat}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Quick Secondary Toggles -->
          <div class="flex flex-wrap items-center justify-between gap-4 pt-4 text-xs">
            <div class="flex flex-wrap items-center gap-4">
              <label class="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input type="checkbox" id="filter-step-free" class="rounded border-slate-300 text-sky-600" ${f.step_free_only ? 'checked' : ''}>
                <span>Step-Free Accessible Only</span>
              </label>

              <div class="flex items-center gap-2">
                <label for="explore-sort" class="text-slate-600 font-medium">Sort by:</label>
                <select id="explore-sort" class="border border-slate-300 rounded-lg p-1 text-xs text-slate-800 bg-white font-medium">
                  <option value="default" ${f.sort_by === 'default' ? 'selected' : ''}>Default</option>
                  <option value="completeness" ${f.sort_by === 'completeness' ? 'selected' : ''}>Highest Verification</option>
                  <option value="name" ${f.sort_by === 'name' ? 'selected' : ''}>Alphabetical</option>
                  <option value="duration_asc" ${f.sort_by === 'duration_asc' ? 'selected' : ''}>Visit Duration (Shortest)</option>
                </select>
              </div>
            </div>

            <span class="text-slate-500 font-semibold" aria-live="polite">${items.length} Destinations Available</span>
          </div>
        </div>

        <!-- Destination Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          ${items.length > 0 
            ? items.map(d => components.renderDestinationCard(d, compareIds.includes(d.id))).join('')
            : `
              <div class="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
                <p class="text-sm font-bold text-slate-800 mb-1">No destinations match the selected filters</p>
                <p class="text-xs text-slate-500 mb-4">Try clearing filters or search query.</p>
                <button id="btn-reset-filters" class="text-xs font-bold text-sky-700 border border-sky-300 px-3.5 py-2 rounded-xl hover:bg-sky-50">Reset Filters</button>
              </div>
            `
          }
        </div>
      </div>
    `;

    // Filter listeners with 300ms Debounce for efficiency
    const searchInput = document.getElementById('explore-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          store.setFilters({ search: e.target.value.trim() });
          this.renderExploreView();
        }, 300);
      });
    }

    document.querySelectorAll('.btn-cat-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat');
        store.setFilters({ category: cat });
        this.renderExploreView();
      });
    });

    const stepFreeCheckbox = document.getElementById('filter-step-free');
    if (stepFreeCheckbox) {
      stepFreeCheckbox.addEventListener('change', (e) => {
        store.setFilters({ step_free_only: e.target.checked });
        this.renderExploreView();
      });
    }

    const sortSelect = document.getElementById('explore-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        store.setFilters({ sort_by: e.target.value });
        this.renderExploreView();
      });
    }

    const resetBtn = document.getElementById('btn-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        store.setFilters({ search: '', category: 'All', step_free_only: false, sort_by: 'default' });
        this.renderExploreView();
      });
    }
  }

  async launchRealityCheck(destinationId) {
    store.state.activeDestinationId = destinationId;
    store.setActiveTab('reality-check');

    this.mainContainer.innerHTML = `
      <div class="max-w-4xl mx-auto py-20 text-center">
        <div class="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true"></div>
        <h3 class="text-lg font-bold text-slate-900 mb-1">Running WayWise Reality Check...</h3>
        <p class="text-xs text-slate-600 max-w-sm mx-auto">Evaluating confirmed facts against your requirements, checking weather forecasts, and compiling unknown parameters.</p>
      </div>
    `;

    try {
      const profile = store.state.profile;
      const apiKey = store.state.settings.geminiApiKey;

      const [realityResult, weatherResult] = await Promise.all([
        api.performRealityCheck(destinationId, profile, apiKey),
        api.getWeather(destinationId, profile.visit_date).catch(() => null)
      ]);

      store.state.currentRealityCheck = realityResult;
      store.state.currentWeather = weatherResult;

      this.mainContainer.innerHTML = `
        <div class="max-w-5xl mx-auto space-y-6">
          <div class="flex items-center justify-between">
            <button onclick="document.querySelector('[data-tab=explore]').click()" class="text-xs font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1">
              ← Back to Destinations
            </button>
            <button class="btn-open-profile text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1">
              Adjust Travel Preferences ⚙
            </button>
          </div>
          ${components.renderRealityCheckReport(realityResult, weatherResult)}
        </div>
      `;

      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.announce(`Reality check completed for ${realityResult.destination_name}`);
    } catch (err) {
      console.error('Reality check error:', err);
      this.mainContainer.innerHTML = `
        <div class="max-w-md mx-auto py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
          <p class="text-rose-700 font-bold mb-2">Reality Check Failed</p>
          <p class="text-xs text-slate-600 mb-4">${err.message}</p>
          <button onclick="document.querySelector('[data-tab=explore]').click()" class="bg-sky-600 text-white text-xs font-bold px-4 py-2 rounded-xl">Back to Explore</button>
        </div>
      `;
    }
  }

  renderRealityCheckView() {
    if (store.state.currentRealityCheck) {
      this.mainContainer.innerHTML = `
        <div class="max-w-5xl mx-auto space-y-6">
          <div class="flex items-center justify-between">
            <button onclick="document.querySelector('[data-tab=explore]').click()" class="text-xs font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1">
              ← Back to Destinations
            </button>
            <button class="btn-open-profile text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1">
              Adjust Travel Preferences ⚙
            </button>
          </div>
          ${components.renderRealityCheckReport(store.state.currentRealityCheck, store.state.currentWeather)}
        </div>
      `;
    } else {
      this.renderExploreView();
    }
  }

  async renderCompareView() {
    const ids = store.state.compareIds;
    if (!ids || ids.length === 0) {
      this.mainContainer.innerHTML = `
        <div class="max-w-4xl mx-auto">
          ${components.renderComparisonMatrix(null)}
        </div>
      `;
      return;
    }

    this.mainContainer.innerHTML = `
      <div class="max-w-4xl mx-auto py-20 text-center">
        <div class="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true"></div>
        <p class="text-xs text-slate-600">Aligning destination data for comparison matrix...</p>
      </div>
    `;

    try {
      const data = await api.compareDestinations(ids, store.state.profile);
      this.mainContainer.innerHTML = `
        <div class="max-w-6xl mx-auto">
          ${components.renderComparisonMatrix(data)}
        </div>
      `;
    } catch (err) {
      this.mainContainer.innerHTML = `
        <div class="max-w-md mx-auto py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
          <p class="text-rose-700 font-bold mb-2">Comparison Failed</p>
          <p class="text-xs text-slate-600 mb-4">${err.message}</p>
        </div>
      `;
    }
  }

  async renderCommunityView() {
    this.mainContainer.innerHTML = `
      <div class="max-w-4xl mx-auto py-16 text-center">
        <div class="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true"></div>
        <p class="text-xs text-slate-600">Loading community reports and observations...</p>
      </div>
    `;

    try {
      const data = await api.getReports();
      const reports = data.reports || [];
      store.state.reports = reports;

      this.mainContainer.innerHTML = `
        <div class="max-w-5xl mx-auto">
          ${components.renderCommunitySection(reports, this.destinations, store.state.isAdminMode)}
        </div>
      `;
    } catch (err) {
      this.mainContainer.innerHTML = `
        <div class="max-w-md mx-auto py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
          <p class="text-rose-700 font-bold mb-2">Error loading reports</p>
          <p class="text-xs text-slate-600">${err.message}</p>
        </div>
      `;
    }
  }

  async filterReportsByStatus(status) {
    try {
      const data = await api.getReports(null, status);
      store.state.reports = data.reports || [];
      this.renderCommunityView();
    } catch (err) {
      this.showToast('Could not filter reports', 'error');
    }
  }

  async handleModerateReport(reportId, newStatus) {
    try {
      const note = prompt(`Enter admin audit note for status '${newStatus}':`, 'Verified via official venue liaison');
      if (note === null) return;

      await api.updateReportStatus(reportId, newStatus, note);
      this.showToast(`Report status updated to ${newStatus}`, 'success');
      await this.renderCommunityView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  openProfileModal() {
    this.populateProfileForm();
    this.profileModal.classList.remove('hidden');
    const firstInput = document.getElementById('profile-time');
    if (firstInput) firstInput.focus();
  }

  populateProfileForm() {
    const p = store.state.profile;
    document.getElementById('profile-time').value = p.available_time_hours || 3.0;
    document.getElementById('profile-time-display').textContent = `${p.available_time_hours || 3.0} Hours`;
    document.getElementById('profile-walk').value = p.walking_intensity_preference || 'Moderate';
    document.getElementById('profile-step-free').checked = !!p.step_free_required;
    document.getElementById('profile-min-stairs').checked = !!p.minimize_stairs;
    document.getElementById('profile-children').checked = !!p.traveling_with_children;
    document.getElementById('profile-senior').checked = !!p.slower_paced_required;
    document.getElementById('profile-budget').value = p.budget_tier || 'Moderate';

    const interests = p.interests || [];
    document.querySelectorAll('.profile-interest-checkbox').forEach(cb => {
      cb.checked = interests.includes(cb.value);
    });
  }

  saveProfileFromForm() {
    const selectedInterests = [];
    document.querySelectorAll('.profile-interest-checkbox:checked').forEach(cb => {
      selectedInterests.push(cb.value);
    });

    const updated = {
      available_time_hours: parseFloat(document.getElementById('profile-time').value),
      walking_intensity_preference: document.getElementById('profile-walk').value,
      step_free_required: document.getElementById('profile-step-free').checked,
      minimize_stairs: document.getElementById('profile-min-stairs').checked,
      traveling_with_children: document.getElementById('profile-children').checked,
      slower_paced_required: document.getElementById('profile-senior').checked,
      budget_tier: document.getElementById('profile-budget').value,
      interests: selectedInterests
    };

    store.updateProfile(updated);
    this.profileModal.classList.add('hidden');
    this.showToast('WayWise Travel Profile saved locally', 'success');
    this.announce('Travel profile updated');
  }

  openSettingsModal() {
    const keyInput = document.getElementById('settings-gemini-key');
    if (keyInput) keyInput.value = store.state.settings.geminiApiKey || '';
    this.settingsModal.classList.remove('hidden');
    if (keyInput) keyInput.focus();
  }

  openReportModal() {
    const destSelect = document.getElementById('report-dest-select');
    if (destSelect) {
      destSelect.innerHTML = this.destinations.map(d => `
        <option value="${d.id}">${this.escapeHtml(d.name)} (${this.escapeHtml(d.city)})</option>
      `).join('');
    }
    this.reportModal.classList.remove('hidden');
    const firstInput = document.getElementById('report-title-input');
    if (firstInput) firstInput.focus();
  }

  async handleReportSubmission() {
    const destId = document.getElementById('report-dest-select').value;
    const cat = document.getElementById('report-category-select').value;
    const title = document.getElementById('report-title-input').value.trim();
    const desc = document.getElementById('report-desc-input').value.trim();
    const reporter = document.getElementById('report-user-input').value.trim() || 'Anonymous Traveler';

    if (!title || !desc) {
      alert('Please fill out both the observation title and details.');
      return;
    }

    try {
      await api.submitReport({
        destination_id: destId,
        category: cat,
        title: title,
        description: desc,
        reported_by: reporter
      });

      this.reportModal.classList.add('hidden');
      document.getElementById('report-form').reset();
      this.showToast('Observation submitted. Marked as unverified until audited.', 'success');
      await this.renderCommunityView();
    } catch (err) {
      alert('Failed to submit report: ' + err.message);
    }
  }

  showToast(message, type = 'info') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-emerald-700' : type === 'warning' ? 'bg-amber-700' : type === 'error' ? 'bg-rose-700' : 'bg-slate-900';
    toast.className = `${bgClass} text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0`;
    toast.innerHTML = `<span>${components.escapeHtml(message)}</span>`;

    this.toastContainer.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.waywiseApp = new WayWiseApp();
});
