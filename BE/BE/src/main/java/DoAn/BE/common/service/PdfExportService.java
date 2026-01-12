package DoAn.BE.common.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Service for generating PDF documents
 * Provides utilities for creating tables, headers, and styled content
 */
@Service
@Slf4j
public class PdfExportService {

    // Colors
    private static final DeviceRgb PRIMARY_COLOR = new DeviceRgb(59, 130, 246); // Blue-500
    private static final DeviceRgb HEADER_BG = new DeviceRgb(243, 244, 246); // Gray-100

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /**
     * Builder for creating PDF documents
     */
    public PdfBuilder createDocument() {
        return new PdfBuilder();
    }

    /**
     * Builder class for fluent PDF creation
     */
    public static class PdfBuilder {
        private final ByteArrayOutputStream outputStream;
        private final PdfDocument pdfDocument;
        private final Document document;
        private PdfFont font;

        public PdfBuilder() {
            this.outputStream = new ByteArrayOutputStream();
            this.pdfDocument = new PdfDocument(new PdfWriter(outputStream));
            this.document = new Document(pdfDocument, PageSize.A4);
            document.setMargins(40, 40, 40, 40);

            try {
                // Use built-in Helvetica font (supports basic characters)
                this.font = PdfFontFactory.createFont();
            } catch (IOException e) {
                log.error("Failed to create font", e);
            }
        }

        /**
         * Add title to the document
         */
        public PdfBuilder addTitle(String title) {
            Paragraph titlePara = new Paragraph(title)
                    .setFont(font)
                    .setFontSize(24)
                    .setFontColor(PRIMARY_COLOR)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(10);
            document.add(titlePara);
            return this;
        }

        /**
         * Add subtitle
         */
        public PdfBuilder addSubtitle(String subtitle) {
            Paragraph subtitlePara = new Paragraph(subtitle)
                    .setFont(font)
                    .setFontSize(12)
                    .setFontColor(ColorConstants.GRAY)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(subtitlePara);
            return this;
        }

        /**
         * Add section header
         */
        public PdfBuilder addSectionHeader(String header) {
            Paragraph headerPara = new Paragraph(header)
                    .setFont(font)
                    .setFontSize(14)
                    .setFontColor(PRIMARY_COLOR)
                    .setBold()
                    .setMarginTop(15)
                    .setMarginBottom(10);
            document.add(headerPara);
            return this;
        }

        /**
         * Add a simple table with headers and data
         */
        public PdfBuilder addTable(List<String> headers, List<List<String>> rows) {
            Table table = new Table(UnitValue.createPercentArray(headers.size()))
                    .useAllAvailableWidth();

            // Add headers
            for (String header : headers) {
                Cell headerCell = new Cell()
                        .add(new Paragraph(header).setFont(font).setBold())
                        .setBackgroundColor(HEADER_BG)
                        .setTextAlignment(TextAlignment.CENTER)
                        .setPadding(8);
                table.addHeaderCell(headerCell);
            }

            // Add data rows
            boolean alternate = false;
            for (List<String> row : rows) {
                for (String cellValue : row) {
                    Cell cell = new Cell()
                            .add(new Paragraph(cellValue != null ? cellValue : "").setFont(font))
                            .setPadding(6);
                    if (alternate) {
                        cell.setBackgroundColor(new DeviceRgb(249, 250, 251)); // Very light gray
                    }
                    table.addCell(cell);
                }
                alternate = !alternate;
            }

            document.add(table);
            return this;
        }

        /**
         * Add key-value pairs as a summary block
         */
        public PdfBuilder addSummary(List<String[]> keyValues) {
            Table table = new Table(2);
            table.setWidth(UnitValue.createPercentValue(50));

            for (String[] kv : keyValues) {
                Cell keyCell = new Cell()
                        .add(new Paragraph(kv[0]).setFont(font).setBold())
                        .setBorder(null)
                        .setPaddingRight(15);
                Cell valueCell = new Cell()
                        .add(new Paragraph(kv[1]).setFont(font))
                        .setBorder(null);
                table.addCell(keyCell);
                table.addCell(valueCell);
            }

            document.add(table);
            document.add(new Paragraph("\n"));
            return this;
        }

        /**
         * Add paragraph text
         */
        public PdfBuilder addParagraph(String text) {
            document.add(new Paragraph(text).setFont(font).setFontSize(10));
            return this;
        }

        /**
         * Add a line separator
         */
        public PdfBuilder addSeparator() {
            document.add(new Paragraph("\n"));
            return this;
        }

        /**
         * Add footer with page numbers
         */
        public PdfBuilder addFooter(String companyName) {
            int numPages = pdfDocument.getNumberOfPages();
            for (int i = 1; i <= numPages; i++) {
                String footerText = String.format("%s | Generated: %s | Page %d of %d",
                        companyName,
                        LocalDateTime.now().format(DATETIME_FORMAT),
                        i, numPages);

                Paragraph footer = new Paragraph(footerText)
                        .setFont(font)
                        .setFontSize(8)
                        .setFontColor(ColorConstants.GRAY)
                        .setTextAlignment(TextAlignment.CENTER);

                document.showTextAligned(footer,
                        PageSize.A4.getWidth() / 2,
                        20,
                        i,
                        TextAlignment.CENTER,
                        com.itextpdf.layout.properties.VerticalAlignment.BOTTOM,
                        0);
            }
            return this;
        }

        /**
         * Build and return the PDF as byte array
         */
        public byte[] build() {
            document.close();
            return outputStream.toByteArray();
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Format date for display in PDF
     */
    public static String formatDate(LocalDate date) {
        return date != null ? date.format(DATE_FORMAT) : "";
    }

    /**
     * Format datetime for display in PDF
     */
    public static String formatDateTime(LocalDateTime dateTime) {
        return dateTime != null ? dateTime.format(DATETIME_FORMAT) : "";
    }

    /**
     * Format currency (VND)
     */
    public static String formatCurrency(Number amount) {
        if (amount == null)
            return "";
        return String.format("%,.0f VND", amount.doubleValue());
    }

    /**
     * Format percentage
     */
    public static String formatPercent(Number value) {
        if (value == null)
            return "";
        return String.format("%.1f%%", value.doubleValue());
    }
}
