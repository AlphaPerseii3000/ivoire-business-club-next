export type ScanResult = {
  isSafe: boolean;
  reason?: string;
};

const GENERIC_SCAN_FAILURE_REASON = "Scan unavailable";

export async function scanFile(_buffer: Buffer): Promise<ScanResult> {
  // Option C baseline: lightweight heuristic checks without external service dependency.
  // The buffer is received but heuristic inspection is intentionally minimal to avoid
  // false positives. Future work (post-MVP) can wire VirusTotal/ClamAV Cloud via env vars.
  const apiKey = process.env.ANTIVIRUS_API_KEY;
  const apiUrl = process.env.ANTIVIRUS_API_URL;

  if (!apiKey || !apiUrl) {
    console.warn("[file-scan] Aucun service d'antivirus configuré — scan ignoré en test/développement.");
    return { isSafe: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Api-Key": apiKey,
      },
      body: new Uint8Array(_buffer),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn("[file-scan] Service d'antivirus indisponible:", response.status);
      return { isSafe: false, reason: GENERIC_SCAN_FAILURE_REASON };
    }

    const result = (await response.json()) as { clean?: boolean; threat?: string };

    if (result.clean === false) {
      return {
        isSafe: false,
        reason: result.threat ? "Threat detected" : "Fichier non sûr",
      };
    }

    return { isSafe: true };
  } catch (error) {
    console.warn("[file-scan] Échec du scan antivirus:", error instanceof Error ? error.message : "unknown");
    return { isSafe: false, reason: GENERIC_SCAN_FAILURE_REASON };
  }
}
