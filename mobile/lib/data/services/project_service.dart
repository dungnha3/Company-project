import 'api_service.dart';
import '../models/project.dart';
import '../models/issue.dart';
import '../models/issue_activity.dart';

class ProjectService {
  final ApiService _apiService = ApiService();

  // Get my projects (projects I'm a member of)
  // Backend: GET /api/projects/my-projects
  Future<List<Project>> getMyProjects() async {
    try {
      final response = await _apiService.get('/projects/my-projects');
      if (response is List) {
        return response.map((e) => Project.fromJson(e)).toList();
      }
    } catch (e) {
      // Log error but return empty list
    }
    return [];
  }

  // Get tasks assigned to me
  // Backend: GET /api/issues/my-issues
  Future<List<Issue>> getMyTasks() async {
    try {
      final response = await _apiService.get('/issues/my-issues');
      if (response is List) {
        return response.map((e) => Issue.fromJson(e)).toList();
      }
    } catch (e) {
      rethrow;
    }
    return [];
  }

  // Get task detail by ID
  // Backend: GET /api/issues/{issueId} matches basic info
  // Backend: GET /api/comments/issue/{issueId} for comments
  Future<Issue?> getTaskDetail(int issueId) async {
    try {
      final response = await _apiService.get('/issues/$issueId');
      final issue = Issue.fromJson(response);

      // Fetch comments separately
      try {
        final commentsData = await _apiService.get('/comments/issue/$issueId');
        if (commentsData is List) {
           List<Comment> comments = commentsData.map((e) => Comment.fromJson(e)).toList();
           return issue.copyWith(comments: comments);
        }
      } catch (e) {
        print('Error fetching comments: $e');
      }

      return issue;
    } catch (e) {
      return null;
    }
  }

  // Update task status (for Kanban drag-drop)
  // Backend: PATCH /api/issues/{issueId}/status/{statusId}
  Future<void> updateTaskStatus(int issueId, int statusId) async {
    await _apiService.patch('/issues/$issueId/status/$statusId', {});
  }

  // Add comment to issue
  // Backend: POST /api/comments
  Future<void> addComment(int issueId, String content) async {
    await _apiService.post('/comments', {
      'issueId': issueId,
      'content': content,
    });
  }

  // Get comments for an issue
  // Backend: GET /api/comments/issue/{issueId}
  Future<List<dynamic>> getComments(int issueId) async {
    try {
      final response = await _apiService.get('/comments/issue/$issueId');
      if (response is List) {
        return response;
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  // Get project details
  // Backend: GET /api/projects/{projectId}
  Future<Project?> getProjectDetail(int projectId) async {
    try {
      final response = await _apiService.get('/projects/$projectId');
      return Project.fromJson(response);
    } catch (e) {
      return null;
    }
  }

  // Create new issue
  // Backend: POST /api/issues
  Future<bool> createIssue({
    required int projectId,
    required String title,
    String? description,
    required String priority,
    DateTime? dueDate,
    double? estimatedHours,
    int? assigneeId,
  }) async {
    try {
      await _apiService.post('/issues', {
        'projectId': projectId,
        'title': title,
        'description': description,
        'priority': priority,
        'dueDate': dueDate?.toIso8601String().split('T')[0], // yyyy-MM-dd
        'estimatedHours': estimatedHours,
        'assigneeId': assigneeId,
        'statusId': 1, // Default to To Do
      });
      return true;
    } catch (e) {
      print('Error creating issue: $e');
      return false;
    }
  }

  // Update issue
  // Backend: PUT /api/issues/{id}
  Future<bool> updateIssue(int issueId, {
    String? title,
    String? description,
    String? priority,
    DateTime? dueDate,
    double? estimatedHours,
    double? actualHours,
    int? statusId,
    int? assigneeId,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (title != null) body['title'] = title;
      if (description != null) body['description'] = description;
      if (priority != null) body['priority'] = priority;
      if (dueDate != null) body['dueDate'] = dueDate.toIso8601String().split('T')[0];
      if (estimatedHours != null) body['estimatedHours'] = estimatedHours;
      if (actualHours != null) body['actualHours'] = actualHours;
      if (statusId != null) body['statusId'] = statusId;
      if (assigneeId != null) body['assigneeId'] = assigneeId;

      await _apiService.put('/issues/$issueId', body);
      return true;
    } catch (e) {
      print('Error updating issue: $e');
      return false;
    }
  }

  // Get issues for a sprint (Kanban board)
  // Backend: GET /api/issues/sprint/{sprintId}
  Future<List<Issue>> getSprintIssues(int sprintId) async {
    try {
      final response = await _apiService.get('/issues/sprint/$sprintId');
      if (response is List) {
        return response.map((e) => Issue.fromJson(e)).toList();
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  // Get project sprints
  // Backend: GET /api/projects/{projectId}/sprints
  Future<List<Map<String, dynamic>>> getProjectSprints(int projectId) async {
    try {
      final response = await _apiService.get('/projects/$projectId/sprints');
      if (response is List) {
        return List<Map<String, dynamic>>.from(response);
      }
    } catch (e) {
      print('Error loading sprints: $e');
    }
    return [];
  }

  // Get project backlog
  // Backend: GET /api/issues/backlog/{projectId}
  Future<List<Issue>> getBacklog(int projectId) async {
    try {
      final response = await _apiService.get('/issues/backlog/$projectId');
      if (response is List) {
        return response.map((e) => Issue.fromJson(e)).toList();
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  // Get activities for an issue
  // Backend: GET /api/activities/issue/{issueId}
  Future<List<IssueActivity>> getIssueActivities(int issueId) async {
    try {
      final response = await _apiService.get('/activities/issue/$issueId');
      if (response is List) {
        return response.map((e) => IssueActivity.fromJson(e)).toList();
      }
    } catch (e) {
      print('Error loading activities: $e');
    }
    return [];
  }
}
