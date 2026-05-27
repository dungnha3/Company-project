package DoAn.BE;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;

@SpringBootApplication
@ComponentScan(basePackages = "DoAn.BE", excludeFilters = @ComponentScan.Filter(type = FilterType.REGEX, pattern = "DoAn\\.BE\\.common\\.search\\..*"))
public class BeApplication {

	public static void main(String[] args) {
		try {
			SpringApplication.run(BeApplication.class, args);
		} catch (Throwable e) {
			System.err.println("=== FATAL STARTUP EXCEPTION ===");
			e.printStackTrace(System.err);
			System.exit(1);
		}
	}
}
