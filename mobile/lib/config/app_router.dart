import 'package:flutter/material.dart';
import '../screens/auth/login_screen.dart';
import '../screens/home_screen.dart';
import '../screens/hr/attendance_screen.dart';
import '../screens/hr/payroll_screen.dart';
import '../screens/hr/leave_request_screen.dart';
import '../screens/projects/my_tasks_screen.dart';
import '../screens/projects/issue_detail_screen.dart';
import '../screens/notifications/notifications_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/profile/profile_detail_screen.dart';
import '../screens/profile/change_password_screen.dart';
import '../screens/chat/chat_list_screen.dart';
import '../screens/chat/chat_screen.dart';
import '../screens/projects/create_issue_screen.dart';
import '../screens/projects/sprint_board_screen.dart';
import '../screens/projects/project_list_screen.dart';
import '../screens/storage/my_files_screen.dart';
import '../screens/storage/project_files_screen.dart';

class AppRouter {
  static const String root = '/';
  static const String login = '/login';
  static const String home = '/home';
  static const String attendance = '/attendance';
  static const String payroll = '/payroll';
  static const String leaveRequest = '/leave-request';
  static const String myTasks = '/my-tasks';
  static const String issueDetail = '/issue-detail';
  static const String notifications = '/notifications';
  static const String profile = '/profile';
  static const String changePassword = '/change-password';
  static const String chatList = '/chat-list';
  static const String chat = '/chat';
  static const String createIssue = '/create-issue';
  static const String sprintBoard = '/sprint-board';
  static const String projectList = '/project-list';
  static const String myFiles = '/my-files';
  static const String projectFiles = '/project-files';
  static const String profileDetail = '/profile-detail';

  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case root:
      case login:
        return MaterialPageRoute(builder: (_) => LoginScreen());
      case home:
        return MaterialPageRoute(builder: (_) => HomeScreen());
      case attendance:
        return MaterialPageRoute(builder: (_) => AttendanceScreen());
      case payroll:
        return MaterialPageRoute(builder: (_) => PayrollScreen());
      case leaveRequest:
        return MaterialPageRoute(builder: (_) => LeaveRequestScreen());
      case myTasks:
        return MaterialPageRoute(builder: (_) => MyTasksScreen());
      case issueDetail:
        final args = settings.arguments as Map<String, dynamic>;
        return MaterialPageRoute(
          builder: (_) => IssueDetailScreen(
            taskId: args['issueId'],
          ),
        );
      case notifications:
        return MaterialPageRoute(builder: (_) => NotificationsScreen());
      case profile:
        return MaterialPageRoute(builder: (_) => ProfileScreen());
      case changePassword:
        return MaterialPageRoute(builder: (_) => ChangePasswordScreen());
      case chatList:
        return MaterialPageRoute(builder: (_) => ChatListScreen());
      case chat:
        final args = settings.arguments as Map<String, dynamic>;
        return MaterialPageRoute(
          builder: (_) => ChatScreen(
            roomId: args['roomId'],
            roomName: args['roomName'],
          ),
        );
      case createIssue:
        return MaterialPageRoute(builder: (_) => CreateIssueScreen());
      case sprintBoard:
        final args = settings.arguments as Map<String, dynamic>;
        return MaterialPageRoute(
          builder: (_) => SprintBoardScreen(
            projectId: args['projectId'],
            projectName: args['projectName'],
          ),
        );
      case projectList:
        return MaterialPageRoute(builder: (_) => ProjectListScreen());
      case myFiles:
        return MaterialPageRoute(builder: (_) => MyFilesScreen());
      case projectFiles:
        final args = settings.arguments as Map<String, dynamic>;
        return MaterialPageRoute(
          builder: (_) => ProjectFilesScreen(
            projectId: args['projectId'],
            projectName: args['projectName'],
          ),
        );
      case profileDetail:
        return MaterialPageRoute(builder: (_) => const ProfileDetailScreen());
      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            body: Center(child: Text('No route defined for ${settings.name}')),
          ),
        );
    }
  }
}
