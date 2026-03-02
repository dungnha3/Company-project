package DoAn.BE.sysadmin.entity;

import DoAn.BE.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "global_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true, callSuper = false)
public class GlobalSettings extends BaseEntity {

    @Id
    @Column(name = "setting_key", nullable = false, unique = true)
    @EqualsAndHashCode.Include
    private String settingKey;

    @Column(name = "setting_value")
    private String settingValue;

    @Column(name = "description")
    private String description;
}
