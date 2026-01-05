export const getRequestedScopes = (scope: unknown): string[] => {
    // If scope is not provided or empty, default to 'all' for backward compatibility
    return Array.isArray(scope) && scope.length > 0 ? scope : ['all'];
};

export const createScopeChecker = (requestedScopes: string[]) => {
    return (s: string) => requestedScopes.includes('all') || requestedScopes.includes(s);
};
