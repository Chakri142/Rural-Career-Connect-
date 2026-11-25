package in.ruralconnect;

import java.time.format.DateTimeParseException;
import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class Errors {
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> known(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode())
        .body(Map.of("error", Objects.toString(e.getReason(), "Request could not be completed.")));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<?> duplicate() {
    return ResponseEntity.status(409)
        .body(
            Map.of(
                "error",
                "A matching record already exists or this change conflicts with an existing record."
                    + " Check your email or application history."));
  }

  @ExceptionHandler(DateTimeParseException.class)
  ResponseEntity<?> date() {
    return ResponseEntity.badRequest().body(Map.of("error", "Enter a valid date."));
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  ResponseEntity<?> large() {
    return ResponseEntity.status(413).body(Map.of("error", "File exceeds the upload limit."));
  }
}
