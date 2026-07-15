let recoveryAccessToken: string | null = null;

function getUrlParameters(url: string) {
  const queryStart = url.indexOf("?");
  const hashStart = url.indexOf("#");
  const chunks: string[] = [];

  if (queryStart >= 0) {
    chunks.push(url.slice(queryStart + 1, hashStart >= 0 ? hashStart : undefined));
  }
  if (hashStart >= 0) {
    chunks.push(url.slice(hashStart + 1));
  }

  return new URLSearchParams(chunks.join("&"));
}

export function captureRecoveryToken(url: string | null) {
  if (!url) return false;

  const params = getUrlParameters(url);
  const token = params.get("access_token");
  const type = params.get("type");

  if (!token || type !== "recovery") return false;

  recoveryAccessToken = token;
  return true;
}

export function getRecoveryToken() {
  return recoveryAccessToken;
}

export function clearRecoveryToken() {
  recoveryAccessToken = null;
}
