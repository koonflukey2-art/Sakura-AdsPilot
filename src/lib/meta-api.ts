const GRAPH_BASE = 'https://graph.facebook.com/v20.0';

type MetaListItem = { id: string; name: string; status?: string };

type MetaResponse<T> = { data?: T[]; error?: { message?: string } };

async function graphGet<T extends MetaListItem>(path: string, token: string, params: Record<string, string> = {}) {
  const search = new URLSearchParams({ access_token: token, ...params });
  const response = await fetch(`${GRAPH_BASE}${path}?${search.toString()}`, { cache: 'no-store' });
  const json = (await response.json()) as MetaResponse<T>;

  if (!response.ok || !json.data) {
    throw new Error(json.error?.message || 'เรียก Meta Graph API ไม่สำเร็จ');
  }

  return json.data.map((item) => ({ id: item.id, name: item.name, status: item.status ?? 'UNKNOWN' }));
}

export async function fetchMetaCampaigns(adAccountId: string, accessToken: string) {
  return graphGet('/' + adAccountId + '/campaigns', accessToken, { fields: 'id,name,status', limit: '200' });
}

export async function fetchMetaAdsets(adAccountId: string, accessToken: string, campaignId?: string) {
  const params: Record<string, string> = { fields: 'id,name,status,campaign_id', limit: '200' };
  if (campaignId) {
    params.filtering = JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaignId }]);
  }

  return graphGet('/' + adAccountId + '/adsets', accessToken, params);
}

export async function updateAdsetDailyBudget(adsetId: string, accessToken: string, budgetMinorUnit: number) {
  const body = new URLSearchParams({ access_token: accessToken, daily_budget: String(Math.max(100, Math.round(budgetMinorUnit))) });
  const response = await fetch(`${GRAPH_BASE}/${adsetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || 'ปรับงบ Adset ไม่สำเร็จ');
  }
}

export async function pauseAdset(adsetId: string, accessToken: string) {
  const body = new URLSearchParams({ access_token: accessToken, status: 'PAUSED' });
  const response = await fetch(`${GRAPH_BASE}/${adsetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || 'หยุด Adset ไม่สำเร็จ');
  }
}
