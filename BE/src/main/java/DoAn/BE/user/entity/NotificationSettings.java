package DoAn.BE.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettings {

    @Column(name = "notif_email_new_message")
    private Boolean emailNewMessage = true;

    @Column(name = "notif_email_mentions")
    private Boolean emailMentions = true;

    @Column(name = "notif_email_weekly_digest")
    private Boolean emailWeeklyDigest = false;

    @Column(name = "notif_push_desktop")
    private Boolean pushDesktop = true;

    @Column(name = "notif_push_mobile")
    private Boolean pushMobile = true;

    @Column(name = "notif_sound_enabled")
    private Boolean soundEnabled = true;

    @Column(name = "notif_email_project_updates")
    private Boolean emailProjectUpdates = true;
}
