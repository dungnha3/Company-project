package DoAn.BE.storage.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FolderNodeDTO {
    private String name;
    private String path; // virtual path, "" for root
    private List<FolderNodeDTO> children;

    public static FolderNodeDTO root() {
        return FolderNodeDTO.builder()
                .name("")
                .path("")
                .children(new ArrayList<>())
                .build();
    }
}
