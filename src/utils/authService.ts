import { authStore } from './authStore';
import { storage } from './storage';
import { APP_ID } from '../types';

export const API_BASE_URL = import.meta.env.NEXT_PUBLIC_API_BASE_URL;
export const AUTH_BASE = `${API_BASE_URL}/api/v1/auth`;

const generateRandomString = (length = 64): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const values = crypto.getRandomValues(new Uint8Array(length));
    for (let i = 0; i < length; i++) {
        result += charset[values[i] % charset.length];
    }
    return result;
};

const base64UrlEncode = (base64: string): string =>
    base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sha256 = async (plain: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const binary = String.fromCharCode(...new Uint8Array(hash));
    return base64UrlEncode(btoa(binary));
};

export const initiateLogin = async (): Promise<void> => {
    const codeVerifier = generateRandomString(64);
    const state = generateRandomString(16);
    const codeChallenge = await sha256(codeVerifier);

    await storage.setItem('pkce_code_verifier', codeVerifier);
    await storage.setItem('pkce_state', state);

    const redirectUri = window.location.origin;
    const authPortalBase = API_BASE_URL.replace('gateway.', 'auth.gateway.');

    const authUrl =
        `${authPortalBase}/login` +
        `?app_identifier=${APP_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256` +
        `&state=${state}`;

    window.location.href = authUrl;
};

export const handleAuthCallback = async (code: string, returnedState: string): Promise<boolean> => {
    try {
        const storedState = await storage.getItem('pkce_state');
        const codeVerifier = await storage.getItem('pkce_code_verifier');

        if (!returnedState || !codeVerifier || returnedState !== storedState) {
            throw new Error('Invalid state or missing verifier');
        }

        const redirectUri = window.location.origin;

        const response = await fetch(`${AUTH_BASE}/token/code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                code_verifier: codeVerifier,
                redirect_uri: redirectUri,
                app_identifier: APP_ID,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Token exchange failed', err);
            return false;
        }

        const data = await response.json();

        authStore.setTokens({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
        });

        await storage.deleteItem('pkce_code_verifier');
        await storage.deleteItem('pkce_state');

        await fetchUserProfile();

        return true;
    } catch (error) {
        console.error('Handle callback error', error);
        return false;
    }
};

let refreshPromise: Promise<void> | null = null;

export const refreshAccessToken = async (): Promise<void> => {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            const refreshToken = authStore.getRefreshToken();
            if (!refreshToken) throw new Error('No refresh token');

            const response = await fetch(
                `${AUTH_BASE}/token/refresh?app_identifier=${APP_ID}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        refresh_token: refreshToken,
                    }),
                }
            );

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    authStore.clear();
                    throw new Error('Refresh token expired');
                }
                throw new Error(`Refresh failed: ${response.status}`);
            }

            const data = await response.json();
            authStore.setTokens({
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
            });
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
};

const decodeJWT = (token: string): any => {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch (e) {
        return null;
    }
};

export const checkAndProactiveRefresh = async (): Promise<boolean> => {
    const token = authStore.getAccess();
    if (!token) return false;

    try {
        const payload = decodeJWT(token);
        if (!payload) {
            authStore.clear();
            return false;
        }

        const exp = payload.exp;
        const nowInSecs = Math.floor(Date.now() / 1000);

        const isExpired = exp && exp <= nowInSecs;
        const willExpireSoon = exp && (exp - nowInSecs < 300);

        if (isExpired || willExpireSoon) {
            try {
                await refreshAccessToken();
                const newToken = authStore.getAccess();
                if (newToken) fetchUserProfile();
                return !!newToken;
            } catch (err) {
                if (isExpired) {
                    authStore.clear();
                    return false;
                }
                return true;
            }
        }

        if (!authStore.getUser()) {
            fetchUserProfile();
        }

        return true;
    } catch (e) {
        authStore.clear();
        return false;
    }
};

export const logout = (): void => {
    authStore.clear();
    const authPortalBase = API_BASE_URL.replace('gateway.', 'auth.gateway.');
    const redirectUri = encodeURIComponent(window.location.origin);
    window.location.href = `${authPortalBase}/logout?redirect_uri=${redirectUri}`;
};

export const fetchUserProfile = async (): Promise<void> => {
    try {
        const token = authStore.getAccess();
        if (!token) return;

        const response = await fetch(`${AUTH_BASE}/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.results) {
                authStore.setUser({
                    name: data.results.profile?.fullname || "User",
                    email: data.results.email
                });
            }
        }
    } catch (e) {
        console.warn('Failed to fetch user profile', e);
    }
};
