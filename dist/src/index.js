/**
 * edystudio 国内镜像 Worker
 * 反向代理 https://michoney.github.io/edystudio/ 并改写所有链接，
 * 使页面内的资源/跳转全部走本 Worker 域名（国内可访问）。
 * 配合 Cloudflare 边缘缓存，命中后不再回源 GitHub。
 */

const UPSTREAM_HOST = "michoney.github.io";
const UPSTREAM_PREFIX = "/edystudio"; // GitHub Pages 上该项目所在子路径

/**
 * 把 GitHub Pages 页面里的引用改写成 Worker 自身域名。
 * 处理三类来源：
 *  1) https://michoney.github.io/edystudio/...  -> https://<worker>/...
 *  2) https://michoney.github.io/...            -> https://<worker>/...
 *  3) 绝对路径 /edystudio/...                   -> /...
 */
function rewriteBody(body, workerOrigin, workerHost) {
  return body
    .replaceAll(`https://${UPSTREAM_HOST}${UPSTREAM_PREFIX}`, workerOrigin)
    .replaceAll(`//${UPSTREAM_HOST}${UPSTREAM_PREFIX}`, `//${workerHost}`)
    .replaceAll(`https://${UPSTREAM_HOST}`, workerOrigin)
    .replaceAll(`//${UPSTREAM_HOST}`, `//${workerHost}`)
    .replace(/(['"\s])\/edystudio(?=\/|"|'|#|\s|$)/g, "$1/");
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const workerOrigin = url.origin;
    const workerHost = url.host;

    // 映射到 GitHub Pages 的项目子路径（worker 根路径 -> /edystudio/）
    const targetPath = UPSTREAM_PREFIX + (url.pathname === "/" ? "/" : url.pathname);
    const targetUrl = `https://${UPSTREAM_HOST}${targetPath}${url.search}`;
    const upstreamRequest = new Request(targetUrl, request);

    const cache = caches.default;
    let response = await cache.match(request);
    if (response) return response;

    response = await fetch(upstreamRequest);

    // 处理上游重定向，改写 Location 中的 github 域名
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const loc = response.headers.get("location");
      if (loc) {
        const locUrl = new URL(loc, targetUrl);
        if (locUrl.host === UPSTREAM_HOST) {
          locUrl.host = workerHost;
          locUrl.protocol = url.protocol;
          if (locUrl.pathname.startsWith(UPSTREAM_PREFIX)) {
            locUrl.pathname = locUrl.pathname.slice(UPSTREAM_PREFIX.length) || "/";
          }
          return Response.redirect(locUrl.toString(), response.status);
        }
      }
    }

    const contentType = response.headers.get("content-type") || "";
    const isTextual =
      contentType.includes("text/html") ||
      contentType.includes("text/css") ||
      contentType.includes("application/javascript") ||
      contentType.includes("text/javascript") ||
      contentType.includes("application/json") ||
      contentType.includes("application/xml") ||
      contentType.includes("text/xml");

    const headers = new Headers(response.headers);
    // 去掉可能限制改写后资源的策略头
    headers.delete("content-security-policy");
    headers.delete("content-security-policy-report-only");
    headers.delete("access-control-allow-origin");

    let finalResponse;
    if (isTextual) {
      let body = await response.text();
      body = rewriteBody(body, workerOrigin, workerHost);
      finalResponse = new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } else {
      finalResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    finalResponse.headers.set("Cache-Control", "public, max-age=300");
    finalResponse.headers.set("X-Mirror-Of", `https://${UPSTREAM_HOST}${UPSTREAM_PREFIX}/`);
    ctx.waitUntil(cache.put(request, finalResponse.clone()));
    return finalResponse;
  },
};
