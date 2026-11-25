package in.ruralconnect;

import org.springframework.boot.*;
import org.springframework.boot.autoconfigure.*;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@SpringBootApplication(
    exclude =
        org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration
            .class)
public class Main {
  public static void main(String[] args) {
    SpringApplication.run(Main.class, args);
  }

  @Bean
  BCryptPasswordEncoder passwords() {
    return new BCryptPasswordEncoder(11);
  }

  @Bean
  SecurityFilterChain security(HttpSecurity http) throws Exception {
    return http.authorizeHttpRequests(
            a ->
                a.requestMatchers(
                        "/",
                        "/index.html",
                        "/app.js",
                        "/ui.js",
                        "/public.js",
                        "/workspace.js",
                        "/licenses/**",
                        "/style.css",
                        "/art/**",
                        "/fonts/**",
                        "/vendor/**",
                        "/error",
                        "/api/session",
                        "/api/register",
                        "/api/login",
                        "/api/contact")
                    .permitAll()
                    .requestMatchers(
                        org.springframework.http.HttpMethod.GET,
                        "/api/jobs",
                        "/api/job/*",
                        "/api/logo/*")
                    .permitAll()
                    .requestMatchers("/api/**")
                    .authenticated()
                    .anyRequest()
                    .denyAll())
        .requestCache(c -> c.disable())
        .logout(l -> l.disable())
        .headers(
            h ->
                h.frameOptions(f -> f.disable())
                    .contentSecurityPolicy(
                        c ->
                            c.policyDirectives(
                                "default-src 'self'; script-src 'self'; style-src 'self'"
                                    + " 'unsafe-inline'; img-src 'self' data:; font-src 'self';"
                                    + " connect-src 'self'; object-src 'none'; base-uri 'self';"
                                    + " form-action 'self'")))
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                        (req, res, ex) -> {
                          res.setStatus(401);
                          res.setContentType("application/json");
                          res.getWriter().print("{\"error\":\"Please sign in to continue.\"}");
                        })
                    .accessDeniedHandler(
                        (req, res, ex) -> {
                          res.setStatus(403);
                          res.setContentType("application/json");
                          res.getWriter()
                              .print(
                                  "{\"error\":\"Access denied or session expired. Refresh and try"
                                      + " again.\"}");
                        }))
        .build();
  }
}
