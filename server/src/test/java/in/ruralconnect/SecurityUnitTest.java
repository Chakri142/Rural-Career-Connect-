package in.ruralconnect;

import static org.junit.jupiter.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class SecurityUnitTest {
  private Map<String,Object> match(List<String> required, List<String> have) {
    var result = new HashMap<String,Object>();
    new Store(null, null, null).match(result, required, have);
    return result;
  }
  @Test void matchingIsExplainableAndDoesNotDoubleCount() {
    var result = match(List.of(" Excel ", "EXCEL", "Typing", "Email", "Tally"), List.of("excel", "typing", " EMAIL ", "email"));
    assertEquals(75L, result.get("score"));
    assertEquals(List.of("Tally"), result.get("missing"));
    assertEquals(4, ((List<?>)result.get("skills")).size());
  }
  @Test void matchingEmptyAndSpellingVariantsAreNotGuessed() {
    assertEquals(0L, match(List.of(), List.of("Excel")).get("score"));
    assertEquals(0L, match(List.of("Excel"), List.of()).get("score"));
    assertEquals(0L, match(List.of("accounting"), List.of("acounting")).get("score"));
    assertEquals(100L, match(List.of("  DATA   ENTRY "), List.of("data entry")).get("score"));
  }
  @Test void rateLimitExpiresAndSeparatesPeersAndRoutes() {
    var l = new RequestRateLimit(); long t=1_000_000;
    for (int i=0;i<10;i++) assertEquals(0, l.check("a", "/api/login", t));
    assertEquals(600, l.check("a", "/api/login", t));
    assertEquals(0, l.check("b", "/api/login", t));
    assertEquals(0, l.check("a", "/api/register", t));
    assertEquals(0, l.check("a", "/api/login", t+600_000));
  }
}
