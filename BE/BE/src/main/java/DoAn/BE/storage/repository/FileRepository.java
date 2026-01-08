package DoAn.BE.storage.repository;

import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.entity.Folder;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FileRepository extends JpaRepository<File, Long> {
    List<File> findByOwner_UserId(Long userId);

    List<File> findByFolder_FolderId(Long folderId);

    List<File> findByFolder(Folder folder);

    List<File> findByParentFile_FileId(Long parentFileId);

    List<File> findByFolder_FolderType(DoAn.BE.storage.entity.Folder.FolderType folderType);

    // [OPTIMIZED: For recent files query]
    @Query("SELECT f FROM File f WHERE f.owner.userId = :userId " +
            "AND f.isDeleted = false " +
            "AND f.createdAt > :since " +
            "ORDER BY f.createdAt DESC")
    List<File> findRecentByOwner(@Param("userId") Long userId,
            @Param("since") LocalDateTime since,
            Pageable pageable);

    // [OPTIMIZED: For search query]
    @Query("SELECT f FROM File f WHERE f.owner.userId = :userId " +
            "AND f.isDeleted = false " +
            "AND LOWER(f.originalFilename) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "ORDER BY f.createdAt DESC")
    List<File> searchByOwnerAndFilename(@Param("userId") Long userId,
            @Param("keyword") String keyword);

    // [OPTIMIZED: For statistics - count only]
    long countByOwner_UserIdAndIsDeletedFalse(Long userId);

    @Query("SELECT SUM(f.fileSize) FROM File f WHERE f.owner.userId = :userId AND f.isDeleted = false")
    Long sumFileSizeByOwner(@Param("userId") Long userId);

    // [Count by mime type pattern]
    @Query("SELECT COUNT(f) FROM File f WHERE f.owner.userId = :userId " +
            "AND f.isDeleted = false AND f.mimeType LIKE :pattern")
    long countByOwnerAndMimeTypeLike(@Param("userId") Long userId, @Param("pattern") String pattern);
}
