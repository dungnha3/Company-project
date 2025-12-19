import { apiService } from '@/shared/services/api.service'

// Meeting API - Quản lý cuộc họp
export const meetingApi = {
    // Create a new meeting
    createMeeting: async (meetingData) => {
        try {
            const response = await apiService.post('/api/meetings', meetingData)
            return response
        } catch (error) {
            throw error
        }
    },

    // Get meetings for a room
    getMeetingsByRoom: async (roomId) => {
        try {
            const response = await apiService.get(`/api/meetings/room/${roomId}`)
            return response
        } catch (error) {
            throw error
        }
    },

    // Get upcoming meetings
    getUpcomingMeetings: async () => {
        try {
            const response = await apiService.get('/api/meetings/upcoming')
            return response
        } catch (error) {
            throw error
        }
    },

    // Get meeting by ID
    getMeetingById: async (meetingId) => {
        try {
            const response = await apiService.get(`/api/meetings/${meetingId}`)
            return response
        } catch (error) {
            throw error
        }
    },

    // Update meeting
    updateMeeting: async (meetingId, meetingData) => {
        try {
            const response = await apiService.put(`/api/meetings/${meetingId}`, meetingData)
            return response
        } catch (error) {
            throw error
        }
    },

    // Delete/Cancel meeting
    cancelMeeting: async (meetingId) => {
        try {
            const response = await apiService.delete(`/api/meetings/${meetingId}`)
            return response
        } catch (error) {
            throw error
        }
    },

    // Start meeting now (creates a meeting that starts immediately)
    startMeetingNow: async (roomId, title) => {
        try {
            const meetingData = {
                roomId,
                title: title || 'Cuộc họp ngay',
                startTime: new Date().toISOString(),
                duration: 60, // Default 1 hour
                type: 'INSTANT'
            }
            const response = await apiService.post('/api/meetings', meetingData)
            return response
        } catch (error) {
            throw error
        }
    },

    // Schedule a meeting
    scheduleMeeting: async (roomId, title, startTime, duration, description, participants) => {
        try {
            const meetingData = {
                roomId,
                title,
                startTime,
                duration,
                description,
                participantIds: participants,
                type: 'SCHEDULED'
            }
            const response = await apiService.post('/api/meetings', meetingData)
            return response
        } catch (error) {
            throw error
        }
    },

    // Join meeting
    joinMeeting: async (meetingId) => {
        try {
            const response = await apiService.post(`/api/meetings/${meetingId}/join`)
            return response
        } catch (error) {
            throw error
        }
    },

    // Leave meeting
    leaveMeeting: async (meetingId) => {
        try {
            const response = await apiService.post(`/api/meetings/${meetingId}/leave`)
            return response
        } catch (error) {
            throw error
        }
    },

    // End meeting
    endMeeting: async (meetingId) => {
        try {
            const response = await apiService.post(`/api/meetings/${meetingId}/end`)
            return response
        } catch (error) {
            throw error
        }
    }
}

export default meetingApi
