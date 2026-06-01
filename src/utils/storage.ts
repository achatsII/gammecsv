export const storage = {
    async getItem(key: string): Promise<string | null> {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(key);
        }
        return null;
    },

    async setItem(key: string, value: string): Promise<void> {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
        }
    },

    async deleteItem(key: string): Promise<void> {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(key);
        }
    }
};
