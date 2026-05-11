export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

export class UserContext {
    private static currentUserId: string = DEFAULT_USER_ID;

    static set(userId: string): void {
        this.currentUserId = userId;
    }

    static get(): string {
        return this.currentUserId;
    }

    static isDefaultUser(): boolean {
        return this.currentUserId === DEFAULT_USER_ID;
    }

    static resetToDefault(): void {
        this.currentUserId = DEFAULT_USER_ID;
    }
}
