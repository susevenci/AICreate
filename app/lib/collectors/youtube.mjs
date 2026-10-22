/**
 * collectors/youtube.mjs — 唯一会发网络请求的采集器（官方 Data API v3）
 *
 * 约束：
 *   - 只读公开数据（频道上传列表 + 视频统计）
 *   - 必须显式配置 YOUTUBE_API_KEY；未配置时抛 missing_key，由上层降级为手工
 *   - 单次最多 50 条，调用 3 个接口（channels / playlistItems / videos）
 */

const API = 'https://www.googleapis.com/youtube/v3';

export function youtubeConfigured() {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

export async function fetchChannelSources({ channelId, max = 20 }) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    const err = new Error('未配置 YOUTUBE_API_KEY，已降级为手工录入');
    err.code = 'missing_key';
    throw err;
  }
  if (!channelId) {
    const err = new Error('缺少 channelId');
    err.code = 'field_required';
    throw err;
  }

  const chRes = await fetch(
    `${API}/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${key}`
  );
  if (!chRes.ok) throw new Error(`channels 接口失败：HTTP ${chRes.status}`);
  const chJson = await chRes.json();
  const uploads = chJson.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error('频道不存在或没有公开上传列表');

  const size = Math.min(Math.max(Number(max) || 20, 1), 50);
  const plRes = await fetch(
    `${API}/playlistItems?part=snippet&maxResults=${size}&playlistId=${uploads}&key=${key}`
  );
  if (!plRes.ok) throw new Error(`playlistItems 接口失败：HTTP ${plRes.status}`);
  const plJson = await plRes.json();
  const items = plJson.items || [];
  const ids = items.map((i) => i.snippet?.resourceId?.videoId).filter(Boolean);
  if (ids.length === 0) return [];

  const vdRes = await fetch(`${API}/videos?part=snippet,statistics&id=${ids.join(',')}&key=${key}`);
  if (!vdRes.ok) throw new Error(`videos 接口失败：HTTP ${vdRes.status}`);
  const vdJson = await vdRes.json();
  const stats = new Map((vdJson.items || []).map((v) => [v.id, v]));

  return ids.map((id) => {
    const v = stats.get(id);
    const snippet = v?.snippet || {};
    const s = v?.statistics || {};
    return {
      platform: 'YouTube',
      platformId: id,
      title: snippet.title || id,
      url: `https://www.youtube.com/watch?v=${id}`,
      author: snippet.channelTitle || '',
      publishedAt: String(snippet.publishedAt || '').slice(0, 10),
      views: Number(s.viewCount) || 0,
      likes: Number(s.likeCount) || 0,
      comments: Number(s.commentCount) || 0,
      shares: 0,
    };
  });
}
