package ru.arf;

import com.fastcgi.FCGIInterface;

import java.io.InputStreamReader;
import java.io.Reader;
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
        // Log to stderr to not interfere with the response on stdout
        System.err.println("FastCGI Server started, waiting for requests...");

        while (fcgi.FCGIaccept() >= 0) {
            long startTime = System.nanoTime(); // Start timing

            try {
                // For POST requests, data comes from standard input.
                // The CONTENT_LENGTH property tells us how many bytes to read.
                int contentLength = Integer.parseInt(System.getProperties().getProperty("CONTENT_LENGTH", "0"));

                if (contentLength <= 0) {
                    throw new IllegalArgumentException("No POST data received.");
                }

                Reader in = new InputStreamReader(System.in, StandardCharsets.UTF_8);
                char[] buffer = new char[contentLength];
                in.read(buffer);
                String postData = new String(buffer);

                Map<String, String> params = parseQueryString(postData);

                // Parse and validate input
                double x = Double.parseDouble(params.get("x"));
                double y = Double.parseDouble(params.get("y"));
                double r = Double.parseDouble(params.get("r"));

                // Perform the hit check calculation
                boolean hit = checkHit(x, y, r);
                String currentTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                long executionTime = (System.nanoTime() - startTime) / 1_000_000; // End timing in milliseconds

                // Create the success JSON body
                String jsonBody = String.format(
                        "{\"x\":%.2f, \"y\":%.2f, \"r\":%.2f, \"hit\":%b, \"currentTime\":\"%s\", \"executionTime\":%d}",
                        x, y, r, hit, currentTime, executionTime
                );

                // Send the successful CGI response
                String cgiResponse = "Content-Type: application/json\r\n" +
                        "\r\n" +
                        jsonBody;

                System.out.print(cgiResponse);

            } catch (Exception e) {
                long executionTime = (System.nanoTime() - startTime) / 1_000_000;
                String reason = e.getMessage() != null ? e.getMessage() : "Invalid or missing parameters.";

                String jsonBody = String.format(
                        "{\"error\":\"%s\", \"executionTime\":%d}",
                        reason, executionTime
                );

                // Send the CGI error response
                String cgiErrorResponse = "Status: 400 Bad Request\r\n" +
                        "Content-Type: application/json\r\n" +
                        "\r\n" +
                        jsonBody;

                System.out.print(cgiErrorResponse);
            } finally {
                System.out.flush();
            }
        }
    }

    /**
     * Checks if the point (x, y) falls within the shaded area for a given radius R.
     */
    private static boolean checkHit(double x, double y, double r) {
        // Quadrant 1: Circle sector
        if (x >= 0 && y >= 0) {
            return (x * x + y * y) <= (r / 2) * (r / 2);
        }
        // Quadrant 3: Rectangle
        if (x <= 0 && y <= 0) {
            return (x >= -r) && (y >= -r);
        }
        // Quadrant 4: Triangle
        if (x >= 0 && y <= 0) {
            // Line equation: y = x - r/2
            return y >= (x - r / 2);
        }
        // Quadrant 2 is empty
        return false;
    }

    /**
     * Parses a URL-encoded string (e.g., "x=1&y=2") into a Map.
     */
    private static Map<String, String> parseQueryString(String qs) throws UnsupportedEncodingException {
        Map<String, String> result = new HashMap<>();
        if (qs == null || qs.isEmpty()) {
            return result;
        }
        for (String param : qs.split("&")) {
            String[] pair = param.split("=", 2);
            if (pair.length > 1 && !pair[1].isEmpty()) {
                result.put(URLDecoder.decode(pair[0], "UTF-8"), URLDecoder.decode(pair[1], "UTF-8"));
            }
        }
        return result;
    }
}