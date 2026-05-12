import java.sql.*;
import java.util.*;

public class DamengJdbcBridge {

    public static void main(String[] args) {
        if (args.length < 4) {
            System.err.println("{\"error\":\"missing arguments: url user password sql [limit]\"}");
            System.exit(1);
        }

        String url = args[0];
        String user = args[1];
        String password = args[2];
        String sql = args[3];
        int limit = args.length > 4 ? Integer.parseInt(args[4]) : 200;

        Connection conn = null;
        Statement stmt = null;

        try {
            Class.forName("dm.jdbc.driver.DmDriver");
            conn = DriverManager.getConnection(url, user, password);
            stmt = conn.createStatement();
            stmt.setQueryTimeout(30);

            String trimmedSql = sql.trim().toUpperCase();
            boolean isQuery = trimmedSql.startsWith("SELECT")
                || trimmedSql.startsWith("WITH")
                || trimmedSql.startsWith("EXPLAIN");

            if (isQuery) {
                executeQuery(stmt, sql, limit);
            } else {
                executeUpdate(stmt, sql);
            }

        } catch (ClassNotFoundException e) {
            System.err.println("{\"error\":\"Dameng JDBC driver not found: " + escape(e.getMessage()) + "\"}");
            System.exit(1);
        } catch (SQLException e) {
            System.err.println("{\"error\":\"SQL execution failed: " + escape(e.getMessage())
                + "\",\"sqlState\":\"" + escape(e.getSQLState())
                + "\",\"errorCode\":" + e.getErrorCode() + "}");
            System.exit(1);
        } catch (Exception e) {
            System.err.println("{\"error\":\"" + escape(e.getMessage()) + "\"}");
            System.exit(1);
        } finally {
            safeClose(stmt);
            safeClose(conn);
        }
    }

    private static void executeQuery(Statement stmt, String sql, int limit) throws SQLException {
        stmt.setMaxRows(limit);
        ResultSet rs = stmt.executeQuery(sql);
        ResultSetMetaData meta = rs.getMetaData();
        int columnCount = meta.getColumnCount();

        StringBuilder json = new StringBuilder();
        json.append("{\"columns\":[");
        for (int i = 1; i <= columnCount; i++) {
            if (i > 1) json.append(",");
            json.append("\"").append(escape(meta.getColumnLabel(i))).append("\"");
        }
        json.append("],\"types\":[");
        for (int i = 1; i <= columnCount; i++) {
            if (i > 1) json.append(",");
            json.append("\"").append(escape(meta.getColumnTypeName(i))).append("\"");
        }
        json.append("],\"rows\":[");

        int rowCount = 0;
        while (rs.next()) {
            if (rowCount > 0) json.append(",");
            json.append("{");
            for (int i = 1; i <= columnCount; i++) {
                if (i > 1) json.append(",");
                String colName = meta.getColumnLabel(i);
                json.append("\"").append(escape(colName)).append("\":");
                Object value = rs.getObject(i);
                appendValue(json, value);
            }
            json.append("}");
            rowCount++;
        }
        rs.close();

        json.append("],\"rowCount\":").append(rowCount);
        json.append(",\"truncated\":").append(rowCount >= limit);
        json.append("}");

        System.out.println(json.toString());
    }

    private static void executeUpdate(Statement stmt, String sql) throws SQLException {
        int affected = stmt.executeUpdate(sql);
        System.out.println("{\"affectedRows\":" + affected
            + ",\"message\":\"OK, affected " + affected + " rows\"}");
    }

    private static void appendValue(StringBuilder json, Object value) {
        if (value == null) {
            json.append("null");
        } else if (value instanceof Number) {
            json.append(value.toString());
        } else if (value instanceof Boolean) {
            json.append(value.toString());
        } else if (value instanceof Clob) {
            try {
                Clob clob = (Clob) value;
                String str = clob.getSubString(1, (int) Math.min(clob.length(), 65535));
                json.append("\"").append(escape(str)).append("\"");
            } catch (Exception e) {
                json.append("\"\"");
            }
        } else if (value instanceof Blob) {
            json.append("\"[BLOB]\"");
        } else if (value instanceof java.sql.Date) {
            json.append("\"").append(value.toString()).append("\"");
        } else if (value instanceof java.sql.Timestamp) {
            json.append("\"").append(value.toString()).append("\"");
        } else if (value instanceof java.sql.Time) {
            json.append("\"").append(value.toString()).append("\"");
        } else {
            json.append("\"").append(escape(value.toString())).append("\"");
        }
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private static void safeClose(AutoCloseable resource) {
        if (resource != null) {
            try { resource.close(); } catch (Exception ignored) { }
        }
    }
}