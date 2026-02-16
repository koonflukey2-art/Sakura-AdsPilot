import { decrypt } from '@/lib/crypto';
import { prisma } from '@/lib/prisma';

const GRAPH_BASE = 'https://graph.facebook.com/v20.0';

type GraphError = { message?: string; code?: number; fbtrace_id?: string };
type GraphListResponse<T> = { data?: T[]; error?: GraphError };

type MetaConnectionResult =
  | { ok: true; adAccountId: string; accessToken: string }
  | { ok: false; error: string };

export type MetaClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: GraphError };

type Campaign = { id: string; name: string; status?: string };
type Adset = { id: string; name: string; status?: string; campaign_id?: string; daily_budget?: string };

type Insight = {
  adset_id?: string;
  campaign_id?: string;
  spend?: string;
  ctr?: string;
  frequency?: string;
  actions?: Array<{ action_type: string; value: string }>;
  purchase_roas?: Array<{ value: string }>;
};

export async function getOrgMetaConnection(organizationId: string): Promise<MetaConnectionResult> {
  const connection = await prisma.metaConnection.findFirst({ where: { organizationId }, orderBy: { updatedAt: 'desc' } });
  if (!connection) return { ok: false, error: 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ Meta' };
  if (connection.status !== 'CONNECTED') return { ok: false, error: 'สถานะการเชื่อมต่อ Meta ไม่พร้อมใช้งาน' };
  if (!connection.accessTokenEnc?.trim()) return { ok: false, error: 'ไม่พบ access token' };
  if (connection.tokenExpiresAt && connection.tokenExpiresAt <= new Date()) return { ok: false, error: 'Meta token หมดอายุแล้ว' };

  return { ok: true, adAccountId: connection.adAccountId, accessToken: decrypt(connection.accessTokenEnc) };
}

async function graphGet<T>(path: string, accessToken: string, params: Record<string, string> = {}): Promise<MetaClientResult<T[]>> {
  const query = new URLSearchParams({ access_token: accessToken, ...params });
  const res = await fetch(`${GRAPH_BASE}${path}?${query.toString()}`, { cache: 'no-store' });
  const body = (await res.json().catch(() => ({}))) as GraphListResponse<T>;

  if (!res.ok || !body.data) {
    return { ok: false, error: body.error?.message || 'เรียก Meta Graph API ไม่สำเร็จ', details: body.error };
  }

  return { ok: true, data: body.data };
}

async function graphPost(path: string, accessToken: string, payload: Record<string, string>): Promise<MetaClientResult<{ success: true }>> {
  const body = new URLSearchParams({ access_token: accessToken, ...payload });
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: GraphError };
    return { ok: false, error: json.error?.message || 'เรียก Meta Graph API ไม่สำเร็จ', details: json.error };
  }

  return { ok: true, data: { success: true } };
}

export async function fetchCampaigns(adAccountId: string, accessToken: string) {
  return graphGet<Campaign>(`/${adAccountId}/campaigns`, accessToken, { fields: 'id,name,status', limit: '200' });
}

export async function fetchAdsets(adAccountId: string, accessToken: string, campaignId?: string) {
  const params: Record<string, string> = { fields: 'id,name,status,campaign_id,daily_budget', limit: '200' };
  if (campaignId) {
    params.filtering = JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaignId }]);
  }
  return graphGet<Adset>(`/${adAccountId}/adsets`, accessToken, params);
}

export async function fetchInsights(adAccountId: string, accessToken: string) {
  return graphGet<Insight>(`/${adAccountId}/insights`, accessToken, {
    level: 'adset',
    date_preset: 'yesterday',
    fields: 'adset_id,campaign_id,spend,ctr,frequency,actions,purchase_roas',
    limit: '200'
  });
}

export async function updateBudget(adsetId: string, accessToken: string, dailyBudgetMinor: number) {
  return graphPost(`/${adsetId}`, accessToken, { daily_budget: String(Math.max(100, Math.round(dailyBudgetMinor))) });
}

export async function pauseAdset(adsetId: string, accessToken: string) {
  return graphPost(`/${adsetId}`, accessToken, { status: 'PAUSED' });
}
