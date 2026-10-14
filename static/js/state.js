// TravelReality AI - Reactive Application State Management

const STORAGE_KEYS = {
  PROFILE: 'travelreality_profile_v1',
  SETTINGS: 'travelreality_settings_v1',
  COMPARE: 'travelreality_compare_v1'
};

const DEFAULT_PROFILE = {
  region_or_destination: '',
  visit_date: '',
  available_time_hours: 3.0,
  budget_tier: 'Moderate',
  interests: ['History', 'Culture'],
  walking_intensity_preference: 'Moderate',
  minimize_stairs: false,
  step_free_required: false,
  traveling_with_children: false,
  slower_paced_required: false,
  environment_preference: 'Any',
  required_facilities: []
};

class StateStore {
  constructor() {
    this.state = {
      profile: this.loadFromStorage(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE),
      settings: this.loadFromStorage(STORAGE_KEYS.SETTINGS, { geminiApiKey: '' }),
      compareIds: this.loadFromStorage(STORAGE_KEYS.COMPARE, []),
      activeTab: 'home',
      activeDestinationId: null,
      filters: {
        search: '',
        category: 'All',
        step_free_only: false,
        max_walking_km: null,
        sort_by: 'default'
      },
      destinations: [],
      currentRealityCheck: null,
      currentWeather: null,
      reports: [],
      isAdminMode: false
    };

    this.listeners = new Set();
  }

  loadFromStorage(key, defaultValue) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      console.warn(`Failed to parse ${key} from localStorage`, e);
      return defaultValue;
    }
  }

  saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to save ${key} to localStorage`, e);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(changeType, payload) {
    for (const listener of this.listeners) {
      try {
        listener(changeType, payload, this.state);
      } catch (err) {
        console.error('State listener error:', err);
      }
    }
  }

  // Profile actions
  updateProfile(newProfileData) {
    this.state.profile = { ...this.state.profile, ...newProfileData };
    this.saveToStorage(STORAGE_KEYS.PROFILE, this.state.profile);
    this.notify('profile_updated', this.state.profile);
  }

  resetProfile() {
    this.state.profile = { ...DEFAULT_PROFILE };
    this.saveToStorage(STORAGE_KEYS.PROFILE, this.state.profile);
    this.notify('profile_updated', this.state.profile);
  }

  // Settings actions
  updateSettings(newSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.saveToStorage(STORAGE_KEYS.SETTINGS, this.state.settings);
    this.notify('settings_updated', this.state.settings);
  }

  // Comparison tray actions
  toggleCompare(destinationId) {
    let ids = [...this.state.compareIds];
    if (ids.includes(destinationId)) {
      ids = ids.filter(id => id !== destinationId);
    } else {
      if (ids.length >= 3) {
        throw new Error('You can compare a maximum of 3 destinations at a time.');
      }
      ids.push(destinationId);
    }
    this.state.compareIds = ids;
    this.saveToStorage(STORAGE_KEYS.COMPARE, ids);
    this.notify('compare_updated', ids);
    return ids;
  }

  clearCompare() {
    this.state.compareIds = [];
    this.saveToStorage(STORAGE_KEYS.COMPARE, []);
    this.notify('compare_updated', []);
  }

  // Navigation
  setActiveTab(tab) {
    this.state.activeTab = tab;
    this.notify('tab_changed', tab);
  }

  // Filters
  setFilters(newFilters) {
    this.state.filters = { ...this.state.filters, ...newFilters };
    this.notify('filters_updated', this.state.filters);
  }

  // Admin toggle
  toggleAdminMode() {
    this.state.isAdminMode = !this.state.isAdminMode;
    this.notify('admin_toggled', this.state.isAdminMode);
  }
}

export const store = new StateStore();
