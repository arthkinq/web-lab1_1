package ru.arf;

import com.fastcgi.FCGIInterface;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

public class Main {

    public static void main(String[] args) {
        var fcgi = new FCGIInterface();
        System.err.println("FastCGI Server started, waiting for requests..."); // Use stderr for logs

        while (fcgi.FCGIaccept() >= 0) {
            try {
                String queryString = System.getProperties().getProperty("QUERY_STRING");

                if (queryString == null || queryString.isEmpty()) {
                    throw new IllegalArgumentException("Query parameters are missing.");
                }

                Map<String, String> params = parseQueryString(queryString);

                double x = Double.parseDouble(params.get("x"));
                double y = Double.parseDouble(params.get("y"));
                double r = Double.parseDouble(params.get("r"));

                boolean exists = canFormTriangle(x, y, r);
                String result = exists ? "Exists" : "Does not exist";
                String currentTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss"));

                String jsonBody = String.format(
                        "{\"x\":%.2f, \"y\":%.2f, \"r\":%.2f, \"result\":\"%s\", \"time\":\"%s\"}",
                        x, y, r, result, currentTime
                );

                // This is the correct CGI-style response.
                // Apache will add the "HTTP/1.1 200 OK" status line.
                String cgiResponse = "Content-Type: application/json\r\n" +
                        "\r\n" + // This blank line separates headers from the body
                        jsonBody;

                // Print the response to standard output
                System.out.print(cgiResponse);

            } catch (Exception e) {
                String reason = "Invalid or missing parameters. Please provide numeric values for 'x', 'y', and 'r'.";
                String jsonBody = String.format("{\"error\":\"%s\"}", reason);

                // For an error, we can still send a 200 OK with an error in the JSON,
                // or send a 400 Bad Request status header for Apache to use.
                String cgiErrorResponse = "Status: 400 Bad Request\r\n" +
                        "Content-Type: application/json\r\n" +
                        "\r\n" +
                        jsonBody;

                System.out.print(cgiErrorResponse);
            } finally {
                System.out.flush(); // Ensure the response is sent
            }
        }
    }

    private static boolean canFormTriangle(double x, double y, double r) {
        return (x > 0 && y > 0 && r > 0) && (x + y > r) && (x + r > y) && (y + r > x);
    }

    private static Map<String, String> parseQueryString(String qs) throws UnsupportedEncodingException {
        Map<String, String> result = new HashMap<>();
        for (String param : qs.split("&")) {
            String[] pair = param.split("=", 2);
            if (pair.length > 1) {
                result.put(URLDecoder.decode(pair[0], "UTF-8"), URLDecoder.decode(pair[1], "UTF-8"));
            } else {
                result.put(URLDecoder.decode(pair[0], "UTF-8"), null);
            }
        }
        return result;
    }
}