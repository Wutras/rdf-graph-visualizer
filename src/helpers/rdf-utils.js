function isValidTtlPrefix(prefix) {
  return /^(PREFIX\s+\w*:\s*<[^>]*>|\@prefix\s+\w*:\s*<[^>]*>\s*\.)$/i.test(prefix.trim());
}

export function validateRDFPrefixes(prefixes) {
  const prefixArr = prefixes.split("\n");
  return prefixArr.every((prefix) => isValidTtlPrefix(prefix));
}
