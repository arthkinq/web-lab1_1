package ru.arf;

import com.fastcgi.FCGIInterface;
import java.util.Locale;

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
        System.err.println("FastCGI Server started, waiting for requests...");

        while (fcgi.FCGIaccept() >= 0) {
            long startTime = System.nanoTime();

            try {
                int contentLength = Integer.parseInt(System.getProperties().getProperty("CONTENT_LENGTH", "0"));
                if (contentLength <= 0) throw new IllegalArgumentException("No POST data received.");

                Reader in = new InputStreamReader(System.in, StandardCharsets.UTF_8);
                char[] buffer = new char[contentLength];
                in.read(buffer);
                String postData = new String(buffer);

                Map<String, String> params = parseQueryString(postData);

                double x = Double.parseDouble(params.get("x"));
                double y = Double.parseDouble(params.get("y"));
                double r = Double.parseDouble(params.get("r"));

                boolean hit = checkHit(x, y, r);
                String currentTime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                double executionTimeMicro = (double)(System.nanoTime() - startTime) / 1000.0;

                String jsonBody = String.format(Locale.US,
                        "{\"x\":%.2f, \"y\":%.2f, \"r\":%.2f, \"hit\":%b, \"currentTime\":\"%s\", \"executionTime\":%.3f}",
                        x, y, r, hit, currentTime, executionTimeMicro
                );

                // ЭТО ВАЖНО: Мы снова генерируем ПОЛНЫЙ HTTP-ответ из-за флага -nph
                String httpResponse = "HTTP/1.1 200 OK\r\n" +
                        "Content-Type: application/json\r\n" +
                        "Content-Length: " + jsonBody.getBytes(StandardCharsets.UTF_8).length + "\r\n" +
                        "\r\n" + // Критически важная пустая строка
                        jsonBody;

                System.out.print(httpResponse);

            } catch (Exception e) {
                String reason = "Invalid or missing parameters.";
                String jsonBody = String.format("{\"error\":\"%s\"}", reason);

                String httpErrorResponse = "HTTP/1.1 400 Bad Request\r\n" +
                        "Content-Type: application/json\r\n" +
                        "Content-Length: " + jsonBody.getBytes(StandardCharsets.UTF_8).length + "\r\n" +
                        "\r\n" +
                        jsonBody;

                System.out.print(httpErrorResponse);
            } finally {
                System.out.flush();
            }
        }
    }

    private static boolean checkHit(double x, double y, double r) {
        if (x >= 0 && y >= 0) { return (x * x + y * y) <= (r / 2) * (r / 2); }
        if (x < 0 && y > 0) { return false; }
        if (x <= 0 && y <= 0) { return (x >= -r) && (y >= -r); }
        if (x > 0 && y < 0) { return y >= (2 * x - r); }
        return false;
    }

    private static Map<String, String> parseQueryString(String qs) throws UnsupportedEncodingException {
        Map<String, String> result = new HashMap<>();
        if (qs == null || qs.isEmpty()) return result;
        for (String param : qs.split("&")) {
            String[] pair = param.split("=", 2);
            if (pair.length > 1 && !pair[1].isEmpty()) {
                result.put(URLDecoder.decode(pair[0], "UTF-8"), URLDecoder.decode(pair[1], "UTF-8"));
            }
        }
        return result;
    }
}