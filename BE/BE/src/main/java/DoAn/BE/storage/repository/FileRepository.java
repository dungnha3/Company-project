package DoAn.BE.storage.repository;

import DoAn.BE.storage.entity.File;
import DoAn.BE.storage.entity.Folder;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FileRepository extends JpaRepository<File, Long> {
    List<File> findByOwner_UserId(Long userId);

    List<File> findByFolder_FolderId(Long folderId);

    List<File> findByFolder(Folder folder);

    List<File> findByParentFile_FileId(Long parentFileId);

    List<File> findByFolder_FolderType(DoAn.BE.storage.entity.Folder.FolderType folderType);
}
