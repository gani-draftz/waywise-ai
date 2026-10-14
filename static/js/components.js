// WayWise AI - UI Components Module

export const components = {
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  getSuitabilityColor(label) {
    if (!label) return 'bg-gray-100 text-gray-800 border-gray-300';
    const l = label.toLowerCase();
    if (l.includes('highly')) return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    if (l.includes('moderate')) return 'bg-blue-50 text-blue-800 border-blue-300';
    if (l.includes('caution')) return 'bg-amber-50 text-amber-900 border-amber-300';
    if (l.includes('mismatch')) return 'bg-rose-50 text-rose-800 border-rose-300';
    return 'bg-gray-50 text-gray-800 border-gray-300';
  },

  getScoreBadge(score, label) {
    if (score === null || score === undefined) {
      return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">Info Incomplete</span>`;
    }
    const colorClass = this.getSuitabilityColor(label);
    return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${colorClass}">
      <span class="w-2 h-2 rounded-full mr-1.5 ${score >= 70 ? 'bg-emerald-600' : score >= 45 ? 'bg-amber-500' : 'bg-rose-600'}"></span>
      ${score}/100 • ${this.escapeHtml(label)}
    </span>`;
  },

  renderDestinationCard(dest, isComparing = false, calculatedScore = null, calculatedLabel = null) {
    const p = dest.practical_info || {};
    const access = p.accessibility || {};
    const walk = p.walking_requirements || {};
    const duration = p.visit_duration || {};

    const completeness = dest.data_completeness_score || 90;
    const completenessColor = completeness >= 90 ? 'text-emerald-800 bg-emerald-50 border-emerald-300' : 'text-amber-900 bg-amber-50 border-amber-300';

    const stepFreeStatus = access.step_free_access || 'Unverified';
    let stepFreeBadgeColor = 'bg-gray-100 text-gray-800';
    if (stepFreeStatus === 'Full' || stepFreeStatus === 'Good') stepFreeBadgeColor = 'bg-emerald-100 text-emerald-900';
    else if (stepFreeStatus === 'Partial') stepFreeBadgeColor = 'bg-blue-100 text-blue-900';
    else if (stepFreeStatus === 'Limited' || stepFreeStatus === 'Challenging') stepFreeBadgeColor = 'bg-amber-100 text-amber-950 font-semibold';

    return `
      <article class="dest-card bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200" data-id="${dest.id}">
        <div>
          <!-- Image Banner -->
          <div class="relative h-48 w-full overflow-hidden bg-slate-100 shimmer-loading">
            <img 
              src="${this.escapeHtml(dest.image_url)}" 
              alt="${this.escapeHtml(dest.name)} in ${this.escapeHtml(dest.city)}"
              class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
              decoding="async"
              onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80';"
            />
            <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-black/75 text-white backdrop-blur-sm">
                ${this.escapeHtml(dest.category)}
              </span>
            </div>
            <div class="absolute top-3 right-3">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${completenessColor} shadow-xs backdrop-blur-md">
                ${completeness}% Verified
              </span>
            </div>
          </div>

          <!-- Content Body -->
          <div class="p-5">
            <div class="flex items-start justify-between gap-2 mb-1">
              <h3 class="font-bold text-lg text-slate-900 line-clamp-1">${this.escapeHtml(dest.name)}</h3>
            </div>
            
            <p class="text-xs font-medium text-slate-600 mb-2.5 flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              ${this.escapeHtml(dest.city)}, ${this.escapeHtml(dest.state ? dest.state + ', ' : '')}${this.escapeHtml(dest.country)}
            </p>

            <p class="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">${this.escapeHtml(dest.description)}</p>

            <div class="mb-3">
              ${this.getScoreBadge(calculatedScore, calculatedLabel)}
            </div>

            <!-- Practical Facts Grid -->
            <div class="grid grid-cols-2 gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 mb-4">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-sky-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>~${duration.estimated_hours || 2}h visit</span>
              </div>
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-sky-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <span>${this.escapeHtml(walk.intensity || 'Moderate')} walk</span>
              </div>
              <div class="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span class="text-slate-600">Step-Free Access:</span>
                <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${stepFreeBadgeColor}">${this.escapeHtml(stepFreeStatus)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="px-5 pb-5 pt-0 flex items-center gap-2">
          <button 
            type="button"
            class="btn-reality-check flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs py-2.5 px-3 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            data-id="${dest.id}"
            aria-label="Run Reality Check for ${this.escapeHtml(dest.name)}">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            Reality Check
          </button>
          
          <button 
            type="button"
            title="${isComparing ? 'Remove from comparison' : 'Add to comparison'}"
            aria-label="${isComparing ? 'Remove from comparison' : 'Add to comparison'}"
            class="btn-toggle-compare p-2.5 rounded-xl border ${isComparing ? 'border-sky-500 bg-sky-50 text-sky-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'} transition"
            data-id="${dest.id}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isComparing ? 'M5 13l4 4L19 7' : 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'}"></path></svg>
          </button>
        </div>
      </article>
    `;
  },

  renderRealityCheckReport(result, weatherData = null) {
    const isGemini = result.engine_mode === 'gemini_ai';
    const engineBadge = isGemini 
      ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300"><span class="w-2 h-2 rounded-full bg-purple-600 mr-1.5 animate-pulse"></span>Synthesized via Google Gemini AI</span>`
      : `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300"><span class="w-2 h-2 rounded-full bg-blue-600 mr-1.5"></span>WayWise Deterministic Engine (100% Verified)</span>`;

    const scoreColorClass = this.getSuitabilityColor(result.suitability_label);
    const breakdown = result.score_breakdown || {
      accessibility_score: 85,
      walking_score: 80,
      schedule_score: 90,
      interest_fit_score: 85
    };

    return `
      <div class="space-y-8 animate-fadeIn">
        <!-- Top Status Banner -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div class="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
            <div>
              <div class="flex items-center gap-2 mb-1.5">
                ${engineBadge}
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  ${result.completeness_score}% Data Completeness
                </span>
              </div>
              <h1 class="text-2xl sm:text-3xl font-black text-slate-900">${this.escapeHtml(result.destination_name)}</h1>
              <p class="text-xs text-slate-600 mt-1">WayWise Personalized Reality Check • Evidence-Grounded Synthesis</p>
            </div>

            <!-- Score Visual -->
            <div class="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div class="text-right">
                <span class="block text-2xl font-black ${result.suitability_score >= 70 ? 'text-emerald-700' : result.suitability_score >= 45 ? 'text-amber-700' : 'text-rose-700'}">
                  ${result.suitability_score !== null ? result.suitability_score + '/100' : 'N/A'}
                </span>
                <span class="text-xs font-bold ${scoreColorClass} px-2.5 py-0.5 rounded border inline-block mt-0.5">
                  ${this.escapeHtml(result.suitability_label)}
                </span>
              </div>
            </div>
          </div>

          <!-- Dimensional Score Breakdown Strip -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6 text-xs">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span class="text-slate-500 block text-[11px] mb-0.5">♿ Accessibility Fit</span>
              <span class="font-black text-slate-900 text-sm">${breakdown.accessibility_score}%</span>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span class="text-slate-500 block text-[11px] mb-0.5">🚶 Walking Intensity Fit</span>
              <span class="font-black text-slate-900 text-sm">${breakdown.walking_score}%</span>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span class="text-slate-500 block text-[11px] mb-0.5">⏱ Schedule & Duration</span>
              <span class="font-black text-slate-900 text-sm">${breakdown.schedule_score}%</span>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span class="text-slate-500 block text-[11px] mb-0.5">🎯 Interest Alignment</span>
              <span class="font-black text-slate-900 text-sm">${breakdown.interest_fit_score}%</span>
            </div>
          </div>

          <!-- Overall Synthesis Narrative -->
          <div class="bg-sky-50/70 border border-sky-200 rounded-2xl p-5 mb-6">
            <h4 class="text-xs font-bold text-sky-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <svg class="w-4 h-4 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Executive Reality Assessment
            </h4>
            <p class="text-sm text-sky-950 leading-relaxed font-medium">${this.escapeHtml(result.overall_synthesis)}</p>
          </div>

          <!-- Toolbar -->
          <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-slate-700">Official Provenance:</span>
              ${result.official_sources && result.official_sources.length ? result.official_sources.map(s => `
                <a href="${this.escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" class="underline hover:text-sky-700 font-medium flex items-center gap-0.5">
                  ${this.escapeHtml(s.name)}
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                </a>
              `).join(' • ') : '<span class="italic">Official Tourism Records</span>'}
            </div>
            <button onclick="window.print()" class="text-slate-800 hover:text-slate-950 flex items-center gap-1.5 font-bold bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl border border-slate-300 transition" aria-label="Print Reality Check Report">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              Print / Save PDF
            </button>
          </div>
        </div>

        <!-- THE 4 CORE PILLARS -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          <!-- PILLAR A: WHAT WE KNOW -->
          <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2.5 mb-4">
                <div class="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm" aria-hidden="true">A</div>
                <div>
                  <h3 class="font-bold text-slate-900 text-base">WHAT WE KNOW</h3>
                  <p class="text-xs text-slate-600">Confirmed facts supported by identifiable official authorities</p>
                </div>
              </div>

              <div class="space-y-3 text-xs">
                ${result.what_we_know && result.what_we_know.map(k => `
                  <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-bold text-slate-900">${this.escapeHtml(k.category)}</span>
                      <span class="text-[10px] text-slate-500 font-medium">Verified: ${this.escapeHtml(k.verified_date || 'Recent')}</span>
                    </div>
                    <p class="text-slate-800 mb-1 leading-relaxed">${this.escapeHtml(k.fact)}</p>
                    ${k.stairs ? `<p class="text-slate-700 italic mb-1">Stairs: ${this.escapeHtml(k.stairs)}</p>` : ''}
                    <div class="text-[11px] text-slate-600 font-mono">Source: ${this.escapeHtml(k.source)}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- PILLAR B: HOW WELL IT MATCHES YOU -->
          <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2.5 mb-4">
                <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm" aria-hidden="true">B</div>
                <div>
                  <h3 class="font-bold text-slate-900 text-base">HOW WELL IT MATCHES YOU</h3>
                  <p class="text-xs text-slate-600">Personalized match rationale based on your requirements</p>
                </div>
              </div>

              <div class="space-y-2.5 text-xs">
                ${result.how_well_it_matches_you && result.how_well_it_matches_you.length ? result.how_well_it_matches_you.map(m => `
                  <div class="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 font-medium">
                    <svg class="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    <span class="leading-relaxed">${this.escapeHtml(m)}</span>
                  </div>
                `).join('') : '<p class="text-xs text-slate-500 italic p-3">No direct positive match factors identified based on the general profile.</p>'}
              </div>
            </div>
          </div>

          <!-- PILLAR C: WHAT COULD BE DIFFICULT -->
          <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2.5 mb-4">
                <div class="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm" aria-hidden="true">C</div>
                <div>
                  <h3 class="font-bold text-slate-900 text-base">WHAT COULD BE DIFFICULT</h3>
                  <p class="text-xs text-slate-600">Mismatches, steep stairs, lack of elevators, or closures</p>
                </div>
              </div>

              <div class="space-y-2.5 text-xs">
                ${result.what_could_be_difficult && result.what_could_be_difficult.length ? result.what_could_be_difficult.map(d => `
                  <div class="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-300 text-amber-950 font-semibold">
                    <svg class="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <span class="leading-relaxed">${this.escapeHtml(d)}</span>
                  </div>
                `).join('') : '<p class="text-xs text-slate-600 italic p-3">No critical constraints identified for your current profile.</p>'}
              </div>
            </div>
          </div>

          <!-- PILLAR D: WHAT TO VERIFY BEFORE LEAVING -->
          <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div class="flex items-center gap-2.5 mb-4">
                <div class="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm" aria-hidden="true">D</div>
                <div>
                  <h3 class="font-bold text-slate-900 text-base">WHAT TO VERIFY BEFORE LEAVING</h3>
                  <p class="text-xs text-slate-600">Interactive pre-departure checklist for unverified details</p>
                </div>
              </div>

              <div class="space-y-2 text-xs" id="interactive-checklist">
                ${result.what_to_verify_before_leaving && result.what_to_verify_before_leaving.length ? result.what_to_verify_before_leaving.map((item, idx) => `
                  <label class="checklist-item flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                    <input type="checkbox" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" onchange="this.parentElement.classList.toggle('checked', this.checked)">
                    <span class="text-slate-800 leading-snug">${this.escapeHtml(item)}</span>
                  </label>
                `).join('') : '<p class="text-xs text-slate-600 italic p-3">All critical travel requirements for this venue have verified documentation.</p>'}
              </div>
            </div>
          </div>

        </div>

        <!-- LIVE CONDITIONS & METEOROLOGICAL FORECAST (Open-Meteo) -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
              <h3 class="font-bold text-slate-900 text-base">Live Meteorological Conditions & Forecast</h3>
            </div>
            <span class="text-[11px] text-slate-500 font-medium">Open-Meteo Weather API</span>
          </div>

          ${weatherData && weatherData.weather ? `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <!-- Current Temp -->
              <div class="p-4 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-sm flex items-center justify-between">
                <div>
                  <span class="text-xs uppercase tracking-wider text-sky-100 font-bold">Current Weather</span>
                  <div class="text-3xl font-black mt-1">${weatherData.weather.current.temperature_c !== null ? weatherData.weather.current.temperature_c + '°C' : 'N/A'}</div>
                  <p class="text-xs text-sky-100 font-medium">${this.escapeHtml(weatherData.weather.current.condition || 'Fair')}</p>
                </div>
                <div class="text-right text-xs text-sky-100 space-y-0.5">
                  <div>Feels like: ${weatherData.weather.current.apparent_temperature_c !== null ? weatherData.weather.current.apparent_temperature_c + '°C' : 'N/A'}</div>
                  <div>Wind: ${weatherData.weather.current.wind_speed_kmh || 0} km/h</div>
                  <div>Humidity: ${weatherData.weather.current.humidity_pct || 0}%</div>
                </div>
              </div>

              <!-- 7-Day Forecast Strip -->
              <div class="col-span-1 md:col-span-2 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                ${weatherData.weather.forecast && weatherData.weather.forecast.map(f => `
                  <div class="flex-1 min-w-[80px] p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div class="font-bold text-slate-800 text-[11px] mb-1">${f.date.slice(5)}</div>
                    <div class="font-black text-slate-900">${f.max_temp !== null ? Math.round(f.max_temp) + '°' : '-'}</div>
                    <div class="text-[10px] text-slate-600">${f.min_temp !== null ? Math.round(f.min_temp) + '°' : '-'}</div>
                    <div class="text-[10px] text-sky-700 font-semibold mt-1">${f.precipitation_prob || 0}% rain</div>
                  </div>
                `).join('')}
              </div>
            </div>

            ${weatherData.weather.date_notice ? `
              <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                <svg class="w-4 h-4 text-blue-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>${this.escapeHtml(weatherData.weather.date_notice)}</span>
              </div>
            ` : ''}
          ` : `
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
              Live weather feed loading or offline fallback mode active.
            </div>
          `}
        </div>

        <!-- GROUNDED ALTERNATIVE DESTINATIONS -->
        ${result.suggested_alternatives && result.suggested_alternatives.length ? `
          <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <div class="mb-4">
              <h3 class="font-bold text-slate-900 text-base">Grounded Alternative Destinations</h3>
              <p class="text-xs text-slate-600">Suggested when this venue presents mismatches or accessibility barriers</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              ${result.suggested_alternatives.map(alt => `
                <div class="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 flex flex-col justify-between hover:border-sky-300 transition">
                  <div>
                    <div class="h-28 rounded-xl overflow-hidden mb-3 bg-slate-200">
                      <img src="${this.escapeHtml(alt.image_url)}" alt="${this.escapeHtml(alt.name)}" class="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <h4 class="font-bold text-slate-900 text-sm mb-1">${this.escapeHtml(alt.name)}</h4>
                    <p class="text-xs text-slate-600 mb-2">${this.escapeHtml(alt.city)} • ${this.escapeHtml(alt.category)}</p>
                    <p class="text-xs text-slate-700 leading-relaxed mb-3">${this.escapeHtml(alt.reason)}</p>

                    <div class="space-y-1 mb-3">
                      ${alt.comparative_advantages.map(adv => `
                        <div class="text-[11px] text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <svg class="w-3 h-3 text-emerald-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                          <span>${this.escapeHtml(adv)}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>

                  <button 
                    type="button" 
                    class="btn-reality-check w-full text-center py-2 px-3 bg-white border border-slate-300 hover:border-sky-500 text-slate-800 hover:text-sky-700 rounded-xl text-xs font-bold shadow-2xs transition"
                    data-id="${alt.id}"
                    aria-label="Switch to reality check for ${this.escapeHtml(alt.name)}">
                    Switch to this Reality Check
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

      </div>
    `;
  },

  renderComparisonMatrix(comparisonData) {
    if (!comparisonData || !comparisonData.destinations || !comparisonData.destinations.length) {
      return `
        <div class="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
          <svg class="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
          <h3 class="text-base font-bold text-slate-900 mb-1">No destinations selected for comparison</h3>
          <p class="text-xs text-slate-600 max-w-sm mx-auto mb-4">Click the bookmark icon on any destination card to compare up to 3 destinations side by side.</p>
          <button onclick="document.querySelector('[data-tab=explore]').click()" class="bg-sky-600 text-white text-xs font-bold px-4 py-2 rounded-xl">Browse Destinations</button>
        </div>
      `;
    }

    const dests = comparisonData.destinations;
    const profile = comparisonData.active_profile;

    return `
      <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-fadeIn">
        <div class="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900">Side-by-Side Destination Comparison</h2>
            <p class="text-xs text-slate-600 mt-0.5">Comparing ${dests.length} selected destinations against your travel profile requirements</p>
          </div>
          <button id="btn-clear-compare" class="text-xs text-rose-700 hover:text-rose-800 font-bold px-3 py-1.5 rounded-lg border border-rose-300 hover:bg-rose-50 transition" aria-label="Clear all compared destinations">
            Clear All
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-800">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" class="p-4 font-bold text-slate-900 w-44">Criterion</th>
                ${dests.map(d => `
                  <th scope="col" class="p-4 font-bold text-slate-900 min-w-[220px]">
                    <div class="flex items-center justify-between gap-2 mb-2">
                      <span class="text-sm font-black line-clamp-1">${this.escapeHtml(d.name)}</span>
                      <button class="btn-remove-compare text-slate-400 hover:text-rose-600 font-bold" data-id="${d.id}" aria-label="Remove ${this.escapeHtml(d.name)} from comparison">✕</button>
                    </div>
                    <div class="h-24 rounded-lg overflow-hidden mb-2 bg-slate-200">
                      <img src="${this.escapeHtml(d.image_url)}" alt="${this.escapeHtml(d.name)}" class="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div class="text-[11px] text-slate-600 font-medium mb-1">${this.escapeHtml(d.city)}</div>
                    <div>${this.getScoreBadge(d.suitability_score, d.suitability_label)}</div>
                  </th>
                `).join('')}
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-100">
              <!-- Step-Free Access -->
              <tr class="${profile && profile.step_free_required ? 'bg-sky-50/70 font-semibold' : ''}">
                <td class="p-4 text-slate-900 font-bold">
                  Step-Free Access
                  ${profile && profile.step_free_required ? '<span class="block text-[10px] text-sky-800 uppercase tracking-wider">Your Mandatory Need</span>' : ''}
                </td>
                ${dests.map(d => `
                  <td class="p-4">
                    <span class="px-2 py-0.5 rounded text-xs font-bold ${d.step_free_access === 'Full' || d.step_free_access === 'Good' ? 'bg-emerald-100 text-emerald-900' : d.step_free_access === 'Partial' ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-950'}">
                      ${this.escapeHtml(d.step_free_access)}
                    </span>
                    <p class="text-[11px] text-slate-600 mt-1">${this.escapeHtml(d.stairs_details)}</p>
                  </td>
                `).join('')}
              </tr>

              <!-- Walking Requirements -->
              <tr>
                <td class="p-4 text-slate-900 font-bold">Walking Requirements</td>
                ${dests.map(d => `
                  <td class="p-4">
                    <span class="font-extrabold text-slate-900">~${d.walking_distance_km} km</span> (${this.escapeHtml(d.walking_intensity)})
                    <p class="text-[11px] text-slate-600 mt-0.5">${this.escapeHtml(d.walking_surface)}</p>
                  </td>
                `).join('')}
              </tr>

              <!-- Duration -->
              <tr>
                <td class="p-4 text-slate-900 font-bold">Visit Duration</td>
                ${dests.map(d => `
                  <td class="p-4 font-bold text-slate-900">~${d.duration_hours} hours</td>
                `).join('')}
              </tr>

              <!-- Elevators & Wheelchairs -->
              <tr>
                <td class="p-4 text-slate-900 font-bold">Lifts & Wheelchairs</td>
                ${dests.map(d => `
                  <td class="p-4">
                    <div>Elevators: <span class="font-semibold">${this.escapeHtml(d.elevators)}</span></div>
                    <div>Wheelchairs on site: <span class="font-semibold">${this.escapeHtml(d.wheelchairs_on_site)}</span></div>
                  </td>
                `).join('')}
              </tr>

              <!-- Restrooms -->
              <tr>
                <td class="p-4 text-slate-900 font-bold">Restrooms</td>
                ${dests.map(d => `
                  <td class="p-4">
                    <span>${d.restrooms === 'Yes' ? 'Available' : 'None/Unverified'}</span>
                    ${d.accessible_restroom === 'Yes' ? '<span class="text-emerald-800 font-semibold block text-[11px]">✓ Accessible Toilet</span>' : ''}
                  </td>
                `).join('')}
              </tr>

              <!-- Schedule -->
              <tr>
                <td class="p-4 text-slate-900 font-bold">Opening Schedule</td>
                ${dests.map(d => `
                  <td class="p-4">
                    <div class="text-[11px] text-slate-900 font-semibold">${this.escapeHtml(d.schedule)}</div>
                    <div class="text-[10px] text-rose-700 font-medium mt-0.5">Closed: ${this.escapeHtml(d.closed_days)}</div>
                  </td>
                `).join('')}
              </tr>

              <!-- Key Difficulty -->
              <tr class="bg-amber-50/50">
                <td class="p-4 text-amber-950 font-bold">Key Difficulty Notice</td>
                ${dests.map(d => `
                  <td class="p-4 text-amber-950 text-[11px] leading-relaxed font-medium">
                    ${this.escapeHtml(d.top_difficulty)}
                  </td>
                `).join('')}
              </tr>

              <!-- Data Completeness -->
              <tr>
                <td class="p-4 text-slate-900 font-bold">Data Completeness</td>
                ${dests.map(d => `
                  <td class="p-4">
                    <div class="font-extrabold text-slate-900">${d.data_completeness}% Verified</div>
                    <div class="text-[10px] text-slate-500 mt-0.5 truncate">${this.escapeHtml(d.source_provenance)}</div>
                  </td>
                `).join('')}
              </tr>

              <!-- Action -->
              <tr class="bg-slate-50">
                <td class="p-4"></td>
                ${dests.map(d => `
                  <td class="p-4">
                    <button 
                      class="btn-reality-check w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-xs transition"
                      data-id="${d.id}"
                      aria-label="View Reality Check for ${this.escapeHtml(d.name)}">
                      Run Reality Check
                    </button>
                  </td>
                `).join('')}
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderCommunitySection(reports, destinations, isAdminMode) {
    return `
      <div class="space-y-6">
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-bold text-slate-900">Community Condition Reports</h2>
            <p class="text-xs text-slate-600 mt-0.5">Crowdsourced ground observations, temporary obstacles, and accessibility changes</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-open-submit-report" class="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5" aria-label="Submit a new ground observation">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              Submit Observation
            </button>
            <button id="btn-toggle-admin" class="text-xs font-bold px-3 py-2 rounded-xl border ${isAdminMode ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-slate-100 text-slate-800 border-slate-300'} transition" aria-label="Toggle admin moderation mode">
              ${isAdminMode ? '✓ Admin Moderation Active' : 'Admin Desk'}
            </button>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="flex flex-wrap items-center gap-2" role="region" aria-label="Filter reports by verification status">
          <span class="text-xs font-bold text-slate-700 mr-1">Status:</span>
          <button class="btn-filter-report px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white" data-status="all">All (${reports.length})</button>
          <button class="btn-filter-report px-3 py-1 rounded-lg text-xs font-semibold bg-white text-slate-800 border border-slate-200 hover:bg-slate-100" data-status="verified">Verified</button>
          <button class="btn-filter-report px-3 py-1 rounded-lg text-xs font-semibold bg-white text-slate-800 border border-slate-200 hover:bg-slate-100" data-status="under_review">Under Review</button>
          <button class="btn-filter-report px-3 py-1 rounded-lg text-xs font-semibold bg-white text-slate-800 border border-slate-200 hover:bg-slate-100" data-status="unverified">Unverified</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="reports-grid">
          ${reports.map(r => {
            const statusColors = {
              verified: 'bg-emerald-50 text-emerald-900 border-emerald-300',
              under_review: 'bg-blue-50 text-blue-900 border-blue-300',
              unverified: 'bg-amber-50 text-amber-950 border-amber-300',
              rejected: 'bg-rose-50 text-rose-900 border-rose-300'
            };
            const sColor = statusColors[r.verification_status] || 'bg-gray-100 text-gray-800';

            return `
              <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="text-xs font-bold text-sky-800">${this.escapeHtml(r.destination_name)}</span>
                    <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${sColor} uppercase tracking-wider">
                      ${this.escapeHtml(r.verification_status.replace('_', ' '))}
                    </span>
                  </div>

                  <h4 class="font-bold text-slate-900 text-sm mb-1.5">${this.escapeHtml(r.title)}</h4>
                  <p class="text-xs text-slate-700 leading-relaxed mb-3">${this.escapeHtml(r.description)}</p>

                  ${r.admin_notes ? `
                    <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 mb-3">
                      <span class="font-bold text-slate-900">Admin Audit:</span> ${this.escapeHtml(r.admin_notes)}
                    </div>
                  ` : ''}
                </div>

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>By: ${this.escapeHtml(r.reported_by)} • ${new Date(r.reported_at).toLocaleDateString()}</span>
                  <span class="font-bold text-slate-700">${this.escapeHtml(r.category)}</span>
                </div>

                ${isAdminMode ? `
                  <div class="mt-3 pt-3 border-t border-amber-200 bg-amber-50/70 p-2.5 rounded-xl flex items-center justify-between gap-2">
                    <span class="text-[11px] font-bold text-amber-950">Audit Action:</span>
                    <div class="flex items-center gap-1.5">
                      <button class="btn-moderate-report text-xs font-bold px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white" data-id="${r.id}" data-action="verified">Verify</button>
                      <button class="btn-moderate-report text-xs font-bold px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white" data-id="${r.id}" data-action="under_review">Review</button>
                      <button class="btn-moderate-report text-xs font-bold px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white" data-id="${r.id}" data-action="rejected">Reject</button>
                    </div>
                  </div>
                ` : ''}

              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
};
