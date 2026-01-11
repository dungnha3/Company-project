import apiClient from './client';
import { ENDPOINTS } from './endpoints';

/**
 * Time Tracking API Service
 */
export const timelogApi = {
    // Log time for an issue
    logTime: async (data) => {
        const response = await apiClient.post(ENDPOINTS.TIMELOGS.CREATE, data);
        return response.data;
    },

    // Get time logs for an issue
    getIssueTimelogs: async (issueId) => {
        const response = await apiClient.get(ENDPOINTS.TIMELOGS.BY_ISSUE(issueId));
        return response.data;
    },

    // Get total hours for an issue
    getIssueTotalHours: async (issueId) => {
        const response = await apiClient.get(ENDPOINTS.TIMELOGS.TOTAL_BY_ISSUE(issueId));
        return response.data;
    },

    // Get my timelogs (paginated)
    getMyTimelogs: async (page = 0, size = 20) => {
        const response = await apiClient.get(ENDPOINTS.TIMELOGS.MY_LOGS, {
            params: { page, size }
        });
        return response.data;
    },

    // Update timelog
    updateTimelog: async (logId, data) => {
        const response = await apiClient.put(ENDPOINTS.TIMELOGS.UPDATE(logId), data);
        return response.data;
    },

    // Delete timelog
    deleteTimelog: async (logId) => {
        await apiClient.delete(ENDPOINTS.TIMELOGS.DELETE(logId));
    }
};

/**
 * Analytics API Service
 */
export const analyticsApi = {
    // Get burndown chart data
    getBurndown: async (projectId, sprintId) => {
        const response = await apiClient.get(ENDPOINTS.ANALYTICS.BURNDOWN(projectId), {
            params: { sprintId }
        });
        return response.data;
    },

    // Get velocity chart data
    getVelocity: async (projectId, sprintCount = 5) => {
        const response = await apiClient.get(ENDPOINTS.ANALYTICS.VELOCITY(projectId), {
            params: { sprintCount }
        });
        return response.data;
    },

    // Get status distribution
    getStatusDistribution: async (projectId) => {
        const response = await apiClient.get(ENDPOINTS.ANALYTICS.STATUS(projectId));
        return response.data;
    },

    // Get team workload
    getTeamWorkload: async (projectId) => {
        const response = await apiClient.get(ENDPOINTS.ANALYTICS.WORKLOAD(projectId));
        return response.data;
    }
};

/**
 * Calendar API Service
 */
export const calendarApi = {
    // Get events in date range
    getEvents: async (start, end) => {
        const response = await apiClient.get(ENDPOINTS.CALENDAR.EVENTS, {
            params: { start, end }
        });
        return response.data;
    },

    // Create event
    createEvent: async (data) => {
        const response = await apiClient.post(ENDPOINTS.CALENDAR.EVENTS, data);
        return response.data;
    },

    // Get event by ID
    getEvent: async (eventId) => {
        const response = await apiClient.get(ENDPOINTS.CALENDAR.EVENT_BY_ID(eventId));
        return response.data;
    },

    // Update event
    updateEvent: async (eventId, data) => {
        const response = await apiClient.put(ENDPOINTS.CALENDAR.EVENT_BY_ID(eventId), data);
        return response.data;
    },

    // Delete event
    deleteEvent: async (eventId) => {
        await apiClient.delete(ENDPOINTS.CALENDAR.EVENT_BY_ID(eventId));
    },

    // RSVP to event
    respondToEvent: async (eventId, status) => {
        await apiClient.post(ENDPOINTS.CALENDAR.RESPOND(eventId), null, {
            params: { status }
        });
    }
};

/**
 * Automation API Service
 */
export const automationApi = {
    // Create automation rule
    createRule: async (data) => {
        const response = await apiClient.post(ENDPOINTS.AUTOMATIONS.CREATE, data);
        return response.data;
    },

    // Get project rules
    getProjectRules: async (projectId) => {
        const response = await apiClient.get(ENDPOINTS.AUTOMATIONS.BY_PROJECT(projectId));
        return response.data;
    },

    // Get rule by ID
    getRule: async (ruleId) => {
        const response = await apiClient.get(ENDPOINTS.AUTOMATIONS.BY_ID(ruleId));
        return response.data;
    },

    // Toggle rule
    toggleRule: async (ruleId) => {
        const response = await apiClient.post(ENDPOINTS.AUTOMATIONS.TOGGLE(ruleId));
        return response.data;
    },

    // Delete rule
    deleteRule: async (ruleId) => {
        await apiClient.delete(ENDPOINTS.AUTOMATIONS.DELETE(ruleId));
    },

    // Get rule logs
    getRuleLogs: async (ruleId, page = 0, size = 20) => {
        const response = await apiClient.get(ENDPOINTS.AUTOMATIONS.LOGS(ruleId), {
            params: { page, size }
        });
        return response.data;
    }
};
