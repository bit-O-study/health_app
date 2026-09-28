/** Final explicit DDL wins: removed grants/policies must not be requested again. */
export function expectedFunctionAccess(sql: string): Map<string, boolean> {
 const result = new Map<string, boolean>();
 const ddl = /\b(grant|revoke)\s+(?:execute|all(?:\s+privileges)?)\s+on\s+function\s+public\.(\w+)\([^)]*\)\s+(?:to|from)\s+([^;]+);/gi;
 for (const m of sql.matchAll(ddl)) if (/\bauthenticated\b/i.test(m[3])) result.set(m[2], m[1].toLowerCase() === "grant");
 return result;
}
export function expectedPolicies(sql: string) {
 const result = new Map<string, { name: string; table: string }>();
 const ddl = /\b(create|drop)\s+policy\s+(?:if\s+exists\s+)?(?:"([^"]+)"|(\w+))\s+on\s+public\.(\w+)/gi;
 for (const m of sql.matchAll(ddl)) {
   const name = m[2] ?? m[3], table = m[4], key = table + ":" + name;
   if (m[1].toLowerCase() === "create") result.set(key, { name, table }); else result.delete(key);
 }
 return [...result.values()];
}
