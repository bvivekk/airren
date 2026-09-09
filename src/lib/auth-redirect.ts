export function safeAppPath(value: string | null | undefined): string {
  if (!value) {
    return "/";
  }
  let path = value;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const url = new URL(path);
      path = `${url.pathname}${url.search}`;
    } catch {
      return "/";
    }
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return "/";
  }
  if (path.startsWith("/sso-callback")) {
    return "/";
  }
  return path;
}
