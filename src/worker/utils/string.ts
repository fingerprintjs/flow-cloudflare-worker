/**
 * Resolves templates within a target string by replacing placeholders with corresponding values.
 *
 * @param {string} target - The string containing placeholders to be replaced.
 * @param {Record<string, string>} values - An object where the keys represent placeholders and values represent the replacement strings.
 * @return {string} - The resulting string with placeholders replaced by their corresponding values.
 */
export function resolveTemplates(target: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((acc, [key, value]) => {
    return acc.replace(key, value)
  }, target)
}
