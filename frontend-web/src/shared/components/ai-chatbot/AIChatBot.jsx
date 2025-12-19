import { useState, useRef, useEffect } from 'react';
import { aiApi } from './aiApi';

/**
 * AI ChatBot Component - Giống Notion AI
 * Floating button ở góc dưới bên phải, click để mở chat
 */
// Chat history storage key
const CHAT_HISTORY_KEY = 'ai_chatbot_history';

export default function AIChatBot({ projectId = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [aiStatus, setAiStatus] = useState({ available: false, message: '' });
  const [pendingActions, setPendingActions] = useState([]);
  const [pendingActionType, setPendingActionType] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Quick actions cho AI
  const quickActions = [
    { icon: '📊', label: 'Tóm tắt dự án', action: 'SUMMARIZE_PROJECT', isNew: false, needProject: true },
    { icon: '🏃', label: 'Tiến độ Sprint', action: 'SUMMARIZE_SPRINT', isNew: false, needProject: true },
    { icon: '💡', label: 'Gợi ý công việc', action: 'SUGGEST_TASKS', isNew: true, needProject: true },
    { icon: '📈', label: 'Phân tích tiến độ', action: 'ANALYZE_PROGRESS', isNew: false, needProject: true },
    { icon: '📝', label: 'Tạo báo cáo', action: 'GENERATE_REPORT', isNew: true, needProject: true },
  ];

  // Check AI status and fetch projects on mount
  useEffect(() => {
    checkAiStatus();
    fetchProjects();
    loadChatHistory();
  }, []);

  // Load chat history from localStorage
  const loadChatHistory = () => {
    try {
      const saved = localStorage.getItem(CHAT_HISTORY_KEY);
      if (saved) {
        const history = JSON.parse(saved);
        setChatHistory(history);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Save chat to history
  const saveChatToHistory = (chatId, chatMessages, title = null) => {
    if (!chatMessages || chatMessages.length === 0) return;

    const chatTitle = title || getChatTitle(chatMessages);
    const updatedHistory = [...chatHistory];
    const existingIndex = updatedHistory.findIndex(chat => chat.id === chatId);

    const chatData = {
      id: chatId,
      title: chatTitle,
      messages: chatMessages,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      updatedHistory[existingIndex] = chatData;
    } else {
      updatedHistory.unshift(chatData);
    }

    // Keep only last 20 chats
    const limitedHistory = updatedHistory.slice(0, 20);
    setChatHistory(limitedHistory);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(limitedHistory));
  };

  // Get chat title from first user message
  const getChatTitle = (chatMessages) => {
    const firstUserMessage = chatMessages.find(m => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.slice(0, 40) + (firstUserMessage.content.length > 40 ? '...' : '');
    }
    return 'Cuộc chat mới';
  };

  // Switch to a chat from history
  const handleSwitchChat = (chat) => {
    // Save current chat before switching
    if (currentChatId && messages.length > 0) {
      saveChatToHistory(currentChatId, messages);
    }

    setMessages(chat.messages);
    setCurrentChatId(chat.id);
    setConversationId(null); // Reset conversation ID
    setShowChatHistory(false);
    setPendingActions([]);
    setPendingActionType(null);
  };

  // Delete a chat from history
  const handleDeleteChat = (chatId, e) => {
    e.stopPropagation();
    const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
    setChatHistory(updatedHistory);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedHistory));

    // If deleting current chat, reset to new chat
    if (chatId === currentChatId) {
      handleNewChat();
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const checkAiStatus = async () => {
    try {
      const response = await aiApi.getStatus();
      setAiStatus(response);
    } catch (error) {
      console.error('Error checking AI status:', error);
      setAiStatus({ available: false, message: 'Không thể kết nối đến AI service' });
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await aiApi.getMyProjects();
      setProjects(response || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    }
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setShowProjectSelector(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (message = inputValue, actionType = 'CHAT') => {
    if (!message.trim() && actionType === 'CHAT') return;

    const userMessage = message.trim() || getActionLabel(actionType);

    // Generate chat ID if not exists
    const chatId = currentChatId || `chat_${Date.now()}`;
    if (!currentChatId) {
      setCurrentChatId(chatId);
    }

    // Add user message to UI
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Use selected project or prop projectId
      const currentProjectId = selectedProject?.projectId || projectId;

      const response = await aiApi.chat({
        message: userMessage,
        conversationId,
        projectId: currentProjectId,
        actionType,
      });

      // Save conversation ID
      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      // Add AI response
      const updatedMessages = [...newMessages, {
        role: 'assistant',
        content: response.message,
        suggestedActions: response.suggestedActions,
        executableActions: response.executableActions
      }];
      setMessages(updatedMessages);

      // Save to chat history
      saveChatToHistory(chatId, updatedMessages);

      // Set pending actions if any - show buttons for tasks that can be created
      if (response.executableActions && response.executableActions.length > 0) {
        // Check if any action is task-related (CREATE_ISSUE, CREATE_MULTIPLE_ISSUES, SETUP_PROJECT_COMPLETE)
        const taskActions = response.executableActions.filter(a =>
          a.actionType === 'CREATE_ISSUE' ||
          a.actionType === 'CREATE_MULTIPLE_ISSUES' ||
          a.actionType === 'SETUP_PROJECT_COMPLETE'
        );
        if (taskActions.length > 0) {
          setPendingActions(taskActions);
          setPendingActionType('TASK_CREATION');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Get error message from response
      let errorMessage = 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      const errorMessages = [...newMessages, {
        role: 'assistant',
        content: errorMessage,
        isError: true
      }];
      setMessages(errorMessages);

      // Save error chat to history too
      saveChatToHistory(chatId, errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionConfig) => {
    const action = typeof actionConfig === 'string' ? actionConfig : actionConfig.action;
    const needProject = typeof actionConfig === 'object' ? actionConfig.needProject : true;

    // Check if project is needed but not selected
    if (needProject && !selectedProject && !projectId) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Vui lòng chọn một dự án trước khi sử dụng tính năng này.\n\nClick vào "@ Add context" bên dưới để chọn dự án.',
        isError: true
      }]);
      return;
    }

    const actionMessages = {
      SUMMARIZE_PROJECT: 'Hãy tóm tắt tình trạng dự án này',
      SUMMARIZE_SPRINT: 'Hãy tóm tắt tiến độ sprint hiện tại',
      SUGGEST_TASKS: `Hãy gợi ý các công việc cần làm để hoàn thành dự án "${selectedProject?.name || 'này'}". 
        Với mỗi công việc, hãy đề xuất:
        - Tên công việc
        - Thời gian ước tính (giờ)
        - Mức độ ưu tiên (LOW/MEDIUM/HIGH/CRITICAL)
        - Hạn chót (số ngày từ hôm nay)
        - Mô tả ngắn
        
        Liệt kê dưới dạng danh sách.`,
      ANALYZE_PROGRESS: 'Hãy phân tích tiến độ dự án',
      GENERATE_REPORT: 'Hãy tạo báo cáo status update',
    };
    handleSendMessage(actionMessages[action] || '', action);
  };

  const getActionLabel = (actionType) => {
    const labels = {
      SUMMARIZE_PROJECT: 'Tóm tắt dự án',
      SUMMARIZE_SPRINT: 'Tóm tắt sprint',
      SUGGEST_TASKS: 'Gợi ý công việc',
      ANALYZE_PROGRESS: 'Phân tích tiến độ',
      GENERATE_REPORT: 'Tạo báo cáo',
    };
    return labels[actionType] || actionType;
  };

  // Execute an AI action (create project, task, etc.)
  const handleExecuteAction = async (action) => {
    setIsLoading(true);
    try {
      const result = await aiApi.executeAction(action);

      // Add result message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.message,
        isActionResult: true,
        actionStatus: result.status
      }]);

      // Clear pending actions
      setPendingActions(prev => prev.filter(a => a !== action));

      // Dispatch custom event để thông báo các component khác reload data
      // Backend trả về status = 'EXECUTED' khi thành công
      if (result.status === 'EXECUTED') {
        window.dispatchEvent(new CustomEvent('ai-data-changed', {
          detail: { actionType: action.actionType, result }
        }));
      }

    } catch (error) {
      console.error('Error executing action:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Lỗi khi thực hiện: ${error.response?.data?.message || error.message}`,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get action type display name
  const getActionTypeName = (actionType) => {
    const names = {
      CREATE_PROJECT: 'Tạo dự án',
      CREATE_ISSUE: 'Tạo task',
      CREATE_SPRINT: 'Tạo sprint',
      CREATE_MULTIPLE_ISSUES: 'Tạo nhiều tasks',
      ASSIGN_ISSUE: 'Gán task',
      CHANGE_ISSUE_STATUS: 'Đổi trạng thái',
    };
    return names[actionType] || actionType;
  };

  // Parse tasks from AI message content
  const parseTasksFromContent = (content) => {
    const tasks = [];
    const lines = content.split('\n');
    let currentTask = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for task title patterns like "**Công việc 1: Title**" or "Công việc 1:"
      const taskMatch = trimmedLine.match(/\*\*(?:Công việc|Task|Tác vụ)\s*\d*\s*[:.]?\s*(.+?)\*\*/i) ||
        trimmedLine.match(/^(?:Công việc|Task|Tác vụ)\s*\d*\s*[:.]?\s*(.+)/i);

      if (taskMatch) {
        // Save previous task
        if (currentTask && currentTask.title) {
          tasks.push(currentTask);
        }
        // Start new task
        currentTask = {
          title: taskMatch[1].replace(/\*\*/g, '').trim(),
          priority: 'MEDIUM'
        };
      } else if (currentTask) {
        // Parse metadata
        const timeMatch = trimmedLine.match(/(?:thời gian|ước tính)[^:]*:\s*(\d+)\s*(?:giờ|h)/i);
        const priorityMatch = trimmedLine.match(/(?:ưu tiên|priority)[^:]*:\s*(LOW|MEDIUM|HIGH|CRITICAL|thấp|trung bình|cao|khẩn cấp)/i);
        const descMatch = trimmedLine.match(/(?:mô tả|description)[^:]*:\s*(.+)/i);

        if (timeMatch) {
          currentTask.estimatedHours = parseInt(timeMatch[1]);
        }
        if (priorityMatch) {
          const p = priorityMatch[1].toLowerCase();
          currentTask.priority = p === 'thấp' || p === 'low' ? 'LOW' :
            p === 'cao' || p === 'high' ? 'HIGH' :
              p === 'khẩn cấp' || p === 'critical' ? 'CRITICAL' : 'MEDIUM';
        }
        if (descMatch) {
          currentTask.description = descMatch[1].trim();
        }
      }
    }

    // Add last task
    if (currentTask && currentTask.title) {
      tasks.push(currentTask);
    }

    return tasks;
  };

  // Check if message contains task suggestions
  const hasTaskSuggestions = (content) => {
    if (!content) return false;
    const lowerContent = content.toLowerCase();
    // Check for common patterns indicating task list
    const hasTaskKeyword = lowerContent.includes('công việc') ||
      lowerContent.includes('task') ||
      lowerContent.includes('tác vụ');
    const hasListPattern = (content.match(/\*\*(?:Công việc|Task|Tác vụ)\s*\d/gi) || []).length >= 2;
    return hasTaskKeyword && hasListPattern;
  };

  // Create tasks from message content
  const handleCreateTasksFromContent = async (content) => {
    let currentProjectId = selectedProject?.projectId || projectId;

    // Try to find project from content or all messages if not selected
    if (!currentProjectId && projects.length > 0) {
      // First, search in current content
      for (const project of projects) {
        const projectName = project.name.toLowerCase();
        const contentLower = content.toLowerCase();
        // Check for various patterns: exact match, quoted, bold
        if (contentLower.includes(projectName) ||
          contentLower.includes(`"${projectName}"`) ||
          contentLower.includes(`**${projectName}**`)) {
          currentProjectId = project.projectId;
          break;
        }
      }

      // If not found, search in all messages
      if (!currentProjectId) {
        for (const msg of messages) {
          if (currentProjectId) break;
          const msgLower = (msg.content || '').toLowerCase();
          for (const project of projects) {
            if (msgLower.includes(project.name.toLowerCase())) {
              currentProjectId = project.projectId;
              break;
            }
          }
        }
      }
    }

    if (!currentProjectId) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Vui lòng chọn một dự án bằng cách click "@Add context" bên dưới.',
        isError: true
      }]);
      return;
    }

    const tasks = parseTasksFromContent(content);

    if (tasks.length === 0) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Không tìm thấy công việc nào để tạo.',
        isError: true
      }]);
      return;
    }

    setIsLoading(true);
    try {
      // Create action for multiple tasks
      const action = {
        actionType: 'CREATE_MULTIPLE_ISSUES',
        data: {
          projectId: currentProjectId,
          issues: tasks
        }
      };

      const result = await aiApi.executeAction(action);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.message || `✅ Đã tạo ${tasks.length} công việc thành công!`,
        isActionResult: true
      }]);

      // Dispatch event to refresh data
      if (result.status === 'EXECUTED') {
        window.dispatchEvent(new CustomEvent('ai-data-changed', {
          detail: { actionType: 'CREATE_MULTIPLE_ISSUES', result }
        }));
      }
    } catch (error) {
      console.error('Error creating tasks:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Lỗi khi tạo công việc: ${error.response?.data?.message || error.message}`,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Approve all suggested tasks and create them
  const handleApproveAllTasks = async (actions) => {
    if (!actions || actions.length === 0) return;

    setIsLoading(true);
    try {
      const results = await aiApi.executeBatchActions(actions);

      // Count successes
      const successCount = results.filter(r => r.status === 'EXECUTED').length;
      const failCount = results.length - successCount;

      let resultMessage = `✅ Đã tạo thành công ${successCount} công việc`;
      if (failCount > 0) {
        resultMessage += `\n⚠️ ${failCount} công việc không thể tạo`;
      }

      // Show individual results
      results.forEach(r => {
        if (r.message) {
          resultMessage += `\n${r.message}`;
        }
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: resultMessage,
        isActionResult: true
      }]);

      // Clear pending actions
      setPendingActions([]);
      setPendingActionType(null);

      // Dispatch custom event để thông báo các component khác reload data
      if (successCount > 0) {
        window.dispatchEvent(new CustomEvent('ai-data-changed', {
          detail: { actionType: 'BATCH_CREATE', successCount }
        }));
      }

    } catch (error) {
      console.error('Error creating tasks:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Lỗi khi tạo công việc: ${error.response?.data?.message || error.message}`,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Reject suggested tasks
  const handleRejectTasks = () => {
    setPendingActions([]);
    setPendingActionType(null);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '👍 Đã hủy. Bạn có thể yêu cầu AI gợi ý lại hoặc tiếp tục chat.',
      isActionResult: true
    }]);
  };

  const handleNewChat = () => {
    // Save current chat before creating new one
    if (currentChatId && messages.length > 0) {
      saveChatToHistory(currentChatId, messages);
    }

    setMessages([]);
    setConversationId(null);
    setCurrentChatId(null);
    setInputValue('');
    setPendingActions([]);
    setPendingActionType(null);
    setShowChatHistory(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.floatingButton}
        title="AI Assistant"
      >
        <div style={styles.buttonIcon}>
          {isOpen ? '✕' : '🤖'}
        </div>
        {!isOpen && <div style={styles.notificationDot} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={styles.chatWindow}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <span style={styles.headerIcon}>🤖</span>
              <div style={styles.headerTitle}>
                <span style={styles.titleText}>AI Assistant</span>
                <div style={styles.chatActionsRow}>
                  <button
                    style={styles.newChatBtnDropdown}
                    onClick={() => setShowChatHistory(!showChatHistory)}
                  >
                    {messages.length > 0 ? getChatTitle(messages) : 'New chat'} ▾
                  </button>
                  <button
                    style={styles.newChatPlusBtn}
                    onClick={handleNewChat}
                    title="Tạo cuộc chat mới"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div style={styles.headerActions}>
              <button style={styles.iconBtn} title="Mở rộng">⬜</button>
              <button style={styles.iconBtn} onClick={() => setIsOpen(false)} title="Đóng">—</button>
            </div>
          </div>

          {/* Chat History Dropdown */}
          {showChatHistory && (
            <div style={styles.chatHistoryDropdown}>
              <div style={styles.chatHistoryHeader}>
                <span>📜 Lịch sử chat</span>
                <button
                  style={styles.closeHistoryBtn}
                  onClick={() => setShowChatHistory(false)}
                >
                  ✕
                </button>
              </div>
              <div style={styles.chatHistoryList}>
                {chatHistory.length === 0 ? (
                  <div style={styles.noHistory}>Chưa có lịch sử chat</div>
                ) : (
                  chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      style={{
                        ...styles.chatHistoryItem,
                        ...(chat.id === currentChatId && styles.chatHistoryItemActive)
                      }}
                      onClick={() => handleSwitchChat(chat)}
                    >
                      <div style={styles.chatHistoryItemContent}>
                        <span style={styles.chatHistoryTitle}>{chat.title}</span>
                        <span style={styles.chatHistoryDate}>
                          {new Date(chat.updatedAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <button
                        style={styles.deleteChatBtn}
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        title="Xóa cuộc chat"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Chat Content */}
          <div style={styles.chatContent}>
            {messages.length === 0 ? (
              // Welcome Screen
              <div style={styles.welcomeScreen}>
                <div style={styles.avatarContainer}>
                  <div style={styles.avatar}>🤖</div>
                  <div style={styles.statusDot} />
                </div>
                <h3 style={styles.welcomeTitle}>Tôi có thể giúp gì cho bạn?</h3>

                {/* Selected Project Badge */}
                {selectedProject && (
                  <div style={styles.selectedProjectBadge}>
                    📊 {selectedProject.name}
                  </div>
                )}

                {/* Quick Actions */}
                <div style={styles.quickActions}>
                  {quickActions.map((actionConfig, idx) => (
                    <button
                      key={idx}
                      style={{
                        ...styles.quickActionBtn,
                        ...(actionConfig.needProject && !selectedProject && !projectId && styles.quickActionBtnDisabled)
                      }}
                      onClick={() => handleQuickAction(actionConfig)}
                      disabled={!aiStatus.available}
                    >
                      <span style={styles.actionIcon}>{actionConfig.icon}</span>
                      <span style={styles.actionLabel}>{actionConfig.label}</span>
                      {actionConfig.isNew && <span style={styles.newBadge}>New</span>}
                    </button>
                  ))}
                </div>

                {!aiStatus.available && (
                  <div style={styles.warningBanner}>
                    ⚠️ {aiStatus.message || 'AI service chưa được cấu hình'}
                  </div>
                )}
              </div>
            ) : (
              // Messages
              <div style={styles.messagesList}>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.messageWrapper,
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {msg.role === 'assistant' && (
                      <div style={styles.assistantAvatar}>🤖</div>
                    )}
                    <div
                      style={{
                        ...styles.messageBubble,
                        ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble),
                        ...(msg.isError && styles.errorBubble),
                      }}
                    >
                      <div style={styles.messageContent}>
                        {msg.content.split('\n').map((line, i) => (
                          <p key={i} style={{ margin: line ? '4px 0' : '8px 0' }}>{line}</p>
                        ))}
                      </div>

                      {/* Action buttons for executable actions */}
                      {msg.executableActions && msg.executableActions.length > 0 && (
                        <div style={styles.actionButtons}>
                          {msg.executableActions.map((action, actionIdx) => (
                            <button
                              key={actionIdx}
                              style={styles.executeActionBtn}
                              onClick={() => handleExecuteAction(action)}
                              disabled={isLoading}
                            >
                              {getActionTypeName(action.actionType)}
                              {action.data?.name && `: ${action.data.name}`}
                              {action.data?.title && `: ${action.data.title}`}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Show "Tạo nhiều tasks" button when AI suggests tasks but no executableActions */}
                      {msg.role === 'assistant' &&
                        !msg.isError &&
                        !msg.isActionResult &&
                        !msg.executableActions?.length &&
                        hasTaskSuggestions(msg.content) && (
                          <div style={styles.actionButtons}>
                            <button
                              style={styles.createTasksBtn}
                              onClick={() => handleCreateTasksFromContent(msg.content)}
                              disabled={isLoading}
                            >
                              📋 Tạo nhiều tasks
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div style={styles.messageWrapper}>
                    <div style={styles.assistantAvatar}>🤖</div>
                    <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
                      <div style={styles.typingIndicator}>
                        <span style={styles.dot} />
                        <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
                        <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Approve/Reject buttons for pending actions - Only show for task-related actions */}
          {pendingActions.length > 0 && (pendingActionType === 'SUGGEST_TASKS' || pendingActionType === 'TASK_CREATION') && (
            <div style={styles.pendingActionsBar}>
              <span style={styles.pendingActionsText}>
                📋 {pendingActions.length} công việc được gợi ý
              </span>
              <div style={styles.pendingActionsButtons}>
                <button
                  style={styles.rejectBtn}
                  onClick={handleRejectTasks}
                  disabled={isLoading}
                >
                  ✕ Từ chối
                </button>
                <button
                  style={styles.approveBtn}
                  onClick={() => handleApproveAllTasks(pendingActions)}
                  disabled={isLoading}
                >
                  ✓ Đồng ý tạo tất cả
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div style={styles.inputArea}>
            {/* Project selector dropdown */}
            {showProjectSelector && (
              <div style={styles.projectSelector}>
                <div style={styles.projectSelectorHeader}>
                  <span>📁 Chọn dự án</span>
                  <button
                    style={styles.closeSelectorBtn}
                    onClick={() => setShowProjectSelector(false)}
                  >
                    ✕
                  </button>
                </div>
                <div style={styles.projectList}>
                  {projects.length === 0 ? (
                    <div style={styles.noProjects}>Không có dự án nào</div>
                  ) : (
                    projects.map((project) => (
                      <button
                        key={project.projectId}
                        style={{
                          ...styles.projectItem,
                          ...(selectedProject?.projectId === project.projectId && styles.projectItemSelected)
                        }}
                        onClick={() => handleSelectProject(project)}
                      >
                        <span style={styles.projectIcon}>📊</span>
                        <div style={styles.projectInfo}>
                          <span style={styles.projectName}>{project.name}</span>
                          <span style={styles.projectKey}>{project.keyProject}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div style={styles.inputContainer}>
              <button
                type="button"
                className="context-btn"
                style={{
                  ...styles.contextBtn,
                  ...(selectedProject && styles.contextBtnSelected),
                  ...(showProjectSelector && { backgroundColor: '#e5e7eb' })
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Context button clicked');
                  setShowProjectSelector(!showProjectSelector);
                }}
              >
                {selectedProject ? (
                  <>
                    <span>📊</span> {selectedProject.name}
                    <span
                      style={styles.clearProjectBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProject(null);
                      }}
                    >
                      ✕
                    </span>
                  </>
                ) : (
                  <>
                    <span>@</span> Add context
                  </>
                )}
              </button>
              <textarea
                ref={inputRef}
                style={styles.input}
                placeholder={selectedProject ? `Hỏi về dự án ${selectedProject.name}...` : "Hỏi bất cứ điều gì..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!aiStatus.available || isLoading}
                rows={1}
              />
            </div>
            <div style={styles.inputFooter}>
              <div style={styles.inputOptions}>
                <button style={styles.optionBtn}>📎</button>
                <button style={styles.optionBtn}>Auto</button>
                <button style={styles.optionBtn}>🌐 All sources</button>
              </div>
              <button
                style={{
                  ...styles.sendBtn,
                  opacity: (!inputValue.trim() || !aiStatus.available || isLoading) ? 0.5 : 1,
                }}
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || !aiStatus.available || isLoading}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .context-btn:hover {
          background-color: #e5e7eb !important;
          border-color: #d1d5db !important;
        }
      `}</style>
    </>
  );
}

// Styles
const styles = {
  floatingButton: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    zIndex: 9999,
  },
  buttonIcon: {
    fontSize: '24px',
  },
  notificationDot: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    border: '2px solid white',
  },
  chatWindow: {
    position: 'fixed',
    bottom: '96px',
    right: '24px',
    width: '400px',
    height: '600px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 9998,
    animation: 'slideUp 0.3s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    fontSize: '24px',
  },
  headerTitle: {
    display: 'flex',
    flexDirection: 'column',
  },
  titleText: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#1a1a1a',
  },
  newChatBtn: {
    background: 'none',
    border: 'none',
    fontSize: '12px',
    color: '#666',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
  },
  headerActions: {
    display: 'flex',
    gap: '4px',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    color: '#666',
    transition: 'background 0.2s',
  },
  chatContent: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  },
  welcomeScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '20px',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: '16px',
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
  },
  statusDot: {
    position: 'absolute',
    top: '0',
    right: '0',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    border: '2px solid white',
  },
  welcomeTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '24px',
  },
  quickActions: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  quickActionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    textAlign: 'left',
  },
  actionIcon: {
    fontSize: '18px',
  },
  actionLabel: {
    flex: 1,
    fontSize: '14px',
    color: '#1a1a1a',
  },
  newBadge: {
    fontSize: '11px',
    color: '#3b82f6',
    fontWeight: '500',
  },
  warningBanner: {
    marginTop: '20px',
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#92400e',
  },
  messagesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  messageWrapper: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },
  assistantAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: '12px 16px',
    borderRadius: '16px',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  userBubble: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    backgroundColor: '#f5f5f5',
    color: '#1a1a1a',
    borderBottomLeftRadius: '4px',
  },
  errorBubble: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  messageContent: {
    whiteSpace: 'pre-wrap',
  },
  actionButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
  },
  executeActionBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #3b82f6',
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  createTasksBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #10b981',
    backgroundColor: '#ecfdf5',
    color: '#10b981',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    padding: '4px 0',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#9ca3af',
    animation: 'bounce 1.4s infinite ease-in-out',
  },
  inputArea: {
    padding: '12px 16px',
    borderTop: '1px solid #f0f0f0',
    position: 'relative',
  },
  inputContainer: {
    border: '2px solid #e5e7eb',
    borderRadius: '16px',
    padding: '8px 12px',
    transition: 'border-color 0.2s',
  },
  contextBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    background: '#f5f5f5',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#666',
    cursor: 'pointer',
    marginBottom: '8px',
    zIndex: 10,
    position: 'relative',
    transition: 'all 0.2s ease',
  },
  input: {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    resize: 'none',
    minHeight: '24px',
    maxHeight: '120px',
    fontFamily: 'inherit',
  },
  inputFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
  },
  inputOptions: {
    display: 'flex',
    gap: '4px',
  },
  optionBtn: {
    padding: '4px 8px',
    background: 'none',
    border: 'none',
    fontSize: '12px',
    color: '#666',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  sendBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s',
  },
  // Project selector styles
  projectSelector: {
    position: 'absolute',
    bottom: '100%',
    left: '16px',
    right: '16px',
    marginBottom: '8px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    maxHeight: '300px',
    overflow: 'hidden',
    zIndex: 100,
  },
  projectSelectorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    fontWeight: '600',
    fontSize: '14px',
  },
  closeSelectorBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#666',
    padding: '4px',
  },
  projectList: {
    maxHeight: '240px',
    overflowY: 'auto',
  },
  noProjects: {
    padding: '20px',
    textAlign: 'center',
    color: '#666',
    fontSize: '14px',
  },
  projectItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    width: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s',
    textAlign: 'left',
  },
  projectItemSelected: {
    backgroundColor: '#eff6ff',
  },
  projectIcon: {
    fontSize: '20px',
  },
  projectInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  projectName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a1a',
  },
  projectKey: {
    fontSize: '12px',
    color: '#666',
  },
  contextBtnSelected: {
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
    borderColor: '#3b82f6',
  },
  clearProjectBtn: {
    marginLeft: '8px',
    padding: '2px 6px',
    fontSize: '12px',
    color: '#666',
    cursor: 'pointer',
  },
  selectedProjectBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '16px',
  },
  quickActionBtnDisabled: {
    opacity: 0.5,
  },
  // Pending actions bar styles
  pendingActionsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    borderTop: '1px solid #fcd34d',
    gap: '12px',
  },
  pendingActionsText: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#92400e',
  },
  pendingActionsButtons: {
    display: 'flex',
    gap: '8px',
  },
  rejectBtn: {
    padding: '8px 16px',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  approveBtn: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  // Chat history styles
  chatActionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  newChatBtnDropdown: {
    background: 'none',
    border: 'none',
    fontSize: '12px',
    color: '#666',
    cursor: 'pointer',
    padding: '2px 0',
    textAlign: 'left',
    maxWidth: '150px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  newChatPlusBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '22px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.25)',
  },
  chatHistoryDropdown: {
    position: 'absolute',
    top: '56px',
    left: '16px',
    right: '16px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    zIndex: 100,
    maxHeight: '350px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  chatHistoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    fontWeight: '600',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#f9fafb',
  },
  closeHistoryBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#666',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  chatHistoryList: {
    maxHeight: '280px',
    overflowY: 'auto',
  },
  noHistory: {
    padding: '24px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },
  chatHistoryItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'background 0.2s',
    borderBottom: '1px solid #f5f5f5',
  },
  chatHistoryItemActive: {
    backgroundColor: '#eff6ff',
  },
  chatHistoryItemContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflow: 'hidden',
  },
  chatHistoryTitle: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1a1a1a',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chatHistoryDate: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  deleteChatBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px 8px',
    borderRadius: '4px',
    opacity: 0.5,
    transition: 'opacity 0.2s, background 0.2s',
  },
};
