/**
 * ScoreAR API Configuration (js/auth/api-config.js)
 * Phase 1: Resolves API Endpoint URL across Vercel and Firebase Hosting.
 * - When served on Vercel (*.vercel.app): uses relative path ''
 * - When served on Firebase Hosting (scorear2.web.app / firebaseapp.com): routes to 'https://socerar2.vercel.app'
 * - Localhost / Local dev: supports local override via localStorage or defaults to 'https://socerar2.vercel.app'
 */
(function(global) {
  'use strict';

  function resolveApiBaseUrl() {
    if (typeof window === 'undefined' || !window.location) {
      return 'https://socerar2.vercel.app';
    }

    const host = (window.location.hostname || '').toLowerCase();

    // 1. If running on Vercel itself (production or branch preview), use relative path
    if (host.endsWith('.vercel.app')) {
      return '';
    }

    // 2. If running on Firebase Hosting, route to Vercel Serverless domain
    if (host.includes('web.app') || host.includes('firebaseapp.com')) {
      return 'https://socerar2.vercel.app';
    }

    // 3. Localhost / 127.0.0.1
    if (host === 'localhost' || host === '127.0.0.1') {
      try {
        const storedOverride = localStorage.getItem('scorear_api_url');
        if (storedOverride) return storedOverride;
      } catch(e) {}
      return 'https://socerar2.vercel.app';
    }

    return 'https://socerar2.vercel.app';
  }

  global.SCOREAR_API_URL = resolveApiBaseUrl();

  global.getScoreARApiUrl = function(endpoint) {
    const base = global.SCOREAR_API_URL || '';
    const clean = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    return base + clean;
  };
})(typeof window !== 'undefined' ? window : globalThis);
