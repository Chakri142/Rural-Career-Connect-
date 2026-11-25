package in.ruralconnect;

import org.apache.tomcat.util.http.Rfc6265CookieProcessor;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.*;

@Configuration
public class PreviewCookies {
  @Bean
  WebServerFactoryCustomizer<TomcatServletWebServerFactory> embedCookies() {
    return factory ->
        factory.addContextCustomizers(
            context -> {
              if ("none".equalsIgnoreCase(System.getenv("COOKIE_SAMESITE"))
                  && "true".equalsIgnoreCase(System.getenv("COOKIE_SECURE"))) {
                Rfc6265CookieProcessor cp = new Rfc6265CookieProcessor();
                cp.setPartitioned(true);
                context.setCookieProcessor(cp);
              }
            });
  }
}
