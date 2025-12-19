package DoAn.BE.common.util;

/**
 * Utility class for GPS calculations
 * Sử dụng công thức Haversine để tính khoảng cách giữa 2 tọa độ GPS
 */
public class GPSUtil {
    
    private static final double EARTH_RADIUS = 6371000; // meters
    private static final double MIN_LATITUDE = -90.0;
    private static final double MAX_LATITUDE = 90.0;
    private static final double MIN_LONGITUDE = -180.0;
    private static final double MAX_LONGITUDE = 180.0;
    
    /**
     * Validate latitude value
     * @param lat Latitude to validate
     * @throws IllegalArgumentException if latitude is invalid
     */
    private static void validateLatitude(double lat) {
        if (Double.isNaN(lat) || Double.isInfinite(lat)) {
            throw new IllegalArgumentException("Latitude không hợp lệ: " + lat);
        }
        if (lat < MIN_LATITUDE || lat > MAX_LATITUDE) {
            throw new IllegalArgumentException("Latitude phải trong khoảng -90 đến 90: " + lat);
        }
    }
    
    /**
     * Validate longitude value
     * @param lon Longitude to validate
     * @throws IllegalArgumentException if longitude is invalid
     */
    private static void validateLongitude(double lon) {
        if (Double.isNaN(lon) || Double.isInfinite(lon)) {
            throw new IllegalArgumentException("Longitude không hợp lệ: " + lon);
        }
        if (lon < MIN_LONGITUDE || lon > MAX_LONGITUDE) {
            throw new IllegalArgumentException("Longitude phải trong khoảng -180 đến 180: " + lon);
        }
    }
    
    /**
     * Calculate distance between two GPS coordinates using Haversine formula
     * @param lat1 Latitude of point 1
     * @param lon1 Longitude of point 1
     * @param lat2 Latitude of point 2
     * @param lon2 Longitude of point 2
     * @return Distance in meters
     * @throws IllegalArgumentException if any coordinate is invalid
     */
    public static double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        validateLatitude(lat1);
        validateLatitude(lat2);
        validateLongitude(lon1);
        validateLongitude(lon2);
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return EARTH_RADIUS * c;
    }
    
    /**
     * Check if a point is within radius of another point
     * @param lat1 Latitude of point 1
     * @param lon1 Longitude of point 1
     * @param lat2 Latitude of point 2
     * @param lon2 Longitude of point 2
     * @param radiusMeters Allowed radius in meters
     * @return true if within radius
     * @throws IllegalArgumentException if any coordinate or radius is invalid
     */
    public static boolean isWithinRadius(double lat1, double lon1, double lat2, double lon2, double radiusMeters) {
        if (radiusMeters < 0) {
            throw new IllegalArgumentException("Radius phải là số dương: " + radiusMeters);
        }
        double distance = calculateDistance(lat1, lon1, lat2, lon2);
        return distance <= radiusMeters;
    }
}
