// Chat Contacts
export const chatContacts = [
  {
    id: 1,
    name: 'HR Department',
    avatar: '👥',
    lastMessage: 'Đã gửi thông báo về chính sách mới',
    time: '10:30',
    unread: 2,
    online: true
  },
  {
    id: 2,
    name: 'Tech Team',
    avatar: '💻',
    lastMessage: 'Meeting lúc 2PM hôm nay nhé',
    time: '09:15',
    unread: 0,
    online: true
  },
  {
    id: 3,
    name: 'Nguyễn Văn A',
    avatar: '👤',
    lastMessage: 'Cảm ơn bạn!',
    time: 'Hôm qua',
    unread: 0,
    online: false
  },
  {
    id: 4,
    name: 'Trần Thị B',
    avatar: '👩',
    lastMessage: 'File đã được gửi',
    time: 'Hôm qua',
    unread: 0,
    online: false
  },
  {
    id: 5,
    name: 'Marketing Team',
    avatar: '📢',
    lastMessage: 'Chiến dịch mới đã sẵn sàng',
    time: '2 ngày trước',
    unread: 0,
    online: false
  }
]

// Chat Messages
export const chatMessages = [
  {
    id: 1,
    sender: 'HR Department',
    content: 'Xin chào! Chúng tôi có thông báo về chính sách nghỉ phép mới.',
    time: '10:25',
    isOwn: false
  },
  {
    id: 2,
    sender: 'You',
    content: 'Dạ, em đã nhận được thông báo. Cho em hỏi thêm về quy định chi tiết được không ạ?',
    time: '10:27',
    isOwn: true
  },
  {
    id: 3,
    sender: 'HR Department',
    content: 'Tất nhiên! Chính sách mới cho phép nhân viên sử dụng tối đa 15 ngày nghỉ phép có lương mỗi năm.',
    time: '10:28',
    isOwn: false
  },
  {
    id: 4,
    sender: 'You',
    content: 'Em hiểu rồi ạ. Cảm ơn anh/chị nhiều!',
    time: '10:30',
    isOwn: true
  }
]
