import { storage } from './storage';
import { APP_ID } from '../types';

const ACCESS_KEY = `${APP_ID}_access_token`;
const REFRESH_KEY = `${APP_ID}_refresh_token`;

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    isHydrated: boolean;
    user: { name: string; email?: string; role?: string } | null;
}

type AuthListener = (token: string | null) => void;

const state: AuthState = {
    accessToken: null,
    refreshToken: null,
    isHydrated: false,
    user: null,
};

const listeners: Set<AuthListener> = new Set();

const notify = () => {
    listeners.forEach(listener => listener(state.accessToken));
};

export const authStore = {
    async hydrate() {
        if (state.isHydrated) return;
        try {
            const [access, refresh] = await Promise.all([
                storage.getItem(ACCESS_KEY),
                storage.getItem(REFRESH_KEY)
            ]);
            state.accessToken = access;
            state.refreshToken = refresh;
        } catch (e) {
            console.error('Auth hydration failed', e);
        } finally {
            state.isHydrated = true;
        }
    },

    getAccess(): string | null {
        return state.accessToken;
    },

    getRefreshToken(): string | null {
        return state.refreshToken;
    },

    setTokens(tokens: { accessToken: string; refreshToken: string }) {
        state.accessToken = tokens.accessToken;
        state.refreshToken = tokens.refreshToken;
        notify();
        Promise.all([
            storage.setItem(ACCESS_KEY, tokens.accessToken),
            storage.setItem(REFRESH_KEY, tokens.refreshToken)
        ]).catch(console.error);
    },

    clear() {
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        notify();
        Promise.all([
            storage.deleteItem(ACCESS_KEY),
            storage.deleteItem(REFRESH_KEY)
        ]).catch(console.error);
    },

    subscribe(listener: AuthListener) {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },

    isHydrated() {
        return state.isHydrated;
    },

    getUser() {
        return state.user;
    },

    setUser(user: { name: string; email?: string; role?: string } | null) {
        state.user = user;
        notify();
    }
};
