/**
 * IndexNow Protocol Client for DecayFix
 * Automatically submits updated/new URLs to Bing, Yandex, Seznam, and participating search engines.
 * Protocol reference: https://www.indexnow.org/
 */

export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'd79f046e379b47e4b52b3628e5a7b6cf';
export const SITE_HOST = 'decayfix.sprintlabsai.com';
export const KEY_LOCATION = `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`;

export async function pingIndexNow(urls: string[]): Promise<{ success: boolean; status: number; message: string }> {
  if (!urls || urls.length === 0) {
    return { success: false, status: 400, message: 'No URLs provided for IndexNow submission' };
  }

  // Format all URLs as fully-qualified absolute HTTPS URLs
  const normalizedUrls = urls.map((u) => {
    if (u.startsWith('http://') || u.startsWith('https://')) {
      return u;
    }
    const cleanPath = u.startsWith('/') ? u : `/${u}`;
    return `https://${SITE_HOST}${cleanPath}`;
  });

  const payload = {
    host: SITE_HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: normalizedUrls,
  };

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok || response.status === 200 || response.status === 202) {
      return {
        success: true,
        status: response.status,
        message: `Successfully submitted ${normalizedUrls.length} URLs to IndexNow (Status: ${response.status})`,
      };
    } else {
      const text = await response.text();
      return {
        success: false,
        status: response.status,
        message: `IndexNow API returned status ${response.status}: ${text}`,
      };
    }
  } catch (error: any) {
    console.error('Error submitting URLs to IndexNow:', error);
    return {
      success: false,
      status: 500,
      message: error.message || 'Network exception during IndexNow ping',
    };
  }
}
