package in.ruralconnect;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Small per-process, peer-IP fixed-window limit. Not a substitute for a trusted edge limiter. */
@Component
public class RequestRateLimit extends OncePerRequestFilter {
  static final long WINDOW_MS = 600_000;
  static final int MAX_KEYS = 10_000;
  private record Bucket(long start, int count) {}
  private final Map<String, Bucket> buckets = new HashMap<>();

  // Returns seconds until retry, or 0 if allowed. Never trusts client-forwarded headers.
  synchronized long check(String peer, String path, long now) {
    int max = switch (path) {
      case "/api/login" -> 10;
      case "/api/register" -> 8;
      case "/api/contact" -> 12;
      default -> 0;
    };
    if (max == 0) return 0;
    String key = peer + "|" + path;
    Bucket b = buckets.get(key);
    if (b == null || now - b.start >= WINDOW_MS || now < b.start) {
      if (buckets.size() >= MAX_KEYS) {
        buckets.entrySet().removeIf(e -> now - e.getValue().start >= WINDOW_MS || now < e.getValue().start);
        if (buckets.size() >= MAX_KEYS && !buckets.containsKey(key)) return 60;
      }
      buckets.put(key, new Bucket(now, 1));
      return 0;
    }
    if (b.count >= max) return Math.max(1, (WINDOW_MS - (now - b.start) + 999) / 1000);
    buckets.put(key, new Bucket(b.start, b.count + 1));
    return 0;
  }

  @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    if ("POST".equals(req.getMethod())) {
      long wait = check(req.getRemoteAddr(), req.getServletPath(), System.currentTimeMillis());
      if (wait > 0) {
        res.setStatus(429);
        res.setHeader("Retry-After", Long.toString(wait));
        res.setContentType("application/json");
        res.getWriter().write("{\"error\":\"Too many requests. Please wait and try again.\"}");
        return;
      }
    }
    chain.doFilter(req, res);
  }
}
